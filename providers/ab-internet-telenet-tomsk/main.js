/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.115 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://telenet.tomsk.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'auth/login', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var params = {
		'LoginForm[username]': prefs.login,
		'LoginForm[password]': prefs.password,
		'LoginForm[rememberMe]': 0,
		ajax: 'login-form-index',
		yt0: ''
	};
	
	var res = AnyBalance.requestPost(baseurl + 'auth/login', params, addHeaders({
		Referer: baseurl + 'auth/login',
		Accept: 'application/json, text/javascript, */*; q=0.01',
		'X-Requested-With': 'XMLHttpRequest'
	}));

	var json = getJson(res),
		error = json.LoginForm_password;

	if(error && isArray(error) && error.length !== 0)
		throw new AnyBalance.Error(error.join('. '), null, /Логин или пароль неверны/i.test(error));
	
	delete params.ajax;
	html = AnyBalance.requestPost(baseurl + 'auth/login', params, addHeaders({
		Referer: baseurl + 'auth/login'
	}));

	if (!/logout/i.test(html))
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Баланс:[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', 'balance'], /Баланс:[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'fio', /head_okno[^>]+>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'agreement', /Договор:[^>]+>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'account', /Счет:[^>]+>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}