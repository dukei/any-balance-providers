/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
	'X-Requested-With':'XMLHttpRequest',
	
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://killfish.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'my.html', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'ajax.php', {
		'action': 'user.login',
		num: prefs.login,
		code: prefs.password,
		type: 'my'
	}, addHeaders({Referer: baseurl + 'login'}));
	
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