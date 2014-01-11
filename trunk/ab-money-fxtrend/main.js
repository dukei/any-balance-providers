/**
Provider of AnyBalance (http://any-balance-providers.googlecode.com)

Provider for FX-Trend
WWW: http://www.fx-trend.com
mailto:wtiger@mail.ru
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main(){
	var prefs = AnyBalance.getPreferences();

	AnyBalance.trace('Authorizing and trying to get info...');

	var baseurl = 'https://fx-trend.com/';


	var info = AnyBalance.requestPost(baseurl + 'login/my/profile/info', {
		"login": prefs.login,
		"pass": prefs.pass
	}, addHeaders({Referer: baseurl + 'profile'}));	

	var error = $('#errHolder', info).text();
	if(error){
		throw new AnyBalance.Error(error);
	}


//	if(matches = info.match(/API is disabled on this account/i)){
//		throw new AnyBalance.Error("API is disabled. Try to enable API in security section of your account on www.perfectmoney.is and set IP mask to *.*.*.*. PLEASE NOTE THAT ENABLING API IS SERIOUS SECURITY RISK FOR YOUR ACCOUNT.");}

//	if(matches = info.match(/<input name='ERROR' type='hidden' value='(.*?)'>/i)){
//		throw new AnyBalance.Error(matches[1]);}


	var result = {success: true};

	AnyBalance.trace('Parsing... ');

	info = AnyBalance.requestGet(baseurl + 'my/accounts/');

	var re = new RegExp('<td class="mat_number">'+prefs.account+'<\\/td>\\s+<td .*?>(\\S+)<\\/td>\\s+<td>(\\S+)<\\/td>\\s+<td .*?>(\\S+)<\/td>\\s+<td .*?>(.*?)<\\/td>\\s+<td>(\\S+)<\\/td>\\s+<td>(\\S+)<\\/td>\\s+<td>(\\S+)<\\/td>\\s+<td>(.*?)<\\/td>\\s+<td>(\\S+)<\\/td>', 'i');

	if(matches = info.match(re)){
		result.__tariff = prefs.account;
		result.open = matches[1];
		result.currency = matches[2];
		result.leverage = matches[3];
		result.balance = parseBalance(matches[4]);
		result.equity = parseBalance(matches[5]);
		result.receipts = result.equity*1 - result.balance*1;
		result.margin = parseBalance(matches[6]);
		result.free = parseBalance(matches[7]);
		result.mlevel = parseBalance(matches[8]);
		result.profit = parseBalance(matches[9]);
	}
	else{
		if(matches = info.match(/Извините, доступ в личные кабинеты временно приостановлен в связи с проведением периодического ролловера/i)){
			throw new AnyBalance.Error("Извините, доступ в личные кабинеты временно приостановлен в связи с проведением периодического ролловера.");}
		else{
			throw new AnyBalance.Error("Error getting statistics");}
	}

	
	AnyBalance.setResult(result);
};

