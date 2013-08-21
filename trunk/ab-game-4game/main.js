/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и бонусы из личного кабинета фогейма

Сайт оператора: https://ru.4game.com
Личный кабинет: https://ru.4game.com
*/
var g_headers = {
    'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Connection':'keep-alive',
    //Мобильный браузер хотим
    'User-Agent':'Mozilla/5.0 (Linux; U; Android 4.0.2; en-us; Galaxy Nexus Build/ICL53F) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30'
}

function main(){
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');
	
	var baseurl = "https://ru.4game.com/";
	
    var html = AnyBalance.requestGet(baseurl + 'widgetjson/signin?&loginField=' + encodeURIComponent(prefs.login) + '&passwordField=' + encodeURIComponent(prefs.password) + '&serviceId=0&jsonp&callback=');
    var json = getJson(html);
    if(!json.success){
        var message = json.message;
        throw new AnyBalance.Error(message);
    }

    html = AnyBalance.requestGet(baseurl + 'settings/personal/', addHeaders({
		'Referer':baseurl + 'subscription/index.html',
		'X-Requested-With':'XMLHttpRequest'
    }));
    var result = {success: true};

    result.__tariff = prefs.login;
    getParam(html, result, 'balance', /"jsUserBarBalance__eMoneyValue">([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
    // бонусы не фиксены
	getParam(html, result, 'bonus', /и\s*([^<]*)(?:<[^>]*>\s*)*бонусов/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result); 
}