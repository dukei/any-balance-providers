/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	// Mobile
	//'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+',
	// Desktop
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.mediamarkt.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'user/cards', g_headers);

	var csrf = getParam(html, null, null, /<meta[^>]+name="csrf-token"[^>]*content="([^"]*)/i, null, html_entity_decode);

	if(!html || AnyBalance.getLastStatusCode() > 400 || csrf == ""){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'login')
			return prefs.login;
		else if (name == 'password')
			return prefs.password;

		return value;
	});

	html = AnyBalance.requestPost(baseurl + 'user/authenticate', {
		login: prefs.login,
		password: prefs.password,
		remember_me: false,
		_token: csrf
	}, addHeaders({Referer: baseurl}));

	json = getJson(html);

	if (!json.success) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};

	result.fio = json.user.name + ' ' +  json.user.surname;
	result.phone = json.user.mobile_phone

	html = getJson(AnyBalance.requestPost(baseurl + 'ajax/crm_get_user', {
		_token: csrf
	}, addHeaders({Referer: baseurl}))).html;

	getParam(html, result, 'balance', /<a href="#" class="link border-dotted">([\s\S]*?)&nbsp;баллов<\/a>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'available', /Можно потратить: <b>([\s\S]*?)&nbsp;баллов<\/b>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'inactive', /Неактивных: <b>([\s\S]*?)&nbsp;баллов<\/b>/i, replaceTagsAndSpaces, parseBalance);

	AnyBalance.setResult(result);
}
