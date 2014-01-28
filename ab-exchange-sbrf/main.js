/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main() {
	var result = {success: true};
	
	var prefs = AnyBalance.getPreferences();
	
	var baseurl = 'http://sberbank.ru/';
	var html = AnyBalance.requestGet(baseurl + (prefs.region || 'moscow') + '/ru/quotes/currencies/table/');
	
	getParam(html, result, 'date', /<input[^>]+value="([^"]*)"[^>]*name="date"/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, '__tariff', /<input[^>]+value="([^"]*)"[^>]*name="date"/i, replaceTagsAndSpaces, html_entity_decode);
	
	var r = new RegExp('<input type="hidden" name="([^"]+)" value="([^"]+)" />', 'g');
	
	var url = baseurl + 'common/js/quote_table.php?payment=cash&person=natural';
	
	while ((matches = r.exec(html)) != null) {
		url += '&' + matches[1] + '=' + matches[2];
	}
	html = AnyBalance.requestGet(url);
	r = new RegExp('<tr><td class="rbord"><a[^>]+>[^<]+</a></td><td class="rbord" style="text-align:center;">([^<]+)</td><td class="rbord" style="text-align:center;">(\\d+)</td><td class="rbord" style="text-align:center;">([0-9\\.]+).+?</td><td class="rbord" style="text-align:center;">([0-9\\.]+).+?</td></tr>', 'g');
	while ((matches = r.exec(html)) != null) {
		switch (matches[1]) {
		case 'USD':
			result.usd_purch = parseFloat(matches[3]) / parseInt(matches[2]);
			result.usd_sell = parseFloat(matches[4]) / parseInt(matches[2]);
			break;
		case 'EUR':
			result.eur_purch = parseFloat(matches[3]) / parseInt(matches[2]);
			result.eur_sell = parseFloat(matches[4]) / parseInt(matches[2]);
			break;
		case 'GBP':
			result.gbp_purch = parseFloat(matches[3]) / parseInt(matches[2]);
			result.gbp_sell = parseFloat(matches[4]) / parseInt(matches[2]);
			break;
		}
	}
	//throw new AnyBalance.Error('текст ошибки');
	AnyBalance.setResult(result);
}