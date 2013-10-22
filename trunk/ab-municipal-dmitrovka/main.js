/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	// Mobile
	//'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+',
	// Desktop
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};
function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://dmitrov-ka.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
		
	var html = requestPostMultipart(baseurl + 'netcat/modules/auth/', {
		'AuthPhase':'1',
		'AuthPhase':'1',
		'REQUESTED_FROM':'/life/home/personal/',
		'REQUESTED_BY':'GET',
		'catalogue':'1',
		'sub':'597',
		'cc':'799',
		'loginsave':'',
		'AUTH_USER':prefs.login,
		'AUTH_PW':prefs.password,
    }, addHeaders({Referer: baseurl + 'netcat/modules/auth'}));
	
	if(!/auth\/password_change\.php/i.test(html)) {
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
    var result = {success: true};
	getParam(html, result, 'fio', /class=[^>]*poselkiListing[^>]*>[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /class=[^>]*poselkiListing(?:[^>]*>){4}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	
	if(isAvailable(['bill_num','bill_date','bill_summ'])) {
		html = AnyBalance.requestGet(baseurl + 'life/home/bills/', g_headers);
		
		getParam(html, result, 'bill_num', /class="bills_row cl"(?:[^>]*>){7}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, 'bill_date', /class="bills_row cl"(?:[^>]*>){10}([^<]*)/i, replaceTagsAndSpaces, parseDateW);
		getParam(html, result, 'bill_summ', /class="bills_row cl"(?:[^>]*>){16}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	}
	
    AnyBalance.setResult(result);
}

// Парсит дату из такого вида в мс 27 июля 2013
function parseDateW(str){
	AnyBalance.trace('Trying to parse date from ' + str);
	return getParam(str, null, null, null, [replaceTagsAndSpaces, /января/i, '.01.', /февраля/i, '.02.', /марта/i, '.03.', /апреля/i, '.04.', /мая/i, '.05.', /июня/i, '.06.', /июля/i, '.07.', /августа/i, '.08.', /сентября/i, '.09.', /октября/i, '.10.', /ноября/i, '.11.', /декабря/i, '.12.', /\s/g, ''], parseDate);
}