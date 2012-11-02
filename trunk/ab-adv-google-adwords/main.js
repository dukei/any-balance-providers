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

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
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

function main() {

	var result = {
        success: true
    };

    var prefs = AnyBalance.getPreferences();
    
    AnyBalance.setDefaultCharset('utf-8');

	var baseurl = "https://accounts.google.com/ServiceLogin?service=adwords&hl=ru_RU&ltmpl=jfk&continue=https://adwords.google.com/um/gaiaauth?apt%3DNone%26ltmpl%3Djfk&passive=86400&sacu=1&sarp=1";
	var baseurlLogin = "https://accounts.google.com/";
    
    var html = AnyBalance.requestGet(baseurl, g_headers);
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
    
    //AnyBalance.trace(JSON.stringify(params));

    var html = AnyBalance.requestPost(baseurlLogin + 'ServiceLoginAuth', params, g_headers);

    //AnyBalance.trace(html);

    if(!/authenticatedUserName/i.test(html)){
        var error = getParam(html, null, null, /<span[^>]+class="errormsg[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error);
        error = getParam(html, null, null, /(<form[^>]+name="verifyForm")/i);
        if(error)
            throw new AnyBalance.Error("This account requires 2-step authorization. Turn off 2-step authorization to use this provider.");
        throw new AnyBalance.Error('Can not log in google account.');
    }

	html = AnyBalance.requestGet('https://adwords.google.com/select/ShowBillingSummary?hl=ru', g_headers);
    if(/<form[^>]+name="tcaccept"/i.test(html)){
        //Надо че-то принять, че-то у них изменилось.
        throw new AnyBalance.Error('Положения программы Google изменились. Пожалуйста, зайдите в ваш аккаунт Adwords через браузер и на вкладке "Сводка платежных данных" примите новые положения.');
    }

    getParam(html, result, 'balance', /<div[^>]+id="adw-billing-billingstatement-currentBalance"[^>]*>\s+\(?([^\)<]*)\)?<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'currency', /<div[^>]+id="adw-billing-billingstatement-currentBalance"[^>]*>\s+\((\w+)\s+/i, replaceTagsAndSpaces);

    AnyBalance.setResult(result);
}

