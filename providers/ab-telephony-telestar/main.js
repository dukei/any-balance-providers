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
	var baseurl = 'http://tlstar.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestPost(baseurl + 'personal/', {
		login:prefs.login,
		password:prefs.password,
		cmd:'login'
	}, addHeaders({
		Referer: baseurl
	}));

	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<p[^>]+class="error"[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Логин или пароль неверны/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};

	if(isAvailable('balance')) {
		html = AnyBalance.requestGet(baseurl+'personal/?op=payments', g_headers);
		getParam(html, result, 'balance', /Ваш текущий баланс:([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
	}

	if(isAvailable(['telNumber', 'fio', 'cost', 'debt', 'discount'])) {
		var href = getParam(html, null, null, /<div[^>]+class="personal-menu-title">Личный кабинет(?:[\s\S]*?<li[^>]*>){3}<a[^>]+href="([\s\S]*?)"/i);
		if(!href)
			AnyBalance.trace('Не удалось найти ссылку на квитанцию. Сайт изменен?');
		else {
			html = AnyBalance.requestGet(baseurl + href, g_headers);
			getParam(html, result, 'telNumber', /Тел\.([\s\S]*?)фио/i, replaceTagsAndSpaces);
			getParam(html, result, 'fio', /ФИО:([\s\S]*?)<br/i, replaceTagsAndSpaces);
			getParam(html, result, 'debt', /Задолженность за прошедший период(?:[^>]*>){5}([\s\S]*?)<br/i, replaceTagsAndSpaces, parseBalance);
			getParam(html, result, 'cost', /Абонентская плата(?:[^>]*>){5}([\s\S]*?)<br/i, replaceTagsAndSpaces, parseBalance);
			getParam(html, result, 'discount', /Скидка(?:[^>]*>){5}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
		}
	}

	AnyBalance.setResult(result);
}