/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'Origin':'https://my.ispserver.com/',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://my.ispserver.com/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'manager/billmgr?startpage=accountinfo', g_headers);
	
	AnyBalance.setCookie('my.ispserver.com', 'billmgr4', 'sirius:ru:0');
	
	html = AnyBalance.requestPost(baseurl + 'manager/billmgr', {
		username:prefs.login,
		password:prefs.password,
		theme:'sirius',
		lang:'ru',
		func:'auth',
		project:'',
		welcomfunc:'',
		welcomparam:'',
	}, addHeaders({Referer: baseurl + 'manager/billmgr?startpage=accountinfo'}));
	
	var cookie = getParam(html, null, null, /(sirius:ru:\d+)/);
	AnyBalance.setCookie('my.ispserver.com', 'billmgr4', cookie);
	
	html = AnyBalance.requestGet(baseurl + 'manager/billmgr', addHeaders({Referer: baseurl + 'manager/billmgr'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /"login-error-title"[^>]*>([\s\S]*?)<\/tr/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + '/manager/billmgr?func=accountinfo&clickstat=yes', addHeaders({Referer: baseurl + 'manager/billmgr'}));
	
	var result = {success: true};
	
	var accounToFind = prefs.account || '\\d+';
	var account = getParam(html, null, null, new RegExp('(>'+accounToFind+'</div(?:[^>]*>){16,20})\\s*</tr>', 'i'));
	if(!account)
		throw new AnyBalance.Error('Не удалось найти ' + (prefs.account ? 'счет с номером ' + prefs.account : 'ни одного счета.'));
	
	AnyBalance.trace(account);
	
	getParam(account, result, 'acc_num', />(\d+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(account, result, 'acc_name', /<div>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(account, result, 'balance', /([\s\S]*?<div>[^<]+){2}/i, replaceTagsAndSpaces, parseBalance);
	getParam(account, result, 'avail_till', /([\s\S]*?<div>[^<]+){4}/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}