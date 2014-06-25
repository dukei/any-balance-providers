/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'Origin'	:'http://www.rivegauche.ru',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main(){
	AnyBalance.setDefaultCharset('utf-8');
	var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.cardnum, 'Введите номер карты!');

	var baseurl = 'http://www.rivegauche.ru/discount/savings';
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	// Ищем токен
	var form_build_id = getParam(html, null, null, /form_build_id"[^>]*id="([^"]*)/i);
	if(!form_build_id)
		throw new AnyBalance.Error('Не удалось найти форму для запроса. Сайт изменен?');
	
	var html = AnyBalance.requestPost(baseurl, {
		'cardtype':prefs.cardtype || 0,
		'cardnum':prefs.cardnum,
		'op':'',
		'form_build_id':form_build_id,
		'form_id':"savings_check_form"
	}, addHeaders({Referer: baseurl}));
	
	if (!/статус карты/i.test(html)) {
		var error = getParam(html, null, null, /"carderrors"[^>]*>([\s\S]*?)<\/ul/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};

	getParam(html, result, '__tariff', /На[^<]*карте\s*№([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'db_balance', /class="savingsAmmount">([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'db_date', [/последняя операция по карте (.*)<br>/m, /дата последней[^<]*по карте([^<]*)/i], replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'db_status', /"card-status"[^>]*>\s*статус карты([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	
	getParam(html, result, 'db_bonus', /бонус на(?:[^>]*>)?День Рождения(?:[^>]*>){4}\s*<div[^>]*savingsAmmount[^>]*>([^<]+)<\//i, replaceTagsAndSpaces, parseBalance);

	//Обычная карта
	/*if (prefs.cardtype == 0){	
		getParam(html, result, '__tariff', /На[^<]*карте\s*№([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, 'db_balance', /class="savingsAmmount">([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'db_date', /дата последней[^<]*по карте([^<]*)/i, replaceTagsAndSpaces, parseDate);
		getParam(html, result, 'db_status', /"card-status"[^>]*>\s*статус карты([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	//Золотая карта
	} else if (prefs.cardtype==1) {
		getParam(html, result, 'db_balance', /class="savingsAmmount">([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'db_date', [/последняя операция по карте (.*)<br>/m, /дата последней[^<]*по карте([^<]*)/i], replaceTagsAndSpaces, parseDate);

		
		regexp=/сумма бонуса к Вашему дню рождения:<\/div>\n<div class=\"savingsAmmount\">\n(.*)\n<\/div>/m;
		if (res=regexp.exec(html)){
			result.bonus=res[1];
		}

		getParam(html, result, 'db_status', /"card-status"[^>]*>\s*статус карты([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	}*/

	AnyBalance.setResult(result);
}