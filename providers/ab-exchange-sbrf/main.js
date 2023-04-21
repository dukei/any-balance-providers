/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает курсы валют с сайта Сбербанка

Сайт: http://data.sberbank.ru/moscow/ru/quotes/metal
*/

var g_headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
    'Connection': 'keep-alive',
    'cache-control': 'max-age=0',
    'upgrade-insecure-requests': '1',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
};

var g_iso_to2letters = {
	USD: 'usd',
	EUR: 'eur',
	CAD: 'cad',
	DKK: 'dkk',
	JPY: 'jpy',
	NOK: 'nok',
	SGD: 'sgd',
	SEK: 'sek',
	CHF: 'chf',
	GBP: 'gbp',
	CNY: 'cny',
	HKD: 'hkd',
	AUD: 'aud',
	AED: 'aed',
	KZT: 'kzt',
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var region = findRegion(prefs.region).TRBANK_CODE;
  
    if (/office/.test(prefs.type)) {
        var rateType = 'ERNP-4';
        var enterType = '?tab=vsp';
		var sourceType = 'Офисы банка';
	} else {
        var rateType = 'ERNP-2';
        var enterType = '?tab=sbol';
		var sourceType = 'СберБанк Онлайн';
    }	
	
	var html = AnyBalance.requestGet('https://www.sberbank.ru/ru/quotes/currencies', g_headers);
  
    html = AnyBalance.requestGet('https://www.sberbank.ru/proxy/services/rates/public/actual?rateType=' + rateType + '&isoCodes[]=USD&isoCodes[]=EUR&isoCodes[]=CNY&isoCodes[]=GBP&isoCodes[]=KZT&isoCodes[]=AED&isoCodes[]=SGD&isoCodes[]=SEK&isoCodes[]=NOK&isoCodes[]=CAD&isoCodes[]=CHF&isoCodes[]=DKK&isoCodes[]=JPY&isoCodes[]=HKD&isoCodes[]=AUD&regionId=' + region,
	addHeaders({
		accept: '*/*',
  		Referer: 'https://www.sberbank.ru/ru/quotes/currencies' + enterType
  	}));
	AnyBalance.trace(html);

    var json = getJson(html);

    var result = {success: true};

    for(var key in json){
    	var valut = json[key];
  	    var name = g_iso_to2letters[key];
	    AnyBalance.trace(name + ': ' + JSON.stringify(valut));
        if(AnyBalance.isAvailable(name + '_purch'))
            result[name + '_purch'] = valut.rateList[0].rateBuy;
        if(AnyBalance.isAvailable(name + '_sell'))
            result[name + '_sell'] = valut.rateList[0].rateSell;
        if(AnyBalance.isAvailable(name + '_amount') && (amount = getAmount(name)))
            result[name + '_amount'] = valut.rateList[0].rateBuy * amount;
	    if(AnyBalance.isAvailable('date'))
            sumParam(valut.startDateTime, result, 'date', null, null, null, aggregate_max);
	    if(AnyBalance.isAvailable('source'))
            getParam(sourceType, result, 'source');
	    getParam(getFormattedDate(null, new Date(valut.startDateTime)), result, '__tariff');
    }

    AnyBalance.setResult(result);
}

function getAmount(valut){
	var prefs = AnyBalance.getPreferences();
	if(!prefs.amount)
		return undefined;
	if(/^[\d\s\.,]+$/.test(prefs.amount))
		return parseBalance(prefs.amount);
	var amount = getParam(prefs.amount, null, null, new RegExp(valut + '\s*:([^;a-z]*)', 'i'), null, parseBalance);
	return amount;
}
