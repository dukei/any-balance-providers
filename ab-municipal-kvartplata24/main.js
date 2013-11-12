/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://lk.kvp24.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'lk/login.jsp', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'lk/j_spring_security_check', {
		j_username: prefs.login,
		j_password: prefs.password,
		'_spring_security_remember_me': 'on'
	}, addHeaders({Referer: baseurl + 'lk/login.jsp'}));

	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error) throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var year = new Date().getFullYear();
	var p = {
		year: "2013"
	};
	
	html = AnyBalance.requestPost(baseurl + 'lk/payment/getDataByYear', JSON.stringify(p), addHeaders( {
		Referer: baseurl + 'lk/payment',
		Accept:'*/*',
		'X-Requested-With':'XMLHttpRequest',		
	}));
	
	var paymentsJson = getJson(html);
	var lastPayment = paymentsJson[paymentsJson.length-1];
	
	var result = {success: true};
	
	getParam(lastPayment.totalAmount+'', result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(lastPayment.date+'', result, 'date', null, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}