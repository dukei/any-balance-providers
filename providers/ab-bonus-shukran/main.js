/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.62 Safari/537.36',
	'X-Requested-With':'XMLHttpRequest'
};

function main(){
    var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Enter login!');
	checkEmpty(prefs.password, 'Enter password!');	
	
    var baseurl = 'https://www.shukranrewards.com/';
    AnyBalance.setDefaultCharset('utf-8'); 
	
    var html = AnyBalance.requestGet(baseurl + '', g_headers);
	
	var form = getParam(html, null, null, /<form[^>]*"parsley"[\s\S]*?<\/form>/i);
	if(!form)
		throw new AnyBalance.Error('Can`t find login form, please, contact the developers.');
		
	var params = createFormParams(form, function(params, str, name, value) {
		if (name == 'name') 
			return prefs.login;
		else if (name == 'pass')
			return prefs.password;
		return value;
	});

	html = AnyBalance.requestPost(baseurl + 'en/ajaxlogin/user_login', params, addHeaders({Referer: baseurl + ''})); 

    if(!/Login successful/i.test(html)){
		var json = getJsonEval(getParam(html, null, null, /\[(\{[\s\S]*\})\]/i));
		var error = getParam(json.data, null, null, null, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Enter a valid card number or email only/i.test(html));
		
        throw new AnyBalance.Error('Can`t login! Please, check your login and password.');
    }
	
	html = AnyBalance.requestGet(baseurl + 'en?country=AE', g_headers);

    var result = {success: true};
	
    getParam(html, result, 'balance', /Available\s*:\s*(\d+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balance_pending', /Pending\s*:\s*(\d+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /your card number is\s*(\d{16})/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'fio', /Hi([^<]+)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}