/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток и другие параметры карт Банка Авангард через интернет банк.

Сайт оператора: http://www.avangard.ru/
Личный кабинет: https://www.avangard.ru/login/logon_enter.html
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
    var baseurl = "https://www.avangard.ru/";
    AnyBalance.setDefaultCharset("windows-1251");
    
    var what = prefs.what || 'card';
    if(prefs.num && !/\d{4}/.test(prefs.num))
        throw new AnyBalance.Error("Введите 4 последних цифры номера " + g_phrases.karty[what] + " или не вводите ничего, чтобы показать информацию по " + g_phrases.karte1[what]);

    var html = AnyBalance.requestPost(baseurl + "client4/afterlogin", {
        login:prefs.login,
        passwd:prefs.password,
        x:38,
        y:6,
    });

    var error = getParam(html, null, null, /<!--WAS_ERROR-->([\s\S]*?)<!--\/WAS_ERROR-->/i, replaceTagsAndSpaces);
    if(error)
        throw new AnyBalance.Error(error);

    var firstpage = getParam(html, null, null, /window.location\s*=\s*"([^"]*)"/i);
    if(!firstpage)
        throw new AnyBalance.Error("Не удалось найти ссылку на первую страницу банка.");

    AnyBalance.trace("We seem to enter the bank...");

    html = AnyBalance.requestGet(baseurl + "ibAvn/" + firstpage);

    var pattern = null;
    if(what == 'card')
        pattern = new RegExp('(\\d+\\*{6}' + (prefs.num || '\\d{4}') + ')');
    else
        pattern = new RegExp(prefs.num ? '(\\d{16}'+prefs.num+')' : '(\\d{20})');

    $html = $(html);
    var acccardnum = null;

    var $acc = $html.find('table[width="700"]').filter(function(i){
        var matches = pattern.exec($(this).text());
        if(matches && !acccardnum)
            acccardnum = matches[1];
        return !!matches;
    }).first();

    if(!$acc.size()){
        if(prefs.num)
            throw new AnyBalance.Error('Не удалось найти ' + g_phrases.kartu[what] + ' с последними цифрами ' + prefs.num);
        else
            throw new AnyBalance.Error('Не удалось найти ни ' + g_phrases.karty1[what] + '!');
    }

    var result = {success: true};

    getParam($acc.find('a.xl').text(), result, 'accnum', /(\d{20})/);
    getParam($acc.find('a.xl').text(), result, '__tariff', /(\d{20})/);
    getParam($acc.find('tr:has(a.xl)').text(), result, 'accname', /([\S\s]*?)\d{20}/, replaceTagsAndSpaces);
    getParam($acc.find('tr:first-child td:last-child b').text(), result, 'balance', null, replaceTagsAndSpaces, parseBalance);
    getParam($acc.find('tr:first-child td:last-child b').text(), result, 'currency', null, replaceTagsAndSpaces, parseCurrency);

    if(what == 'card'){
        var $card = $acc.find('table.cardListTable tr:contains("' + acccardnum + '")').first();
        if($card.size()){
            getParam($card.find('td:nth-child(2)').text(), result, 'cardnum', null, replaceTagsAndSpaces);
            getParam($card.find('td:nth-child(2)').text(), result, '__tariff', null, replaceTagsAndSpaces);
            getParam($card.find('td:nth-child(3)').text(), result, 'cardname', null, replaceTagsAndSpaces);
            getParam($card.find('td:nth-child(4)').text(), result, 'cardtill', null, replaceTagsAndSpaces);
            getParam($card.find('td:nth-child(5)').text(), result, 'cardtype', null, replaceTagsAndSpaces);
            getParam($card.find('td:nth-child(6)').text(), result, 'cardstatus', null, replaceTagsAndSpaces);
        }
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

