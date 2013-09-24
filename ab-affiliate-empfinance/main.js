/**
Provider of AnyBalance (http://any-balance-providers.googlecode.com)

Provider for Empire Finance Group
WWW: https://empfinance.com/
mailto:wtiger@mail.ru
*/

function main(){
	var prefs = AnyBalance.getPreferences();

	var baseurl;

	if(prefs.site==2){baseurl= 'https://empfinance.org/';}
	else{baseurl= 'https://empfinance.com/';}

//разлогиниться из кабинета 
//	var outinfo = AnyBalance.requestGet(baseurl + "investor/logoff/");


	AnyBalance.setDefaultCharset('utf-8');

	AnyBalance.trace('Authorizing on '+baseurl+'...');
	var info = AnyBalance.requestPost(baseurl + "login/", {
		"username": prefs.username,
		"password": prefs.password,
		"login": "2",
		"referer": "",
		"h_submit": "1"
	},
	{	"Accept-Charset": "UTF-8",
		"Accept-Language": "en-US;q=0.6,en;q=0.4",
		"User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64)"
	});

	var error = $('#errHolder', info).text();
	if(error){
		throw new AnyBalance.Error(error);
	}

	if(!(matches = info.match(/Total invested/i))){
		throw new AnyBalance.Error("Incorrect login or password or error getting data.");}

	var result = {success: true};

	result.__tariff = prefs.username;
	result.balance_pm = getParam(info, null, null, /Account Balance:.*?<span class="pm">[\s\$]+(.*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	result.balance_ego = getParam(info, null, null, /Account Balance:.*?<span class="ego">[\s\$]+(.*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	result.balance_wire = getParam(info, null, null, /Account Balance:.*?<span class="wire">[\s\$]+(.*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	result.balance = result.balance_pm + result.balance_ego + result.balance_wire;
	getParam(info, result, 'earned', /Earned:.*?<span>[\s\$]+(.*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'withdrew_total', /Withdrew total:.*?<span>[\s\$]+(.*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'total_invested', /Total invested:.*?<span.*?>[\s\$]+(.*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);

	AnyBalance.setResult(result);
};

