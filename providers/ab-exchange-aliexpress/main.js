
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
    'Cache-Control': 'max-age=0',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

function main() {
  	AnyBalance.setDefaultCharset('utf-8');
	
	var html = AnyBalance.requestGet('https://helpix.ru/currency/', g_headers);
	
	if (!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
	}
	
	var result = {success: true};
	
	var table = getElement(html, /<table[^>]+class="b-tabcurr">/i);
	var rows = getElements(table, [/<tr[^>]+class="b-tabcurr__tr"[^>]*>/ig, /b-currency/i]);
	
	if (!table || !rows){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти таблицу курсов. Сайт изменен?');
	}
	
	if(rows.length && rows.length > 0){
	    AnyBalance.trace('Найдено строк с курсами: ' + rows.length);
		getParam(rows[0], result, 'date', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, [replaceTagsAndSpaces, /(\d{4})-(\d{2})-(\d{2})(.*)/, '$3.$2.$1'], parseDate);
		getParam(rows[0], result, '__tariff', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, [replaceTagsAndSpaces, /(\d{4})-(\d{2})-(\d{2})(.*)/, '$3.$2.$1']);
		for(var i=0; i<rows.length; ++i){
	    	var row = rows[i];
			
			var rate = getParam(row, null, null, /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalanceSilent);
			var rateru = getParam(row, null, null, /(?:[\s\S]*?<td[^>]*>){3}<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalanceSilent);
			var ratecbrf = getParam(row, null, null, /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalanceSilent);
			
			if(rate && !result.rate)
				getParam(rate, result, 'rate', null, null, parseBalanceRound);
			
			if(rateru && !result.rateru)
				getParam(rateru, result, 'rateru', null, null, parseBalanceRound);
			
			if(ratecbrf && !result.ratecbrf)
				getParam(ratecbrf, result, 'ratecbrf', null, null, parseBalanceRound);
			
			if(i>=9 || (result.rate && result.rateru && result.ratecbrf)) break;
	    }
	}else{
		AnyBalance.trace('Не удалось получить информацию по курсам');
	}
	
	if (AnyBalance.isAvailable('trend', 'averrate')) {
	    if (rows && rows.length>0){
			var __rate;
			var period = 0;
	    	for(var i=0; i<rows.length; ++i){
	    		sumParam(rows[i], result, '__rate', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalanceSilent, aggregate_sum);
	    	    
			    if(result.__rate) period += 1;
				
				if(i>=9) break;
			}
		    
	    	var weekAgoRate = getParam(rows[period], null, null, /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalanceSilent);
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
	    if (rows && rows.length>0){
			var __rateru;
			var period = 0;
	    	for(var i=0; i<rows.length; ++i){
				sumParam(rows[i], result, '__rateru', /(?:[\s\S]*?<td[^>]*>){3}<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalanceSilent, aggregate_sum);
	    	    
				if(result.__rateru) period += 1;
				
				if(i>=9) break;
			}
	        
			var weekAgoRate = getParam(rows[period], null, null, /(?:[\s\S]*?<td[^>]*>){3}<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalanceSilent);
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
	    if (rows && rows.length>0){
			var __ratecbrf;
			var period = 0;
	    	for(var i=0; i<rows.length; ++i){
				sumParam(rows[i], result, '__ratecbrf', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalanceSilent, aggregate_sum);
				
				if(result.__ratecbrf) period += 1;
				
				if(i>=9) break;
	    	}
	        
			var weekAgoRate = getParam(rows[period], null, null, /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalanceSilent);
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
	
	setCountersToNull(result);
    
    AnyBalance.setResult(result);
}

function parseBalanceRound(val) {
	var balance = parseBalance(val + '');
	if(!isset(balance))
		return null;
	
	return Math.round(balance*100)/100;
}
