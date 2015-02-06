/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/33.0.1750.146 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://lk.ttk.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login && /^\d{9}$/.test(prefs.login), 'Логин должен состоять только из девяти цифр!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'po/LoginForm.jsp', g_headers);
	
	html = AnyBalance.requestGet(baseurl + 'po/accounts?account=' + prefs.login, g_headers);
	
	var j_username = getParam(html, null, null, /"value(?:[^"]*"){2}([^"]+)"/i, replaceTagsAndSpaces, html_entity_decode);
	checkEmpty(j_username, 'Не удалось найти id пользователя с номером счета ' + prefs.login);
	
	html = AnyBalance.requestPost(baseurl + 'po/LoginSSO', {
		'username':prefs.login,
		'j_username':j_username,
		'j_password':prefs.password,
		'loginSource':'form'
	}, addHeaders({Referer: baseurl + 'po/LoginForm.jsp'}));
	
	html = AnyBalance.requestGet(baseurl + 'po/index.jsf', g_headers);
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	// Вошли, там может быть и несколько счетов, но пока нет доступа к такому кабинету, сделаем пока с одним
	var result = {success: true};
	
	html = AnyBalance.requestGet(baseurl + 'po/rest/client/accounts/', g_headers);
	
	var json = getJson(html);
	
	// возвращается массив со счетами, можно потом сделать поддержку нескольких счетов
	var currAcc = json[0];
	
	getParam(currAcc.accountNumber + '', result, '__tariff', null, replaceTagsAndSpaces, html_entity_decode);
	getParam(currAcc.accountNumber + '', result, 'account', null, replaceTagsAndSpaces, html_entity_decode);
	getParam(currAcc.accountBalance + '', result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	
	if(isAvailable('fio')) {
		html = AnyBalance.requestGet(baseurl + 'po/rest/client/info/', g_headers);
		
		json = getJson(html);

		getParam(json.firstName + ' ' + json.lastName, result, 'fio', /"user-panel_button([^>]*>){2}/i, replaceTagsAndSpaces, html_entity_decode);
	}
	AnyBalance.setResult(result);
}