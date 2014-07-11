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
	
	var html = AnyBalance.requestGet(baseurl + prefs.wallet, g_headers);
	var result = {success: true};
	
	// parse errors reported by nicehash, convert into AnyBalance exceptions if any
	var errdiv = /(<div\s*class="alert alert-error"\s*>[\s\S]*?<\/div>)/i.exec(html);
	if (errdiv!=null)
		throw new AnyBalance.Error("blockchain.info: "+replaceAll(errdiv[1],replaceTagsAndSpaces));

	// parse params
	getParam(html, result, 'balance', /(<td id="final_balance">.*?<\/td>)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'total_received', /(<td id="total_received">.*?<\/td>)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'n_transactions', /(<td id="n_transactions">.*?<\/td>)/i, replaceTagsAndSpaces, parseBalance);

	AnyBalance.setResult(result);
}
