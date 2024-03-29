// BTC wallet validation, BTC wallets are 27 to 34 long, alphanumeric and must start with either 1 or 3
function validateBtcWallet(wallet) 
{
	if (typeof(wallet)=="undefined")
		throw new AnyBalance.Error("Please enter your BTC wallet!");
	if ((wallet.length<27) || (wallet.length>34))
		throw new AnyBalance.Error("Invalid BTC wallet, must be 27 to 34 characters long!");
	if (/[^a-zA-Z0-9]/.test(wallet))
		throw new AnyBalance.Error("Invalid BTC wallet, must contain alphanumeric characters only!");
	if ((wallet[0]!='1') && (wallet[0]!='3'))
		throw new AnyBalance.Error("Invalid BTC wallet, must begin with either '1' or '3'!");
}

// BTC exchange rate by currency code, from coindesk.com
function getCDExchangeRate(currency)
{
    currency = currency.toUpperCase();
    if (currency.match(/^[A-Z][A-Z][A-Z]$/)==null)
        throw new AnyBalance.Error("currency code must be 3 characters long, English letters only");
    var json = AnyBalance.requestGet('http://api.coindesk.com/v1/bpi/currentprice/' + currency + '.json', g_headers);
    try 
    {
        json = JSON.parse(json);
    } 
    catch(error)
    {
        // errors are returned by coindesk as plain text string, so json parsing would fail
	AnyBalance.trace(json);
        throw new AnyBalance.Error("coindesk.com: could not get exchange rate");
    }
    
    if ((typeof json.bpi=="undefined") || (typeof json.bpi[currency]=="undefined"))
        throw new AnyBalance.Error("unexpected coindesk.com repsonse");

    return {
	rate: json.bpi[currency].rate_float,
	currency: json.bpi[currency].code
    };
}


function getBIExchangeRate(currency){
    currency = currency.toUpperCase();
    if (currency.match(/^[A-Z][A-Z][A-Z]$/)==null)
        throw new AnyBalance.Error("currency code must be 3 characters long, English letters only");
    var json = AnyBalance.requestGet('https://blockchain.info/ticker', g_headers);
    try 
    {
        json = JSON.parse(json);
    } 
    catch(error)
    {
        // errors are returned by coindesk as plain text string, so json parsing would fail
	AnyBalance.trace(json);
        throw new AnyBalance.Error("blockchain.info: could not get exchange rate");
    }
    
    if ((typeof json[currency]=="undefined"))
        throw new AnyBalance.Error("unexpected blockchain.info repsonse");

    return {
	rate: json[currency].buy,
	currency: json[currency].symbol
    };
}

function getExchangeRate(currency){
	try{
		return getCDExchangeRate(currency);
	}catch(e){
		AnyBalance.trace(e.message);
		return getBIExchangeRate(currency);
	}
}