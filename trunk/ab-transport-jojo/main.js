/**
AnyBalance Provider (http://any-balance-providers.googlecode.com)

Retrieves the balance of the Jojo Skanetrafiken transport card.
Some algorithms, urls and regexps are taken from:
https://github.com/liato/android-bankdroid/blob/master/src/com/liato/bankdroid/banking/banks/Jojo.java

Skanetrafiken website: http://www.skanetrafiken.se
My pages: https://www.skanetrafiken.se/templates/MSRootPage.aspx?id=2935&epslanguage=SV
*/

var reViewState = "__VIEWSTATE\"\\s+value=\"([^\"]+)\"";
var ctLoginFail = "ctl00_fullRegion_menuRegion_Login_msNotLoggedInDiv"
var ctWrongLoginPass = "Inloggningen misslyckades";
var reAccounts = "1_mRepeaterMyCards_ctl(\\d{2,3})_LinkButton\\d{1,3}\"[^>]+>([^<]+)</a>\\s*</td>\\s*<td[^>]+>\\s*<a\\s*id=\"ctl00_fullRegion_mainRegion_CardInformation1_mRepeaterMyCards_ctl\\d{2,3}_LinkButton\\d{1,3}\"[^>]+>([^<]+)</a>";

var headers = {
	"User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64)"};
var headersJSON = {
	"Accept": "application/json, text/javascript, */*; q=0.01",
	"Content-Type": "application/json",
	"User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64)"};

if (typeof String.prototype.trim != 'function') { // detect native implementation
  String.prototype.trim = function () {
	return this.replace(/^\s+/, '').replace(/\s+$/, '');
  };
}

function main(){
	var prefs = AnyBalance.getPreferences();
	if(prefs.card)
		if(!/^\d{4}$/.test(prefs.card))
			throw new AnyBalance.Error("Enter only 4 last digits of the card or leave this field empty.");

	var baseurl = "https://www.skanetrafiken.se/templates/";
	var result = {success: true}, matches;
	AnyBalance.setDefaultCharset("ISO-8859-1");
	
	var url = baseurl + "MSRootPage.aspx?id=2935&epslanguage=SV";
	AnyBalance.trace("GET: " + url);
	var html = AnyBalance.requestGet(url, headers);
	AnyBalance.trace("GET: " + url + "... OK");

	if (!(matches = html.match(reViewState)))
		throw new AnyBalance.Error("login token not found.");
	var token = matches[1];
	//AnyBalance.trace(url + " token: " + token);
		
	url = baseurl + "MSRootPage.aspx?id=2935&epslanguage=SV";
	AnyBalance.trace("POST: " + url);
	html = AnyBalance.requestPost(url, {
		'__EVENTTARGET':'',
		'__EVENTARGUMENT':'',
		'__VIEWSTATE':token,
		'ctl00$fullRegion$menuRegion$Login$UsernameTextBox':prefs.login,
		'ctl00$fullRegion$menuRegion$Login$PasswordTextBox':prefs.password,
		'ctl00$fullRegion$menuRegion$Login$LoginButton':'Logga in',
	}, headers);
	AnyBalance.trace("POST: " + url + "... OK");
	
	if (html.indexOf(ctWrongLoginPass) >= 0)
		throw new AnyBalance.Error("Invalid login and/or password");
	if (html.indexOf(ctLoginFail) >= 0)
		throw new AnyBalance.Error("Login failed. Website design is changed?");
	
	url = baseurl + "CardInformation.aspx?id=26957&epslanguage=SV";
	AnyBalance.trace("GET: " + url);
	html = AnyBalance.requestGet(url, headers);
	AnyBalance.trace("GET: " + url + "... OK");

	if (!(matches = html.match(reViewState)))
		throw new AnyBalance.Error("accounts token not found.");
	token = matches[1];
	//AnyBalance.trace(url + " accounts token: " + token);

	var pattern = new RegExp(reAccounts, 'gi');
	var accID, accName, accNumLast4;
	while(matches = pattern.exec(html))
	{
		accID = matches[1];
		accName = matches[2].trim();
		accNumLast4 = matches[3].trim().slice(-4);
		AnyBalance.trace("Account found: id=" + accID + " numLast4=" + accNumLast4 + " name=" + accName);
		if (!prefs.card || prefs.card == accNumLast4)
			break;
	}
	if (!matches)
		throw new AnyBalance.Error("Card number, specified in settings, was not found. Correct it or set it to blank and try again.");
	AnyBalance.trace("Account selected: id=" + accID + " numLast4=" + accNumLast4 + " name=" + accName);
		
	url = baseurl + "CardInformation.aspx?id=26957&epslanguage=SV";
	var obj = {};
	obj['__EVENTTARGET']='';
	obj['__EVENTARGUMENT']='';
	obj['__VIEWSTATE']=token;
	obj['ctl00$fullRegion$mainRegion$CardInformation1$mRepeaterMyCards$ctl' + accID + '$Button']='Kortinfo';
	AnyBalance.trace("POST: " + url);
	html = AnyBalance.requestPost(url, obj, headers);
	AnyBalance.trace("POST: " + url + "... OK");

	result.__tariff = accName;
	getParam(html, result, 'balance', /labelsaldoinfo"[\s\S]*?>([^<]+)</i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency','balance'], /labelsaldoinfo"[\s\S]*?>([^<]+)</i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'validfrom', /labelvalidperiodinfo"[\s\S]*?>([^<]+) - \d/i, replaceTagsAndSpaces, parseDateISO);
	getParam(html, result, 'validtill', /labelvalidperiodinfo"[\s\S]*?>[\s\S]*? - ([^<]+)</i, replaceTagsAndSpaces, parseDateISO);
	getParam(html, result, 'zoneslist', /labelzoneareainfozones"[\s\S]*?>([^<]+)</i, replaceTagsAndSpaces);
	getParam(html, result, 'zonearea', /labelzoneareainfo"[\s\S]*?>([^<]+)</i, replaceTagsAndSpaces);
	getParam(html, result, 'status', /labelstatusinfo"[\s\S]*?>([^<]+)</i, replaceTagsAndSpaces);
	getParam(html, result, 'info', /labelobsinfo"[\s\S]*?>([^<]+)</i, replaceTagsAndSpaces);
	cardnum = getParam(html, null, null, /labelcardnumberinfo"[\s\S]*?>([^<]+)</i, replaceTagsAndSpaces);
	if (isAvailable('cardnum'))
	{
		result['cardnum'] = cardnum;
	}
	
	if (cardnum != null && isAvailable(['expiresat', 'expiresin', 'expirestate']))
	{
		url = "http://195.66.94.115/card?identifier=" + cardnum;
		AnyBalance.trace("GET: " + url);
		html = AnyBalance.requestGet(url, headersJSON);
		AnyBalance.trace("GET: " + url + "... OK: " + html);

		json = getJson(html);
		if (json['Identifier'] != null && json['Identifier'] == cardnum)
		{
			if (isAvailable('expiresat'))
			{
				var dt = new Date(+(/\/Date\((\d*)[-\d]*\)\//.exec(json['ExpireDate']))[1]);
				result['expiresat'] = parseDateISO(dt);
			}
			if (isAvailable('expiresin'))
			{
				result['expiresin'] = json['DaysToExpiration'];
			}
			if (isAvailable('expirestate'))
			{
				result['expirestate'] = json['Expired'] == false ? "valid" : "expired";
			}
		}
	}
	
	AnyBalance.setResult(result);
}
