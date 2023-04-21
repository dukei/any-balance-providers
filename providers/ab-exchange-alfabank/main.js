
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'application/json, text/plain, */*',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Connection': 'keep-alive',
	'Referer': 'https://alfabank.ru/currency/',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');
	
	if(/office/.test(prefs.type)){
        var rType = 'rateCass';
		var sourceType = 'Отделения банка';
	}else{
        var rType = 'makeCash';
		var sourceType = 'Альфа-Онлайн';
    }
	
	var date = new Date(+new Date() + 3*60*60*1000).toISOString();
	var dateISO = date.replace(/(\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\d)(.*)/i, '$1' + '+03:00');
    
	var html = AnyBalance.requestGet('https://alfabank.ru/api/v1/scrooge/currencies/alfa-rates?currencyCode.in=USD,EUR,CNY,GBP,CHF,CZK,TRY&rateType.in=rateCass,makeCash&lastActualForDate.eq=true&clientType.eq=standardCC&date.lte=' + dateISO, g_headers);

	if (!html || AnyBalance.getLastStatusCode() >= 500) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
	}
	
	AnyBalance.trace(html);

    var json = getJson(html);
	
	if(!json.data){
		var error = json.error || json.message || json.title;
		if(error)
			throw new AnyBalance.Error(error, null, true);
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось получить информацию по курсам валют. Сайт изменен?');
	}
    
	var result = {success: true};
	
	for(var i = 0; i<json.data.length; i++){
		var valut = json.data[i];
		var t = valut.rateByClientType[0].ratesByType;
		var rates = t.filter(function (b) { return b.rateType == rType })[0];
		var key = valut.currencyCode;
	    AnyBalance.trace(key + ': ' + JSON.stringify(valut));
        if(AnyBalance.isAvailable('buy' + key) && rates)
            result['buy' + key] = rates.lastActualRate.buy.originalValue;
        if(AnyBalance.isAvailable('sell' + key) && rates)
            result['sell' + key] = rates.lastActualRate.sell.originalValue;
        if(AnyBalance.isAvailable('date') && rates)
            sumParam(getFormattedDate(null, new Date(rates.lastActualRate.date)), result, 'date', null, null, parseDateSilent, aggregate_max);
	    if(AnyBalance.isAvailable('source'))
            getParam(sourceType, result, 'source');
	    if(rates)
		    getParam(getFormattedDate(null, new Date(rates.lastActualRate.date)), result, '__tariff');
	}
    
	AnyBalance.setResult(result);
}
