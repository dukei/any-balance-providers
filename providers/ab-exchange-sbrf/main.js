/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает курсы валют с сайта Сбербанка

Сайт: http://data.sberbank.ru/moscow/ru/quotes/metal
*/

var g_headers = {
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
  'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
  'Connection': 'keep-alive',
  'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
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
	CNY: 'cny'
};

function main(){
  var prefs = AnyBalance.getPreferences();
  AnyBalance.setDefaultCharset('utf-8');

    var region = findRegion(prefs.region).TRBANK_CODE;
  
    if (/office/.test(prefs.type)) {
        var rateType = 'ERNP-4';
        var requestID = '7cfa7f739ebdf97418a3963183fbba05';
		var sourceType = 'Офисы банка';
	} else {
        var rateType = 'ERNP-2';
        var requestID = '8e4f8491fbf9f2ada11a32133ef30b80';
		var sourceType = 'СберБанк Онлайн';
    }	

  var html = AnyBalance.requestGet('https://www.sberbank.ru/proxy/services/rates/public/actual?rateType=' + rateType + '&isoCodes[]=USD&isoCodes[]=EUR&isoCodes[]=CAD&isoCodes[]=DKK&isoCodes[]=JPY&isoCodes[]=NOK&isoCodes[]=SGD&isoCodes[]=SEK&isoCodes[]=CHF&isoCodes[]=GBP&isoCodes[]=CNY&regionId=' + region,
	addHeaders({
  		'X-Requested-With': 'XMLHttpRequest',
  		'X-Request-ID': requestID,
  		Referer: 'https://www.sberbank.ru/ru/quotes/currencies/'
  	}));

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
