/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36',
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
	
	html = AnyBalance.requestPost(baseurl + 'portal/lecare/login?_DARGS=/gear/lecare/login/login.jsp', params, addHeaders({
		Referer: baseurl + 'portal/lecare/login?_DARGS=/gear/lecare/login/login.jsp'
	}));
	
	if (!/logout/i.test(html)) {
		var error = sumParam(html, null, null, /class="alert error"([^>]*>){2}/i, replaceTagsAndSpaces, null, aggregate_join);
		if (error)
			throw new AnyBalance.Error(error, null, /nieprawidłowy login|nieprawidłowe hasło/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Can`t login. Is the site has changed?');
	}
	
	var result = {success: true};

	getParam(html, result, 'phone', /Numer telefonu([^>]*>){5}/i, replaceTagsAndSpaces);
	getParam(html, result, '__tariff', /Plan taryfowy([^>]*>){6}/i, replaceTagsAndSpaces);
	getParam(html, result, 'balance', /Konto główne(?:[^>]*>){11}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', 'balance'], /Konto główne(?:[^>]*>){11}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'incomingCallsDays', /Możesz odbierać(?:[^>]*>){9}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'outgoingCallsDays', /Możesz dzwonić(?:[^>]*>){9}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'skarbonkaLeft', /Skarbonka(?:[^>]*>){18}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);

	if(isAvailable(['internet', 'trafficLeft', 'bonusTrafficLeft'])) {
		html = AnyBalance.requestGet('https://www.orange.pl/portal/moj_orange/wykorzystanie/w_skrocie', g_headers);
		getParam(html, result, 'internet', /pakiet danych(?:[\s\S]*?<div[^>]*>){12}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseTraffic);
		getParam(html, result, 'trafficLeft', /Wartość dostępnego limitu transferu danych(?:[\s\S]*?<div[^>]*>){12}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseTraffic);
		getParam(html, result, 'bonusTrafficLeft', /bonusowa wartość dostępnego limitu transferu danych(?:[\s\S]*?<div[^>]*>){12}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseTraffic);
	}
	AnyBalance.setResult(result);
}