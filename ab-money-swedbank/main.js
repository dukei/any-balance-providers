/**
AnyBalance Provider (http://any-balance-providers.googlecode.com)

Retrieves the balance of the bank account in Swedbank through internet bank system.
Some algorithms, urls and regexps are taken from:
https://github.com/liato/android-bankdroid/blob/master/src/com/liato/bankdroid/banking/banks/Swedbank.java

Bank website: http://www.swedbank.se/
Internet banking: https://mobilbank.swedbank.se/
*/

var reCSRF = "csrf_token\".*?value=\"([^\"]+)\"";
var ctWrongLoginPass = "misslyckats";
var ctError = "<h1>Fel</h1>";
var reAccounts = "(account|loan)\\.html\\?id=([^\"]+)\"[^>]*>\\s*(?:<span\\sclass=\"icon\">[^<]*</span>\\s*)?<span\\s*class=\"name\">([^<]+)</span>\\s*(?:<br/>\\s*)?<span\\s*class=\"amount\">([^<]+)</";

var headers = {
    "User-Agent": "Mozilla/5.0 (Linux; Android 4.0.4; Galaxy Nexus Build/IMM76B) AppleWebKit/535.19 (KHTML, like Gecko) Chrome/18.0.1025.133 Mobile Safari/535.19"};

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

function parseDate(str){
    var matches = /(\d+)[^\d](\d+)[^\d](\d+)/.exec(str);
    var time;
    if(matches){
      time = (new Date(+matches[3], matches[2]-1, +matches[1])).getTime();
    }
    AnyBalance.trace('Parsing date ' + new Date(time) + ' from value: ' + str);
    return time;
}

function main(){
    throw new AnyBalance.Error("Swedbank mobile website was shut down. Not possible to update provider...");

    var prefs = AnyBalance.getPreferences();
    var baseurl = "https://mobilbank.swedbank.se/banking/swedbank/";
    var result = {success: true}, matches;
    AnyBalance.setDefaultCharset("ISO-8859-1");
    
    var url = baseurl + "login.html";
    AnyBalance.trace("GET: " + url);
    var html = AnyBalance.requestGet(url, headers);
    AnyBalance.trace(url + ": " + html);

    if (!(matches = html.match(reCSRF)))
        throw new AnyBalance.Error("login token not found");
    var csrftoken = matches[1];
    AnyBalance.trace(url + " token: " + csrftoken);
        
    url = baseurl + "loginNext.html";
    AnyBalance.trace("POST: " + url);
    html = AnyBalance.requestPost(url, {
        'xyz':prefs.login,
        'auth-method':'code',
        '_csrf_token':csrftoken,
    }, headers);
    AnyBalance.trace(url + ": " + html);
    
    if (!(matches = html.match(reCSRF)))
        throw new AnyBalance.Error("loginNext token not found");
    csrftoken = matches[1];
    AnyBalance.trace(url + " token: " + csrftoken);
        
    url = baseurl + "login.html";
    AnyBalance.trace("POST: " + url);
    html = AnyBalance.requestPost(url, {
        'zyx': prefs.password,
        '_csrf_token': csrftoken,
    }, headers);
    AnyBalance.trace(url + " (post): " + html);
    if (html.indexOf(ctWrongLoginPass) >= 0)
        throw new AnyBalance.Error("Invalid login and/or password");
    if (html.indexOf(ctError) >= 0)
    {
    	var errmsg = getParam(html, null, null, /infobox"[\s\S]*?>([^<]+)</i, replaceTagsAndSpaces, null);
        throw new AnyBalance.Error(errmsg ? Encoder.htmlDecode(errmsg) : "Error during login");
    }

    url = baseurl + "accounts.html";
    AnyBalance.trace("POST: " + url);
    html = AnyBalance.requestGet(url, headers);
    AnyBalance.trace(url + ": " + html);

    var pattern = new RegExp(reAccounts, 'g');
    while(matches = pattern.exec(html))
    {
        if (matches[1] == "account")
            break;
    }
    if (!matches)
        throw new AnyBalance.Error("Account not found");
    var accType = matches[1];
    var accIndex = matches[2];
    var accName = matches[3].trim();
    var accBalance = matches[4];
        
    result.__tariff = accName;
    if (AnyBalance.isAvailable("balance"))
    {
        result.balance = parseBalance(accBalance);
    }

    AnyBalance.setResult(result);
}
