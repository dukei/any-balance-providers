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
	var baseurl = 'https://lk.ttk.ru';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login && /^\d{9}$/.test(prefs.login), 'Логин должен состоять только из девяти цифр!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + '/po/login.jsf', g_headers);
	
	html = AnyBalance.requestGet(baseurl + '/po/accounts?account=' + prefs.login, g_headers);
	
	var j_username = getParam(html, null, null, /"value(?:[^"]*"){2}([^"]+)"/i, replaceTagsAndSpaces);
	checkEmpty(j_username, 'Не удалось найти id пользователя с номером счета ' + prefs.login);
	
	html = AnyBalance.requestPost(baseurl + '/po/login', {
		redirect: '',
		'username':prefs.login,
		'j_username':j_username,
		'password':prefs.password,
		'loginSource':'form'
	}, addHeaders({Origin: baseurl, Referer: baseurl + 'po/login.jsf'}));

	if(/failed=true/i.test(AnyBalance.getLastUrl())){
		var error = getElement(html, /<em[^>]+id="[^"]*error(?:[^>](?!display:\s*none))*>/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверн/i.test(error));

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');

	}
	
	// Вошли, там может быть и несколько счетов, но пока нет доступа к такому кабинету, сделаем пока с одним
	var result = {success: true};
	
	html = AnyBalance.requestGet(baseurl + '/po/rest/client/accounts/', g_headers);
	
	var json = getJson(html);
	
	// возвращается массив со счетами, можно потом сделать поддержку нескольких счетов
	var currAcc;
	for(var i=0; i<json.length; ++i){
		currAcc = json[i];
		if(currAcc.accountNumber == prefs.login)
			break;
	}

	if(!currAcc) {
		AnyBalance.trace("Не удалось найти счет " + prefs.login + ", возьмем первый счет");
		currAcc = json[0];
	}

	if(!currAcc) {
		throw new AnyBalance.Error("Не удалось найти ни одного счета. Сайт изменен?"); 
	}

	getParam(currAcc.accountNumber + '', result, '__tariff', null, replaceTagsAndSpaces);
	getParam(currAcc.accountNumber + '', result, 'account', null, replaceTagsAndSpaces);
	getParam(currAcc.accountBalance && Math.round(currAcc.accountBalance * 100)/100, result, 'balance');
	
	if(isAvailable('fio')) {
		html = AnyBalance.requestGet(baseurl + '/po/rest/client/info/', g_headers);
		
		json = getJson(html);

		getParam(json.firstName + ' ' + json.lastName, result, 'fio', null, replaceTagsAndSpaces);
	}
	AnyBalance.setResult(result);
}