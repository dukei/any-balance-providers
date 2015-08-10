/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};
function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://m.facebook.com/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Please, enter login!');
	checkEmpty(prefs.password, 'Please, enter password');
		
	var html = AnyBalance.requestGet(baseurl, g_headers);

	var params = createFormParams(html, function(params, str, name, value){
		if(name == 'email')
			return prefs.login;
		if(name == 'pass')
			return prefs.password;			
		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'login.php?refsrc=https%3A%2F%2Fm.facebook.com%2F&refid=8', params, addHeaders({Referer: baseurl + ''}));
	
	if(!/logout/i.test(html)) {
		if(/Нам не удалось опознать ваш электронный адрес/i.test(html))
			throw new AnyBalance.Error('Your have entered wrong login or password.', null, true);
		throw new AnyBalance.Error('Can`t login. Site changed?');
	}
	
	html = AnyBalance.requestGet(baseurl, g_headers);
	var result = {success: true};

	var userid = getParam(html, null, null, /"USER_ID":"([^"]+)/i, replaceTagsAndSpaces, parseBalance);

	getParam(html, result, 'messages', /Входящие(?:[^>]*>){2}(\d+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'friends', /добавление в друзья(?:[^>]*>){2}(\d+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', new RegExp(userid + ',"name":"([^"]+)', 'i'), replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'name', new RegExp(userid + ',"name":"([^"]+)', 'i'), replaceTagsAndSpaces, html_entity_decode);
	
    AnyBalance.setResult(result);
}