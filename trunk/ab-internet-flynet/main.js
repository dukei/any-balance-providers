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
	var baseurl = 'https://stat.flynet.by/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'bgbilling/webexecuter', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	html = AnyBalance.requestPost(baseurl + 'bgbilling/webexecuter', {
        action: 'Dashboard',
        user: prefs.login,
        pswd: prefs.password
	}, addHeaders({Referer: baseurl + 'bgbilling/webexecuter'}));
    
	if (!/action=Exit/i.test(html)) {
		var error = getParam(html, null, null, /ОШИБКА:([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /не найден/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Баланс(?:[^>]*>){4}\s*([\s\d.,]+)руб/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'account', /Договор №([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /Тарифный план(?:[^>]*>){4}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	
	var traficUsed = getParam(html, null, null, /action=TrafficRangeReport(?:[^>]*>){1}\s*([\d.,]+)/i, replaceTagsAndSpaces, parseTrafficGb);
	var traficTotal = getParam(html, null, null, /action=TrafficRangeReport(?:[^>]*>){1}[^<]+из\s*([\d.,]+)/i, replaceTagsAndSpaces, parseTrafficGb);
	if(isset(traficUsed) && isset(traficTotal)) {
		getParam(traficTotal - traficUsed, result, 'trafic');
	}
	
	if(isAvailable('fee')) {
		html = AnyBalance.requestGet(baseurl + 'bgbilling/webexecuter?action=GetBalance&mid=0&module=contract', g_headers);
		
		getParam(html, result, 'fee', /Абонентская плата(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	}
	
	AnyBalance.setResult(result);
}

function parseTrafficGb(str) {
	return parseTraffic(str + 'gb');
}