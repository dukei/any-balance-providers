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
	var baseurl = 'https://m.orange.pl/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Enter login!');
	checkEmpty(prefs.password, 'Enter password!');
	
	var html = AnyBalance.requestGet(baseurl + 'portal/lecare/login?_DARGS=/gear/lecare/login/login.jsp', g_headers);
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'login') 
			return prefs.login;
		else if (name == 'password')
			return prefs.password;

		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'portal/lecare/login?_DARGS=/gear/lecare/login/login.jsp', params, addHeaders({Referer: baseurl + 'portal/lecare/login?_DARGS=/gear/lecare/login/login.jsp'}));
	
	if (!/logout/i.test(html)) {
		var error = sumParam(html, null, null, /class="alert error"([^>]*>){2}/i, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
		if (error)
			throw new AnyBalance.Error(error, null, /nieprawidłowy login|nieprawidłowe hasło/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Can`t login. Is the site has changed?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'phone', /Numer telefonu([^>]*>){5}/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /Plan taryfowy([^>]*>){6}/i, replaceTagsAndSpaces, html_entity_decode);
	
	if(isAvailable('balance')) {
		html = AnyBalance.requestGet('https://www.orange.pl/gear/moj_orange/infoservices/ajax?group=packages-tab' + prefs.login + '&toGet=packages-tab&toUpdate=tab' + prefs.login + '&tabId=0&pageId=320500042&tabsReq=true&jsp=dynamic_v2&modal=&onlyHeader=true&_windowid=&jsp=dynamic_v2&refreshCounter=0&_=' + new Date().getTime(), addHeaders({
			Accept: '*/*',
			'X-Requested-With': 'XMLHttpRequest'
		}));
		
		getParam(html, result, 'balance', /na koncie głównym(?:[\s\S]*?<span[^>]*>)([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, ['currency', 'balance'], /na koncie głównym(?:[\s\S]*?<span[^>]*>)([\s\S]*?)<\//i, replaceTagsAndSpaces, parseCurrency);
	}
	
	AnyBalance.setResult(result);
}