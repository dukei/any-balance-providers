/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Данные по бонусной карте Спортмастер

Сайт оператора: http://sportmaster.ru/
Личный кабинет: http://www.sportmaster.ru/personal/bonus.php
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
    var _text = text.replace(/\s+/, '');
    var val = getParam(_text, null, null, /(-?\d[\d\.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

var replaceTagsAndSpaces = [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "http://www.sportmaster.ru/personal/bonus.php?login=yes";
    var html = AnyBalance.requestPost(baseurl, {
        AUTH_FORM:'Y',
        TYPE:'AUTH',
        backurl:'/personal/bonus.php',
        USER_LOGIN:prefs.login,
        USER_PASSWORD:prefs.password
    });

    var error = getParam(html, null, null, /<font[^>]*class=['"]errortext['"][^>]*>([\s\S]*?)<\/font>/i, replaceTagsAndSpaces, html_entity_decode);
    if(error)
        throw new AnyBalance.Error(error);

    var result = {success: true};

    getParam(html, result, 'cardnum', /Номер бонусной карты:[\s\S]*?>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /Номер бонусной карты:[\s\S]*?>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Доступно средств:[\s\S]*?>([^<]*)/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

