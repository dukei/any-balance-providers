// emaulate firefox headers
var g_headers = 
{
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
//	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
//	'Accept-Language': 'en-US',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};


// check/update currencty symbol
function currencySymbolCheck(symbol)
{
    symbol = symbol.toUpperCase();
    if (!/^[A-Z]{3,5}$/.test(symbol))
        throw new AnyBalance.Error("Currency codes must be 3 to 5 letters long, capital English letters only, no extra spaces or other characters.");
    return(symbol);
}


// ask for the cryptocurrency ID
function currencyId(symbol)
{
    // check if we have this one saved before fetching it
	var id = AnyBalance.getData(symbol, null);
	if(id != null && /^\d+$/.test(String(id)))
    {
        AnyBalance.trace("Cryptocurrency ID is already known, using the known value..."); 
		return(id);
    }

    // don't have it? fetch the ID
    AnyBalance.trace("Finding out cryptocurrency ID..."); 
    var url = "https://pro-api.coinmarketcap.com/v1/cryptocurrency/map?symbol=" + symbol;
    var html = AnyBalance.requestGet(url, g_headers);
    var json = getJson(html);

    if(!json.status || json.status.error_code){
    	var error = json.status && json.status.error_message;
    	if(error)
    		throw new AnyBalance.Error(error, null, /Invalid/i.test(error));
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Could not receive CMC id for the ticker');
    }

    if(!json.data || !json.data.length || json.data[0].id == null)
    	throw new AnyBalance.Error('Could not find cryptocurrency with ticker ' + symbol);

    id = json.data[0].id;
    AnyBalance.setData(symbol, id);
    AnyBalance.saveData();
    return id;
}


// main entry point
function main() 
{
    // get and check preferences
	AnyBalance.setDefaultCharset('utf-8');
        AnyBalance.setOptions({charset: 'utf-8'});
    var prefs = AnyBalance.getPreferences();
    var base = currencySymbolCheck(prefs.base || '');
    var target = currencySymbolCheck(prefs.target || '');

    if(prefs.api_key)
    	g_headers['X-CMC_PRO_API_KEY'] = prefs.api_key;
    
    // get the base cryptocurrency ID first
    var baseId = currencyId(base);
    AnyBalance.trace("The ID for " + base + " is " + baseId);
    
    // get the currency conversion info
    var url = "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?id=" + baseId + "&convert=" + target;
    var html = AnyBalance.requestGet(url, g_headers);
    AnyBalance.trace(html, "server reply"); 
    var json = getJson(html);
    var result = {success: true};

    if(!json.data){
    	if(json.status && json.status.error_message){
    		throw new AnyBalance.Error(json.status.error_message.replace(/Please contact us.*/i, 'Please, register at https://pro.coinmarketcap.com/signup and input your own API Key to the provider preferences.'));
    	}
    	throw new AnyBalance.Error('Could not get currency info. Is the site changed?');
    }

    for(var sym in json.data){
        var info = json.data[sym];

        if(!info.quote || !info.quote[target.toUpperCase()])
            throw new AnyBalance.Error("Unexpected target currency code.");

        var rate = info.quote[target.toUpperCase()].price;
        var cap = info.quote[target.toUpperCase()].market_cap;
        
        // the server will still return the usual JSON, nor an error, in case of bad 
        // target currency, but the price is going to be missing
        if (rate == null)
            throw new AnyBalance.Error("Unexpected target currency code.");
        
		// return the result
        AnyBalance.trace(rate, "exchange rate");
        
        getParam(info.symbol + ' → ' + target, result, '__tariff');
        getParam(+rate, result, 'exchangerate');
        getParam(info.symbol, result, 'symbol');
        getParam(+info.cmc_rank, result, 'rank');
        getParam(cap && +cap, result, 'cap');
        getParam(target, result, ['currency', 'cap', 'exchangerate']);
        
        if(AnyBalance.isAvailable('price_btc')){
        	if(base === 'BTC'){
        		getParam(1000, result, 'price_btc');
        	}else if(target.toUpperCase() === 'BTC'){
        		// The main request already contains the BTC price
        		getParam(rate * 1000, result, 'price_btc');
        	}else{
        		// CMC plan allows only one convert currency per request,
        		// so BTC has to be requested separately.
        		var urlBtc = "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?id=" + baseId + "&convert=BTC";
        		var htmlBtc = AnyBalance.requestGet(urlBtc, g_headers);
        		AnyBalance.trace(htmlBtc, "server reply 2"); 
        		var jsonBtc = getJson(htmlBtc);

        		if(!jsonBtc.data)
        			throw new AnyBalance.Error('Could not get BTC exchange rate.');

        		for(var sym1 in jsonBtc.data){
        			if(!jsonBtc.data[sym1].quote ||
        				!jsonBtc.data[sym1].quote.BTC ||
        				jsonBtc.data[sym1].quote.BTC.price == null)
        				throw new AnyBalance.Error('Could not get BTC exchange rate.');

        			getParam(jsonBtc.data[sym1].quote.BTC.price * 1000, result, 'price_btc');
        			break;
        		}
        	}
        }

    	break;
    }

    AnyBalance.trace("Elapsed: " + json.status.elapsed);

	AnyBalance.setResult(result);
}
