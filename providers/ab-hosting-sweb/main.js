/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о балансе и тарифном плане для хостинг провайдера SpaceWeb

Сайт оператора: http://sweb.ru
Личный кабинет: https://mcp.sweb.ru
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

function parseDate(str){
    var matches = /(\d+)[^\d](\d+)[^\d](\d+)/.exec(str);
    var time;
    if(matches){
	  time = (new Date(+matches[3], matches[2]-1, +matches[1])).getTime();
          AnyBalance.trace('Parsing date ' + new Date(time) + ' from value: ' + str);
          return time;
    }
    AnyBalance.trace('Could not parse date from value: ' + str);
}

function decodeJSString(str){
   var val = eval('"' + str + '"');
   return val;
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('UTF-8');

    var baseurl = "https://mcp.sweb.ru/";

    if(prefs.__dbg){
        var html = AnyBalance.requestGet('https://cp.sweb.ru/');
    }else{
        var html = AnyBalance.requestPost(baseurl + 'main/auth_submit/', {
            login:prefs.login,
            password:prefs.password,
            service_type:'',
            savepref:''
        });
    }

    //AnyBalance.trace(html);
    if(!/\/main\/auth_logout_submit\//i.test(html)){
        var error = getParam(html, null, null, /var\s+text\s*=\s*"([^"]*)"[^<]*jGrowl-error/, replaceTagsAndSpaces, decodeJSString);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /Баланс:[\S\s]*?<dd[^>]*>([\S\s]*?)<\/dd>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'bonus', /Бонус:[\S\s]*?<dd[^>]*>([\S\s]*?)<\/dd>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'block', /Блокировка:[\S\s]*?<dd[^>]*title="([^"]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'quota', /Квота:[\S\s]*?<dd[^>]*>([\S\s]*?)<\/dd>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /Тариф(?:<[^>]*>)?:[\S\s]*?<dd[^>]*>([\S\s]*?)<\/dd>/i, replaceTagsAndSpaces);

    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

