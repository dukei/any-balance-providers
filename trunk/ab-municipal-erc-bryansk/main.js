/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	// Mobile
	//'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+',
	// Desktop
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.rirc.ru/cabinet/cgi-bin/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestPost(baseurl + 'login.pl', {
		login: prefs.login,
		password: prefs.password,
		agreement: 'on'
	}, addHeaders({Referer: baseurl + 'login.pl'}));
	
	if (!/exit_cabinet/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+id="message"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /логин должно содержать|неверная комбинация/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};

	getParam(html, result, 'fio', /<span[^>]+id="fio"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'address', /<span[^>]+id="address"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'live', /<span[^>]+id="live"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'licschet', /<input[^>]+id="gkx_ls_id"[^>]*value="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /<input[^>]+id="gkx_total_bill"[^>]*value="([^"]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'licschet_krm', /<input[^>]+id="krm_ls_id"[^>]*value="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance_krm', /<input[^>]+id="krm_total_bill"[^>]*value="([^"]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff',  /<input[^>]+id="gkx_ls_id"[^>]*value="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}