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
	var baseurl = 'https://server105.ibank.absolutbank.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'web_banking/protected/welcome.jsf', g_headers);
	html = AnyBalance.requestPost(baseurl + 'web_banking/fillLoginInfoAjaxServlet', {
		username: prefs.login,
	}, addHeaders({
		Referer: baseurl + 'web_banking/protected/welcome.jsf',
		'X-Requested-With': 'XMLHttpRequest'
	}));
	
	html = AnyBalance.requestPost(baseurl + 'web_banking/j_security_check', {
		j_username: prefs.login,
		j_password: prefs.password,
		'captcha': ''
	}, addHeaders({
		Referer: baseurl + 'web_banking/protected/welcome.jsf'
	}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error) throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(html));
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	if (prefs.type == 'card') 
		fetchCard(html, baseurl);
	else
		fetchAcc(html, baseurl); // Счета по умолчанию
}

function fetchAcc(html, baseurl) {
	var prefs = AnyBalance.getPreferences();
	
	html = AnyBalance.requestGet(baseurl + 'web_banking/protected/accounts/contracts.jsf', addHeaders({
		Referer: baseurl + 'web_banking/protected/cardsdocuments/index.jsf'
	}));
	
	var lastdigits = prefs.lastdigits || '\\d{4}';
	// <tr(?:[^>]*>){11}\d{14,}\d{4}(?:[^>]*>){10,11}
	var tr = getParam(html, null, null, new RegExp('<tr(?:[^>]*>){11}\\d{14,}' + lastdigits + '(?:[^>]*>){10,11}', 'i'));
	if (!tr)
		throw new AnyBalance.Error("Не удаётся найти " + (prefs.lastdigits ? 'счет с последними цифрами ' + prefs.lastdigits : 'ни одного счета'));
	
	var result = {success: true};
	
	getParam(tr, result, 'accname', /(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(tr, result, '__tariff', /(?:[^>]*>){10}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(result.__tariff, result, 'accnum');
	
	getParam(tr, result, 'balance', /(?:[^>]*>){14}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}

function fetchCard(html, baseurl) {
	var prefs = AnyBalance.getPreferences();
	
	// html = AnyBalance.requestGet(baseurl + 'web_banking/protected/cards/index.jsf', addHeaders({
		// Referer: baseurl + 'web_banking/protected/cardsdocuments/index.jsf'
	// }));
	
	html = AnyBalance.requestGet(baseurl + 'web_banking/protected/accounts/absolut_current_balance.jsf', addHeaders({
		Referer: baseurl + 'web_banking/protected/cardsdocuments/index.jsf'
	}));
	
	var lastdigits = prefs.lastdigits || '\\d{4}';
	// <tr(?:[^>]*>){11}\d{14,}6643(?:[^>]*>){30,80}\s*<\/tr>
	var tr = getParam(html, null, null, new RegExp('<tr(?:[^>]*>){11}\\d{14,}' + lastdigits + '(?:[^>]*>){30,80}\\s*</tr>', 'i'));
	if (!tr)
		throw new AnyBalance.Error("Не удаётся найти " + (prefs.lastdigits ? 'счет с последними цифрами ' + prefs.lastdigits : 'ни одного счета'));
	
	AnyBalance.trace(tr);
	
	var result = {success: true};
	
	getParam(tr, result, 'accname', /(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(tr, result, '__tariff', /\d{4}(?:(?:&nbsp;|\s)\*{4}){2}(?:&nbsp;|\s)\d{4}/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(tr, result, 'accnum', /(?:[^>]*>){10}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(result.__tariff, result, 'card_num');
	
	var params = createFormParams(tr);
	
	params = joinObjects(params, {
		'filter_SUBMIT': '1',
		'javax.faces.ViewState': getParam(html, null, null, /name="javax.faces.ViewState"[^>]*value="([^"]+)/i),
		'javax.faces.behavior.event': 'action',
		'javax.faces.partial.event': 'click',
		'javax.faces.source': 'getButton',
		'javax.faces.partial.ajax': 'true',
		'javax.faces.partial.execute': 'filter getButton',
		'javax.faces.partial.render': 'dateGrid globalErrors filterErrors FORM',
		'filter': 'filter'		
	});
	
	html = AnyBalance.requestPost(baseurl + 'web_banking/protected/accounts/absolut_current_balance.jsf', params, addHeaders({
		Referer: baseurl + 'web_banking/protected/welcome.jsf'
	}));
	
	getParam(html, result, 'balance', /&#1055;&#1083;&#1072;&#1090;&#1077;&#1078;&#1085;&#1099;&#1081; &#1083;&#1080;&#1084;&#1080;&#1090;(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', '__tariff'], /&#1055;&#1083;&#1072;&#1090;&#1077;&#1078;&#1085;&#1099;&#1081; &#1083;&#1080;&#1084;&#1080;&#1090;(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'limit', /&#1051;&#1080;&#1084;&#1080;&#1090; &#1082;&#1088;&#1077;&#1076;&#1080;&#1090;&#1086;&#1074;&#1072;&#1085;&#1080;&#1103;:(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);	
	
	
}