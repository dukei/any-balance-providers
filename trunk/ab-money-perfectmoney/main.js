/**
Provider of AnyBalance (http://any-balance-providers.googlecode.com)

Provider for Perfect Money
WWW: http://www.perfectmoney.is
mailto:wtiger@mail.ru
*/

function main(){
	var prefs = AnyBalance.getPreferences();

	AnyBalance.trace('Authorizing and trying to get info...');
	var info = AnyBalance.requestPost("https://perfectmoney.is/acct/balance.asp", {
		"AccountID": prefs.AccountID,
		"PassPhrase": prefs.PassPhrase
	},
	{	"Accept-Language": "en-US;q=0.6,en;q=0.4",
		"User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64)"
	});

	var error = $('#errHolder', info).text();
	if(error){
		throw new AnyBalance.Error(error);
	}


	if(matches = info.match(/API is disabled on this account/i)){
		throw new AnyBalance.Error("API is disabled. Try to enable API in security section of your account on www.perfectmoney.is and set IP mask to *.*.*.*. PLEASE NOTE THAT ENABLING API IS SERIOUS SECURITY RISK FOR YOUR ACCOUNT.");}

	if(matches = info.match(/API is disabled for this IP/i)){
		throw new AnyBalance.Error("API is not accepted for your IP-address. Open the security section of your account on www.perfectmoney.is and set IP mask to *.*.*.*. PLEASE NOTE THAT ENABLING API IS SERIOUS SECURITY RISK FOR YOUR ACCOUNT.");}

	if(matches = info.match(/<input name='ERROR' type='hidden' value='(.*?)'>/i)){
		throw new AnyBalance.Error(matches[1]);}

	if(!(matches = info.match(/Account No\./i))){
		throw new AnyBalance.Error("Error getting data.");}

	var result = {success: true};

	AnyBalance.trace('Parsing... ');

	result.__tariff=prefs.AccountID;
	getParam(info, result, 'u_account', /<input name='U(\d+)'/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'u_balance', /<input name='U\d+' type='hidden' value='(.*?)'>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'e_account', /<input name='E(\d+)'/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'e_balance', /<input name='E\d+' type='hidden' value='(.*?)'>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'g_account', /<input name='G(\d+)'/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'g_balance', /<input name='G\d+' type='hidden' value='(.*?)'>/i, replaceTagsAndSpaces, parseBalance);

	AnyBalance.setResult(result);
};

