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

var g_cards = ['АВ-OLD', 'АВ', 'АВ9', 'ВК', 'СТ', 'ЭБВГ', 'АВЭ', 'M2M', 'ДС', 'КВ', 'ЛО'];

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://av.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите номер карты!');
	
	var html = AnyBalance.requestGet(baseurl + 'personal/discount_cards/', g_headers);
	
	var found = false;
	for(var i = 0; i < g_cards.length; i++) {
		html = AnyBalance.requestPost(baseurl + 'udata/avemarket/request_value_proc/', {
			'type_card': g_cards[i],
			'number_card': prefs.login,
		}, addHeaders({
			Referer: baseurl + 'personal/discount_cards/',
			'X-Requested-With': 'XMLHttpRequest'
		}));
		
		if(found = !/Карта не найдена/i.test(html))
			break;
	}
	
	if (!found)
		throw new AnyBalance.Error('Не удалось получить данные по карте, сайт изменен?');
	
	var result = {success: true};
	
	getParam(prefs.login, result, '__tariff');
	getParam(html, result, 'discount', /<udata[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	
	// if(isset(result.discount)) {
		// var next = getParam(html, null, null, /для увеличения скидки на\s*(\d+)\s*%/i, replaceTagsAndSpaces, parseBalance);
		// getParam(next + result.discount, result, 'next_discount');
	// }
	
	// getParam(html, result, 'to_reach_next_discount', /необходимо совершить покупок([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	// getParam(html, result, 'last_purch_date', /Дата последней покупки:([^<]*)/i, replaceTagsAndSpaces, parseDate);
	
	AnyBalance.setResult(result);
}