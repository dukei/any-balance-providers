
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
	var baseurl = 'https://www.three.co.uk/';

	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Enter user name!');
	AB.checkEmpty(prefs.password, 'Enter password!');

	var html = AnyBalance.requestGet(baseurl + 'My3Account/My3/Login', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Site is temporary unavailable! Try again later.');
	}

	var iframe = getParam(html, null, null, /<iframe[^>]+id="loginIframe"[^>]*src="([^"]*)/i, replaceHtmlEntities);
	if(!iframe){
		html = AnyBalance.requestGet(baseurl + 'My3Account/My3/Login', g_headers);
		iframe = getParam(html, null, null, /<iframe[^>]+id="loginIframe"[^>]*src="([^"]*)/i, replaceHtmlEntities);
	}

	AnyBalance.trace('Login iframe: ' + iframe);
	html = AnyBalance.requestGet(iframe, addHeaders({Referer: AnyBalance.getLastUrl()}));

	var form = AB.getElement(html, /<form[^>]+login_form[^>]*>/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Could not find login form. Is site changed?');
	}

	var params = AB.createFormParams(form, function(params, str, name, value) {
		if (name == 'username') {
			return prefs.login;
		} else if (name == 'password') {
			return prefs.password;
		}

		return value;
	});

	html = AnyBalance.requestPost(AnyBalance.getLastUrl(), params, AB.addHeaders({
		Referer: AnyBalance.getLastUrl()
	}));

	if (!/Login successful/i.test(html)) {
		var error = AB.getElements(html, /<div[^>]+my3AuthError\b(?:[^>](?!display:\s*none))*>/ig, AB.replaceTagsAndSpaces).join('\n');
		if (error) {
			throw new AnyBalance.Error(error, null, /password/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Could not enter personal account. Is the site changed?');
	}

	var url = getParam(html, null, null, /<a[^>]+href="([^"]*SelfcareUk[^"]*)/i, replaceHtmlEntities);
	AnyBalance.trace('Logged in successfully: ' + url);

	html = AnyBalance.requestGet(url, g_headers);
	html = AnyBalance.requestGet(baseurl + 'New_My3/Account_balance?id=My3_CheckYourBalanceLink', g_headers);

	var result = {
		success: true
	};

	AB.getParam(html, result, 'balance', /Total Credit(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	AB.getParam(html, result, '__tariff', /Your number is\s*<strong[^>]*>([\s\S]*?)<\/strong>/i, replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}
