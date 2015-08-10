// http request headers
var g_headers = 
{
	'Accept': 'application/json, text/javascript, */*; q=0.01',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'en-US',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36'
};


// Translates NiceHash API algo enum into our counter ids
var g_hash_types = 
[
	"Scrypt",
	"SHA256",
	"ScryptANf",
	"X11",
	"X13",
	"Keccak",
	"X15",
	"Nist5"
];


// Multiplier to currency unit map
var g_multiplier_names = 
{
	1: " BTC",
	1000: " mBTC",
	1000000: " µBTC",
};


// Main
function main() 
{
	var prefs = AnyBalance.getPreferences();
	if (typeof prefs.server=="undefined") 
		prefs.server = "www.nicehash.com";
	var baseurl = 'https://' + prefs.server + '/api?method=stats.provider&addr=';
	var result = {success: true};
	AnyBalance.setDefaultCharset('utf-8');
	
	// validate the wallet first
	validateBtcWallet(prefs.wallet);

	// set the unit according to the multiplier
	getParam(g_multiplier_names[prefs.btcunits], result, "btcunits", null, null, html_entity_decode);
	
	// access NiceHash API, supposed to return a json, yet somettimes, 
	// for example, while under maintenance, the site returns an html instead of json
	var response = AnyBalance.requestGet(baseurl + prefs.wallet, g_headers);
	if (/<body/i.exec(response)!=null)
	{
		var errdiv = /<div class="panel-heading">(.*?)<\/div>/.exec(response);
		if (errdiv!=null)
			throw new AnyBalance.Error(prefs.server + ": "+replaceAll(errdiv[1],replaceTagsAndSpaces),true); 
		else 
        {
            var title = /<title>(.*?)<\/title>/.exec(response);
			throw new AnyBalance.Error(prefs.server + ": "+ (title!=null) ? title[1] : "unknown error",true); 
        }
	}
		
	// parse the json reply, make sure we have some stats
	var json = getJson(response);
	if (json.result.stats.length==0)
		throw new AnyBalance.Error("No data for " + prefs.wallet);
	
	// update params and calculate the total
	var total = 0.0;
	for(var i=0;i<json.result.stats.length;i++) 
	{
		var stats = json.result.stats[i];
		if (stats.algo>=g_hash_types.length)
			continue;
		stats.balance = parseFloat(stats.balance);
		total += stats.balance;
		getParam((stats.balance*prefs.btcunits).toString(), result, g_hash_types[stats.algo], null, null, parseBalance);
	}

	// update the total param and the the hell out
	getParam((total*prefs.btcunits).toString(), result, "Total", null, null, parseBalance);
	AnyBalance.setResult(result);
}
