var g_headers = 
{
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'en-US',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() 
{
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://blockchain.info/address/';
	AnyBalance.setDefaultCharset('utf-8');
	
	validateBtcWallet(prefs.wallet);
	if(prefs.currency && !CurrencyISO.getCurrencySymbol(prefs.currency))
		throw new AnyBalance.Error('Wrong currency code. Use 3 letters ISO currency code, for example, USD', null, true);
	
	var html, maxtries = 6, tries = 1;
	do{
		AnyBalance.trace('Trying to get wallet balance from blockchain.info ' + tries + '/' + maxtries);
		html = AnyBalance.requestGet(baseurl + prefs.wallet, g_headers);
		if(/Maximum concurrent requests for this endpoint reached/i.test(html)){
			if(tries < 6){
				AnyBalance.trace('Maximum concurrent requests for this endpoint reached, sleeping 3 seconds');
				++tries;
				AnyBalance.sleep(3000);
			}else{
				AnyBalance.trace('Too frequent requests. Will try later');
			}
		}else{
			break;
		}
	}while(true);

	var result = {success: true};
	
	// parse errors reported by blockchain.info, convert into AnyBalance exceptions if any
	var errdiv = getElement(html, /<div[^>]+alert/i, replaceTagsAndSpaces);
	if (errdiv!=null)
		throw new AnyBalance.Error("blockchain.info: "+errdiv);

	// parse params
	getParam(html, result, 'balance', /(<td[^>]+id="final_balance"[^>]*>[\s\S]*?<\/td>)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'total_received', /(<td[^>]+id="total_received"[^>]*>[\s\S]*?<\/td>)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'n_transactions', /(<td[^>]+id="n_transactions"[^>]*>[\s\S]*?<\/td>)/i, replaceTagsAndSpaces, parseBalance);

    // convert if needed
    if ((typeof prefs.currency!="undefined") && (prefs.currency!=""))
    {
        var exchange = getExchangeRate(prefs.currency);
        result['currency'] = CurrencyISO.getCurrencySymbol(exchange.code);
        result['exchange_rate'] = Math.round(exchange.rate_float*100)/100;
        result['value'] = Math.round(result['balance']*exchange.rate_float*100)/100;
    }

   	result.btcunits = 'Ƀ';
    if(prefs.mbtc){
    	if(result.balance)
    		result.balance = Math.round(result.balance*1000*100000)/100000;
    	if(result.total_received)
    		result.total_received = Math.round(result.total_received*1000*100000)/100000;
    	result.btcunits = 'mɃ';
    }

    result.__tariff = prefs.wallet;

    setCountersToNull(result);
    
	AnyBalance.setResult(result);
}
