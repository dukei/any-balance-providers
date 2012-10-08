/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и бонусы из личного кабинета фогейма

Сайт оператора: https://ru.4game.com
Личный кабинет: https://ru.4game.com
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

var g_headers = {
    'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Connection':'keep-alive',
    //Мобильный браузер хотим
    'User-Agent':'Mozilla/5.0 (Linux; U; Android 4.0.2; en-us; Galaxy Nexus Build/ICL53F) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30'
}

function addHeaders(newHeaders){
   var headers = {};
   for(var i in g_headers){
       headers[i] = g_headers[i];
   }
   for(i in newHeaders){
       headers[i] = newHeaders[i];
   }
   return headers;
}

function getJson(html){
    try{
        var json = getParam(html, null, null, /^\s*jsonp\w*\((.*)\)\s*$/i);
        return JSON.parse(json);
    }catch(e){
        AnyBalance.trace('wrong json: ' + e.message + ' (' + html + ')');
        throw new AnyBalance.Error('Неправильный ответ сервера. Если эта ошибка повторяется, обратитесь к автору провайдера.');
    }
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://ru.4game.com/";

    var html = AnyBalance.requestGet(baseurl + 'widgetjson/signin?&loginField=' + encodeURIComponent(prefs.login) + '&passwordField=' + encodeURIComponent(prefs.password) + '&serviceId=0&jsonp&callback=jsonp1349723037913');
    var json = getJson(html);
    if(!json.success){
        var message = json.message;
//        if(json.errors){
//            for(var i in json.errors){
//                message += '\n' + json.errors[i];
//            }
//        }
        throw new AnyBalance.Error(message);
    }

//    AnyBalance.trace('Login: ' + html);

    html = AnyBalance.requestGet(baseurl + 'userPanel/index.html?callback=jsonp134972306634', addHeaders({
	'Referer':baseurl + 'subscription/index.html',
	'X-Requested-With':'XMLHttpRequest'
    }));
//    AnyBalance.trace('Data' + html);

    json = getJson(html);
    html = json.html;

    var result = {success: true};

    result.__tariff = prefs.login;
    getParam(html, result, 'balance', /<span[^>]+class="score"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'bonus', /и\s*([^<]*)(?:<[^>]*>\s*)*бонусов/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result); 
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

