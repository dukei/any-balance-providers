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
	// var baseurl = 'https://csc.telenor.me/CURWeb/Login.aspx?appId=67a1cbac-40c2-46e3-a8b6-9973f5c166f8&rurl=https%3a%2f%2fcsc.telenor.me';
	var baseurl = 'https://www.telenor.me/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html =  AnyBalance.requestGet(baseurl + 'nalog/', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestPost(baseurl + 'nalog/?c=Login&a=login', {
		email: prefs.login,
		password: prefs.password,
	}, addHeaders({Referer: baseurl + 'nalog/'}));

	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<li[^>]+class="error"[^>]*>([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Pogrešna e-mail adresa ili lozinka/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	html = AnyBalance.requestGet(baseurl + 'mojtelenor/?q=Login/logme/', g_headers);

	var result = {success: true};
	
	getParam(html, result, '__tariff', /Tarifni paket<\/h2>[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /preostaloKredita-cena[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'deadline', /serviceExpiryDate[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseDate);
	
	AnyBalance.setResult(result);
	
	// var html = AnyBalance.requestGet(baseurl, g_headers);
	
	// var params = createFormParams(html, function(params, str, name, value) {
	// 	if (name == 'txtUsername') 
	// 		return prefs.login;
	// 	else if (name == 'txtPassword')
	// 		return prefs.password;

	// 	return value;
	// });
	
	// html = AnyBalance.requestPost(baseurl, {
	// 	'__VIEWSTATE':getParam(html, null, null, /"__VIEWSTATE"[^>]*value="([^"]+)/i),
	// 	'txtUsername':prefs.login,
	// 	'txtPassword':prefs.password,
	// 	'btnSubmit.x':'14',
	// 	'btnSubmit.y':'10',
	// }, addHeaders({Referer: baseurl}));
	
	// if (!/logout/i.test(html)) {
	// 	var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
	// 	if (error)
	// 		throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
	// 	AnyBalance.trace(html);
	// 	throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	// }
	
	// html = AnyBalance.requestGet('https://csc.telenor.me/DataPackage2.aspx', g_headers);
	
	// var result = {success: true};
	
	// getParam(html, result, 'balance', /Trenutno stanje na Vašem prepaid računu je:(?:[^>]*>){4}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	// getParam(html, result, ['currency', 'balance'], /Trenutno stanje na Vašem prepaid računu je:(?:[^>]*>){4}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseCurrency);
	// getParam(html, result, 'deadline', /Vaš prepaid račun, ukoliko ga u medjuvremenu ne dopunite, ističe:(?:[^>]*>){4}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDate);
	
	// AnyBalance.setResult(result);
}