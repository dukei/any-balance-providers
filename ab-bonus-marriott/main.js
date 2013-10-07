/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/30.0.1599.69 Safari/537.36',
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://m.marriott.com/';
    AnyBalance.setDefaultCharset('utf-8'); 
	
    var html = AnyBalance.requestGet(baseurl, g_headers);
	
	var secure = getParam(html, null, null, /<img\s*src\s*=\s*"(https:\/\/smetrics[^"]*)/i);
	var href = getParam(html, null, null, /href="([^"]*)[^>]*>\s*Rewards account/i);

	html = AnyBalance.requestGet(secure, addHeaders({Referer: baseurl}));
	html = AnyBalance.requestGet(href, addHeaders({Referer: baseurl}));
	
	var params = createFormParams(html, function(params, str, name, value){
		if(name == 'txtUserName')
			return prefs.login;
		else if(name == 'txtPassword')
			return prefs.password;
		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'p/frmRewardSignIn', params, addHeaders({Referer: href}));
	html = AnyBalance.requestGet(href, g_headers);
	
	if(!/"Sign out"/i.test(html)){
        throw new AnyBalance.Error('Can`t login. Site changed?');
    }

    var result = {success: true};
    getParam(html, result, 'balance', /Points Balance[\s\S]*?<label[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'nights', /Total membership nights[\s\S]*?<label[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /Membership Level[\s\S]*?<label[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	
    AnyBalance.setResult(result);
}