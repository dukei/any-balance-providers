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
	var baseurl = 'https://www.tinkoff.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	var html = AnyBalance.requestGet(baseurl + 'api/v1/currency_rates/', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
    var json = getJson(html);
    
    if(!json) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось получить данные. Сайт изменен?');   
    }
	
	var result = {success: true};
	
	getParam(json.payload.rates[8].buy, result, 'usd_to_rub_buy', null, null);
	getParam(json.payload.rates[8].sell, result, 'usd_to_rub_sell', null, null);
	getParam(json.payload.rates[9].buy, result, 'usd_to_eur_buy', null, null);
	getParam(json.payload.rates[9].sell, result, 'usd_to_eur_sell', null, null);
	getParam(json.payload.rates[10].buy, result, 'eur_to_rub_buy', null, null);
	getParam(json.payload.rates[10].sell, result, 'eur_to_rub_sell', null, null);
	getParam(json.payload.rates[11].buy, result, 'eur_to_usd_buy', null, null);
	getParam(json.payload.rates[11].sell, result, 'eur_to_usd_sell', null, null);
	
	AnyBalance.setResult(result);
}