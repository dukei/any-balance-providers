/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

// used by addHeaders
var g_headers = 
{
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'en-US',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

// misc referrers
var g_loginPage = "https://mein.ortelmobile.de/ScLogin.html";
var g_mainPage = "https://mein.ortelmobile.de/ScMain.html";


// execute the login sequence, return a session id
function doLogin(login,password)
{
    var loginUrl = "https://mein.ortelmobile.de/services/userLogin.php";

    // login/password sanity checks
    if ((login.length!=13) || (login.substring(0,2)!="49") || (!/^\d+$/.test(login)))
        throw new AnyBalance.Error("The login must be 13 digits long, starting with 49");
    if ((password.length<8) || (password.length>40))
        throw new AnyBalance.Error("The password must be 8 to 40 characters");
    
    // post the login request, the reply should be an xml, but an html with a temporary error code sometimes
    // happens as well, while html-reported errors seems to always be temporary
	var	xml = AnyBalance.requestPost(loginUrl, {username: login, password: password, transactionRef:"dummy1"}, addHeaders({Referer: g_loginPage}));
	AnyBalance.trace(xml,"Login Reply");
    if (xml.indexOf("<html>")>=0)
    {
        var err = /<title>(.*)<\/title>/.exec(xml);
        throw new AnyBalance.Error(err ? err[1] : "unexpected server responce",true);
    }

    // parse as xml and check for errors
    xml = (new DOMParser()).parseFromString(xml,"text/xml");
    var errNodes = xml.getElementsByTagName("error");
    if (errNodes.length>0)
        throw new AnyBalance.Error(errNodes[0].getElementsByTagName("text")[0].childNodes[0].nodeValue); 
    
    // all we need from this XML reply is the session ID
    return(xml.getElementsByTagName("sessionKey")[0].childNodes[0].nodeValue);
}


// log out (there is a limit on a number of sessions, they take a long time to expire)
function doLogout(sessionId)
{
    var logoutUrl = "https://mein.ortelmobile.de/services/userLogout.php";
	var	xml = AnyBalance.requestPost(logoutUrl, {sessionKey: sessionId}, addHeaders({Referer: g_mainPage}));
	AnyBalance.trace(xml,"Logout Reply");
}


// request and return the current balance
function getCurrentBalance(sessionId)
{
    var balanceUrl = "https://mein.ortelmobile.de/services/subscriptionGetSubscriptionCurrentBalance.php";
    
    // post the balance request, load it into DOM
	var	xml = AnyBalance.requestPost(balanceUrl, {sessionKey: sessionId}, addHeaders({Referer: g_mainPage}));
	AnyBalance.trace(xml,"Balance Reply");
    xml = (new DOMParser()).parseFromString(xml,"text/xml");    
    
    // get the balance
    return(parseFloat(xml.getElementsByTagName("currentBalance")[0].getElementsByTagName("usage")[0].getElementsByTagName("value")[0].childNodes[0].nodeValue));
}


// rquest and return current data and voice minutes counters
function getCurrentDataAndVoice(sessionId)
{
    var optionsUrl = "https://mein.ortelmobile.de/services/subscriptionGetCompactTariffOptions.php";

    // post the balance request, load it into DOM
	var	xml = AnyBalance.requestPost(optionsUrl, {sessionKey: sessionId}, addHeaders({Referer: g_mainPage}));
	AnyBalance.trace(xml,"Options Reply");
    xml = (new DOMParser()).parseFromString(xml,"text/xml");    
    
    // we want to look at all active tariff options
    var result = {mbytes:0, minutes:0, options: ""};
    var options = xml.getElementsByTagName("compactTariffOption");
    for (var i=0;i<options.length;i++)
    {
        var option = options[i];
        var status = option.getElementsByTagName("status")[0].childNodes[0].nodeValue;
        if (status!="ACTIVE")
            continue;
        
        // get the option name, add it to the plan names string
        var name = option.getElementsByTagName("name")[0].childNodes[0].nodeValue;
        AnyBalance.trace(name,"Active Option");
        result.options += result.options.length ? ", " + name : name;
        
        // get the free units set
        var freeUnits = option.getElementsByTagName("FreeUnit");
        for (var j=0;j<freeUnits.length;j++)
        {
            var type = freeUnits[j].getElementsByTagName("Type")[0].childNodes[0].nodeValue;
            var unit = freeUnits[j].getElementsByTagName("Unit")[0].childNodes[0].nodeValue;
            var left = freeUnits[j].getElementsByTagName("RemainingAmount")[0].childNodes[0].nodeValue;
            
            // we probably support just some types and units, the ones i've personally encountered
            if ((type=="voice") && (unit=="seconds"))
                result.minutes += parseFloat(left)/60;
            else if ((type=="data") && (unit=="kbyte"))
                result.mbytes += parseFloat(left)/1024;
        }
    }
    
    // done, return the result
    return(result);
}


// provider main entry point
function main() 
{
    var result = {success: true};

    // get preferences
    var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');

    // log in
    var sessionId = doLogin(prefs.login, prefs.password);
    AnyBalance.trace(sessionId,"Session ID");
    
    try 
    {
        // get the params
        var credit = getCurrentBalance(sessionId);
        var info = getCurrentDataAndVoice(sessionId);

        // update the result
        result["credit"] = credit.toFixed(2); 
        result["plan"] = info.options; 
        result["data"] = info.mbytes.toFixed(2); 
        result["voice"] = info.minutes.toFixed(2); 
    }
    catch (err)
    {
        // logout and rethrow in case of errors
        doLogout(sessionId);
        throw err;
    }
    
    // log out, we are done
    doLogout(sessionId);
    AnyBalance.setResult(result);
}