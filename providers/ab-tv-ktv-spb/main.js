/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для питерского провайдера кабельного телевидения и интернет Компании КТВ

Сайт оператора: http://ktv-spb.ru/
Личный кабинет: https://my.ktv-spb.ru
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

    var baseurl = "https://my.ktv-spb.ru/";

    var html = AnyBalance.requestPost(baseurl + 'index.php?mod=login', {
	'user[login]':prefs.login,
	'user[password]':prefs.password
    });

    //AnyBalance.trace(html);
    if(!/op=logout/.test(html)){
        var error = getParam(html, null, null, /<p[^>]*style=["']color:\s*red[^>]*>([\s\S]*?)<\/p>/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Неверный логин-пароль?');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /Текущий баланс:[\S\s]*?<span[^>]*>([\S\s]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'agreement', /Договор:[\S\s]*?<span[^>]*>([\S\s]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /Договор:[\S\s]*?<span[^>]*>([\S\s]*?)<\/span>/i, replaceTagsAndSpaces, function(str){return 'Договор: ' + str});

    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

