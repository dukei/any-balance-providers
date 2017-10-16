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
	var result = {success: true};
	
	var prefs = AnyBalance.getPreferences();
	var region = findRegion(prefs.region).REGION_ID;
	
	var baseurl = 'http://www.sberbank.ru/portalserver/proxy/?pipe=shortCachePipe&url=';
	var body = JSON.stringify({
		"currencyData":[
			{"currencyCode":"978","rangesAmountFrom":[0,1000]},
			{"currencyCode":"840","rangesAmountFrom":[0,1000]}
		],
		"categoryCode":"base"
	});
	var addUrl = 'http://localhost/rates-web/rateService/rate?regionId=' + region + '&fromDate=' + getFormattedDate({offsetDay: 7}) + '&toDate=' + getFormattedDate() + '&hash=' + computeHash(body);
	
	var html = AnyBalance.requestPost(baseurl + encodeURIComponent(addUrl), body, addHeaders({
		'Content-Type': 'application/json',
		'Referer': 'https://www.sberbank.ru/ru/quotes/currencies',
		'X-Requested-With': 'XMLHttpRequest'
	}));
	var json = getJson(html);

	if(AnyBalance.isAvailable('date', 'usd_purch', 'usd_sell')){
		var info = json['840'].rates[0];
		AB.getParam(info.activeFrom, result, 'date');
    	AB.getParam(info.buyValue, result, 'usd_purch');
    	AB.getParam(info.sellValue, result, 'usd_sell');
    	AB.getParam(getFormattedDate(null, new Date(info.activeFrom)), result, '__tariff');
	}
	
	if(AnyBalance.isAvailable('date', 'eur_purch', 'eur_sell')){
		var info = json['978'].rates[0];
		AB.getParam(info.activeFrom, result, 'date');
    	AB.getParam(info.buyValue, result, 'eur_purch');
    	AB.getParam(info.sellValue, result, 'eur_sell');
    	AB.getParam(getFormattedDate(null, new Date(info.activeFrom)), result, '__tariff');
	}
	
	AnyBalance.setResult(result);
}

