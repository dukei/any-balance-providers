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
	var baseurl = 'https://www.altaiensb.com';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
//	var html = AnyBalance.requestPost(baseurl + '/personal/index.php', g_headers);
	
	var html = AnyBalance.requestPost(baseurl + '/personal/index.php?login=yes', {
		AUTH_FORM:	'Y',
		TYPE:	'AUTH',
		backurl:	'/personal/index.php',
		USER_LOGIN: prefs.login,
		USER_PASSWORD:	prefs.password,
		Login:	'Войти'
	}, addHeaders({Referer: baseurl + '/personal/index.php'}));

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<font[^>]+class="errortext"[^>]*>([\s\S]*?)<\/font>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};

	getParam(html, result, 'licschet', /Лицевой счет[\s\S]*?<th[^>]*>([\s\S]*?)<\/th>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'fio', /<div[^>]+class="user"[^>]*>([\s\S]*?)<\/div>/i, [/здравствуйте,/i, '', replaceTagsAndSpaces], html_entity_decode);
	getParam(html, result, 'balance', /<td[^>]+id="paytotal"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /Тип учета[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'off', /Льгота[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'price', /Ставка тарифа[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'value', /Показания прибора учета[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}