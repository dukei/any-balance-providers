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
	var baseurl = 'https://passport.dx.com/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'accounts/default.dx?redirect=http%3A%2F%2Fdx.com%2F', g_headers);

	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'ctl00$content$txtLoginEmail') 
			return prefs.login;
		else if (name == 'ctl00$content$txtPassword')
			return prefs.password;

		return value;
	});

	html = AnyBalance.requestPost(baseurl + 'accounts/default.dx?redirect=http%3A%2F%2Fdx.com%2F', params, addHeaders({Referer: baseurl + 'accounts/default.dx?redirect=http%3A%2F%2Fdx.com%2F'}));

	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error && /Неверный логин или пароль/i.test(error))
			throw new AnyBalance.Error(error, null, true);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet('https://my.dx.com/', g_headers);

	var result = {success: true};
	
	getParam(html, result, 'points', /DX Points:([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	
	var firstTr = getParam(html, null, null, /<tr class="(?:on|)">(?:[^>]+>){10,15}\s*<\/tr>/i);
	if(firstTr) {
		getParam(html, result, 'order_num', /<tr\s*class="(?:on|)">(?:[^>]+>){2}\s*(\d{10,})/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, 'order_date', /<tr\s*class="(?:on|)">(?:[^>]+>){5}([\s\S]*?)<\/td/i, replaceTagsAndSpaces, parseDate);
		getParam(html, result, 'order_sum', /<tr\s*class="(?:on|)">(?:[^>]+>){7}([\s\S]*?)<\/td/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'order_status', /<tr\s*class="(?:on|)">(?:[^>]+>){9}([\s\S]*?)<\/td/i, replaceTagsAndSpaces, html_entity_decode);
	} else {
		AnyBalance.trace('Нет ни одного заказа или сайт изменен.');
	}
	
	AnyBalance.setResult(result);
}