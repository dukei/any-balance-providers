/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = 
{
	'Accept': 'application/json, text/plain, */*',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'en-US',
	'Connection': 'keep-alive',
    'Content-Type': 'application/json;charset=utf-8',
    'Referer': 'https://www.cricketwireless.com/myaccount.html',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36'
};

var g_login_script = "https://www.cricketwireless.com/selfservice/rest/authentication/login/";
var g_info_url = "https://www.cricketwireless.com/selfservice/rest/authentication/home/";
var g_rewards_url = "https://www.cricketwireless.com/selfservice/rest/rewardmPoints/available/"
var g_usage_url = "https://www.cricketwireless.com/selfservice/rest/usage/summary/";
var g_sessionToken = "";

// execute the login attempt
function doLogin(login,password)
{
    var reply = AnyBalance.requestPost(g_login_script, JSON.stringify({username: login, password: password}), g_headers);
    AnyBalance.trace(reply,"Auth Reply");
    reply = JSON.parse(reply);
    if (reply=="")
        throw new AnyBalance.Error("No Auth Reply");
    if (reply.status!="success")
        throw new AnyBalance.Error("Unable to login, please check your username/password.");    
    AnyBalance.trace(reply.sessionToken,"Session Token");
    g_sessionToken = reply.sessionToken;
}

// get a json info
function getInfo(url, args)
{
    var info = AnyBalance.requestPost(url, JSON.stringify(args), g_headers);
    AnyBalance.trace(info,url);
    return(JSON.parse(info));
}

// main 
function main() 
{
	var result = {success: true};
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset("utf-8");
    
	// sanity checks
	checkEmpty(prefs.login, "Please enter your account user name!");
	checkEmpty(prefs.password, "Please enter your password!");
    
	// login and request the subscriber info
    doLogin(prefs.login,prefs.password);
    var info = getInfo(g_info_url, {sessionToken:g_sessionToken});
    var rewards = getInfo(g_rewards_url, {sessionToken:g_sessionToken, ctn:prefs.login});
    var usage = getInfo(g_usage_url, {sessionToken:g_sessionToken, ctn:prefs.login});
    
    // parse and return
    result["days"]    = info.nextBillDueDays;
    result["credit"]  = info.accountBalance;
    result["monthly"] = parseFloat(info.totalMRC);
    result["bonus"]   = parseFloat(rewards.mPoints);
    for (var i=0;i<usage.limitedServices.length;i++)
    {
        if (usage.limitedServices[i].serviceTypeIndicator=="DD")
        {
            result["udata"] = parseFloat(usage.limitedServices[i].consumedAllowance);
            result["tdata"] = parseFloat(usage.limitedServices[i].totalAllowance);
            result.data = prefs.datamode!=0 ? result.tdata - result.udata : result.udata;
        }
    }
	AnyBalance.setResult(result);
}