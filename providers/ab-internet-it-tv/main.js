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
	var baseurl = 'https://bms.it-tv.org/stat/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'index.php', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'index.php', {
		action: 'auth_request',
		U: '/stat/',
		L: prefs.login,
		P: prefs.password,
	}, addHeaders({Referer: baseurl + 'index.php'}));
	
	var accountHref = getParam(html, null, null, /([^"']+)["']>\s*Лицевой счёт №\d+/i, replaceTagsAndSpaces, html_entity_decode);
	
	if (!/logout/i.test(html) || !accountHref) {
		var error = getParam(html, null, null, /"smalltext">([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин\/пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + accountHref, addHeaders({Referer: baseurl + 'index.php?p=message'}));
	
	var result = {success: true};
	
	getParam(html, result, '__tariff', /Лицевой счёт №(\d+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'acc_num', /Лицевой счёт №(\d+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /Состояние счёта([\s\S]*?)<\/tr>/i, replaceTagsAndSpaces, parseBalance);
	
	var detailsHref = getParam(html, null, null, /([^"']+)["']>\s*Интернет/i, replaceTagsAndSpaces, html_entity_decode);
	if(detailsHref && isAvailable(['state', 'agreement', 'abon', 'traf_in', 'traf_out'])) {
		html = AnyBalance.requestGet(baseurl + detailsHref, addHeaders({Referer: baseurl + 'index.php?p=message'}));
		
		getParam(html, result, 'state', /Состояние услуги:([\s\S]*?)<\/tr>/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, 'agreement', /Договор:([\s\S]*?)<\/tr>/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, 'abon', /Абонплата:([\s\S]*?)<\/tr>/i, replaceTagsAndSpaces, parseBalance);
		
		getParam(html, result, 'traf_in', /Использованый трафф?ик(?:[\s\S]*?<td>){5,10}Интернет:(?:[\s\S]*?<td>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseTraffic);
		getParam(html, result, 'traf_out', /Использованый трафф?ик(?:[\s\S]*?<td>){5,10}Интернет:(?:[\s\S]*?<td>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseTraffic);
	}
	
	AnyBalance.setResult(result);
}