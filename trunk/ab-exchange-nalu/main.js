/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function getRate(result, info) {
	var dan = $('div.block_480x200 td:eq(7),div.block_480x200 td:eq(8),div.block_480x200 td:eq(11),div.block_480x200 td:eq(12),div.block_480x200 td:eq(15),div.block_480x200 td:eq(16)', info).text();
	var inner = dan.split(/\s+/ig);
	result['USDs'] = inner[3];
	result['USDp'] = inner[1];
	result['EURs'] = inner[7];
	result['EURp'] = inner[5];
	result['RUBs'] = inner[11];
	result['RUBp'] = inner[9];
}

function main() {
	if (AnyBalance.getLevel() < 5)
		throw new AnyBalance.Error("Для этого провайдера необходимо AnyBalance API v.5+");

	AnyBalance.trace('Connecting to http://banker.ua/marketindex/course/...');
	var info = AnyBalance.requestGet('http://banker.ua/marketindex/course/');
	var result = {success: true};
	getRate(result, info);
	AnyBalance.setResult(result);
}