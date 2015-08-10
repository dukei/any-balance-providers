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

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://clubapparel.appareluae.com/';
    AnyBalance.setDefaultCharset('utf-8'); 
	
    var html = AnyBalance.requestGet(baseurl + 'mcss/', g_headers);
	
	var params = createFormParams(html, function(params, str, name, value){
		if(name == 'ctl00$webpart_login$login_wp_view$txtb_username')
			return prefs.login;
		if(name == 'ctl00$webpart_login$login_wp_view$txtb_password')
			return prefs.password;			
		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'mcss/', params, addHeaders({Referer: baseurl + 'mcss/'})); 
	
    if(!/LoginStatus_Menu/i.test(html)){
        var error = getParam(html, null, null, /Login failed[^>]*>[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	html = AnyBalance.requestGet(baseurl + 'mcss/pages/UAE/transactions.aspx', g_headers);
	
    var result = {success: true};
    getParam(html, result, 'balance', /accounts[^>]*_balance[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	
    AnyBalance.setResult(result);
}