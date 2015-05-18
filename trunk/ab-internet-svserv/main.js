/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/javascript, application/javascript, */*',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://ssbilling.svserv.net:8081/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'seaside/stat', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');

	var _s = getParam(html, null, null, /_s=([^&';]+)/i);
	var _k = getParam(html, null, null, /_k=([^&';]+)/i);
	
	html = AnyBalance.requestGet(baseurl + 'seaside/stat?_s=' + _s + '&_k=' + _k + '&2&1=' + prefs.login, addHeaders({'X-Requested-With': 'XMLHttpRequest'}));
	
	html = AnyBalance.requestGet(baseurl + 'seaside/stat?_s=' + _s + '&_k=' + _k + '&3', addHeaders({'X-Requested-With': 'XMLHttpRequest'}));
	
	html = AnyBalance.requestGet(baseurl + 'seaside/stat?_s=' + _s + '&_k=' + _k + '&4=' + prefs.password, addHeaders({'X-Requested-With': 'XMLHttpRequest'}));
	
	html = AnyBalance.requestGet(baseurl + 'seaside/stat?_s=' + _s + '&_k=' + _k + '&7', addHeaders({'X-Requested-With': 'XMLHttpRequest'}));
	
	if (!/>\s*Выход\s*</i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Остаток на счете([\s\S]*?)<\/span/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'agreement', /Договор([\s\d№]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /Тарифный план(?:[^>]*>){3}([\s\S]*?)<\//i, [replaceTagsAndSpaces, /\\"/g, ''], html_entity_decode);
	
	AnyBalance.setResult(result);
}