/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
var g_vat_percents = 18.0;

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
var g_get_details = "https://www.golantelecom.co.il/rpc/account_current_balance.rpc.php?action=view_current_balance_summary"

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
	var json = getJson(AnyBalance.requestPost(g_get_details, {account_id: prefs.login, billrun_name: ""}, addHeaders({Referer: g_billing_page})));
	
	// get the info block for the line we need
	var lookfor = "<tr>\\s*?<td>" + prefs.line.substring(0,3) + "-" + prefs.line.substring(3,10) + "<\\/td>[\\S\\s]*?<div>"
	var stats = new RegExp(lookfor,"i").exec(json.content);
	if (!stats)
		throw new AnyBalance.Error("Unable to find data for " + prefs.line +", please make sure the phone nuber is correct!");
	stats = stats[0];

	// i probably always want this part in the log, leaving it here for not
	AnyBalance.trace(stats);
	
	// parse prices, the price rows are like <td><span dir="ltr">₪8.47</span></td>, there are 2 of those
	// i am looking here for <td...>(₪xxxxx)....</td>, twice, hopefully this makes the regex clear
	var prices = /<td.*?>₪([\d\.]*).*?<\/td>[\s\S]*?<td.*?>₪([\d\.]*).*?<\/td>/i.exec(stats);
	if (prices)
	{
		var totalprice = (parseFloat(prices[1])+parseFloat(prices[2]))*(1.0+g_vat_percents/100.0);
		getParam(totalprice.toFixed(2).toString(), result, 'price', null, null, parseBalance); 
	}
	
	// parse simple params
	getParam(stats, result, 'calls',/<td>דקות שיחה<\/td>[\s\S]*?<td>(.*?)<\/td>/i, replaceTagsAndSpaces, parseMinutes);
	getParam(stats, result, 'sms',/<td>SMS<\/td>[\s\S]*?<td>(.*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(stats, result, 'data',/<td>גלישה<\/td>[\s\S]*?<td>(.*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	AnyBalance.setResult(result);
}