/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.97 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://rebra74.ru/';
	AnyBalance.setDefaultCharset('windows-1251');
	
	AB.checkEmpty(prefs.login, 'Введите логин!');

	var html = AnyBalance.requestGet(baseurl + 'bonus/', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	
	html = AnyBalance.requestPost(baseurl + 'bonus/', {
		CARD: prefs.login
	}, AB.addHeaders({
		Referer: baseurl + 'bonus/'
	}));
	
	if (!/операция/i.test(html)) {
		var error = AB.getParam(html, null, null, /<img[^>]+src="\/bitrix\/templates\/new\/img\/tre\.png"[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Информация по карте не найдена/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось получить баланс по карте. Сайт изменен?');
	}
	
	var result = {success: true};
	
	AB.getParam(html, result, 'balance', /Баланс(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'operation', /Баланс(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'date', /Баланс(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseDate);

	AnyBalance.setResult(result);
}