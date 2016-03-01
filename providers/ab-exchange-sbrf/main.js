/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main() {
	var result = {success: true};
	
	var prefs = AnyBalance.getPreferences();
	
	var baseurl = 'http://data.sberbank.ru/';
	var html = AnyBalance.requestGet(baseurl + (prefs.region || 'moscow') + '/ru/quotes/currencies/');
	
	AB.getParam(html, result, 'date', /<h3[^>]*>Курсы иностранных валют с([^<]+)/i, AB.replaceTagsAndSpaces, AB.parseDate);
    AB.getParam(html, result, '__tariff', /<h3[^>]*>Курсы иностранных валют с([^<]+)/i, [/по местному времени/g, '', AB.replaceTagsAndSpaces]);
    AB.getParam(html, result, 'usd_purch', /"Доллар США"(?:[^>]*>){8}([\s\d.,]{3,})/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'usd_sell', /"Доллар США"(?:[^>]*>){13}([\s\d.,]{3,})/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'eur_purch', /"Евро"(?:[^>]*>){8}([\s\d.,]{3,})/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'eur_sell', /"Евро"(?:[^>]*>){13}([\s\d.,]{3,})/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	
	AnyBalance.setResult(result);
}
