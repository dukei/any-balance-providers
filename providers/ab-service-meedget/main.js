var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Encoding':'gzip, deflate, sdch',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://meedget.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.email, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'auth/login', {
		identity: prefs.email,
		password: prefs.password,
		login: 'Войти'
	}, addHeaders({Referer: baseurl}));
	
	
	var error = getParam(html, null, null, /"error":\"([\s\S]*?)\"/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
		throw new AnyBalance.Error(error);
	
	
	html = AnyBalance.requestGet(baseurl + 'admpanel/mymeedget', addHeaders({Referer: baseurl}));
	
	if (!/Выход/i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	getParam(html, result, 'balance', /Баланс:[^>]*<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'days', /Хватит ещё на ([\s\S]*?) дня/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}