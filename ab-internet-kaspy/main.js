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
	var baseurl = 'http://176.97.164.9:8080/';
	AnyBalance.setDefaultCharset('windows-1251');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'bgbilling/webexecuter', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'bgbilling/webexecuter', {
		midAuth: 0,
		user: prefs.login,
		pswd: prefs.password
	}, addHeaders({Referer: baseurl + 'bgbilling/webexecuter'}));
	
	if (!/Выход/i.test(html)) {
		var error = getParam(html, null, null, /<h2>ОШИБКА:([\s\S]*?)<\/h2>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Договор не найден|Неправильный пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	html = AnyBalance.requestGet(baseurl + 'bgbilling/webexecuter?action=ShowBalance&mid=contract', g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'balanceInitial', /Входящий остаток на начало месяца\s*?([\s\S]*?<\/td>)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'income', /Приход за месяц \(всего\)\s*?([\s\S]*?<\/td>)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'outcome', /Расход за месяц \(всего\)\s*?([\s\S]*?<\/td>)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'accumulation', /Наработка за месяц \(всего\)\s*?([\s\S]*?<\/td>)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'licenseFee', /Абонплата\s*?([\s\S]*?<\/td>)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balanceFinal', /Исходящий остаток на конец месяца\s*?([\s\S]*?<\/td>)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'limit', /Лимит\s*?<\/th>([\s\S]*?<\/td>)/i, replaceTagsAndSpaces, parseBalance);

	AnyBalance.setResult(result);
}