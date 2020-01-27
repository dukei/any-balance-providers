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
        var d = new Date();
        result.__tariff =  ("0" + d.getDate()).slice(-2) + "." + ("0"+(d.getMonth()+1)).slice(-2) + "." +
    d.getFullYear() + " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);

    getParam(html, result, curr + "_bittrex", new RegExp('"Bid":([0123456789\.]*)\,', 'i'), null, parseBalance);
}


function main() {
	AnyBalance.trace('Connecting to privatbank for get exchange');
	var info = AnyBalance.requestGet('https://api.privatbank.ua/p24api/pubinfo?exchange&coursid=5');
    
	var result = {success: true};

	getRate(result, info, 'USD');
	getRate(result, info, 'EUR');
	getRate(result, info, 'RUR');
	getRate(result, info, 'BTC');

	AnyBalance.trace('Connecting to privatbank for get cardExchange');
	var info = AnyBalance.requestGet('https://api.privatbank.ua/p24api/pubinfo?cardExchange');

	getCardExchangeRate(result, info, 'USD');
	getCardExchangeRate(result, info, 'EUR');
	getCardExchangeRate(result, info, 'RUR');
	
	getBittrex(result, 'BTC');
       	getBittrex(result, 'ETH');

       	AnyBalance.trace('Connecting to investing.com for get Brent price');
	var info = AnyBalance.requestGet('https://ru.widgets.investing.com/live-commodities?hideTitle=true&cols=last&pairs=8833');
        getParam(info, result, "Brent", new RegExp('last js-col-last pid.*>((\d|\,|\.)+)<', 'i'), null, parseBalance);
    
	AnyBalance.setResult(result);
}