/**
Provider of AnyBalance (http://any-balance-providers.googlecode.com)

Provider for Perfect Money
WWW: http://www.perfectmoney.is
mailto:wtiger@mail.ru
*/

function main(){
	AnyBalance.setDefaultCharset('utf-8');
	var prefs = AnyBalance.getPreferences();

	AnyBalance.trace('Authorizing and trying to get info...');
	var info = AnyBalance.requestPost("https://perfectmoney.is/acct/balance.asp", {
		"AccountID": prefs.AccountID,
		"PassPhrase": prefs.PassPhrase
	},
	{	"Accept-Language": "en-US;q=0.6,en;q=0.4",
		"User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64)"
	});

	var error = getElementById(info, 'errHolder', replaceTagsAndSpaces);
	if(error){
		throw new AnyBalance.Error(error);
	}

	if(matches = info.match(/API is disabled on this account/i)){
		throw new AnyBalance.Error("API is disabled. Try to enable API in security section of your account on www.perfectmoney.is and set IP mask to *.*.*.*");}

	if(matches = info.match(/API is disabled for this IP/i)){
		throw new AnyBalance.Error("API is not accepted for your IP-address. Open the security section of your account on www.perfectmoney.is and set IP mask to *.*.*.*");}

	if(error = getParam(info, null, null, /<input[^>]+name='ERROR'[^>]*value='([^']*)/i, replaceHtmlEntities)){
		throw new AnyBalance.Error(error);}

	if(!(matches = info.match(/Account No\./i))){
		throw new AnyBalance.Error("Error getting data.");}

	var result = {success: true};

	AnyBalance.trace('Parsing... ');

	result.__tariff=prefs.AccountID;
	getParam(info, result, 'u_account', /<input[^>]+name='U(\d+)/i, replaceHtmlEntities, parseBalance);
	getParam(info, result, 'u_balance', /<input[^>]+name='U\d+[^>]*value='([^']*)/i, replaceHtmlEntities, parseBalance);
	getParam(info, result, 'e_account', /<input[^>]+name='E(\d+)/i, replaceHtmlEntities, parseBalance);
	getParam(info, result, 'e_balance', /<input[^>]+name='E\d+[^>]*value='([^']*)/i, replaceHtmlEntities, parseBalance);
	getParam(info, result, 'g_account', /<input[^>]+name='G(\d+)/i, replaceHtmlEntities, parseBalance);
	getParam(info, result, 'g_balance', /<input[^>]+name='G\d+[^>]*value='([^']*)/i, replaceHtmlEntities, parseBalance);

	AnyBalance.setResult(result);
};

