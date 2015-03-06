/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.115 Safari/537.36'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://www.pinsforme.com/ru',
		requesturl = 'https://www.pinsforme.com/ru'
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestPost(requesturl + '/login', {
		redirect_url: 'http://www.pinsforme.com/ru',
		identity: prefs.login,
		password: prefs.password,
		'remember-pass': 'remember-pass',
		login: 'Войти'
	}, addHeaders({Referer: baseurl}));
	
	// Значения ставятся в куки в случае успешного запроса
	var user = AnyBalance.getCookie('user');
	
	if (!user) {
		var error = getParam(html, null, null, /<div[^>]+class="errors_wrap"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неправильный адрес эл. почты или пароль/i.test(error));

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	AnyBalance.trace('user:' + user);

	var json = getJson(decodeURIComponent(user));
	
	var result = {success: true};
	
	getParam(''+json.points, result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(''+json.first_name, result, 'name', null, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}