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
	var baseurl = 'http://stat.elite-line.net/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'webexecuter', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'user') 
			return prefs.login;
		else if (name == 'pswd')
			return prefs.password;
		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'webexecuter', params, addHeaders({Referer: baseurl + 'webexecuter'}));
	
	if (!/Выход/i.test(html)) {
		var error = getParam(html, null, null, /ОШИБКА:([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неправильный пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	html = AnyBalance.requestGet(baseurl + 'webexecuter?action=GetBalance', g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'outremain', /Исходящий остаток на конец месяца<\/td>\s*<td>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'remain', /Входящий остаток на начало месяца<\/td>\s*<td>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'income', /Приход за месяц \(всего\)<\/td>\s*<td>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'outcome', /Расход за месяц \(всего\)<\/td>\s*<td>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'nar', /Наработка за месяц \(всего\)<\/td>\s*<td>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'abom', /Абонплата<\/td>\s*<td>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}