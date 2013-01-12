/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток и другие параметры карт ОТП банка через интернет банк.

Сайт оператора: http://otpbank.ru
Личный кабинет: https://direkt.otpbank.ru/
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

var replaceTagsAndSpaces = [/&nbsp;/g, ' ', /<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, '', /^"+|"+$/g, ''];
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
    var matches = /(\d+)[^\d](\d+)[^\d](\d+)/.exec(str);
    var time;
    if(matches){
	  time = (new Date(+matches[3], matches[2]-1, +matches[1])).getTime();
    }
    AnyBalance.trace('Parsing date ' + new Date(time) + ' from value: ' + str);
    return time;
}

function sleep(delay) {
   if(AnyBalance.getLevel() < 6){
      var startTime = new Date();
      var endTime = null;
      do {
          endTime = new Date();
      } while (endTime.getTime() - startTime.getTime() < delay);
   }else{
      AnyBalance.sleep(delay);
   }
} 

function createFormParams(html, process){
    var params = {};
    html.replace(/<input[^>]+name="([^"]*)"[^>]*>/ig, function(str, name){
        var value = getParam(str, null, null, /value="([^"]*)"/i, null, html_entity_decode);
        name = html_entity_decode(name);
        if(process){
            value = process(params, str, name, value);
        }
        params[name] = value;
    });
    return params;
}

function waitForTransaction(url){
    do{
       html = $.trim(AnyBalance.requestGet(baseurl + url, g_headers));
       if(html == 'FINISHED' || html == 'TIMEOUT')
           break;
       if(html != 'WAITING')
           throw new AnyBalance.Error('Неизвестный ответ от проверки транзакции: ' + html);
       AnyBalance.trace('Waiting for transaction to finish...');
       sleep(3000);
    }while(true);
}

var baseurl = "https://direkt.otpbank.ru/homebank/do/";
var g_headers = {
  'Accept':'*/*',
   'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
   'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
   'Connection':'keep-alive',
   'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.89 Safari/537.1'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset("utf-8");
    
    var what = prefs.what || 'card';
    if(prefs.num && !/\d{4}/.test(prefs.num))
        throw new AnyBalance.Error("Введите 4 последних цифры номера карты или не вводите ничего, чтобы показать информацию по первой карте");

    var html = AnyBalance.requestPost(baseurl + "bejelentkezesJelszoalapu", {
        azonosito:prefs.login,
        jelszo:prefs.password,
        tranzakcionkentiAzonositas:'off',
        muvelet:'login',
        cacheHasznalat:'off',
        x:86,
        y:11,
        lang:'ru'
    }, g_headers);

    if(!/\/homebank\/do\/beallitasok\/kijelentkezes/i.test(html)){
        var error = getParam(html, null, null, /<p[^>]+class="[^"]*red[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error);
        AnyBalance.trace(html);
        throw new AnyBalance.Error("Не удалось зайти в интернет-банк. Сайт изменен?");
    }

    var form = getParam(html, null, null, /(<form[^>]+name="bankszamlaMuveletForm"[\s\S]*?<\/form>)/i);
    if(!form)
        throw new AnyBalance.Error("Не удалось найти форму запроса информации по картам. Обратитесь к автору провайдера.");

    var hrefCheck = getParam(html, null, null, /actionURL\s*:\s*['"]\/homebank\/do\/([^'"]*)/);
    waitForTransaction(hrefCheck);

    var params = createFormParams(form);
    html = AnyBalance.requestPost(baseurl + "bankszamla/bankszamlaMuvelet", params, g_headers);

    var cards = getParam(html, null, null, /<form[^>]+name="bankszamlaMuveletForm"[^>]*>([\s\S]*?)<\/form>/i);
    if(!cards)
        throw new AnyBalance.Error('Не удалось найти таблицу карт!');

    var $cards = $('<div>' + cards + '</div>');
    var re = prefs.num ? new RegExp('(\\d{4}\\s*\\*{4}\\s*\\*{4}\\s*' + prefs.num + ')') : /(\d{4}\s*\*{4}\s*\*{4}\s*\d{4})/;

    var $card = $cards.find('table#nagyTabla>tbody>tr').filter(function(index){
        return re.test($(this).text());
    }).first();

    if(!$card.size())
        throw new AnyBalance.Error('Не удалось найти ' + (prefs.num ? 'карту с последними цифрами ' + prefs.num : 'ни одной карты'));

    var result = {success: true};
    
    getParam($card.text(), result, 'cardnum', re, replaceTagsAndSpaces);
    getParam($card.find('td:nth-child(2)').first().text(), result, 'cardname', null, replaceTagsAndSpaces);
    getParam($card.find('td:nth-child(4)').first().text(), result, 'type', null, replaceTagsAndSpaces);
    getParam($card.find('td:nth-child(5)').first().text(), result, 'balance', null, replaceTagsAndSpaces, parseBalance);
    getParam($card.find('td:nth-child(5)').first().text(), result, 'currency', null, replaceTagsAndSpaces, parseCurrency);
    
    if(AnyBalance.isAvailable('till','own','debt','minpay','minpaytill','gracepay','gracetill','limit')){
        var href = $card.find('td:nth-child(2) a').first().attr('href');
        href = getParam(href, null, null, /\/homebank\/do\/(.*)/i);
        if(!href)
            throw new AnyBalance.Error('Не удалось найти ссылку на детальную информацию по карте. Обратитесь к автору провайдера');
        html = AnyBalance.requestGet(baseurl + href, g_headers);
            
        var form = getParam(html, null, null, /(<form[^>]+name="torzsadatLekerdezesForm"[\s\S]*?<\/form>)/i);
        if(!form)
            throw new AnyBalance.Error("Не удалось найти форму запроса детальной информации по карте. Обратитесь к автору провайдера.");
        
        var hrefCheck = getParam(html, null, null, /actionURL\s*:\s*['"]\/homebank\/do\/([^'"]*)/);
        waitForTransaction(hrefCheck);
        
        var params = createFormParams(form);
        html = AnyBalance.requestPost(baseurl + "bankkartya/torzsadatLekerdezesLink", params, g_headers);

        getParam(html, result, 'till', /Дата окончания действия карты[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
        getParam(html, result, 'own', /Остаток собственных средств[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'debt', /Сумма общей задолженности к уплате[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'minpay', /Минимальный платеж[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'minpaytill', /Дата очередного платежа[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
        getParam(html, result, 'gracepay', /Платеж льготного периода[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'gracetill', /Дата вхождения в льготный период[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
        getParam(html, result, 'limit', /Кредитный лимит[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    }

    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

