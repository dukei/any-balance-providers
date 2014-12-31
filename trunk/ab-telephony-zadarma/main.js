/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
function main() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');
	var baseurl = "https://ss.zadarma.com/";
	
	var html = AnyBalance.requestPost(baseurl + "auth/", {
		'p':'',
		'login_submit_btn':'войти',
		email: prefs.login,
		password: prefs.password
	});
	
	if (!/\/auth\/logout\//i.test(html)) {
		var error = getParam(html, null, null, /<p[^>]+class="error"[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error);
		
		AnyBalance.trace(html)
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	var result = {success: true};
	
	getParam(html, result, 'balance', /<span class="balance">[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', 'balance'], /<span class="balance">[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, '__tariff', [/<p><strong>(.*)<\/strong>( \((?:стоимость|вартість|cost) \d+\.\d+.*\))<\/p>/i, /<h2>Текущий тарифный план<\/h2>\s*<p>\s*<strong>(.*)<\/strong>/i], replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'min', /использовано:[^<]+\[(\d+ мин)/i, replaceTagsAndSpaces, parseMinutes);
	
	if (isAvailable(['phone0', 'phone0till', 'phone1', 'phone1till', 'phone2', 'phone2till'])) {
		html = AnyBalance.requestGet(baseurl + 'dirnum/');
		var numbers = sumParam(html, null, null, /<h2[^>]*>(?:Бесплатный|Безкоштовний|Free)(?:[^<](?!c донабором|з донабором|with dtmf))*<\/h2>(?:[^>]*>){20,25}(?:<h2|Номер действителен|Номер діє|The number works)/ig);
		for (var i = 0; i < Math.min(numbers.length, 3); ++i) {
			getParam(numbers[i], result, 'phone' + i, /(?:Вам подключен прямой номер|Вам надано прямий номер|Your connected number|Вам підключено прямий номер)[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
			getParam(numbers[i], result, 'phone' + i + 'till', /(?:Действует до|Діє до|Valid till)([^<]*)\./i, replaceTagsAndSpaces, parseDateISO);
			getParam(numbers[i], result, 'phone' + i + 'status', /(?:Статус)\s*:([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		}
	}
	
	if (isAvailable(['shortphone0', 'shortphone1', 'shortphone2', 'shortphone3', 'shortphone4'])) {
		html = AnyBalance.requestGet(baseurl + 'mysip/');
		
		var numbers = sumParam(html, null, null, /<li>\s*<a href="#\d+"[^>]*>([^<]*)/ig);
		for (var i = 0; i < Math.min(numbers.length, 5); ++i) {
			getParam(numbers[i], result, 'shortphone' + i, null, replaceTagsAndSpaces, html_entity_decode);
		}
	}
	AnyBalance.setResult(result);
}