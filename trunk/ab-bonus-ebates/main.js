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
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Enter login!');
	checkEmpty(prefs.password, 'Enter password!');
	
	if(prefs.cabinet == 'ru')
		doRu('https://www.ebates.ru/', prefs);
	else
		doCom('https://www.ebates.com/', prefs);
}

function doCom(baseurl, prefs) {
	var html = AnyBalance.requestGet(baseurl + 'auth/logon.do', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'auth/logon.do', {
		username: prefs.login,
		password: prefs.password,
		'urlIdentifier': '/auth/getLogonForm.do?pageName=/common_templates/login.vm',
		'terms':'checked',
	}, addHeaders({Referer: baseurl + 'auth/logon.do'}));	
	
	if (!/>(?:Log|Sign) Out</i.test(html)) {
		var error = getParam(html, null, null, /class="error"[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /is incorrect/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Login attempt has failed. Maybe site has been changed?');
	}
	
	html = AnyBalance.requestPost('http://www.ebates.com/account-info.htm', {}, addHeaders({
		Referer: 'http://www.ebates.com/index.do',
		'X-Requested-With':'XMLHttpRequest'
	}));
	
	var json = getJson(html);
	
	var result = {success: true};
	
	getParam(json.EbatesMember + '', result, 'fio', null, replaceTagsAndSpaces, html_entity_decode);
	getParam(json.CashPaid + '', result, 'CashPaid', null, replaceTagsAndSpaces, parseBalance);
	getParam(json.CashPending + '', result, 'CashPending', null, replaceTagsAndSpaces, parseBalance);
	getParam(json.TotalCashBack + '', result, 'TotalCashBack', null, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}

function doRu(baseurl, prefs) {
	var html = AnyBalance.requestGet(baseurl + 'login', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'login/verify', {
		'fe_member_uname': prefs.login,
		'fe_member_pw': prefs.password,
		'fe_member_remember_me':false,
		'accessDeninedTargetUrl':'',
		'signin':'Log In',
	}, addHeaders({Referer: baseurl + 'login'}));	
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /class="error"[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /is incorrect/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Login attempt has failed. Maybe site has been changed?');
	}
	
	html = AnyBalance.requestGet(baseurl + 'member/dashboard', g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'fio', /Пользователь Ebates:(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'CashPaid', /Выплаченная сумма:(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'CashPending', /Невыплаченная сумма:(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'TotalCashBack', /Общая сумма кэшбек:(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}