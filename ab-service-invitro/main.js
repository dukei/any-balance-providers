/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://lk.invitro.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'lk2/login', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'sp/login', {
        login:prefs.login,
        password:prefs.password,
        lang:'ru'
    }, addHeaders({Referer: baseurl + 'lk2/login'}));
	
	if(!/logout/i.test(html)) {
		var error = getParam(html, null, null, /"myerror"[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		if(error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	// Если есть номер заказа ищем его, если нет ищем что попадется первым
	var inz = prefs.inz ? prefs.inz : '';
	var reInz = new RegExp('<div[^>]*class="order_list_row row collapse resultRow_\\d+"[^>]*>(?:[^>]*>){10}[^>]*' + inz + '(?:[^>]*>){8}', 'i');
	var zakaz = getParam(html, null, null, reInz);
	if(!zakaz)
		throw new AnyBalance.Error('Не удалось найти' + (prefs.inz ? ' ИНЗ №' + prefs.inz : 'ни одного ИНЗ.'));
	
    var result = {success: true};
	getParam(zakaz, result, 'inz_date', /(?:[\s\S]*?<div[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDateMoment);
	getParam(zakaz, result, 'inz_num', /(?:[\s\S]*?<div[^>]*>){4}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(zakaz, result, 'inz_status', /(?:[\s\S]*?<div[^>]*>){5}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);

	if(isAvailable(['age', 'gender', 'addr', 'total'])) {
		var row = getParam(zakaz, null, null, /<div[^>]*class="order_list_row row collapse\s*(resultRow_\d+)"/i);
		var reDetatails = new RegExp(row + '\\"\\)\\.click\\(function\\(\\)\\s*\\{\\s*document\\.location\\s*=\\s*\\"/([^\\"]*)', 'i');
		var details = getParam(html, null, null, reDetatails);
		html = AnyBalance.requestGet(baseurl + details, g_headers);
		
		getParam(html, result, 'age', /Возраст:(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'gender', /Пол:(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, 'addr', /Мед\.офис:(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		sumParam(html, result, 'total', /(<tr class="det_row">(?:[^>]*>){14})/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
	}
	
    AnyBalance.setResult(result);
}

// Парсит дату из такого вида в мс 27 июля 2013
function parseDateMoment(str){
	AnyBalance.trace('Trying to parse date from ' + str);
	return getParam(str, null, null, null, [replaceTagsAndSpaces, /январ(?:я|ь)/i, '.01.', /феврал(?:я|ь)/i, '.02.', /марта|март/i, '.03.', /апрел(?:я|ь)/i, '.04.', /ма(?:я|й)/i, '.05.', /июн(?:я|ь)/i, '.06.', /июл(?:я|ь)/i, '.07.', /август|августа/i, '.08.', /сентябр(?:я|ь)/i, '.09.', /октябр(?:я|ь)/i, '.10.', /ноябр(?:я|ь)/i, '.11.', /декабр(?:я|ь)/i, '.12.', /\s/g, ''], parseDate);
}