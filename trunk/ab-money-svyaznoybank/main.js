/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток и другие параметры карт Связного Банка через интернет банк.

Сайт оператора: http://www.svyaznoybank.ru/
Личный кабинет: https://ibank.svyaznoybank.ru
*/

function getParam (html, result, param, regexp, replaces, parser) {
	if (param && (param != '__tariff' && !AnyBalance.isAvailable (param)))
		return;

	var value = regexp ? regexp.exec (html) : html;
	if (value) {
                if(regexp)
		    value = value[1];
		if (replaces) {
			for (var i = 0; i < replaces.length; i += 2) {
				value = value.replace (replaces[i], replaces[i+1]);
			}
		}
		if (parser)
			value = parser (value);

    if(param)
      result[param] = value;
    else
      return value
	}
}

var replaceTagsAndSpaces = [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, '', /^"+|"+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.', /(\d)\-(\d)/g, '$1.$2'];

function parseBalance(text){
    var _text = text.replace(/\s+/g, '');
    var val = getParam(_text, null, null, /(-?\d[\d\.,\-]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function parseCurrency(text){
    var _text = text.replace(/\s+/g, '');
    var val = getParam(_text, null, null, /[\d\.,\-]+(\S*)/);
    AnyBalance.trace('Parsing currency (' + val + ') from: ' + text);
    return val;
}

function parseDate(str){
    AnyBalance.trace('Parsing date from value: ' + str);
    var matches = /(\d+)[^\d](\d+)[^\d](\d+)/.exec(str);
    var time;
    if(matches){
	  time = (new Date(+matches[3], matches[2]-1, +matches[1])).getTime();
    }
    return time;
}

var g_phrases = {
   karty: {card: 'карты', acc: 'счета'},
   kartu: {card: 'карту', acc: 'счет'},
   karte1: {card: 'первой карте', acc: 'первому счету'},
   karty1: {card: 'одной карты', acc: 'одного счета'}
}

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "https://ibank.svyaznoybank.ru/lite/app";
    AnyBalance.setDefaultCharset("utf-8");
    
    var what = prefs.what || 'card';
    if(prefs.num && !/\d{4}/.test(prefs.num))
        throw new AnyBalance.Error("Введите 4 последних цифры номера " + g_phrases.karty[what] + " или не вводите ничего, чтобы показать информацию по " + g_phrases.karte1[what]);

    var html = AnyBalance.requestGet(baseurl + "/pub/Login");
    
    var matches = /<form[^>]*class="login rounded"[^>]*id="([^"]*)"[^>]*action="\.\.([^"]*)"/i.exec(html);
    if(!matches){
        var prof = getParam(html, null, null, /<title>(Профилактические работы)<\/title>/i);
        if(prof)
            throw new AnyBalance.Error("В настоящее время в системе Интернет-банк проводятся профилактические работы. Пожалуйста, попробуйте ещё раз позже.");
        throw new AnyBalance.Error("Не удаётся найти форму входа в интернет-банк! Сайт недоступен или изменения на сайте.");
    }

    var id=matches[1], href=matches[2];
    var params = {};
    params[id + "_hf_0"] = '';
    params.hasData = 'X';
    params.login=prefs.login;
    params.password=prefs.password;

    html = AnyBalance.requestPost(baseurl + href, params);

    var error = getParam(html, null, null, /<span[^>]*class="feedbackPanelERROR"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
    if(error)
        throw new AnyBalance.Error(error);

    var needsms = getParam(html, null, null, /(sms-message-panel)/i);
    if(needsms)
        throw new AnyBalance.Error("Для работы этого провайдера требуется отключить в настройках интернет-банка подтверждение входа по СМС. Это безопасно, для совершения операций все равно будет требоваться подтверждение по СМС.");

    AnyBalance.trace("We seem to enter the bank...");

    html = AnyBalance.requestGet(baseurl + "/priv/accounts");
    $html = $(html);
    
    var pattern = null;
    if(what == 'card')
        pattern = new RegExp('\\d{4} \\*{4} \\*{4} ' + (prefs.num || '\\d{4}'));
    else
        pattern = new RegExp(prefs.num ? '\\d{16}'+prefs.num : '\\d{20}');

    var min_i = -1;
    var min_val = null;
    var cur_i = -1;
    var $acc = $html.find('div.account').filter(function(i){
        var matches = pattern.exec($(this).text());
        if(!matches)
             return false;
        ++cur_i;
        if(min_i < 0 || min_val > matches[0]){
            min_i = cur_i;
            min_val = matches[0];
        }
        return true;
    }).eq(min_i);
    
    if(!$acc.size()){
        if(prefs.num)
            throw new AnyBalance.Error('Не удалось найти ' + g_phrases.kartu[what] + ' с последними цифрами ' + prefs.num);
        else
            throw new AnyBalance.Error('Не удалось найти ни ' + g_phrases.karty1[what] + '!');
    }

    var result = {success: true};

    getParam($acc.find('div.account-number').text(), result, 'accnum', /(\d{20})/);
    getParam($acc.find('div.account-name').text(), result, 'accname', null, replaceTagsAndSpaces);
    getParam($acc.find('div.account-name').text(), result, '__tariff', null, replaceTagsAndSpaces);
    getParam($acc.find('.card-amount-info').text(), result, 'balance', null, null, parseBalance);
    
    var min_i = -1;
    var min_val = null;
    var cur_i = -1;
    var pattern = new RegExp('\\d{4} \\*{4} \\*{4} ' + ((what == 'card' && prefs.num) || '\\d{4}'));
    var $card = $acc.find('.card-info-row').filter(function(i){
        var matches = pattern.exec($(this).text());
        if(!matches)
             return false;
        ++cur_i;
        if(min_i < 0 || min_val > matches[0]){
            min_i = cur_i;
            min_val = matches[0];
        }
        return true;
    }).eq(min_i);

    if($card.size()){
        getParam($card.find('.card-number').text(), result, 'cardnum');
        getParam($card.find('.card-number').text(), result, '__tariff');
        getParam($card.find('.card-name').text(), result, 'cardname');
        getParam($card.find('.card-amount-info-balls').text(), result, 'cardballs', null, null, parseBalance);
    }

    getParam($acc.find('.balance-review .amount').text(), result, 'accamount', null, null, parseBalance);
    getParam($acc.find('.balance-review .amount').text(), result, 'currency', null, null, parseCurrency);
    getParam($acc.find('.points-by-holds .amount').text(), result, 'holdballs', null, null, parseBalance);

    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

