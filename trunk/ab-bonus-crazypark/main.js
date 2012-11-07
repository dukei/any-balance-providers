/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию по бонусной карте CrazyPark

Сайт оператора: http://www.crazypark.ru
Личный кабинет: http://www.crazypark.ru/club/index.php
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
    AnyBalance.setDefaultCharset('windows-1251');

    var baseurl = "http://www.crazypark.ru/club/";

    var html = AnyBalance.requestPost(baseurl + 'login.php', {
        login:prefs.login,
        password:prefs.password
    });

    //AnyBalance.trace(html);
    if(!/login.php\?login=n/.test(html)){
        var error = getParam(html, null, null, /<div[^>]*class=["']error[^>]*>([\s\S]*?)<\/div>/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /На твоей карте:([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'bonuses', /Из них бонусов:([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'crazies', /Крэйзики на карте:([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'cardnum', /Номер карты:([^<]*)/i, replaceTagsAndSpaces);
    getParam(html, result, 'level', /<div[^>]+class="status"[^>]*>[\S\s]*?url\((\d)_a\.gif\)/i, replaceTagsAndSpaces, parseInt);
    getParam(html, result, 'next', /<span[^>]*>([^<]*)<\/span>\s*<br[^>]*>\s*до перехода/i, replaceTagsAndSpaces, parseBalance);

    var cn = getParam(html, null, null, /Номер карты:([\S\s]*?)<br/i, replaceTagsAndSpaces);
    var level = getParam(html, null, null, /<div[^>]+class="status"[^>]*>[\S\s]*?url\((\d)_a\.gif\)/i, replaceTagsAndSpaces, parseInt);

    result.__tariff = level + ' уровень, №' + cn;

    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

