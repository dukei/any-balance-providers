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
	var prefs = AnyBalance.getPreferences(),
		baseurl = 'https://stat.sertolovo.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'utmplus/index.cgi', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'utmplus/index.cgi', {
		login: prefs.login,
		password: prefs.password,
		cmd: 'login'
	}, addHeaders({Referer: baseurl + 'utmplus/index.cgi'}));
	
	if (!/Завершить сессию/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class=["']error_box_content["'][^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверное имя пользователя или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Денег на счету[^]*?<\/td>\s*<td[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'status', /Состояние[^]*?<\/td>\s*<td[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'fio', /Полное имя[^]*?<\/td>\s*<td[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /Номер договора[^]*?<\/td>\s*<td[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);

	if(isAvailable(['traffIn', 'traffOut'])){
		var cookie = getParam(html, null, null, /createCookie\("sid",\s*"([^"]{10,})/i);
		AnyBalance.setCookie('stat.sertolovo.ru', 'sid', cookie);

		html = AnyBalance.requestGet(baseurl + 'utmplus/index.cgi?page=traffic', addHeaders({Referer: baseurl + 'utmplus/index.cgi'}));

		getParam(html, result, 'traffIn', /Интернет входящий[^>]*>\s*<td[^>]*>[^]*?<\/td>\s*(<td[^>]*>[^]*?<\/td>)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'traffOut', /Интернет исходящий[^>]*>\s*<td[^>]*>[^]*?<\/td>\s*(<td[^>]*>[^]*?<\/td>)/i, replaceTagsAndSpaces, parseBalance);
	}

	AnyBalance.setResult(result);
}