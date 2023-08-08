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
	var baseurl = 'http://www.rbc.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	var url = AnyBalance.getLastUrl();
	
	html = AnyBalance.requestGet(url + 'v10/ajax/key-indicator-update/?_=' + Math.random(), g_headers);
	var json = getJson(html);
	if(!json)
	    throw new AnyBalance.Error('Не удалось найти таблицу с данными. Сайт изменен?');
	
    var result = {success: true};
	
	for(var i=0; i<json.shared_key_indicators.length; ++i){
	   	if(json.shared_key_indicators[i].item.ticker == 'USD Нал'){
			getParam(json.shared_key_indicators[i].item.prepared.value1, result, 'balanceusdpredl', null, null, parseBalance);
			getParam(json.shared_key_indicators[i].item.prepared.value2, result, 'balanceusdspros', null, null, parseBalance);
	   	}
		if(json.shared_key_indicators[i].item.ticker == 'EUR Нал'){
			getParam(json.shared_key_indicators[i].item.prepared.value1, result, 'balanceeurpredl', null, null, parseBalance);
    		getParam(json.shared_key_indicators[i].item.prepared.value2, result, 'balanceeurspros', null, null, parseBalance);
		}
		if(json.shared_key_indicators[i].item.ticker == 'EUR/USD'){
			getParam(json.shared_key_indicators[i].item.prepared.closevalue, result, 'balanceeurusdcv', null, null, parseBalance);
    		getParam(json.shared_key_indicators[i].item.prepared.change, result, 'balanceeurusdch', null, null, parseBalance);
		}
		if(json.shared_key_indicators[i].item.ticker == 'BTC/USD'){
			getParam(json.shared_key_indicators[i].item.prepared.closevalue, result, 'balancebtcusdcv', null, null, parseBalance);
    		getParam(json.shared_key_indicators[i].item.prepared.change, result, 'balancebtcusdch', null, null, parseBalance);
		}
		if(json.shared_key_indicators[i].item.ticker == 'USD ЦБ'){
			getParam(json.shared_key_indicators[i].item.prepared.closevalue, result, 'balanceusdcbrfrt', null, null, parseBalance);
    		getParam(json.shared_key_indicators[i].item.prepared.change, result, 'balanceusdcbrfch', null, null, parseBalance);
		}
		if(json.shared_key_indicators[i].item.ticker == 'EUR ЦБ'){
			getParam(json.shared_key_indicators[i].item.prepared.closevalue, result, 'balanceeurcbrfrt', null, null, parseBalance);
    		getParam(json.shared_key_indicators[i].item.prepared.change, result, 'balanceeurcbrfch', null, null, parseBalance);
		}
		if(json.shared_key_indicators[i].item.ticker == 'CNY ЦБ'){
			getParam(json.shared_key_indicators[i].item.prepared.closevalue, result, 'balancecnycbrfrt', null, null, parseBalance);
    		getParam(json.shared_key_indicators[i].item.prepared.change, result, 'balancecnycbrfch', null, null, parseBalance);
		}
		if(json.shared_key_indicators[i].item.ticker == 'USD Бирж'){
			getParam(json.shared_key_indicators[i].item.prepared.closevalue, result, 'balanceusdstoсkrt', null, null, parseBalance);
    		getParam(json.shared_key_indicators[i].item.prepared.change, result, 'balanceusdstoсkch', null, null, parseBalance);
		}
		if(json.shared_key_indicators[i].item.ticker == 'EUR Бирж'){
			getParam(json.shared_key_indicators[i].item.prepared.closevalue, result, 'balanceeurstoсkrt', null, null, parseBalance);
    		getParam(json.shared_key_indicators[i].item.prepared.change, result, 'balanceeurstoсkch', null, null, parseBalance);
		}
		if(json.shared_key_indicators[i].item.ticker == 'CNY Бирж'){
			getParam(json.shared_key_indicators[i].item.prepared.closevalue, result, 'balancecnystoсkrt', null, null, parseBalance);
    		getParam(json.shared_key_indicators[i].item.prepared.change, result, 'balancecnystoсkch', null, null, parseBalance);
		}
	}
	
	var dt = new Date();
	var updDate = n2(dt.getDate()) + '.' + n2(dt.getMonth()+1) + '.' + dt.getFullYear();
	
	getParam(updDate, result, '__tariff');
	
	if(AnyBalance.isAvailable('date'))
	    getParam(updDate, result, 'date', null, null, parseDate);
	
	AnyBalance.setResult(result);
}
