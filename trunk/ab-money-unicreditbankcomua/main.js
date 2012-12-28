/**
AnyBalance Provider (http://any-balance-providers.googlecode.com)

Retrieves the information from Ukrainian UniCredit Bank (website unicreditbank.com.ua).

Bank website: http://www.unicreditbank.com.ua/
Internet banking: https://online.unicreditbank.com.ua/
*/

var reViewState = "__VIEWSTATE\"\\s+value=\"([^\"]+)\"";
var reValidation = "__EVENTVALIDATION\"\\s+value=\"([^\"]+)\"";
var ctLoginFail = "ctl00_MainContent_uxSessionExpiredMessageLabel"
var ctWrongLoginPass = "Помилка реєстрації в системі";
var reAccounts = "uxAccountNameLinkButton\"[\\s\\S]*?>([^<]+)<[\\s\\S]*?uxAccountNumberLabel\"[\\s\\S]*?>([^<]+)<[\\s\\S]*?uxAvailableFundsLabel\"[\\s\\S]*?>([^<]+)<[\\s\\S]*?uxAvailableFundsCurrencyLabel\"[\\s\\S]*?>([^<]+)<";

var headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64)"};

if (typeof String.prototype.trim != 'function') { // detect native implementation
  String.prototype.trim = function () {
    return this.replace(/^\s+/, '').replace(/\s+$/, '');
  };
}

function getParam (html, result, param, regexp, replaces, parser) {
    if (param && (param != '__tariff' && !AnyBalance.isAvailable (param)))
        return;

    var value = regexp ? regexp.exec (html) : html;
    if (value) {
                if(regexp)
            value = value[1];
        if (replaces) {
            for (var i = 0; i < replaces.length; i += 2) {
                value = value.replace (replaces[i], replaces[i+1]);
            }
        }
        if (parser)
            value = parser (value);

    if(param)
      result[param] = value;
    else
      return value
    }
}

var replaceTagsAndSpaces = [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, '', /^"+|"+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.', /(\d)\-(\d)/g, '$1.$2'];

// parce balance with ' ' (space) as delimitier for thousands and ',' as delimitier for one hundredth (ex. 10 234,56)
function parseBalance(text){
    var _text = text.replace(/\s+/g, '');
    var val = getParam(_text, null, null, /(-?\d[\d\.,\-]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

var replaceFloat2 = [/\s+/g, '', /,/g, '', /(\d)\-(\d)/g, '$1.$2'];

// parce balance with ',' as delimitier for thousands and '.' as delimitier for one hundredth (ex. 10,234.56)
function parseBalance2(text){
    var _text = text.replace(/\s+/g, '');
    var val = getParam(_text, null, null, /(-?\d[\d\.,\-]*)/, replaceFloat2, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

// parce date in form of DAY<any_symbol>MONTH<any_symbol>YEAR4DIG, for ex. 20.01.2012
function parseDate(str){
    var matches = /(\d+)[^\d](\d+)[^\d](\d+)/.exec(str);
    var time;
    if(matches){
      time = (new Date(+matches[3], matches[2]-1, +matches[1])).getTime();
    }
    AnyBalance.trace('Parsing date ' + new Date(time) + ' from value: ' + str);
    return time;
}

// parce date in form of YEAR4DIG<any_symbol>MONTH<any_symbol>DAY, for ex. 2012-01-20
function parseDate2(str){
    var matches = /(\d+)[^\d](\d+)[^\d](\d+)/.exec(str);
    var time;
    if(matches){
      time = (new Date(+matches[1], matches[2]-1, +matches[3])).getTime();
    }
    AnyBalance.trace('Parsing date ' + new Date(time) + ' from value: ' + str);
    return time;
}

function main(){
    var prefs = AnyBalance.getPreferences();
    //if(prefs.card)
    //    if(!/^\d{4}$/.test(prefs.card))
    //        throw new AnyBalance.Error("Enter only 4 last digits of the card or leave this field empty.");
    
    var baseurl = "https://online.unicreditbank.com.ua/";
    if (prefs.login == "1" && prefs.password == "1")
        baseurl = "https://demo.unicreditbank.com.ua/ibdemo/";
    
    var result = {success: true}, matches;
    AnyBalance.setDefaultCharset("utf-8");
    
    //login
    var url = baseurl + "genLogonCIF.aspx";
    AnyBalance.trace("GET: " + url);
    var html = AnyBalance.requestGet(url, headers);
    //AnyBalance.trace(url + ": " + html);

    if (!(matches = html.match(reViewState)))
        throw new AnyBalance.Error("login token not found.");
    var token = matches[1];
    //AnyBalance.trace(url + " token: " + token);
        
    if (!(matches = html.match(reValidation)))
        throw new AnyBalance.Error("login validation not found.");
    var validation = matches[1];
    //AnyBalance.trace(url + " validation: " + validation);
        
    url = baseurl + "genLogonCIF.aspx";
    AnyBalance.trace("POST: " + url);
    html = AnyBalance.requestPost(url, {
        '__VIEWSTATE':token,
        '__EVENTVALIDATION':validation,
        'ctl00$MainContent$uxLogInTextBox':prefs.login,
        'ctl00$MainContent$uxLanguagesDropDown':'uk-UA',
        'ctl00$MainContent$uxLogInImageButton.x':'0',
        'ctl00$MainContent$uxLogInImageButton.y':'0',
    }, headers);
    //AnyBalance.trace(url + " (post): " + html);
    
    if (html.indexOf(ctLoginFail) >= 0)
        throw new AnyBalance.Error("Login failed. Website design is changed?");

    //password
    if (!(matches = html.match(reViewState)))
        throw new AnyBalance.Error("password token not found.");
    token = matches[1];
    //AnyBalance.trace(url + " password token: " + token);
        
    if (!(matches = html.match(reValidation)))
        throw new AnyBalance.Error("password validation not found.");
    var validation = matches[1];
    //AnyBalance.trace(url + " password validation: " + validation);
        
    url = baseurl + "genLogonPassword.aspx";
    AnyBalance.trace("POST: " + url);
    html = AnyBalance.requestPost(url, {
        '__VIEWSTATE':token,
        '__EVENTVALIDATION':validation,
        'ctl00$MainContent$uxLogonPasswordTextBox':prefs.password,
        'ctl00$MainContent$uxLogInImageButton.x':'0',
        'ctl00$MainContent$uxLogInImageButton.y':'0',
    }, headers);
    //AnyBalance.trace(url + " (post): " + html);
    
    if (html.indexOf(ctWrongLoginPass) >= 0)
        throw new AnyBalance.Error("Invalid login and / or password");

    var pattern = new RegExp(reAccounts, 'gi');
    var accName, accNum, accAvail, accAvailCurrency;
    while(matches = pattern.exec(html))
    {
        accName = matches[1];
        accNum = matches[2].replace(/\s+/g, '');
        accAvail = matches[3];
        accAvailCurrency = matches[4];
        AnyBalance.trace("Account found: name=" + accName + " num=*" + accNum.slice(-4) + " avail=*" + accAvail.slice(-5) + " availcurrency=" + accAvailCurrency);
        if (!prefs.account || prefs.account == accNum)
            break;
    }
    if (!matches)
        throw new AnyBalance.Error("Account number, specified in settings, was not found. Correct it or set it to blank and try again.");
    AnyBalance.trace("Account selected: name=" + accName + " num=*" + accNum.slice(-4) + " avail=*" + accAvail.slice(-5) + " availcurrency=" + accAvailCurrency);
        
    getParam(accName, result, '__tariff', null, replaceTagsAndSpaces);
    getParam(accAvail, result, 'balance', null, replaceTagsAndSpaces, parseBalance);
    getParam(accAvailCurrency, result, 'currency', null, replaceTagsAndSpaces);
    
    AnyBalance.setResult(result);
}
