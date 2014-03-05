/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
	'X-Requested-With':'XMLHttpRequest'
};

function generateManifestCounters(rate) {
	AnyBalance.trace('<counter id="purchase_' + rate +'" name="' + rate.toUpperCase() + ' Покупка" units=" UAH"/>');
	AnyBalance.trace('<counter id="sell_' + rate +'" name="' + rate.toUpperCase() + ' Продажа" units=" UAH"/>');
}

function getRate(html, result, rate) {
	//generateManifestCounters(rate);
	
	var purchase = getParam(html, null, null, new RegExp('<tr class=\\"regular\\">(?:[^>]*>){3}[^>]*href=\\"http://kurs.com.ua/' + rate + '([^>]*>){9}', 'i'), replaceTagsAndSpaces, parseBalance);
	var sell = getParam(html, null, null, new RegExp('<tr class=\\"regular\\">(?:[^>]*>){3}[^>]*href=\\"http://kurs.com.ua/' + rate + '(?:[^>]*>){15,20}[^>]*"value"[^>]*>([\\s\\S]*?)</div', 'i'), replaceTagsAndSpaces, parseBalance);
	
	checkEmpty(purchase && sell, 'Не удалось найти курсы для валюты ' + rate, true);
	
	getParam(purchase, result, 'purchase_' + rate);
	getParam(sell, result, 'sell_' + rate);
}

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://kurs.com.ua/';
	AnyBalance.setDefaultCharset('utf-8');
	
	var html = AnyBalance.requestGet(baseurl + 'ajax/mezhbank_table/all/?_=' + new Date().getTime(), g_headers);
	
	var json = getJson(html);
	
	if (!json.table) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти таблицу с курсами. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getRate(json.table, result, 'usd');
	getRate(json.table, result, 'eur');
	getRate(json.table, result, 'rub');
	
	AnyBalance.setResult(result);
}