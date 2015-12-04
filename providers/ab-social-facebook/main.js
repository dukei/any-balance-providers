/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.73 Safari/537.36',
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
		if(name == 'version')
			return '1';
		if(name == '_fb_noscript')
			return undefined;
		
		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'login.php?refsrc=https%3A%2F%2Fm.facebook.com%2F&lwv=100&refid=8', params, addHeaders({Referer: baseurl}));
	
	if (!/requests_jewel/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+id="root"[^>]*>([\s\S]*?)<\/form>/i, [replaceTagsAndSpaces, /Зарегистрируйте аккаунт.*/i, ''], html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Нам не удалось опознать|не соответствует ни одному аккаунту/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Can`t login. Site has been changed?');
	}
	
	html = AnyBalance.requestGet(baseurl, g_headers);
	
	var result = {success: true};

	var userid = getParam(html, null, null, /"USER_ID":"([^"]+)/i, replaceTagsAndSpaces);

	getParam(html, result, 'messages', /Входящие(?:[^>]*>){1,7}(\d+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'friends', /Запросы на добавление в друзья(?:[^>]*>){1,7}(\d+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', new RegExp(userid + ',"name":("[^"]+")', 'i'), [/^/, 'return '], safeEval);
	getParam(result.__tariff, result, 'name');
	
    AnyBalance.setResult(result);
}