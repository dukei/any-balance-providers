/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Retrieves balance, status and renewal date from Etisalat personal account on specified prepaid mobile number.


Operator site: http://www.etisalat.ae
Personal account: https://www.e4me.ae/
*/

var g_headers = {
'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
'Connection':'keep-alive',
'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

var g_errors = {
    "UserNameMustBe": "User name must be at least 5 and at most 8 characters long",
    "PasswordMustBe": "Password must be at least 5 and at most 8 characters long",
    "loginValidation": "Please enter valid user name and password",
    "duplicatelogin": "You are already logged in...",
    "loginAttemptsExceeded": "User name must be at least 5 and at most 8 characters long",
    "loginFailed": "Login or password is invalid. Please try again...",
    "UserNameMustBe": "User name must be at least 5 and at most 8 characters long",
    "UserNameMustBe": "User name must be at least 5 and at most 8 characters long",
    "loginAttemptsExceeded": "You have exceeded the maximum number of unsucessfull Login attempts. Please try again later",
    "Login.BlacklistedCustomer": "Login failed. Kindly visit an eShop Coordinator at your nearest Business Center for further assistance"
};

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://www.e4me.ae/e4me/etisalat/";
    AnyBalance.setDefaultCharset('utf-8'); 

    var result = {success: true};

    try{
        var html = AnyBalance.requestPost(baseurl + 'login', {
            UserName:prefs.login,
            Password:prefs.password
        }, addHeaders({Referer: baseurl + 'login'})); 
        
        if(!/<frame[^>]+src="[^"]*\/etisalat\/accounts"/i.test(html)){
            var errid = getParam(html, null, null, /location\.href='[^']*MSG=([^']*)/i, replaceSlashes);
            if(g_errors[errid])
                throw new AnyBalance.Error(g_errors[errid]);
            //Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
            throw new AnyBalance.Error('The login attempt has failed. Is the site changed?');
        }
        
        html = AnyBalance.requestGet(baseurl + 'accounts?SID=9');
        
        var re = new RegExp('<tr(?:[\\s\\S](?!</tr>))*?getAccountDetails\\(\'\\d*' + (prefs.num ? prefs.num : '\\d+') + '\'[\\s\\S]*?</tr>', 'i');
        var tr = getParam(html, null, null, re);
        if(!tr)
            throw new AnyBalance.Error(prefs.num ? 'There is no phone number ending by ' + prefs.num : 'You do not have prepaid numbers attached to your account.');
        
        getParam(tr, result, 'phone', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(tr, result, 'fio', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(tr, result, 'status', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(tr, result, 'till', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
        
        if(AnyBalance.isAvailable('balance')){
            var id = getParam(tr, null, null, /getAccountDetails\s*\(\s*'([^']*)/i);
            html = AnyBalance.requestGet(baseurl + 'accounts?SID=10&NationalNo=' + id);
            getParam(html, result, 'balance', /Available balance[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, [replaceTagsAndSpaces, /^\./, '0.'], parseBalance);
        
        }
    }finally{
        AnyBalance.requestGet(baseurl + 'logoff'); //The logoff is obligatory, because etisalat does not allow double login
    }

    //Возвращаем результат
    AnyBalance.setResult(result);
}
