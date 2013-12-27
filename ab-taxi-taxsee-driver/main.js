/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
'Connection':'keep-alive',
'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "http://taxsee.ru/drivercabinet/";

    AnyBalance.setDefaultCharset('utf-8'); 
    var html = AnyBalance.requestGet(baseurl + 'index.php', g_headers);
    
    var form = getParam(html, null, null, /<form[^>]+id="loginForm"[^>]*>([\s\S]*?)<\/form>/i);
	if(!form)
		throw new AnyBalance.Error('Не удалось найти форму входа, сайт изменен?');
	
    var params = createFormParams(form, function(params, str, name, value) {
		if(name == 'LoginForm[username]')
			return prefs.login;
		if(name == 'LoginForm[password]')
			return prefs.password;
		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'index.php', params, addHeaders({Referer: baseurl})); 

    if(!/.>Выход</i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+alert-error[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        //Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

    getParam(html, result, '__tariff', /"Profile\[C_FIO\]"[^>]*value="([^"]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(result.__tariff, result, 'fio');
    getParam(html, result, 'balance', /"Profile\[C_SALDO\]"[^>]*value="([^"]+)/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}