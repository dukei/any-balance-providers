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
	var baseurl = 'http://www.liktv.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'component/users/?view=login', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var loginForm = getParam(html, null, null, /<form[^>]+action="\/component\/users\/\?task=user\.login"[^>]*>[^]+?<\/form>/i);
	if(!loginForm)
		throw new AnyBalance.Error('Не найдена форма входа. Сайт изменен?');

	var params = createFormParams(loginForm, function(params, str, name, value) {
		if (name == 'username') 
			return prefs.login;
		else if (name == 'password')
			return prefs.password;

		return value;
	});

	html = AnyBalance.requestPost(baseurl + 'component/users/?task=user.login', params, addHeaders({Referer: baseurl + 'component/users/?view=login'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<dd[^>]+class=['"]error message['"][^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Имя пользователя и пароль не совпадают/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	html = AnyBalance.requestGet(baseurl + 'component/cabinet', g_headers);

	var accounts = getParam(html, null, null, /<table[^>]+class=['"]accounts['"][^>]*>[^]+?<\/table>/i);
	if(!accounts)
		throw new AnyBalance.Error('Не найдена таблица с лицевыми счетами. Сайт изменен?');

	var account = getParam(accounts, null, null, new RegExp('<tr[^>]+class=[\'"]odd[\'"][^>]*>\\s*<td[^>]*>\\s*' + (prefs.num || '') + '[^]+?<\/tr>', 'i'));
	if(!account)
		throw new AnyBalance.Error('Не найден ' + (prefs.num ? 'лицевой счет ' + prefs.num : 'ни один лицевой счет'));

	var result = {success: true};

	getParam(account, result, 'balance', /(?:<td[^>]*>[^]*?<\/td>\s*){2}(<td[^>]*>[^]*?<\/td>)/i, replaceTagsAndSpaces, parseBalance);
	getParam(account, result, 'account', /<td[^>]*>[^]*?<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(account, result, '__tariff', /(?:<td[^>]*>[^]*?<\/td>\s*){1}(<td[^>]*>[^]*?<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}