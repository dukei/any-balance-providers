/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
function main() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');
	var baseurl = "https://ss.zadarma.com/";
	var auth = AnyBalance.requestPost(baseurl + "auth/login/", {
		email: prefs.login,
		password: prefs.password
	});
	var info = AnyBalance.requestGet(baseurl);
	if (!/\/auth\/logout\//i.test(info)) {
		var error = getParam(auth, null, null, /<p[^>]+class="error"[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error) throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	var result = {success: true};
	
	getParam(info, result, 'balance', /<span class="balance">.*\$(-?\d+[\.,]\d+).*<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, '__tariff', /<p><strong>(.*)<\/strong>( \((?:стоимость|вартість|cost) \d+\.\d+.*\))<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
	
	if (isAvailable(['phone0', 'phone0till', 'phone1', 'phone1till', 'phone2', 'phone2till'])) {
		info = AnyBalance.requestGet(baseurl + 'dirnum/');
		var numbers = sumParam(info, null, null, /<h2[^>]*>(?:Бесплатный|Безкоштовний|Free)(?:[^<](?!c донабором|з донабором|with dtmf))*<\/h2>(?:[^>]*>){20,25}(?:<h2|Номер действителен|Номер діє|The number works)/ig);
		for (var i = 0; i < Math.min(numbers.length, 3); ++i) {
			getParam(numbers[i], result, 'phone' + i, /(?:Вам подключен прямой номер|Вам надано прямий номер|Your connected number|Вам підключено прямий номер)[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
			getParam(numbers[i], result, 'phone' + i + 'till', /(?:Действует до|Діє до|Valid till)([^<]*)\./i, replaceTagsAndSpaces, parseDateISO);
			getParam(numbers[i], result, 'phone' + i + 'status', /(?:Статус)\s*:([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
			
		}
	}
	AnyBalance.setResult(result);
}