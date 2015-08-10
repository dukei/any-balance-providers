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
	var baseurl = 'https://a-ads.com/ad_units/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите № рекламного места!');
	
	var html = AnyBalance.requestGet(baseurl + prefs.login, g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Баланс:([^>]*>){3}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'out_balance', /Выплачено:([^>]*>){3}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'last_pay', /Последняя выплата:([^>]*>){3}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', 'balance', 'out_balance'], /Баланс:([^>]*>){3}/i, replaceTagsAndSpaces, parseCurrency);
	
	var statsJson = getJson(getParam(html, null, null, /aa_stats\['ad_unit_stats[^{]+(\{[\s\S]*?\})/i));
	
	getParam(statsJson.impressions_sum_human, result, 'views', null, replaceTagsAndSpaces, parseBalance);
	getParam(statsJson.impressions_sum_human, result, ['viewsVal', 'views'], null, replaceTagsAndSpaces, parseCurrency);
	getParam(statsJson.clicks_sum_human, result, 'clicks', null, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}