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
	var baseurl = 'https://banking.pivdenny.com/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'fiz/signin', g_headers);

	var tform = getParam(html, null, null, /([^"]*)"\s*name="t:formdata"/i, null, html_entity_decode);
	if (!tform)
		throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');

	html = AnyBalance.requestPost(baseurl + 'fiz/ru/signin.loginform', {
		't:formdata': tform,
		login: prefs.login,
		password: prefs.password,
	}, addHeaders({Referer: baseurl + 'fiz/signin'}));

	if (!/home\.bslayout\.logout/i.test(html)) {
		var error = getParam(html, null, null, /(Ошибка авторизации(?:[^>]*>){3}[^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		if (error && /Неверный логин или пароль/i.test(error))
			throw new AnyBalance.Error(error, null, true);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	html = AnyBalance.requestGet(baseurl + 'fiz/ru/accountslist', addHeaders({Referer: baseurl + 'fiz/ru/home'}));
	
	var cardNum = prefs.card_num || '\\d{10,16}';
	var trRegExp = new RegExp('(<tr\\s*class=\\"acc(?:[^>]*>){3}[^<]*'+cardNum+'[\\s\\S]*?</tr>)', 'i');
	var tr = getParam(html, null, null, trRegExp);
	
	if(!tr)
		throw new AnyBalance.Error('Не удалось найти ' + (prefs.card_num ? 'счет с последними цифрами ' + prefs.card_num : 'ни одного счета!'));

	var result = {success: true};
	
	getParam(html, result, 'fio', /Добро пожаловать,(?:[^>]*>){1}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);		
	getParam(tr, result, 'card_number', /(?:[\s\S]*?<[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(tr, result, '__tariff', /(?:[\s\S]*?<[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(tr, result, 'dogovor', /(?:[\s\S]*?<[^>]*>){6}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(tr, result, 'acc_name', /(?:[\s\S]*?<[^>]*>){8}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(tr, result, 'balance', /(?:[\s\S]*?<[^>]*>){10}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(tr, result, ['currency', 'balance'], /(?:[\s\S]*?<[^>]*>){14}([^<]*)/i, replaceTagsAndSpaces);
	
	AnyBalance.setResult(result);
}