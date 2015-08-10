/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = 
{
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'en-US',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

var g_login_page = "https://www.golantelecom.co.il/web/";
var g_billing_page = "https://www.golantelecom.co.il/web/account_billing.php";
var g_login_script = "https://www.golantelecom.co.il/rpc/web.account.rpc.php?action=login&p_action=";
var g_get_details = "https://www.golantelecom.co.il/rpc/account_current_balance.rpc.php"

function main() 
{
	var result = {success: true};
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');

	// sanity checks
	checkEmpty(prefs.login, "Please enter your account number!");
	checkEmpty(/^\d{10}$/.test(prefs.line), "Please enter your 10 digits phone number!");
	checkEmpty(prefs.password, "Please enter your password!");
	
	// login
	var	html = AnyBalance.requestPost(g_login_script, {username: prefs.login, password: prefs.password}, addHeaders({Referer: g_login_page}));
	var err = /<div\s+class\s*=\s*"notification-item notification-item-error"\s*>([\S\s]*?)<\/span>/.exec(html);
	if (err)
		throw new AnyBalance.Error(replaceAll(err[1],replaceTagsAndSpaces));
	
	// get billing details for all lines (the result is a json wrapped html, ewww)
	var json = getJson(AnyBalance.requestPost(g_get_details, {account_id: prefs.login, action: "viewSubscriberCurrentBalance", NDC_SN: prefs.line.substring(1,10)}, addHeaders({Referer: g_billing_page})));
    var stats = json.content;
    AnyBalance.trace(stats);
    if (stats.length<100)
        throw new AnyBalance.Error("Unable to get data for " + prefs.line +", please make sure the phone number is correct!");
	
	// parse price, we no longer need to sum everything up and add vat manually, all we need is to find it
	var price = /<td.*?>סה\"כ לתשלום<\/td>[\s\S]*?<span>₪<\/span>[\s\S]*?<span>([\d\.]*)<\/span>/i.exec(stats);
    getParam(price ? price[1] : "0.0", result, 'price', null, null, parseBalance);
	    
	// parse rest of the params
	getParam(stats, result, 'calls',/<td.*?>דקות שיחה<\/td>[\s\S]*?<td.*?>(.*?)<\/td>/i, replaceTagsAndSpaces, parseMinutes);
	getParam(stats, result, 'sms',/<td.*?>SMS<\/td>[\s\S]*?<td.*?>(.*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(stats, result, 'data',/<td.*?>גלישה<\/td>[\s\S]*?<td.*?>(.*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	AnyBalance.setResult(result);
}