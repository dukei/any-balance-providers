/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Баланс на Google Adwords.
Провайдер получает эти данные из личного Кабинета. Для работы требуется указать в настройках e-mail и пароль.
*/

var g_headers = {
    'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Connection':'keep-alive',
    //Мобильный браузер хотим
    'User-Agent':'Mozilla/5.0 (Linux; U; Android 4.0.2; en-us; Galaxy Nexus Build/ICL53F) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30'
}

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

var replaceTagsAndSpaces = [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, '', /^"+|"+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function parseBalance(text){
    var val = getParam(html_entity_decode(text).replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function parseCurrency(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /-?\d[\d\s.,]*(\S*)/);
    AnyBalance.trace('Parsing currency (' + val + ') from: ' + text);
    return val;
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

function getJson(html){
    try{
        var json = getParam(html, null, null, /^\)\]\}'([\s\S]*)$/);
        return JSON.parse(json);
    }catch(e){
        AnyBalance.trace('wrong json: ' + e.message + ' (' + html + ')');
        throw new AnyBalance.Error('Неправильный ответ сервера. Если эта ошибка повторяется, обратитесь к автору провайдера.');
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

function main() {
    var result = {
        success: true
    }, html;

    var prefs = AnyBalance.getPreferences();
    
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://accounts.google.com/ServiceLogin?service=ahsid&passive=true&continue=https://www.google.com/adsense/m/%3Fhl%3Dru";
    var baseurlLogin = "https://accounts.google.com/";
    
    if(!prefs.__dbg){
        html = AnyBalance.requestGet(baseurl, g_headers);
        var params = createFormParams(html, function(params, input, name, value){
            var undef;
            if(name == 'Email')
                value = prefs.login;
            else if(name == 'Passwd')
                value = prefs.password;
            else if(name == 'PersistentCookie')
                value = undef; //Снимаем галочку
           
            return value;
        });
        
        html = AnyBalance.requestPost(baseurlLogin + 'ServiceLoginAuth', params, g_headers);
        
        if(!/accounts\/Logout/i.test(html)){
            var error = getParam(html, null, null, /<span[^>]+class="errormsg[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
            if(error)
                throw new AnyBalance.Error(error);
            error = getParam(html, null, null, /(<form[^>]+name="verifyForm")/i);
            if(error)
                throw new AnyBalance.Error("This account requires 2-step authorization. Turn off 2-step authorization to use this provider.");
            AnyBalance.trace(html);
            throw new AnyBalance.Error('Can not log in google account.');
        }
    }else{
        html = AnyBalance.requestGet('https://www.google.com/adsense/m/?hl=ru');
    }

    var clientVersion = getParam(html, null, null, /'([a-f0-9]{16,})',\s*ads.adsense.lightfe.home.loadData/i);
    if(!clientVersion)
        AnyBalance.Error('Can not find Client-Version param!');
    AnyBalance.trace('Client-Version: ' + clientVersion);

    html = AnyBalance.requestPost('https://www.google.com/adsense/m/data/home?hl=ru', {}, addHeaders({
	'X-Lightfe-Auth': 1, 
	'Client-Version': clientVersion,
        'Referer': 'https://www.google.com/adsense/m/?hl=ru'
    }));

    var json = getJson(html);

    if(!json.earnings)
       throw new AnyBalance.Error('Google returned no earnings.');

    getParam(json.earnings[2][2], result, 'balance', /(.*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(json.earnings[2][2], result, 'currency', /(.*)/i, replaceTagsAndSpaces, parseCurrency);
    getParam(json.earnings[0][2], result, 'today', /(.*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(json.earnings[1][2], result, 'yesterday', /(.*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(json.earnings[3][2], result, 'prevmonth', /(.*)/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}

