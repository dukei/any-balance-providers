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
		baseurl = 'http://www.ukrtelecom.ua/',
		cabineturl = 'http://kvnsmeppay.ukrtelecom.net:8080/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите номер телефона!');
	
	var html = AnyBalance.requestGet(baseurl + 'oplata/form', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(cabineturl + '/webaccount/gsumm_score.jsp', {
		tel: prefs.login,
		or: '',
		score: 1
	}, addHeaders({Referer: baseurl + 'oplata/form'}));
	
	if (!/СУМА ДО СПЛАТИ/i.test(html)) {
		var error = getParam(html, null, null, /Не знайдено жодного рахунку за\s+умовами Вашого запиту\./i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, true);
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'pay', /СУМА ДО СПЛАТИ,грн(?:[^>]+>){5}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'op', /О\/P<\/td(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'phase', /Період<\/td(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'ks', /КС<\/td(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /телефон<\/td(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);

	AnyBalance.setResult(result);
}