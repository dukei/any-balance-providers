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
	var baseurl = 'https://sovremennik.info/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'oauth2/mo/init', addHeaders({Referer: baseurl}));
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	html = AnyBalance.requestPost('https://auth.motmom.com/oauth2/authorize', {
		'request_id': getParam(html, null, null, /"request_id"[^>]*value="([^"]+)/i),
		'login': prefs.login,
		'password': prefs.password,
		'allow': ''
	}, addHeaders({Referer: 'https://auth.motmom.com/oauth2/authorize'}));
	
	var cabinet = getParam(html, null, null, /location\.replace\(['"]([^'"]+)/i);
	if (!cabinet) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(cabinet, g_headers);
	
	var cabinet = getParam(html, null, null, /"\/(cabinet[^"]+)/i);
	checkEmpty(cabinet, 'Не удалось найти ссылку на личный кабинет, сайт изменен?', true);
	
	html = AnyBalance.requestPost(baseurl + cabinet, '', addHeaders({Referer: baseurl, 'X-Requested-With': 'XMLHttpRequest'}));
	
	var json = getJson(html);
	
	html = json[0].data.html;
	AnyBalance.trace(html);
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /<td>([^<]+)(?:[^>]*>){2}\s*(?:балла|баланс)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'discount', /<td>([^<]+)(?:[^>]*>){2}\s*бонус/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'penalty', /<td>([^<]+)(?:[^>]*>){2}\s*штрафы/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}