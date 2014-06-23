/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
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

var g_isPrepayed = true;

function main(){
    var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.login, 'Enter login, please!');
	checkEmpty(prefs.password, 'Enter password, please!');
	
    var baseurl = "https://onlineservices.etisalat.ae/";
    AnyBalance.setDefaultCharset('utf-8'); 
	
    var result = {success: true};
	
    try{
		var html = AnyBalance.requestGet(baseurl + 'scp/', g_headers);
		
		var form = getParam(html, null, null, /<form id="atg_store_registerLoginForm"[\s\S]*?<\/form>/i);
		
		var action = getParam(html, null, null, /action="\/([^"]+)"/i);
		
		checkEmpty(form && action, 'Can`t find login form, is the site changed?', true);
		
		var params = createFormParams(form, function(params, str, name, value) {
			if (name == 'atg_store_registerLoginEmailAddress') 
				return prefs.login;
			else if (name == 'atg_store_registerLoginPassword')
				return prefs.password;

			return value;
		});		
		
        html = AnyBalance.requestPost(baseurl + action, params, addHeaders({Referer: baseurl + 'scp/index.jsp'})); 

		if(/Change Security Question\/Answer/i.test(html))
			throw new AnyBalance.Error('You need to change Security Question/Answer in your personal account to allow application to show information from this account. Please visit the selfcare from desktop and follow the instructions.');
		
        if(!/Logout/i.test(html)){
            var errid = getParam(html, null, null, /location\.href='[^']*MSG=([^']*)/i, replaceSlashes);
            if(g_errors[errid])
                throw new AnyBalance.Error(g_errors[errid]);
			
            //Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
            throw new AnyBalance.Error('The login attempt has failed. Is the site changed?');
        }
        // Это предоплата
        html = AnyBalance.requestGet(baseurl + 'scp/myaccount/accountoverview.jsp');
		// Это пост оплата
		if(/There is no pre paid account available/i.test(html)) {
			g_isPrepayed = false;
			AnyBalance.trace('There is no pre paid account available... We are in post paid selfcare');
			
			html = AnyBalance.requestGet(baseurl + 'accounts');
		}
        // accountSummaryDetails\.jsp\?accountBackendId=\d+1127[\s\S]*?</tr>
        var re = new RegExp('accountSummaryDetails\\.jsp\\?accountBackendId=\\d+' + (prefs.num ? prefs.num : '\\d+') + '[\\s\\S]*?</tr>', 'i');
        var tr = getParam(html, null, null, re);
        if(!tr)
            throw new AnyBalance.Error(prefs.num ? 'There is no phone number ending by ' + prefs.num : 'You do not have prepaid numbers attached to your account.');
		
		getParam(tr, result, 'balance', /(?:[^>]*>){15}([\s\S]*?)<\/td/i, replaceTagsAndSpaces, parseBalance);
        getParam(tr, result, 'phone', /(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
        getParam(tr, result, '__tariff', /(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
        getParam(tr, result, 'fio', /(?:[^>]*>){9}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
        getParam(tr, result, 'status', /(?:[^>]*>){14}([\s\S]*?)<\/td/i, replaceTagsAndSpaces, html_entity_decode);
        //getParam(tr, result, 'till', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
        /*
        if(AnyBalance.isAvailable('balance')){
            var id = getParam(tr, null, null, /getAccountDetails\s*\(\s*'([^']*)/i);
			
			if(g_isPrepayed) {
				html = AnyBalance.requestPost(baseurl + 'accounts?SID=15&MobileNo=' + id, {
					'SID':'1',
					SelectedAccount:''
				}, addHeaders({'Referer': baseurl + 'accounts?SID=9'}));
			} else {
				html = AnyBalance.requestGet(baseurl + 'accounts?SID=2&NationalNo=' + id, addHeaders({'Referer': baseurl + 'accounts'}));
			}
			
			getParam(html, result, 'balance', [/>\s*Current Amount Due([^>]*>){4}/i, />balance(?:[\s\S]*?<td[^>]*>){5}([\d,.\s]+)/i], replaceTagsAndSpaces, parseBalance);
        }
		*/
    }finally{
		var logout = getParam(html, null, null, /lass="logout" href="\/([^'"]+)/i);
        AnyBalance.requestGet(baseurl + logout); //The logoff is obligatory, because etisalat does not allow double login
    }
	
    AnyBalance.setResult(result);
}
