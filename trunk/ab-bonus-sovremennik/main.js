/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2272.101 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://sovremennik.info/',
		cabineturl = 'https://auth.motmom.com/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'oauth2/mo/init', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	html = AnyBalance.requestPost(cabineturl + 'oauth2/authorize', {
		'request_id': getParam(html, null, null, /"request_id"[^>]*value="([^"]+)/i),
		'login': prefs.login,
		'password': prefs.password,
		'allow': ''
	}, addHeaders({Referer: AnyBalance.getLastUrl()}));

	var error = getParam(html, null, null, /<span[^>]+class="error-message"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
	if(error)
		throw new AnyBalance.Error(error, null, /Ошибочная комбинация логина и пароля/i.test(error));

	var redirectURL = getParam(html, null, null, /<meta http-equiv="Refresh"[^>]*?URL=([^"]+)/i);
	if(redirectURL)
		html = AnyBalance.requestGet(redirectURL.replace(/&amp;/g, '&'), addHeaders({Referer: cabineturl + 'message'}));
	
	if (!/logout/i.test(html)) {
		error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var cabinet = getParam(html, null, null, /href="\/(cabinet\/\d+)"/i);
	checkEmpty(cabinet, 'Не удалось найти ссылку на личный кабинет, сайт изменен?');

	html = AnyBalance.requestPost(baseurl + cabinet, '', addHeaders({Referer: baseurl, 'X-Requested-With': 'XMLHttpRequest'}));
	
	try {
		html = getJson(html)[0].data.html;
		AnyBalance.trace(html);
	} catch(e) {
		throw new AnyBalance.Error('Не удалось получить данные пользователя. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', [/<td>([^<]+)(?:[^>]*>){2}\s*(?:балла|баланс)/i, /Баллы кино[^>]*>([\d\s.,-]+)/i], replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'discount', [/<td>([^<]+)(?:[^>]*>){2}\s*бонус/i, /Бонус в кино[^>]*>([\d\s.,-]+)/i], replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'penalty', />([^<]+)(?:[^>]*>){3}\s*штраф/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}