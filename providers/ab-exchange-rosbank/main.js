 /**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

РОСБАНК (курсы,расчет)
Сайт банка: http://www.rosbank.ru/
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
}

var g_iso_to2letters = {
	USD: 'usd',
	EUR: 'eur',
	CNY: 'cny',
	KZT: 'kzt',
	AMD: 'amd',
	BYN: 'byn',
	TRY: 'try',
	UZS: 'uzs',
};

function main(){
    var prefs = AnyBalance.getPreferences();
	
    AnyBalance.setDefaultCharset('utf-8');  
	
	var html = AnyBalance.requestGet('https://www.rosbank.ru/obmen-valyuty/', g_headers);
	
	if(AnyBalance.getLastStatusCode() >= 400){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
    }
    
	var result = {success: true};
	
	var data = getJsonObject(html, /<script id="__NEXT_DATA__" type="application\/json">/);
	
    if(!data){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось получить объект data. Сайт изменен?');
	}
	
	var info = data.props && data.props.initialState && data.props.initialState.currency && data.props.initialState.currency.content && 
	data.props.initialState.currency.content.components && data.props.initialState.currency.content.components[0] && 
	data.props.initialState.currency.content.components[0].content;
	
	if(!info){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось получить информацию по курсам валют. Сайт изменен?');
	}
	
	var rates = info.currency;
	
	var sourceType, rateBuy, rateSell;
	
	if(/online/.test(prefs.type)){
		sourceType = 'Росбанк Онлайн';
	}else if(/cash$/.test(prefs.type)){
		sourceType = 'Наличные операции';
    }else{
		sourceType = 'Безналичные операции';
    }
	
	getParam(info.updated.replace(/(\d{4})-(\d{2})-(\d{2})(.*)/,'$3.$2.$1'), result, '__tariff');
	
	if(AnyBalance.isAvailable('date'))
	    getParam(info.updated, result, 'date', null, null, parseDateISO);
	
	if(AnyBalance.isAvailable('source'))
            getParam(sourceType, result, 'source');
	
	for(var i=rates.length-1; i>=0; i--){ // Начинаем с конца, чтобы игнорировать коэффициент обмена
		var valut = rates[i];
		var key = valut.currency_buy;
  	    var name = g_iso_to2letters[key];
	    AnyBalance.trace(name + ': ' + JSON.stringify(valut));
        if(AnyBalance.isAvailable(name + '_purch'))
			if(/online/.test(prefs.type)){
                rateBuy = valut.inner_range.buy;
	        }else if(/cashless/.test(prefs.type)){
				rateBuy = valut.inner.buy;
            }else{
                rateBuy = valut.cash.buy;
            }
			getParam(rateBuy, result, name + '_purch', null, null, parseBalanceSilent);
        if(AnyBalance.isAvailable(name + '_sell'))
			if(/online/.test(prefs.type)){
                rateSell = valut.inner_range.sell;
	        }else if(/cashless/.test(prefs.type)){
                rateSell = valut.inner.sell;
            }else{
				rateSell = valut.cash.sell;
            }
			getParam(rateSell, result, name + '_sell', null, null, parseBalanceSilent);
        if(AnyBalance.isAvailable(name + '_amount') && (amount = getAmount(name)))
		    getParam((rateBuy * amount), result, name + '_amount', null, null, parseBalanceSilent);
		if(AnyBalance.isAvailable(name + '_cbrf'))
			getParam(valut.official.value, result, name + '_cbrf', null, null, parseBalanceSilent);
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
