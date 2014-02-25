/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/28.0.1500.95 Safari/537.36',
	'Origin':'https://mobile.paypal.com'
};

function followLink(html, signature){
	var re = new RegExp('<a[^>]+href="([^"]*' + signature + ')"[^<]*>', 'i');
	var href = getParam(html, null, null, re, null, html_entity_decode);
	if(!href) {
		AnyBalance.trace(html_entity_decode(html));
		throw new AnyBalance.Error('Can not find reference ' + signature + '. Is the site changed?');
	}
	return AnyBalance.requestGet(href, g_headers);
}

function main(){
    var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Enter e-mail!');
	checkEmpty(prefs.password, 'Enter password!');
    
	var baseurl = 'https://mobile.paypal.com/cgi-bin/wapapp';
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	html = followLink(html, 'view_balance.x=');
	
	var form = getParam(html, null, null, /<form[^>]+name="Login"[\s\S]*?<\/form>/i);
	if(!form)
        throw new AnyBalance.Error('Can not find login form! Site is changed?');
	
    var params = createFormParams(form);
    params.login_email = prefs.login;
    params.login_password = prefs.password;
    
    var action = getParam(form, null, null, /<form[^>]+action="([^"]*)/i, null, html_entity_decode);
    html = AnyBalance.requestPost(action, params, g_headers);
	
	if (!/cmd=_wapapp-logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+id="crit"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html_entity_decode(html));
		throw new AnyBalance.Error('Can not login to PayPal. Is the site changed?');
	}
	if(!/<\/h4>([^<]*)<hr/i.test(html)){
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Can not find PayPal balance. Is the site changed?');
    }
	
	var result = {success: true};
	
	getParam(html, result, ['currency','balance'], /<\/h4>([^<]*)<hr/i, [replaceTagsAndSpaces, /in/i, ''], parseCurrency);
    getParam(html, result, 'balance', /<\/h4>([^<]*)<hr/i, replaceTagsAndSpaces, parseBalance);
	
    AnyBalance.setResult(result);
}