/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
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
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + '?popupWidget=AuthPopupWidget&block=login', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'login') 
			return prefs.login;
		else if (name == 'password')
			return prefs.password;

		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + '?popupWidget=AuthPopupWidget&block=login', {
		'AuthForm[loginOrEmail]': prefs.login,
		'AuthForm[password]': prefs.password,
		'AuthForm[bruteforceDetected]': ''
	}, addHeaders({Referer: baseurl + '?popupWidget=AuthPopupWidget&block=login'}));

    var result = {success: true};

    result.__tariff = prefs.login;
    getParam(html, result, 'balance', /balance[^:]*:([\s\d,.]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'bonus', /bonus[^:]*:([\s\d,.]+)/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result); 
}