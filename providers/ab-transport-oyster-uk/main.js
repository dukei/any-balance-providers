
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
	var baseurl = 'https://oyster.tfl.gov.uk/oyster/';

	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Enter user name!');
	AB.checkEmpty(prefs.password, 'Enter password!');

	var html = AnyBalance.requestGet(baseurl + 'entry.do', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Site is temporary unavailable! Try again later.');
	}

	var form = AB.getElement(html, /<form[^>]+sign-in[^>]*>/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Could not find login form. Is site changed?');
	}

	var params = AB.createFormParams(form, function(params, str, name, value) {
		if (name == 'UserName') {
			return prefs.login;
		} else if (name == 'Password') {
			return prefs.password;
		}

		return value;
	});

	var action = getParam(form, null, null, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities);

	html = AnyBalance.requestPost(action, params, AB.addHeaders({
		Referer: AnyBalance.getLastUrl()
	}));

	if (!/signout/i.test(html)) {
		if (!html || AnyBalance.getLastStatusCode() > 400) {
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Cards balance is temporary unavailable! Try again later.');
		}

		var error = AB.getElement(html, /<div[^>]+bg-danger/ig, [/<h3[^>]*>[\s\S]*?<\/h3>/i, '', AB.replaceTagsAndSpaces]);
		if (error) {
			throw new AnyBalance.Error(error, null, /password/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Could not enter personal account. Is the site changed?');
	}

	var json = getJsonObject(html, /"cards"\s*:/);
	if(!json){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('No cards found!');
	}

	var result = {
		success: true
	};

	for(var i=0; i<json.length; ++i){
		var card = json[i];
		var suffix = i ? '' + i : '';

		AB.getParam(card.ppvBalance, result, 'balance' + suffix);
		AB.getParam(card.cardNumber, result, 'num' + suffix);
	}

	AnyBalance.setResult(result);
}
