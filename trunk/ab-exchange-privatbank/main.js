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

function main() {
	AnyBalance.trace('Connecting to forex...');

	var info = AnyBalance.requestGet('https://api.privatbank.ua/p24api/pubinfo?exchange&coursid=5');
    
	var result = {success: true};

	getRate(result, info, 'USD');
	getRate(result, info, 'EUR');
	getRate(result, info, 'RUR');

	var info = AnyBalance.requestGet('https://api.privatbank.ua/p24api/pubinfo?cardExchange');

	getCardExchangeRate(result, info, 'USD');
	getCardExchangeRate(result, info, 'EUR');
	getCardExchangeRate(result, info, 'RUR');
    
	AnyBalance.setResult(result);
}