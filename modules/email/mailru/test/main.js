
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	// Mobile
	//'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+',
	// Desktop
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();

	var email = new Email_mailru(prefs.login, prefs.password, 3600);
	AnyBalance.trace('Logged in. Please send 2 emails to ' + email.email);

	email.setOnEmail(function(eml){
		AnyBalance.trace('Received email: ' + eml.name + ' from ' + eml.from + ' on ' + new Date(eml.time));
		AnyBalance.trace('Email text: ' + eml.text);
		AnyBalance.trace('Email html: ' + eml.html);
		AnyBalance.trace('Email has ' + (eml.attachments && eml.attachments.length) + ' attachments');
		//return false; //Чтобы прервать ожидание новых емейлов, можно вернуть false
	});
	
	email.waitForEmails(2);
	
	var result = {
		success: true
	};

	AnyBalance.setResult(result);
}
