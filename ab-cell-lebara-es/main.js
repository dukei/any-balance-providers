/**
AnyBalance Provider (http://any-balance-providers.googlecode.com)
*/
var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	// 'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru,en;q=0.8',
	'Connection': 'keep-alive',
	'Origin':'https://www.lebara.es',
	'Cookie2':'$Version=1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.57 Safari/537.36',
};

function main(){
	var prefs = AnyBalance.getPreferences();
	
	var baseurl = 'https://www.lebara.es/';
	
	// Да уж, такой авторизации я еще не видел.
	var html = AnyBalance.requestGet(baseurl + 'view/content/pl_dashboardLoginSignup?targetUrl=/dashboard', g_headers);
	
	try {
		// На сайте явный баг, авторизация происходит после второго или третьего запроса
		for(var i=0; i<4; i++) {
			html = AnyBalance.requestPost(baseurl + 'view/LoginComponentController?targetUrl=/dashboard&', {
				loginId: prefs.login,
				password: prefs.password
			}, addHeaders({Referer: baseurl + 'view/content/pl_dashboardLoginSignup?targetUrl=/dashboard'}));
			
			if(/LogoutController/.test(html))
				break;
		}
	} catch(e) {
	}
	
	html = AnyBalance.requestGet(baseurl + 'dashboard', g_headers);
	//AnyBalance.trace(html);
	
    if(!/LogoutController/.test(html)){
        var error = getParam(html, null, null, /<ul[^>]+id="[^"]*errors"[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error);
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Can not log in. Wrong login or password or site might be changed.');
    }
    
    var result = {success: true};
	
	getParam(html, result, '__tariff', /<option[^>]+selected[^>]*>\s*(\d+[^<]*)/i, replaceTagsAndSpaces);
	getParam(html, result, 'balance', /<p>[^<]*(?:saldo|balance)(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	
    AnyBalance.setResult(result);
}