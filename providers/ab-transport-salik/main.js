/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://customers.salik.ae/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Please, enter the login!');
	checkEmpty(prefs.password, 'Please, enter the password!');
	
	var html = AnyBalance.requestGet(baseurl + 'default.aspx?culture=en', g_headers);
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'ctl00$WorkSpace$Login1$UserName') 
			return prefs.login;
		else if (name == 'ctl00$WorkSpace$Login1$Password')
			return prefs.password;

		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'default.aspx?culture=en', params, addHeaders({Referer: baseurl + 'default.aspx?culture=en'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /style="color: Red;"(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Your login attempt was not successful/i.test(error));
		
		throw new AnyBalance.Error('Can`t login, is the site changed?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /class="balance"(?:[^>]*>){5}([\s\S]*?)<\/div/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', 'balance'], /class="balance"(?:[^>]*>){5}([\s\S]*?)<\/div/i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'acc_num', /"acc-number"(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'last_payment', /"payment"(?:[^>]*>){6}((?:[\s\S]*?<\/div>){3})/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'acc_type', /"acc-type"(?:[^>]*>){5}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'acc_status', /"acc-status"(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}