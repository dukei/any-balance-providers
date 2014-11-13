/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://mano.tele2.lt';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	html = AnyBalance.requestPost(baseurl + '/user/login', {
		username: prefs.login,
		password: prefs.password,
		'__RequestVerificationToken': getParam(html, null, null, /__RequestVerificationToken[^>]*value="([^"]+)/i)
	}, addHeaders({Referer: baseurl + '/user/login'}));
	
	var json = getJson(html);
	
	if (!json.Url) {
		var error = json.ErrorMessage[0] || json.ErrorMessage;
		if (error)
			throw new AnyBalance.Error(error, null, /Neteisingai nurodytas telefonas/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Login attempt has failed.');
	}
	
	html = AnyBalance.requestGet(baseurl + json.Url, g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /([\s\d-,.]+€)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balance_lt', /([\s\d-,.]+LT)/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}