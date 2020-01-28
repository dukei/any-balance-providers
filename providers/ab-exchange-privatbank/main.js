/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function getRate(result, html, curr){
    getParam(html, result, curr + "_buy", new RegExp('<exchangerate[^>]+\\bccy="' + curr + '"[^>]*buy="([^"]*)', 'i'), null, parseBalance);
    getParam(html, result, curr + "_sell", new RegExp('<exchangerate[^>]+\\bccy="' + curr + '"[^>]*sale="([^"]*)', 'i'), null, parseBalance);
}
function getCardExchangeRate(result, html, curr){
    getParam(html, result, curr + "_buy_card", new RegExp('<exchangerate[^>]+\\bccy="' + curr + '"[^>]*buy="([^"]*)', 'i'), null, parseBalance);
    getParam(html, result, curr + "_sell_card", new RegExp('<exchangerate[^>]+\\bccy="' + curr + '"[^>]*sale="([^"]*)', 'i'), null, parseBalance);
}
function getBittrex(result, curr){
    AnyBalance.trace('Connecting to bitrex.com for get '+curr);
    var html = AnyBalance.requestGet('https://bittrex.com/api/v1.1/public/getmarketsummary?market=usd-'+curr);
    result[curr + '_bittrex']=getJson(html).result[0].Bid;
}


function main() {
	AnyBalance.trace('Connecting to privatbank for get exchange');
	var info = AnyBalance.requestGet('https://api.privatbank.ua/p24api/pubinfo?exchange&coursid=5');
    
	var result = {success: true};
        
	getRate(result, info, 'USD');
	getRate(result, info, 'EUR');
	getRate(result, info, 'RUR');
	getRate(result, info, 'BTC');

        if(AnyBalance.isAvailable('USD_buy_card','USD_sell_card','EUR_buy_card','EUR_sell_card','RUR_buy_card','RUR_sell_card')){
	  AnyBalance.trace('Connecting to privatbank for get cardExchange');
	  var info = AnyBalance.requestGet('https://api.privatbank.ua/p24api/pubinfo?cardExchange');

	  getCardExchangeRate(result, info, 'USD');
	  getCardExchangeRate(result, info, 'EUR');
	  getCardExchangeRate(result, info, 'RUR');
	}
	if(AnyBalance.isAvailable('BTC_bittrex')) getBittrex(result, 'BTC');
       	if(AnyBalance.isAvailable('ETH_bittrex')) getBittrex(result, 'ETH');

        if(AnyBalance.isAvailable('Brent')){ 
       	  AnyBalance.trace('Connecting to investing.com for get Brent price');
	  var info = AnyBalance.requestGet('https://ru.widgets.investing.com/live-commodities?hideTitle=true&cols=last&pairs=8833');
          getParam(info, result, "Brent", new RegExp('last js-col-last pid.*>((\d|\,|\.)+)<', 'i'), null, parseBalance);
        }
	result.__tarif=getFormattedDate('DD.MM.YYYY HH:NN')
	AnyBalance.setResult(result);
}