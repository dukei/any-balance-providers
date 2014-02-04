/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function getRate(result, html, curr){
    getParam(html, result, curr + "_buy", new RegExp('<exchangerate[^>]+\\bccy="' + curr + '"[^>]*buy="([^"]*)', 'i'), null, parseBalance);
    getParam(html, result, curr + "_sell", new RegExp('<exchangerate[^>]+\\bccy="' + curr + '"[^>]*sale="([^"]*)', 'i'), null, parseBalance);
}

function main() {
	AnyBalance.trace('Connecting to forex...');

	var info = AnyBalance.requestGet('https://api.privatbank.ua/p24api/pubinfo?exchange&coursid=5');
	var result = {success: true};

	getRate(result, info, 'USD');
	getRate(result, info, 'EUR');
	getRate(result, info, 'RUR');

	AnyBalance.setResult(result);
}