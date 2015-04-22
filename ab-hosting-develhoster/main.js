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
	var baseurl = 'https://bill.develhoster.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'billmgr', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var binary = getParam(html, null, null, /var binary = "([^"]+)/i);

	AnyBalance.setCookie('bill.develhoster.ru', 'billmgr4', 'sirius:ru:0');
	
	html = AnyBalance.requestPost(baseurl + 'billmgr', {
		username: prefs.login,
		password: prefs.password,
		theme: 'sirius',
		lang: 'ru',
		func: 'auth',
		project: '',
		welcomfunc: '',
 		welcomparam: ''
	}, addHeaders({Referer: baseurl + 'billmgr'}));

	var name = binary.substr(binary.lastIndexOf('/') + 1) + '4';
	var value = getParam(html, null, null, /binary\.substr\(binary\.lastIndexOf\('\/'\)\+1\)\+'4=([^;]+)/i);
	AnyBalance.setCookie('bill.develhoster.ru', name, value);

	html = AnyBalance.requestGet(baseurl + 'billmgr?dashboard=accountinfo&func=accountinfo', g_headers);
	
	if (!/Пополнить счет/i.test(html)) {
		var error = getParam(html, null, null, /<td[^>]+class="login-error-content"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var accTable = getParam(html, null, null, /<tbody[^>]*class="mainBody"[^>]*>([^]*?)<\/tbody>/i);
	if(!accTable){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не найдена таблица со счетами');
	}

	var account = getParam(accTable, null, null, new RegExp('<tr[^>]*>\\s*<td[^>]*>\\s*<div>' + (prefs.num || '\\d{4}') + '[^]*?<\\/tr>', 'i'));
	if(!account)
		throw new AnyBalance.Error('Не найден ' + (prefs.num ? 'счет с кодом ' + prefs.num : 'ни один счет'));

	var result = {success: true};
	
	getParam(account, result, 'code', /<td[^>]*>[^]*?<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(account, result, 'name', /(?:<td[^>]*>[^]*?<\/td>\s*){1}(<td[^>]*>[^]*?<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(account, result, 'balance', /(?:<td[^>]*>[^]*?<\/td>\s*){2}(<td[^>]*>[^]*?<\/td>)/i, replaceTagsAndSpaces, parseBalance);
	getParam(account, result, 'remain', /(?:<td[^>]*>[^]*?<\/td>\s*){4}(<td[^>]*>[^]*?<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);

	AnyBalance.setResult(result);
}