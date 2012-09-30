/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для томского интернет-провайдера ИскраТелеком

Сайт оператора: http://iskratelecom.ru
Личный кабинет: https://my.istel.ru
*/

function getParam (html, result, param, regexp, replaces, parser) {
	if (param && (param != '__tariff' && !AnyBalance.isAvailable (param)))
		return;

	var matches = regexp.exec (html), value;
	if (matches) {
		value = matches[1];
		if (replaces) {
			for (var i = 0; i < replaces.length; i += 2) {
				value = value.replace (replaces[i], replaces[i+1]);
			}
		}
		if (parser)
			value = parser (value);

    if(param)
      result[param] = value;
	}
   return value
}

var replaceTagsAndSpaces = [/&nbsp;/g, ' ', /<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function parseBalance(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://my.istel.ru/cgi-bin/clients/";

    var html = AnyBalance.requestPost(baseurl + 'login', {
        action:'validate',
        login:prefs.login,
        password:prefs.password,
        domain_id:'1',
        submit:'Войти'
    });

    //AnyBalance.trace(html);
    if(!/action=logout/.test(html)){
        var error = getParam(html, null, null, /<span[^>]*style=["']color:\s*#101010[^>]*>([\s\S]*?)<\/span>/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /Ваш баланс:[\S\s]*?<span[^>]*>([\S\s]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'licschet', /Счет &#x2116;([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    var sessid = getParam(html, null, null, /<input[^>]*name="session_id"[^>]*value="([^"]*)/i);

    html = AnyBalance.requestGet(baseurl + "deal_account?session_id=" + sessid + "&action=stat_user_show");

    getParam(html, result, '__tariff', /<td[^>]*class=['"]utm-cell[^>]*>([\S\s]*?)<\/t[dr]>/i, replaceTagsAndSpaces, html_entity_decode);
    var table = getParam(html, null, null, /Отчет о предоставленных пользователю услугах[\s\S]*?<table[^>]*>([\s\S]*?)<\/table>/i);
    if(table){
        var matches = table.match(/<tr>\s*<td>([^<]*)<\/td>/ig);
        var strs=[];
        for(var i=0; matches && i<matches.length; ++i){
            strs[strs.length] = getParam(matches[i], null, null, /<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        }
        if(strs.length){
            result.__tariff = strs.join(', ');
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

