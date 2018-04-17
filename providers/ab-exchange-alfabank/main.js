
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
	var baseurl = 'https://alfabank.ru/_/rss/_currency.html';
	AnyBalance.setDefaultCharset('utf-8');



	var html = AnyBalance.requestGet(baseurl + '', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}


	var result = {
		success: true
	};

	AB.getParam(html, result, 'date', /<title>([^<]*на[\s\S]*?)<\/title>/i, AB.replaceTagsAndSpaces, AB.parseDate);

	AB.getParam(html, result, 'buyUSD', /<td[^>]*id="[^"]*США[^"]*Buy[^"]*"[^>]*>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces,
		AB.parseBalance);
	AB.getParam(html, result, 'sellUSD', /<td[^>]*id="[^"]*США[^"]*Sell[^"]*"[^>]*>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces,
		AB.parseBalance);

	AB.getParam(html, result, 'buyEUR', /<td[^>]*id="[^"]*Евро[^"]*Buy[^"]*"[^>]*>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces,
		AB.parseBalance);
	AB.getParam(html, result, 'sellEUR', /<td[^>]*id="[^"]*Евро[^"]*Sell[^"]*"[^>]*>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces,
		AB.parseBalance);

	AB.getParam(html, result, 'buyGBP', /<td[^>]*id="[^"]*Английский[^"]*Buy[^"]*"[^>]*>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces,
		AB.parseBalance);
	AB.getParam(html, result, 'sellGBP', /<td[^>]*id="[^"]*Английский[^"]*Sell[^"]*"[^>]*>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces,
		AB.parseBalance);

	AB.getParam(html, result, 'buyCHF', /<td[^>]*id="[^"]*Швейцарский[^"]*Buy[^"]*"[^>]*>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces,
		AB.parseBalance);
	AB.getParam(html, result, 'sellCHF', /<td[^>]*id="[^"]*Швейцарский[^"]*Sell[^"]*"[^>]*>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces,
		AB.parseBalance);


	AnyBalance.setResult(result);
}
