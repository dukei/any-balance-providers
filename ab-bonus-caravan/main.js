/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
	//'X-Requested-With':'XMLHttpRequest',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://kiev-s-sosninykh.icaravan.com.ua/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl, g_headers);

	html = AnyBalance.requestPost(baseurl + '__login-password', {
		card: prefs.login,
		password: prefs.password,
	}, addHeaders({Referer: baseurl}));

	if (!/"ok":1/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error && /Неверный логин или пароль/i.test(error))
			throw new AnyBalance.Error(error, null, true);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	var client = getParam(html, null, null, /"str"\s*:\s*"([^"]*)/i);
	if(!client)
		throw new AnyBalance.Error('Не удалось найти форму входа, свяжитесь с разработчиком.');
		
	AnyBalance.setCookie('kiev-s-sosninykh.icaravan.com.ua', 'client', encodeURIComponent(client));

	//html = AnyBalance.requestGet(baseurl + 'profile.html', addHeaders({Referer: baseurl}));
	
	html = AnyBalance.requestGet(baseurl + 'profile/my.html', g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /<h1>Мои баллы(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balance_money', /<h1>Мои баллы(?:[^>]*>){4}([^<]*)/i, replaceTagsAndSpaces, parseBalance);

	AnyBalance.setResult(result);
}