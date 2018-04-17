/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.80 Safari/537.36'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://billing.portf.ru/cabinet/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl+'Account/Login', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl+'Account/Login', {
		UserName: prefs.login,
		Password: prefs.password,
		'RememberMe': 'false'
	}, addHeaders({Referer: baseurl+'Account/Login'}));
	
	if (!/logoff/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="validation-summary-errors"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверное имя пользователя или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};

	getParam(html, result, 'balance', /<h1[^>]+class="balance"[^>]*>([\s\S]*?)<\/h1>/i, replaceTagsAndSpaces, parseBalance);

	if(isAvailable(['fio', 'school', 'class', 'acc_num'])) {
		html = AnyBalance.requestGet(baseurl+'Home/GetMainPartial', g_headers);
		getParam(html, result, 'fio', /<table[^>]+class="account-info"[^>]*>(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
		getParam(html, result, 'school', /<table[^>]+class="account-info"[^>]*>(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
		getParam(html, result, 'class', /<table[^>]+class="account-info"[^>]*>(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
		getParam(html, result, 'acc_num', /<table[^>]+class="account-info"[^>]*>(?:[\s\S]*?<td[^>]*>){8}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	}
	AnyBalance.setResult(result);
}