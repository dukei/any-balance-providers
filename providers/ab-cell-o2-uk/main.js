
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
	var baseurlLogin = 'https://accounts.o2.co.uk/';
	var baseurl = 'https://mymobile.o2.co.uk/';

	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Enter user name!');
	AB.checkEmpty(prefs.password, 'Enter password!');

	var html = AnyBalance.requestGet(baseurlLogin + 'signin', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Site is temporary unavailable! Try again later.');
	}

	var form = AB.getElement(html, /<form[^>]+loginForm[^>]*>/i);
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

	var action = getParam(form, null, null, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities);

	html = AnyBalance.requestPost(action, params, AB.addHeaders({
		Referer: baseurlLogin + 'signin'
	}));

	if (!/disambiguation_id/i.test(html)) {
		var error = AB.getElement(html, /<div[^>]+accountsError/i, AB.replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /match our records/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Could not enter personal account. Is the site changed?');
	}

	var disambiguation_id = getParam(html, null, null, /disambiguation_id=([^&"']+)/i, replaceHtmlEntities);
	var result = {
		success: true
	};

	AB.getParam(html, result, '__tariff', /<span[^>]+mobileNumberHeading[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);

	html = AnyBalance.requestGet(baseurl + 'api/payandgo/balanceandallowance?disambiguation_id=' + disambiguation_id, addHeaders({Referer: AnyBalance.getLastUrl()}));
	var json = getJson(html);

	AB.getParam(json.accountBalance.valueInPence/100, result, 'balance');
	AB.getParam(json.currentTariff.accountStatus, result, 'status');
	AB.getParam(json.currentTariff.anniversaryDate, result, 'renewal');
	//Don't forget, you get international calls from 1p/min. You have 3000 O2 texts, 0 O2 minutes and 100.0MB of data left.
	AB.getParam(json.currentTariff.allowanceStatusText, result, 'sms', /(\d+)\s+O2 text/i, null, parseBalance);
	AB.getParam(json.currentTariff.allowanceStatusText, result, 'min', /(\d+)\s+O2 minute/i, null, parseBalance);
	AB.getParam(json.currentTariff.allowanceStatusText, result, 'traffic', /([\d\.\,]+[MGT]b)\s+of data/i, null, parseTraffic);

	AnyBalance.setResult(result);
}
