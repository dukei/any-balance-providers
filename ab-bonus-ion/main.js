/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Лень карта ИОН

Сайт: http://i-on.ru/
Личный кабинет: http://i-on.ru/crm/logon
*/

function getParam (html, result, param, regexp, replaces, parser) {
	if (param && (param != '__tariff' && !AnyBalance.isAvailable (param)))
		return;

	var value = regexp.exec (html);
	if (value) {
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

function parseBalance(text){
    var _text = html_entity_decode(text);
    var val = getParam(_text.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

var replaceTagsAndSpaces = [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, '', /^"+|"+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

var g_headers = {
    Accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Cache-Control':'max-age=0',
    'Accept-Encoding':null, //Че-то какой-то битый стрим она получает, ошибка EOFException вываливается. Отменяем сжатие
    Connection:'keep-alive',
    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.60 Safari/537.1'
};

function main(){
    var baseurl = "http://i-on.ru/crm/logon";
    var prefs = AnyBalance.getPreferences();
    
    var html = AnyBalance.requestPost(baseurl, {
        number:prefs.login,
        password:prefs.password,
        remember:false
    }, g_headers);

    if(!/\/crm\/logoff/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="validation-summary-errors"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error("Не удалось зайти в личный кабинет. Проверьте номер карты и пароль.");
    }

    var result = {success: true};
   
    getParam(html, result, 'balance', /Сейчас на вашей карте:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
//    getParam(html, result, 'new', /Будут скоро активированы ещё[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'total', /Всего было накоплено:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
//    getParam(html, result, 'off', /Всего было потрачено[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

