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
	var baseurl = 'http://gdetoedet.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите номер отправления!');
	
	var html = AnyBalance.requestGet(baseurl + 'track/'+ prefs.login, g_headers);
	
	if (!new RegExp('ОТПРАВЛЕНИЕ:([^>]*>){1}\\s*'+ prefs.login, 'i').test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти информацию об отправлении' + prefs.login);
	}
	
	var result = {success: true};
	
	getParam(html, result, 'track', /ОТПРАВЛЕНИЕ:([^>]*>){2}/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /ОТПРАВЛЕНИЕ:([^>]*>){2}/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'type', /Тип посылки:(?:[^>]*>){2}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'weight', />вес([^>]*>){3}/i, replaceTagsAndSpaces, html_entity_decode);
	
	var lastStatus = getParam(html, null, null, /<td>\s*<img[^>]*>\s*<\/td>\s*<td>\d{2}\.\d{2}\.\d{4}(?:[^>]*>){10,20}\s*<\/tr>\s*<\/table>/i);
	
	if(lastStatus) {
		getParam(lastStatus, result, ['parcel_date', 'parcel_details'], /(\d{2}\.\d{2}\.\d{4}(?:[^>]*>){2}\d+:\d+)/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(lastStatus, result, ['parcel_adr', 'parcel_details'], /"Адрес отделения"([^>]*>){2}/i, replaceTagsAndSpaces, html_entity_decode);
		sumParam(lastStatus, result, ['parcel_status', 'parcel_details'], /"b-status"([^>]*>){2}/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
		getParam('<b>' + result.parcel_date + ':</b><br/>' + result.parcel_adr + ' - ' + result.parcel_status, result, 'parcel_details');
	} else {
		AnyBalance.trace('Не удалось найти информацию о посылке, возможно она еще не попала в базу gdetoedet.ru');
	}
	
	AnyBalance.setResult(result);
}