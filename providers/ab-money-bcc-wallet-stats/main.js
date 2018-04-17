var g_headers = 
{
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'en-US',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36'
};

function main() 
{
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://blockdozer.com/insight-api/addr/';
	AnyBalance.setDefaultCharset('utf-8');
	
	validateBtcWallet(prefs.wallet);
	
    // errors are text/html, but normal replies are json
    var html = AnyBalance.requestGet(baseurl + prefs.wallet, g_headers);
    AnyBalance.trace(html, "server reply"); 
	var json;
    try 
    {
        json = getJson(html);
    } 
    catch(err) 
    {
        throw new AnyBalance.Error("blockdozer.com: "+replaceAll(html));
    }

	// fetch params
	AnyBalance.setResult({success: true, balance: json.balance, total_received: json.totalReceived, total_sent: json.totalSent, n_transactions: json.txApperances});
}
