/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.111 Safari/537.36'
};

function main() {
	var prefs = AnyBalance.getPreferences(),
		baseurl = 'http://strelkacard.ru';
	
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите номер карты!');

	var html = AnyBalance.requestGet(baseurl + '/api/cards/types/', addHeaders({'X-CSRFToken': 'null', 'X-Requested-With': 'XMLHttpRequest', Referer: baseurl + '/'}));
	var json = getJson(html);
	var info = json[0];
	if(!info){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось получить типы карт. Проблемы на сайте или сайт изменен.');
	}

	var result = {success: true};
	getParam(info.cardtypename, result, 'typename');
	getParam(info.cardtypecode, result, 'typecode');

	html = AnyBalance.requestGet(baseurl + '/api/cards/status/?cardnum=' + encodeURIComponent(prefs.login) + '&cardtypeid=' + encodeURIComponent(info.cardtypeid), 
		addHeaders({'X-CSRFToken': 'null', 'X-Requested-With': 'XMLHttpRequest', Referer: baseurl + '/'}));
	json = getJson(html);

	if(!json.hasOwnProperty('balance')){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Карта с таким номером не найдена. Проверьте, не ошиблись ли вы.');
	}

	getParam(json.balance, result, 'balance', null, null, function(val) { return val/100 });
	getParam(json.cardactive, result, 'status', null, null, function(val) { return val ? 'Активна' : 'Неактивна' });
	getParam(json.numoftrips, result, 'trips');
	getParam(json.periodend, result, 'till', null, null, parseDateISO);
	getParam(json.tarif, result, '__tariff');
	
	AnyBalance.setResult(result);
}
