/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'application/json, text/javascript, */*; q=0.01',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru,en;q=0.8',
	'Connection': 'keep-alive',
	'Origin': 'https://killfish.ru',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36',
	'X-Requested-With':'XMLHttpRequest',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://killfish.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'my.html?type=login', g_headers);
	
	var token = getParam(html, null, null, /"token"[^>]*value="([^"]+)/i);
	if(!token)
		throw new AnyBalance.Error('Не удалось найти токен авторизации!');
	
	html = AnyBalance.requestPost(baseurl + 'ajax.php', {
		'action': 'user.login',
		num: prefs.login,
		code: prefs.password,
		type: ''
	}, addHeaders({
		Referer: baseurl + 'my.html?type=login',
		'X-Csrf-Token':token,
	}));
	
	if (!/"ok":true/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + 'my.html', g_headers);
	
	var result = {success: true};
	getParam(html, result, 'balance', /На вашей карте(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', 'balance', 'total'], /На вашей карте(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'friends', /Вы привели к нам друзей(?:[^>]*>){1}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'total', /Всего Вы получили бонусных зачислений на сумму:(?:[^>]*>){1}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}