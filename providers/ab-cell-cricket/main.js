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

var g_login_page = "https://www.cricketwireless.com/myaccount/ImplLoginAction.do?ecareAction=login";
var g_login_script = "https://www.cricketwireless.com/myaccount/loginPage.do";
var g_info_page = "https://www.cricketwireless.com/myaccount/secure/navigateMenu.do";
var g_info_script1 = "https://www.cricketwireless.com/myaccount/secure/loadAjaxAccountInfo.do"
var g_info_script2 = "https://www.cricketwireless.com/myaccount/secure/loadSingleSubscriber.do"

// some of the stuff on cricket is cookies based, so i want them logged
function traceCookies()
{
    var cookies = AnyBalance.getCookies();
    var str = "";
    for (var i=0; i<cookies.length; i++)
        str += cookies[i].name + "=" + cookies[i].value + "\n";
    AnyBalance.trace(str,"Cookies");
}

// they use cryptojs to encrypt the passwords using AES... oh well....
function getEncryptedValue(pass)
{
    var iv  = CryptoJS.enc.Base64.parse("AAAAAAAAAAAAAAAAAAAAAA==");
    var key = CryptoJS.enc.Base64.parse("QWJjZGVmZ2hpamtsbW5vcA==");
    var encrypted = (CryptoJS.AES.encrypt(pass, key, { iv: iv })).ciphertext.toString(CryptoJS.enc.Base64);
    return(encrypted);
}

// execute the login attempt
function doLogin(login,password)
{
    var params = 
    {
        _expandStatus: "",
        _forwardName: "login",
        _resetBreadCrumbs: "false",
        _stateParam: "eCareLocale.currentLocale: en_US__English",
        ecareAction: "login",
        login_tentative_error: "",
        password: getEncryptedValue(password),
        redirectURL: "",
        userName: login
    }
    AnyBalance.trace(JSON.stringify(params),"Lsogin params");
	AnyBalance.requestPost(g_login_script, params, addHeaders({Referer: g_login_page}));
    traceCookies();
    if (AnyBalance.getCookie("token")==null)
        throw new AnyBalance.Error("Unable to login, please check your username/password.");    
}


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
    var info1 = AnyBalance.requestPost(g_info_script1, {}, addHeaders({Referer: g_info_page, "X-Requested-With": "XMLHttpRequest"}));
    var info2 = AnyBalance.requestPost(g_info_script2, {ctn: prefs.login}, addHeaders({Referer: g_info_page, "X-Requested-With": "XMLHttpRequest"}));
    AnyBalance.trace(info1,"Raw account info 1");
    AnyBalance.trace(info2,"Raw account info 2");
    
    // parse and return
    getParam(info1, result, "days",    /days_left[\s\S]*?<\/div>/i,                     replaceTagsAndSpaces, parseBalance);
    getParam(info1, result, "credit",  /Current Credit:[\s\S]*?<\/span>/i,              replaceTagsAndSpaces, parseBalance);
    getParam(info1, result, "monthly", /Monthly Total:[\s\S]*?<\/span>/i,               replaceTagsAndSpaces, parseBalance);
    getParam(info2, result, "bonus",   /loyalty_user_points[\s\S]*?<\/div>/i,           replaceTagsAndSpaces, parseBalance);
    getParam(info2, result, "data",    /<dd.*data_speed[\s\S]*?Used[\s\S]*?<\/label>/i, replaceTagsAndSpaces, parseTraffic);
	AnyBalance.setResult(result);
}