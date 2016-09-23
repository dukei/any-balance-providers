
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 			'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset': 	'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 	'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 		'keep-alive',
	'User-Agent': 		'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.116 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl  = 'http://www.nordavia.ru/',
		loginurl = 'https://l3.nordavia.ru:8081/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'miles/lk/', g_headers);
	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestPost(loginurl + 'frame/login/', {
		todo: '',
		label_validate_error: '',
		username: prefs.login,
		password: prefs.password,
		capcha_num: '',
		'subm': 'Войти'
	}, AB.addHeaders({
		Referer: loginurl + 'frame/login/'
	}));

	if (!/logout/i.test(html)) {
		var error = AB.getParam(html, null, null, /<td[^>]+class="error"[^>]*>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /логин или пароль указаны неверно/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};

	AB.getParam(html, result, 'balance',  /<div[^>]+card[^>]*>(?:[\s\S]*?<div[^>]*>){3}([^<]*)/i,           AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'fio',      /<div[^>]+card[^>]*>(?:[\s\S]*?<div[^>]*>){1}([^<]*)/i, 			AB.replaceTagsAndSpaces);
	AB.getParam(html, result, '__tariff', /<div[^>]+card[^>]*>(?:[\s\S]*?<div[^>]*>){2}([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'number',   /<div[^>]+card[^>]*>(?:[\s\S]*?<div[^>]*>){2}([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}
