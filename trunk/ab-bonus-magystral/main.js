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
	var baseurl = 'https://www.magystral.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'Users/ReLogin.aspx', g_headers);
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'ctl00$contentPlaceHolder$loginBox$txtLogin') 
			return prefs.login;
		else if (name == 'ctl00$contentPlaceHolder$loginBox$txtPassword')
			return prefs.password;
		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'Users/ReLogin.aspx', params, addHeaders({Referer: baseurl + 'Users/ReLogin.aspx'}));
	
	if (!/signout\.aspx/i.test(html)) {
		var error = getParam(html, null, null, /Ошибка!([^>]*>){5}/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Авторизоваться не удалось/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Всего средств:([^>]*>){2}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'ostatok', /Остаток свободных средств на счёте([^>]*>){3}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'zayavki', /Заявки для зачисления на карты([^>]*>){3}/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}