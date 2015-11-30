/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var baseurl = "http://issa.podryad.tv/";
	AnyBalance.setDefaultCharset('utf-8');
	
	var html = AnyBalance.requestPost(baseurl + 'webexecuter', {
		user: prefs.login,
		pswd: prefs.password
	}, addHeaders({Referer: baseurl + 'webexecuter'}));
	
	if (!/\?action=Exit/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+id="idDiv"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error);
		
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var href = getParam(html, null, null, /href="(\?action=ShowBalance[^"]+)/i, replaceTagsAndSpaces, html_entity_decode);
	html = AnyBalance.requestGet(baseurl + 'webexecuter' + href, '', g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Входящий остаток на начало месяца<\/td><td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'coming', /Приход за месяц \(всего\)<\/td><td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'consumption', /Расход за месяц \(всего\)<\/td><td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'working', /Наработка за месяц \(всего\)<\/td><td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	// getParam(html, result, 'licenseFee', /Абонентская плата<\/td><td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'outgoing', /Исходящий остаток на конец месяца<\/td><td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'limit', /Лимит<\/td><td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}