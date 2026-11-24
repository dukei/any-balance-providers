var g_headers =
{
	'Accept': 'application/json,text/plain,*/*',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'en-US',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};
function main()
{
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://blockchain.info/balance?active=';
	AnyBalance.setDefaultCharset('utf-8');

	validateBtcWallet(prefs.wallet);
	if(prefs.currency && !CurrencyISO.getCurrencySymbol(prefs.currency))
		throw new AnyBalance.Error('Wrong currency code. Use 3 letters ISO currency code, for example, USD', null, true);

	var json, maxtries = 6, tries = 1;
	do{
		AnyBalance.trace('Trying to get wallet balance from blockchain.info ' + tries + '/' + maxtries);
		json = AnyBalance.requestGet(baseurl + encodeURIComponent(prefs.wallet), g_headers);

		if(!json){
			if(tries < maxtries){
				AnyBalance.trace('Blockchain API returned an empty response, sleeping 3 seconds');
				++tries;
				AnyBalance.sleep(3000);
			}else{
				throw new AnyBalance.Error('blockchain.info: empty response');
			}
		}else if(/Maximum concurrent requests for this endpoint reached/i.test(json)){
			if(tries < maxtries){
				AnyBalance.trace('Maximum concurrent requests for this endpoint reached, sleeping 3 seconds');
				++tries;
				AnyBalance.sleep(3000);
			}else{
				throw new AnyBalance.Error('blockchain.info: too frequent requests');
			}
		}else{
			break;
		}
	}while(true);

	var result = {success: true};

	// Parse JSON returned by blockchain.info
	var data;
	try{
		data = JSON.parse(json);
	}catch(e){
		AnyBalance.trace('Blockchain API returned invalid JSON: ' + json);
		throw new AnyBalance.Error('blockchain.info: invalid response from API');
	}

	// The balance API returns an object keyed by the requested address.
	// Example:
	// {
	//   "1ABC...": {
	//     "final_balance": 123456,
	//     "n_tx": 5,
	//     "total_received": 123456
	//   }
	// }
	var walletData = data[prefs.wallet];

	// Some APIs/proxies may normalize the address differently.
	// In that case try to find a case-insensitive matching key.
	if(!walletData){
		for(var address in data){
			if(address.toLowerCase() == prefs.wallet.toLowerCase()){
				walletData = data[address];
				break;
			}
		}
	}

	if(!walletData){
		AnyBalance.trace('Blockchain API response does not contain requested wallet: ' + prefs.wallet);
		throw new AnyBalance.Error('blockchain.info: wallet address was not found in API response');
	}

	// Check that the API returned the fields we need.
	if(typeof walletData.final_balance == 'undefined'){
		throw new AnyBalance.Error('blockchain.info: final_balance is missing in API response');
	}

	// Values returned by Blockchain Data API are in satoshi.
	// 1 BTC = 100,000,000 satoshi.
	result.balance = walletData.final_balance / 100000000;
	result.balance_mbtc = walletData.final_balance / 100000;

	if(typeof walletData.total_received != 'undefined'){
		result.total_received = walletData.total_received / 100000000;
		result.total_received_mbtc = walletData.total_received / 100000;
	}

	if(typeof walletData.n_tx != 'undefined')
		result.n_transactions = walletData.n_tx;

	// convert if needed
	if ((typeof prefs.currency!="undefined") && (prefs.currency!=""))
	{
		var exchange = getExchangeRate(prefs.currency);
		result['currency'] = CurrencyISO.getCurrencySymbol(exchange.currency);
		result['exchange_rate'] = Math.round(exchange.rate*100)/100;
		result['value'] = Math.round(result['balance']*exchange.rate*100)/100;
	}

	result.btcunits = 'Ƀ';

	// mBTC values are already calculated directly from satoshi.
	// Keep five decimal places as in the original provider.
	if(typeof result.balance_mbtc != 'undefined')
		result.balance_mbtc = Math.round(result.balance_mbtc*100000)/100000;

	if(typeof result.total_received_mbtc != 'undefined')
		result.total_received_mbtc = Math.round(result.total_received_mbtc*100000)/100000;

	result.btcunits = 'mɃ';

	result.__tariff = prefs.wallet;

	setCountersToNull(result);

	AnyBalance.setResult(result);
}