/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (AnyBalance 7.0; WOW64; rv:22.0) Gecko/20100101 AnyBalance/22.0'
}

function main() {
	var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.login, 'Enter e-mail!');
	checkEmpty(prefs.password, 'Enter password!');
	
	AnyBalance.setDefaultCharset('utf-8');
	
	var baseurl = 'https://wallet.google.com/';
	var baseurlLogin = 'https://accounts.google.com/';

	try {
		var html = AnyBalance.requestGet(baseurlLogin + 'ServiceLoginAuth', g_headers);

		var GALX = getParam(html, null, null, /GALX[^>]*value="([^"]*)/i);
		if(!GALX)
			throw new AnyBalance.Error('Can`t find find login form, please, contact the developers.');

		html = AnyBalance.requestPost(baseurlLogin + 'ServiceLoginAuth', {
			'Passwd': prefs.password,
			'Email': prefs.login,
			'GALX': GALX,
			'PersistentCookie': 'yes',
		}, g_headers);
	} catch(e) {
		var html = AnyBalance.requestGet('https://www.google.com/settings/account', g_headers);
	}
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<span[^>]+class="errormsg[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error);
		error = getParam(html, null, null, /(<form[^>]+name="verifyForm")/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error('This account requires 2-step authorization. Turn off 2-step authorization to use this provider.');
			
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Can`t log in, is the site changed?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'fio', /Account Options(?:[\s\S]*?<span[^>]*>){5}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'login_email', /Account Options(?:[\s\S]*?<span[^>]*>){8}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	// Получаем информацию из кошелька гугл
	html = AnyBalance.requestGet(baseurl + 'merchant/pages/', g_headers);
	if (/Merchant Center/i.test(html)) {
		var href = getParam(html, null, null, /merchant\/pages[^"]+\/transactions\/display/i);
		if(!href) {
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Can`t find transactions href, is the site changed?');
		}
		// Переходим на страницу Выплаты:
		html = AnyBalance.requestGet(baseurl + href, addHeaders({'Referer': 'Referer: https://wallet.google.com/'}));
		
		var pcid = getParam(html, null, null, /data-customer-id="([^"]+)/i);
		
		var paramsArray = [
			'pcid=' + encodeURIComponent(pcid),
			'style=' + encodeURIComponent('mc3:alerts=NO'),
			'hostOrigin=' + encodeURIComponent('aHR0cHM6Ly93YWxsZXQuZ29vZ2xlLmNvbS8.'),
			'hl=ru',
			'ipi=' + encodeURIComponent('qhqo3ij9wquj'),
		];
		
		html = AnyBalance.requestGet('https://bpui0.google.com/payments/u/0/transactions?' + paramsArray.join('&'), g_headers);
		
		getParam(html, result, 'balance', /id="balance"([^>]*>){2}/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, ['currency', 'balance'], /id="balance"([^>]*>){2}/i, replaceTagsAndSpaces, parseCurrency);
		getParam(html, result, 'last_payment', /id="lastSuccessfulPayment"(?:[^>]*>){1}[^<(]+([^<]+)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'last_payment_date', /id="lastSuccessfulPayment"(?:[^>]*>){1}([^<]+)/i, replaceTagsAndSpaces, parseDate);
	} else {
		AnyBalance.trace('Can`t login to Google Wallet, do have it on this account?');
	}
	AnyBalance.setResult(result);
}