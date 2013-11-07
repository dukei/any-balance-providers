/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function getRateText(result, info, namein, nameout, force) {
	var matches, regexp = new RegExp('"' + namein + '"[^"]*"([^"]*)"', 'i');
	if (matches = info.match(regexp)) {
		if (force || AnyBalance.isAvailable(nameout)) result[nameout] = matches[1];
	}
}

function getRate(result, info, namein, nameout) {
	var matches, regexp = new RegExp('"' + namein + '"[^"]*"([^"]*)"', 'i');
	if (matches = info.match(regexp)) {
		if (AnyBalance.isAvailable(nameout)) result[nameout] = parseFloat(matches[1].replace(',', '.'));
	}
}

function main() {
	AnyBalance.trace('Connecting to forex...');

	var info = AnyBalance.requestGet('http://www.forexpf.ru/_informer_/cbrf.php?id=012345678');
	var result = {success: true};

	getRate(result, info, 'usrutm', 'USD');
	getRate(result, info, 'eurutm', 'EUR');
	getRate(result, info, 'gbrutm', 'GBP');
	getRate(result, info, 'byrutm', 'BYR');
	getRate(result, info, 'kzrutm', 'KZT');
	getRate(result, info, 'cnrutm', 'CNY');
	getRate(result, info, 'uarutm', 'UAH');
	getRate(result, info, 'chrutm', 'CHF');
	getRate(result, info, 'jprutm', 'JPY');

	getRateText(result, info, 'pfdt2', 'date');
	getRateText(result, info, 'pfdt2', '__tariff', true);

	AnyBalance.setResult(result);
}