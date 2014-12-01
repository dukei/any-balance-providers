/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
    'X-Requested-With': 'XMLHttpRequest'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://kabinet.pecom.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.cargo, 'Введите код груза!');
	
	var html = AnyBalance.requestGet(baseurl + 'status', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	html = AnyBalance.requestPost(baseurl + 'cargostatus/status', {
		'cargoCodes': prefs.cargo
	}, addHeaders({Referer: baseurl + 'status'}));

	if (/Ошибка/i.test(html)) {
		var error = getParam(html, null, null, /(?:Ошибка[^>]*>)([\s\S]*?)<\/div/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный формат/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'status', /Статус груза(?:[\s]*?<\/td>[^>]*>)([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'depart_date', /Дата сдачи груза(?:[\s]*?<\/td>[^>]*>)([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'arrival_date', /Время прибытия(?:[\s]*?<\/td>[^>]*>)([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'approx_arrival_date', /Ориентировочное время прибытия(?:[\s]*?<\/td>[^>]*>)([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, '__tariff', /Код груза(?:[\s]*?<\/td>[^>]*>)([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'name', /Наименование груза(?:[\s]*?<\/td>[^>]*>)([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'debt', /Долг по оплате:(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}