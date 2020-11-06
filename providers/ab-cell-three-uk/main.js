
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

	var msisdn = prefs.login.replace(/^0/, '44');

	var html = AnyBalance.requestGet(baseurl + 'My3Account/My3/Login?msisdn=' + msisdn, g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Site is temporary unavailable! Try again later.');
	}

	html = AnyBalance.requestPost(baseurl + 'cs/form/customer-my3-login', JSON.stringify({
		"_form_url":"",
		"_success_url":"",
		"_failure_url":"",
		"msisdn":msisdn,
		"password":prefs.password
	}), addHeaders({
		'X-Requested-With': 'XMLHttpRequest',
		'Content-Type': 'application/json',
	}));
	
	var json = getJson(html);

	if (json.status !== 'success') {
		var error = json.message;
		if (error) {
			throw new AnyBalance.Error(error, null, /password/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Could not enter personal account. Is the site changed?');
	}

	var url = json.data.redirectUrl;
	AnyBalance.trace('Logged in successfully: ' + url);

	html = AnyBalance.requestGet(url, addHeaders({Referer: baseurl}));
	html = AnyBalance.requestGet(baseurl + 'New_My3/Account_balance?id=My3_CheckYourBalanceLink', g_headers);

	var result = {
		success: true
	};

	AB.getParam(html, result, 'balance', /<tr[^>]+summary[^>]*>([\s\S]*?)<\/tr>/i, replaceTagsAndSpaces, parseBalance);
	AB.getParam(html, result, '__tariff', /Your number is\s*<strong[^>]*>([\s\S]*?)<\/strong>/i, replaceTagsAndSpaces);
	AB.getParam(html, result, 'internet_till', /Free internet allowance(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, [replaceTagsAndSpaces /*, /(\d+)\/(\d+)\/(\d+)/, '$2/$1/$3'*/], parseDate);
	AB.getParam(html, result, 'internet_left', /Total internet mb(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

	AnyBalance.setResult(result);
}
