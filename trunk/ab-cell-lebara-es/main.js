/**
AnyBalance Provider (http://any-balance-providers.googlecode.com)
*/

function main(){
	var prefs = AnyBalance.getPreferences();
	
	var baseurl = 'https://www.lebara.es/';

	var html = AnyBalance.requestGet(baseurl + 'instant-login?header=true');

    if(!prefs.__dbg){
        html = AnyBalance.requestPost(baseurl + "view/NewLoginComponentController?targetUrl=/view/content/pl_dashboardLoggedin&", {
        	loginId: prefs.login,
            password: prefs.password
        });
    } else {
        html = AnyBalance.requestGet(baseurl + "view/content/pl_dashboardLoggedin");
    }
    
    if(!/\/view\/NewLogoutController/.test(html)){
        var error = getParam(html, null, null, /<ul[^>]+id="[^"]*errors"[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Can not log in. Wrong login or password or site might be changed.');
    }
    
    var result = {success: true};
	
	getParam(html, result, '__tariff', /<option[^>]+selected[^>]*>\s*(\d+[^<]*)/i, replaceTagsAndSpaces);
	getParam(html, result, 'balance', /(?:saldo|balance):(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	
    AnyBalance.setResult(result);
}