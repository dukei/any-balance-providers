/**
Provider AnyBalance (http://any-balance-providers.googlecode.com)

Reading the information from BalticMiles account (http://www.balticmiles.com)
Author: valeravi (valeravi@vi-soft.com.ua)
*/

function main(){
    throw new AnyBalance.Error("balticmiles.com was shut down. Use pinsforme.com instead. Not possible to create provider for pinsforme.com as it uses reCAPTCHA...");

    var prefs = AnyBalance.getPreferences();
    var baseurl = "https://www.balticmiles.com/en/";
    AnyBalance.setDefaultCharset('utf-8'); 

    AnyBalance.trace('POST: ' + baseurl + 'login');
    html = AnyBalance.requestPost(baseurl + 'login', {
    	redirect_url:baseurl,
        identity:prefs.login,
        password:prefs.password,
        login:'Login'
    }); 
    if (!/\/Logout/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error("Can't enter to the account. Possible that website is changed.");
    }
    var result = {success: true};
    getParam(html, result, 'name', /class="hello"[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /class="userclass"[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /My Points:[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);

    if (isAvailable(['card', 'statusbalance', 'explastupdated', 'expbalance1', 'expbalance2', 'expmonth1', 'expmonth2', 'expiration'])){
    	AnyBalance.trace('GET: ' + baseurl + 'my-account/account-statement');
        html = AnyBalance.requestGet(baseurl + 'my-account/account-statement');
        getParam(html, result, 'statusbalance', /<span>([^<]*)<\/span>\s*Status Points/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'card', /Your BalticMiles card number:(?:[\s\S]*?<[^>]*>){3}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, ['explastupdated', 'expiration'], /Point expiry information last updated:(?:[\s\S]*?<[^>]*>){1}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseDateISO, 'expiration');
        expired = html.match(/Will expire[\s\S]*?<span>\s*<span>\s*([^<>]*?)<\/span>\s*in\s([^<>]*?)\s*<\/span>\s*<span>\s*<span>\s*([^<>]*?)<\/span>\s*in\s([^<>]*?)\s*<\/span>/i);
        if (expired && expired.length >= 5) {
        	getParam(expired[1], result, ['expbalance1', 'expiration'], null, replaceTagsAndSpaces, parseBalance);
        	getParam(expired[2], result, ['expmonth1', 'expiration'], null, replaceTagsAndSpaces, html_entity_decode);
        	getParam(expired[3], result, ['expbalance2', 'expiration'], null, replaceTagsAndSpaces, parseBalance);
        	getParam(expired[4], result, ['expmonth2', 'expiration'], null, replaceTagsAndSpaces, html_entity_decode);
			if (isAvailable('expiration')) {
            	var date = new Date(result['explastupdated']);
            	result['expiration'] = result['expbalance1'] + ' in ' + result['expmonth1'] + ', ' + result['expbalance2'] + ' in ' + result['expmonth2'] +
					', updated at: ' + date.getDate() + '/' + (date.getMonth()+1) + '/' + date.getFullYear();
        	}
        }
    }	
    AnyBalance.setResult(result);
}