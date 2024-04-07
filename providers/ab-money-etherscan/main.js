
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
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://etherscan.io/';
	var baseurlApi = 'https://api.etherscan.io/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Enter your account address!');
	AB.checkEmpty(/^(?:0x)?[a-z0-9]{40}$/i, 'The address should contain exactly 40 hexedecimal digits! Check your input');

	var result = {success: true};

	if(AnyBalance.isAvailable('gasprice', 'basefee')){
		var html = AnyBalance.requestGet('https://api.owlracle.info/v4/eth/gas?apikey=4407d767cb5745f7b1469320d3728411', g_headers);
		var json = getJson(html);
		getParam(Math.round(json.speeds[0].baseFee*10)/10, result, 'basefee');
		getParam(Math.round(json.speeds[0].maxFeePerGas*10)/10, result, 'gasprice');
	}

	if(AnyBalance.isAvailable('balance', 'usd', 'btc')){
		var html = AnyBalance.requestGet(baseurlApi + 'api?module=account&action=balance&address=' + encodeURIComponent(prefs.login) + '&tag=latest&apikey=797R6CPKXY7ZUI7VTHFB9IINH1W4U959RM', g_headers);
		var json = getJson(html);
		var balance = (+json.result)/1000000000000000000;
		getParam(balance, result, 'balance');

	}

        if(AnyBalance.isAvailable('usd', 'btc', 'rate', 'rate_btc')){
		var html = AnyBalance.requestGet(baseurlApi + 'api?module=stats&action=ethprice&apikey=797R6CPKXY7ZUI7VTHFB9IINH1W4U959RM', g_headers);
		var json = getJson(html);
		getParam(Math.round(json.result.ethusd*100)/100, result, ['rate', 'usd']);
		getParam(+json.result.ethbtc, result, ['rate_btc', 'btc']);
		getParam(result.balance*json.result.ethbtc, result, 'btc');
		getParam(result.balance*json.result.ethusd, result, 'usd');
	}

	AnyBalance.setResult(result);                              
}


