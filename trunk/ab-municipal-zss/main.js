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
	var baseurl = 'https://opl.zss.zp.ua/cgi-bin/cps.cgi';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	checkEmpty(prefs.usluga, 'Введите название услуги!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	html = AnyBalance.requestPost(baseurl, {
		email: prefs.login,
		passw: prefs.password,
		'act': 'login',
		'req_fields': 'email = Email, passw = пароль',
	}, addHeaders({Referer: baseurl}));
	
	if (!/act=logout/i.test(html)) {
		var error = getParam(html, null, null, [/На данной странице произошли ошибки!<\/center>([^>]*>){2}/i, /На данной странице произошли ошибки![\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul/i], replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /неправильный адрес электронной почты|Неправильные логин\/пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var service = getParam(html, null, null, new RegExp('<tr>\\s*<td[^>]*>\\s*'+prefs.usluga+'(?:[^>]*>){17}\\s*</tr>', 'i'));
	if(!service) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти услугу. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(service, result, 'name', /([^>]*>){3}/i, replaceTagsAndSpaces, html_entity_decode);
	//Долг/переплата
	getParam(service, result, 'balance', /([^>]*>){9}/i, replaceTagsAndSpaces, parseBalance);
	// Начислено
	getParam(service, result, 'nachisleno', /([^>]*>){11}/i, replaceTagsAndSpaces, parseBalance);
	// Оплачено в тек. мес.
	getParam(service, result, 'oplacheno', /([^>]*>){13}/i, replaceTagsAndSpaces, parseBalance);
	// Сумма к оплате, грн.
	getParam(service, result, 'koplate', /([^>]*>){15}/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}