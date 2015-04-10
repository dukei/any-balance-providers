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
	AnyBalance.setDefaultCharset('utf-8');
	var baseurl = "https://ss.zadarma.com/";

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'auth/', g_headers);

	var captcha, captchaSrc, captchaKey;
	if(AnyBalance.getLevel() >= 7){
		AnyBalance.trace('Пытаемся ввести капчу');
		captchaSrc = getParam(html, null, null, /src="\/(captcha\/index.php[^"]+)/i);
		if(captchaSrc){
			captcha = AnyBalance.requestGet(baseurl + captchaSrc, g_headers);
			captchaKey = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
			AnyBalance.trace('Капча получена: ' + captchaKey);
		} else {
			AnyBalance.trace('Капча не нужна.');
		}
	} else {
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
	}

	html = AnyBalance.requestPost(baseurl + "auth/login/", {
		redirect:'',
		captcha: captchaKey || '',
		email: prefs.login,
		password: prefs.password
	}, addHeaders({ Referer: baseurl }));

	try{
		var json = getJson(html);
		error = !json.success ? json.error : null;
	} catch(e){ }

	if(error)
		throw new AnyBalance.Error(error);

	html = AnyBalance.requestGet(baseurl + 'auth/', g_headers);

	if (!/\/auth\/logout\//i.test(html)) {
		AnyBalance.trace(html)
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	var result = {success: true};
	
	getParam(html, result, 'balance', /<span class="balance">[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', 'balance'], /<span class="balance">[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, '__tariff', [/<p><strong>(.*)<\/strong>( \((?:стоимость|вартість|cost) \d+\.\d+.*\))<\/p>/i, /<h2>Текущий тарифный план<\/h2>\s*<p>\s*<strong>(.*)<\/strong>/i], replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'min', /использовано:[^<]+\[(\d+ мин)/i, replaceTagsAndSpaces, parseMinutes);
	
	if (isAvailable(['phone0', 'phone0till', 'phone1', 'phone1till', 'phone2', 'phone2till'])) {
		html = AnyBalance.requestGet(baseurl + 'dirnum/', g_headers);
		var numbers = sumParam(html, null, null, /<h2[^>]*>(?:Бесплатный|Безкоштовний|Free)(?:[^<](?!c донабором|з донабором|with dtmf))*<\/h2>(?:[^>]*>){20,25}(?:<h2|Номер действителен|Номер діє|The number works)/ig);
		for (var i = 0; i < Math.min(numbers.length, 3); ++i) {
			getParam(numbers[i], result, 'phone' + i, /(?:Вам подключен прямой номер|Вам надано прямий номер|Your connected number|Вам підключено прямий номер)[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
			getParam(numbers[i], result, 'phone' + i + 'till', /(?:Действует до|Діє до|Valid till)([^<]*)\./i, replaceTagsAndSpaces, parseDateISO);
			getParam(numbers[i], result, 'phone' + i + 'status', /(?:Статус)\s*:([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		}
	}
	
	if(isAvailable(['shortphone0', 'shortphone1', 'shortphone2', 'shortphone3', 'shortphone4'])){
		html = AnyBalance.requestGet(baseurl + 'mysip/', g_headers);
		
		var numbers = sumParam(html, null, null, /<li>\s*<a href="#\d+"[^>]*>([^<]*)/ig);
		for(var i = 0; i < Math.min(numbers.length, 5); ++i){
			getParam(numbers[i], result, 'shortphone' + i, null, replaceTagsAndSpaces, html_entity_decode);
		}
	}
	
	AnyBalance.setResult(result);
}