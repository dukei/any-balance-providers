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

	if(!prefs.dbg) {
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
	} else {
		var html = AnyBalance.requestGet('https://www.google.com/settings/account', g_headers);
	}
	var result = {success: true};
	
	getParam(html, result, 'fio', /Account Options(?:[\s\S]*?<span[^>]*>){5}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'login_email', /Account Options(?:[\s\S]*?<span[^>]*>){8}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	// Получаем информацию из кошелька гугл
	html = AnyBalance.requestGet(baseurl + 'merchant/pages/', g_headers);
	if (/Google Wallet - Merchant Center/i.test(html)) {
		var href = getParam(html, null, null, /(merchant\/pages[^"]+bcid[^"]+)\/earnings\/display"/i);
		if(!href) {
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Can`t find transactions href, is the site changed?');
		}
		// Переходим на страницу Выплаты:
		html = AnyBalance.requestGet(baseurl + href + '/transactions/display?selectedrange=LAST_THREE_MONTHS&filterchoice=ALL_TRANSACTIONS', g_headers);
		
		getParam(html, result, 'balance', /id="currentBalanceAmount"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, ['currency', 'balance'], /id="currentBalanceAmount"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseCurrencyMy);
		getParam(html, result, 'last_payment', /lastSuccessfulPaymentAmount"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'last_payment_date', /lastSuccessfulPaymentAmount"[^>]*>[^>]*>[^>]*>[^>]*on([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDate);
	} else {
		AnyBalance.trace('Can`t login to Google Wallet, do have it on this account?');
	}
	AnyBalance.setResult(result);
}

function parseCurrencyMy(text) {
	var val = getParam(html_entity_decode(text).replace(/\s+/g, ''), null, null, /(\S*?)-?\d[\d.,]*/);
	AnyBalance.trace('Parsing currency (' + val + ') from: ' + text);
	return val;
}