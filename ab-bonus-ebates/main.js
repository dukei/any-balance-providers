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
	var baseurl = 'https://www.ebates.com/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'auth/logon.do', g_headers);
	
	try {
		html = AnyBalance.requestPost(baseurl + 'auth/logon.do', {
			username: prefs.login,
			password: prefs.password,
			'urlIdentifier': '/auth/getLogonForm.do?pageName=/common_templates/login.vm',
			'terms':'checked',
		}, addHeaders({Referer: baseurl + 'auth/logon.do'}));
	}catch(e) {
	}
	
	html = AnyBalance.requestGet('http://www.ebates.com/index.do', g_headers);
	
	if (!/>Log Out</i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestPost('http://www.ebates.com/account-info.htm', {}, addHeaders({
		Referer: 'http://www.ebates.com/index.do',
		'X-Requested-With':'XMLHttpRequest'
	}));
	
	var result = {success: true};
	
	getParam(html, result, 'fio', /EbatesMember\s*"\s*:\s*"([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'CashPaid', /CashPaid\s*"\s*:\s*"([^"]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'CashPending', /CashPending\s*"\s*:\s*"([^"]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'TotalCashBack', /TotalCashBack\s*"\s*:\s*"([^"]*)/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}