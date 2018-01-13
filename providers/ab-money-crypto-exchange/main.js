// emaulate firefox headers
var g_headers = 
{
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'en-US',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};


// check/update currencty symbol
function currencySymbolCheck(symbol)
{
    symbol = symbol.toUpperCase();
    if (!/^[A-Z]{3,5}$/.test(symbol))
        throw new AnyBalance.Error("Currency codes must be 3 to 5 letters long, English letters only, no extra spaces or other characters.");
    return(symbol);
}


// ask for the GUID, this will only work on mobile connection, on the 012 network
function currencyId(symbol)
{
    // the list of all the currencies is huge, check if we have this one saved before fetching it
	var id = AnyBalance.getData(symbol, null);
	if (id!=null)
    {
        AnyBalance.trace("Cryptocurrency ID is already known, using the known value..."); 
		return(id);
    }

    // don't have it? shit! fetch the huge list
    AnyBalance.trace("Finding out cryptocurrency ID..."); 
    var url = "https://api.coinmarketcap.com/v1/ticker/?limit=0";
    var html = AnyBalance.requestGet(url, g_headers);
    var json = getJson(html);
    
    // find the currency
    for (var i = 0; i < json.length; i++)
    {
        if (json[i].symbol==symbol)
        {
            AnyBalance.setData(symbol, json[i].id);
            AnyBalance.saveData();            
            return(json[i].id);
        }
    }
    
    // oops
    throw new AnyBalance.Error("Unknow cryptocurrency code.");
}


// main entry point
function main() 
{
	// make sure the data save/resore API is supported
	if (AnyBalance.getLevel()<9)
        throw new AnyBalance.Error("This provider requires a newer Anybalance version.");
    
    // get and check preferences
	AnyBalance.setDefaultCharset('utf-8');
    var prefs = AnyBalance.getPreferences();
    var base = currencySymbolCheck(prefs.base);
    var target = currencySymbolCheck(prefs.target);
    
    // get the base currency id first
    var baseId = currencyId(base);
    AnyBalance.trace("The ID for " + base + " is " + baseId);
    
    // get the currency conversion info
    var url = "https://api.coinmarketcap.com/v1/ticker/" + baseId + "/?convert=" + target;
    var html = AnyBalance.requestGet(url, g_headers);
    AnyBalance.trace(html, "server reply"); 
    var json = getJson(html);
    var rate = json[0]["price_" + target.toLowerCase()];
    var cap = json[0]["market_cap_" + target.toLowerCase()];
    
    // the server will still return the usual JSON, nor an error, in case of bad 
    // target currency, but the price is going to be missing
    if (rate == null)
        throw new AnyBalance.Error("Unexpected target currency code.");
    
	// return the result
    AnyBalance.trace(rate, "exchange rate");
    var result = {success: true};

    getParam(+rate, result, 'exchangerate');
    getParam(json[0].price_btc*1000, result, 'price_btc');
    getParam(json[0].symbol, result, ['symbol', 'exchangerate', 'rank']);
    getParam(+json[0].rank, result, 'rank');
    getParam(cap && +cap, result, 'cap');

	AnyBalance.setResult(result);
}