/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://mediavenus.biz/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'LoginForm[email]')
			return prefs.login;
		else if (name == 'LoginForm[password]')
			return prefs.password;

		return value;
	});
	
	html = AnyBalance.requestPost(baseurl, params, addHeaders({
		Referer: baseurl
	}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<input[^>]+id="loginform-password"[^>]*>[\s\S]*?<div[^>]+class="help-block"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Неправильные данные/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};

	sumParam(html, result, 'charged', /<span[^>]+class="c28"[^>]*>([\s\S]*?)<\/span>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	getParam(html, result, 'balance', /<span[^>]+class="balance"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}