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

function getCurrs(html, regexpkey, curr, result) {
	getParam(html, result, 'balance' + curr + 'spros', new RegExp(regexpkey + '(?:[^>]*>){1}[^>]*indicators__ticker__val1[^>]*>([^<]+)', 'i'), replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balance' + curr + 'predl', new RegExp(regexpkey + '(?:[^>]*>){3}[^>]*indicators__ticker__val2[^>]*>([^<]+)', 'i'), replaceTagsAndSpaces, parseBalance);
}

function main() {
	var baseurl = 'http://www.rbc.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	var table = getParam(html, null, null, /class="indicators__inner">[\s\S]*?<\/div/i);
	
	if(!table)
		throw new AnyBalance.Error('Не удалось найти таблицу с данными. Сайт изменен?');
	
	var result = {success: true};
	
	getCurrs(table, 'Нал. USD', 'usd', result);
	getCurrs(table, 'Нал. EUR', 'eur', result);
	getCurrs(table, 'EUR/USD', 'eur_usd', result);
	
	AnyBalance.setResult(result);
}