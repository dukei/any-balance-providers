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
	AnyBalance.setDefaultCharset('utf-8');
	
	var html = AnyBalance.requestGet('https://www.liqpay.com/exchanges/exchanges.cgi', g_headers);
	
	if (!/<rates>[\s\S]{50,}<\/rates>/i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось получить данные. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getRates(html, result, 'EUR');
	getRates(html, result, 'RUR');
	getRates(html, result, 'UAH');
	getRates(html, result, 'USD');
	
	AnyBalance.setResult(result);
}

function getRates(html, result, name) {	
	var table = getParam(html, null, null, new RegExp('<'+name+'>\\s*<[^>]*>(?:[^>]*>){5}\\s*</'+name+'>', 'i'));
	if(!table)
		throw new AnyBalance.Error('Не удалось получить таблицу курсов. Сайт изменен?');
	
	var currs = sumParam(table, null, null, /<[^>]{3}>[\d.,]*<\/[^>]{3}>/ig, [/[<\/>]/ig, '']);
	for(var i = 0; i < currs.length; i++) {
		var current = currs[i];
		
		var currency = getParam(current, null, null, null, replaceTagsAndSpaces, parseCurrency);
		getParam(current, result, name + '-' + currency, null, replaceTagsAndSpaces, parseBalance);
	}
}