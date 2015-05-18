/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Cache-Control': 'max-age=0',
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Origin': 'https://accounts.google.com',
	'User-Agent': 'Mozilla/5.0 (Linux; U; Android 4.0.4; ru-ru; Android SDK built for x86 Build/IMM76D) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
	'Accept-Language': 'ru-RU, en-US',
}

function main() {
	var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.login, 'Enter e-mail!');
	checkEmpty(prefs.password, 'Enter password!');
	
	AnyBalance.setDefaultCharset('utf-8');
	var baseurl = 'https://wallet.google.com/';
	
	var html = googleLogin(prefs);
	
	var result = {success: true};
	
	getParam(html, result, 'fio', /gbar\.logger\.il(?:[^>]*>){1}([^<]+)<\/span/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'login_email', /gbar\.logger\.il(?:[^>]*>){3}([^<]+)<\/span/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /gbar\.logger\.il(?:[^>]*>){3}([^<]+)<\/span/i, replaceTagsAndSpaces, html_entity_decode);
	
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
		// Следующая выплата
		getParam(html, result, 'next_payment', /01.\d{2}.\d{4}\s*-\s*(?:28|29|30|31).\d{2}.\d{4}(?:[^>]*>){6}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	} else {
		AnyBalance.trace('Can`t login to Google Wallet, do have it on this account?');
	}
	
	AnyBalance.setResult(result);
}