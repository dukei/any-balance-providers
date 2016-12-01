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
	var baseurl = 'https://payments.google.com/';
	
	var html = googleLogin(prefs);
	
	var result = {success: true};
	
	getParam(html, result, 'fio', /gbar\.logger\.il(?:[^>]*>){1}([^<]+)<\/span/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'login_email', /gbar\.logger\.il(?:[^>]*>){3}([^<]+)<\/span/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /gbar\.logger\.il(?:[^>]*>){3}([^<]+)<\/span/i, replaceTagsAndSpaces, html_entity_decode);
	
	// Получаем информацию из кошелька гугл
	html = AnyBalance.requestGet(baseurl + 'payments/home?hl=ru', g_headers);
	if (/центр\s+платежей/i.test(html)) {
		var href = getElements(html, [/<a\s+[^>]+data-widget-reference-token/ig, /Подписки\s+и\s+услуги/i])[0];
		if(!href) {
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Can`t find transactions href, is the site changed?');
		}

		var ebpInfo = getParam(href, null, null, /data-widget-reference-token="([^"]*)/i, replaceHtmlEntities, getJson);

		// Переходим на страницу подписок и услуг:
		html = AnyBalance.requestPost(baseurl + 'payments/u/0/account_manager?hl=ru', {ebp: ebpInfo[1]}, addHeaders({'Referer': baseurl}));
		
		var href = getElements(html, [/<a\s+[^>]+data-widget-reference-token/ig, /Перейти/i])[0];
		if(!href) {
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Can`t find payments href, is the site changed?');
		}
		var ebpInfo = getParam(href, null, null, /data-widget-reference-token="([^"]*)/i, replaceHtmlEntities, getJson);

		// Переходим на страницу выплат:
		html = AnyBalance.requestPost(baseurl + 'payments/u/0/embedded_landing_page?hl=ru', {ebp: ebpInfo[1]}, addHeaders({'Referer': baseurl}));

		getParam(getElement(html, /<[^>]+balance-card-headline/i), result, 'balance', null, replaceTagsAndSpaces, parseBalance);
		getParam(getElement(html, /<[^>]+balance-card-headline/i), result, ['currency', 'balance'], null, replaceTagsAndSpaces, parseCurrency);
		getParam(html, result, 'last_payment', /Его\s+размер составил([^<]+)/i, [replaceTagsAndSpaces, /[\-−]+/g, ''], parseBalance);
		getParam(html, result, 'last_payment_date', /Последний платеж был совершен([^<]+?)(?:\.\s+|<)/i, [replaceTagsAndSpaces, /([а-яё]+)\s+(\d+)/i, '$2 $1'], parseDateWord);
		// Следующая выплата
		getParam(html, result, 'next_payment', /Транзакции(?:[\s\S]*?<div[^>]+field-group-cell[^>]*>){4}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	} else {
		AnyBalance.trace(html);
		AnyBalance.trace('Can`t login to Google Wallet, do have it on this account?');
	}
	
	AnyBalance.setResult(result);
}