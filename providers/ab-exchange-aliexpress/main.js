
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
  'Accept': 'application/json, text/javascript, */*; q=0.01',
  'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
  'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
  'X-Requested-With': 'XMLHttpRequest',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
};

function main() {
  	AnyBalance.setDefaultCharset('utf-8');
	
	var html = AnyBalance.requestGet('https://moneyfromnothing.ru/blog/aliexpress-kurs-dollara/rates_data.json?_=' + new Date().getTime(), g_headers);
	
	if (!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
	}
	
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
	var result = {success: true};
	
	getParam(json.updateTime, result, 'date', null, null, parseDateISO);
	getParam(json.currentRateAliExpress, result, 'rate', null, null, parseBalanceRound);
	getParam(json.currentRateAliExpressRu, result, 'rateru', null, null, parseBalanceRound);
	getParam(json.currentRateCbr, result, 'ratecbrf', null, null, parseBalanceRound);
	getParam(json.updateTime && json.updateTime.replace(/(\d{4})-(\d{2})-(\d{2})(.*)/,'$3.$2.$1'), result, '__tariff');
	
	if(AnyBalance.isAvailable('date'))
	    getParam(json.updateTime && json.updateTime.replace(/(\d{4})-(\d{2})-(\d{2})(.*)/,'$3.$2.$1'), result, 'date', null, null, parseDate);
	
	if (AnyBalance.isAvailable('trend', 'averrate')) {
	    if (json.ratesAliExpress && json.ratesAliExpress.length>0){
			var __rate;
	    	for(var i=0; i<json.ratesAliExpress.length; ++i){
	    		var rate = json.ratesAliExpress[i].rate;
	    		sumParam(rate, result, '__rate', null, null, parseBalanceSilent, aggregate_sum);
	    	}
		
	    	var weekAgoRate = json.ratesAliExpress[0].rate;
	    	var period = json.ratesAliExpress.length;
	    	var averrageRate = result.__rate/period;
			delete result.__rate;
			getParam(averrageRate, result, 'averrate', null, null, parseBalanceRound);
	        	
	    	if(result.rate > weekAgoRate){
	    		result.trend = 'AG$ ↑';
	    	}else if(result.rate < weekAgoRate){
	    		result.trend = 'AG$ ↓';
	    	}else{
	    		result.trend = 'AG$ -';
	    	}
	    }
	}
	
	if (AnyBalance.isAvailable('trendru', 'averrateru')) {
	    if (json.ratesAliExpressRu && json.ratesAliExpressRu.length>0){
			var __rateru;
	    	for(var i=0; i<json.ratesAliExpressRu.length; ++i){
	    		var rate = json.ratesAliExpressRu[i];
	    		sumParam(rate.rate, result, '__rateru', null, null, parseBalanceSilent, aggregate_sum);
	    	}
	        	
	    	var weekAgoRate = json.ratesAliExpressRu[0].rate;
	    	var period = json.ratesAliExpressRu.length;
	    	var averrageRate = result.__rateru/period;
			delete result.__rateru;
			getParam(averrageRate, result, 'averrateru', null, null, parseBalanceRound);
	        	
	    	if(result.rateru > weekAgoRate){
	    		result.trendru = 'AR$ ↑';
	    	}else if(result.rateru < weekAgoRate){
	    		result.trendru = 'AR$ ↓';
	    	}else{
	    		result.trendru = 'AR$ -';
	    	}
	    }
	}
	
	if (AnyBalance.isAvailable('trendcbrf', 'averratecbrf')) {
	    if (json.ratesCbr && json.ratesCbr.length>0){
			var __ratecbrf;
	    	for(var i=0; i<json.ratesCbr.length; ++i){
	    		var rate = json.ratesCbr[i];
	    		sumParam(rate.rate, result, '__ratecbrf', null, null, parseBalanceSilent, aggregate_sum);
	    	}
	        	
	    	var weekAgoRate = json.ratesCbr[0].rate;
	    	var period = json.ratesCbr.length;
	    	var averrageRate = result.__ratecbrf/period;
			delete result.__ratecbrf;
			getParam(averrageRate, result, 'averratecbrf', null, null, parseBalanceRound);
	        	
	    	if(result.ratecbrf > weekAgoRate){
	    		result.trendcbrf = 'CB$ ↑';
	    	}else if(result.ratecbrf < weekAgoRate){
	    		result.trendcbrf = 'CB$ ↓';
	    	}else{
	    		result.trendcbrf = 'CB$ -';
	    	}
	    }
	}
    
    AnyBalance.setResult(result);
}

function parseBalanceRound(val) {
	var balance = parseBalance(val + '');
	if(!isset(balance))
		return null;
	
	return Math.round(balance*100)/100;
}
