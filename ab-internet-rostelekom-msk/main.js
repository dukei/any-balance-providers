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
	var baseurl = 'https://cabinet.rt.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet('http://www.moscow.rt.ru/hometel/personal', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'RTCWWW_MMT/LOGIN', {
		X_Username: prefs.login,
		X_Password: prefs.password,
	}, addHeaders({Referer: 'http://www.moscow.rt.ru/hometel/personal'}));
	
	if (!/Подождите! Идет получение данных...|&#1055;&#1086;&#1076;&#1086;&#1078;&#1076;&#1080;&#1090;&#1077;! &#1048;&#1076;&#1077;&#1090; &#1087;&#1086;&#1083;&#1091;&#1095;&#1077;&#1085;&#1080;&#1077; &#1076;&#1072;&#1085;&#1085;&#1099;&#1093;.../i.test(html)) {
		var error = getParam(html, null, null, /<STRONG class="red">&#1042;&#1085;&#1080;&#1084;&#1072;&#1085;&#1080;&#1077;!<\/STRONG>([^>]*>){6}/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Пользователь не найден|Указан неправильный пароль/i.test(error));
		
		AnyBalance.trace(html_entity_decode(html));
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var sessionId = getParam(html, null, null, /"SESSION_ID"[^>]*value=['"]([^'"]*)/i, replaceTagsAndSpaces, html_entity_decode);
	checkEmpty(sessionId, 'Не удалось найти идентификатор сесии, сайт изменен?', true);
	
	html = AnyBalance.requestPost(baseurl + 'RTCWWW_MMT/ACCOUNT_INFO', {
		SESSION_ID: sessionId
	}, addHeaders({Referer: baseurl + 'RTCWWW_MMT/LOGIN'}));
	
	var result = {success: true};
	
	getParam(html, result, 'balance', />\s*(?:&#1041;&#1072;&#1083;&#1072;&#1085;&#1089;|Баланс)([^>]*>){9}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'status', /&#1057;&#1090;&#1072;&#1090;&#1091;&#1089; &#1072;&#1073;&#1086;&#1085;&#1077;&#1085;&#1090;&#1072;([^>]*>){33}/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'phone', /SUBSCRIBER_MSISDN[^>]*>\s*<option value="([^"]*)"\s*selected="true"/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /SUBSCRIBER_MSISDN[^>]*>\s*<option value="([^"]*)"\s*selected="true"/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'licschet', /&#1053;&#1051;&#1057;:(\d+)/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}