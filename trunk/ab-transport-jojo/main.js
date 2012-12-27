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
    if(prefs.card)
        if(!/^\d{4}$/.test(prefs.card))
            throw new AnyBalance.Error("Enter only 4 last digits of the card or leave this field empty.");

    var baseurl = "https://www.skanetrafiken.se/templates/";
    var result = {success: true}, matches;
    AnyBalance.setDefaultCharset("ISO-8859-1");
    
    var url = baseurl + "MSRootPage.aspx?id=2935&epslanguage=SV";
    AnyBalance.trace("GET: " + url);
    var html = AnyBalance.requestGet(url, headers);
    //AnyBalance.trace(url + ": " + html);

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
    //AnyBalance.trace(url + " (post): " + html);
    
    if (html.indexOf(ctWrongLoginPass) >= 0)
        throw new AnyBalance.Error("Invalid login and/or password");
    if (html.indexOf(ctLoginFail) >= 0)
        throw new AnyBalance.Error("Login failed. Website design is changed?");
    
    url = baseurl + "CardInformation.aspx?id=26957&epslanguage=SV";
    AnyBalance.trace("GET: " + url);
    html = AnyBalance.requestGet(url, headers);
    //AnyBalance.trace(url + ": " + html);

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
    //AnyBalance.trace(url + " (post): " + html);

    result.__tariff = accName;
    getParam(html, result, 'balance', /labelsaldoinfo"[\s\S]*?>([^<]+) kr</i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'validfrom', /labelvalidperiodinfo"[\s\S]*?>([^<]+) - \d/i, replaceTagsAndSpaces, parseDate2);
    getParam(html, result, 'validtill', /labelvalidperiodinfo"[\s\S]*?>[\s\S]*? - ([^<]+)</i, replaceTagsAndSpaces, parseDate2);
    getParam(html, result, 'zoneslist', /labelzoneareainfozones"[\s\S]*?>([^<]+)</i, replaceTagsAndSpaces);
    getParam(html, result, 'zonearea', /labelzoneareainfo"[\s\S]*?>([^<]+)</i, replaceTagsAndSpaces);
    getParam(html, result, 'status', /labelstatusinfo"[\s\S]*?>([^<]+)</i, replaceTagsAndSpaces);
    getParam(html, result, 'cardnum', /labelcardnumberinfo"[\s\S]*?>([^<]+)</i, replaceTagsAndSpaces);
    getParam(html, result, 'info', /labelobsinfo"[\s\S]*?>([^<]+)</i, replaceTagsAndSpaces);
    
    AnyBalance.setResult(result);
}
