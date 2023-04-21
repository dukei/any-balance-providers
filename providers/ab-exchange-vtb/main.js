/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'application/json, text/plain, */*',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'origin': 'https://www.vtb.ru',
    'referer': 'https://www.vtb.ru/',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
};

var g_iso_to2letters = {
	USD: 'usd',
	EUR: 'eur',
	GBP: 'gbp',
	CHF: 'chf',
	CAD: 'cad',
	SEK: 'sek',
	NOK: 'nok',
	JPY: 'jpy',
	CNY: 'cny',
	PLN: 'pln',
	DKK: 'dkk',
	TRY: 'try',
	AED: 'aed',
};

function main() {
	var prefs = AnyBalance.getPreferences();
    
	AnyBalance.setDefaultCharset('utf-8');

    if(/office/.test(prefs.type)){
        var category = 1;
		var sourceType = 'Офисы банка';
	}else{
        var category = 3;
		var sourceType = 'ВТБ Онлайн';
    }
    
    var html = AnyBalance.requestGet('https://siteapi.vtb.ru/api/currencyrates/table?category=' + category + '&type=1', g_headers);
	
	if(AnyBalance.getLastStatusCode() >= 500){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
    }
	
	AnyBalance.trace(html);

    var json = getJson(html);
	
	if(!json.rates){
		var error = json.error || json.message || json.title;
		if(error)
			throw new AnyBalance.Error(error, null, true);
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось получить информацию по курсам валют. Сайт изменен?');
	}
	
	var result = {success: true};
	
	var rates = json.rates;
	
	getParam(json.dateFrom && json.dateFrom.replace(/(\d{4})-(\d{2})-(\d{2})(.*)/,'$3.$2.$1'), result, '__tariff');
	
	if(AnyBalance.isAvailable('date'))
	    getParam(json.dateFrom && json.dateFrom.replace(/(\d{4})-(\d{2})-(\d{2})(.*)/,'$3.$2.$1'), result, 'date', null, null, parseDate);
	
	if(AnyBalance.isAvailable('source'))
            getParam(sourceType, result, 'source');
	
	for(var i=rates.length-1; i>=0; i--){ // Начинаем с конца, чтобы игнорировать коэффициент обмена
		var valut = rates[i];
		var key = valut.currency1.code;
  	    var name = g_iso_to2letters[key];
	    AnyBalance.trace(name + ': ' + JSON.stringify(valut));
        if(AnyBalance.isAvailable(name + '_purch'))
            result[name + '_purch'] = valut.bid;
        if(AnyBalance.isAvailable(name + '_sell'))
            result[name + '_sell'] = valut.offer;
        if(AnyBalance.isAvailable(name + '_amount') && (amount = getAmount(name)))
            result[name + '_amount'] = valut.bid * amount;
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
