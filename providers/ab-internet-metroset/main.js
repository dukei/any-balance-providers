
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.103 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://cabinet.metro-set.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'index.php?', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	AnyBalance.setOptions({forceCharset: 'utf-8'});


	html = AnyBalance.requestPost(baseurl + 'get/ajax.php', {
		get: toBase64('auth'),
		regnum: toBase64(prefs.login),
		pass: toBase64(hex_md5(prefs.password)),
		auto: toBase64('0')
	}, AB.addHeaders({
		'X-Requested-With': 'XMLHttpRequest',
		Referer: baseurl + 'index.php?',
		Origin: baseurl,
		Accept: 'application/json, text/javascript, */*; q=0.01',
		'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
	}));

	var json = AB.getJson(html);
	if (!json.result) {
		var error = fromBase64(json.error_text);
		if (error)
			throw new AnyBalance.Error(error, null, /(Ошибка в формате номера договора|Номер договора и\/или пароль указаны не верно)/i.test(error));

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	html = AnyBalance.requestGet(baseurl+'index.php', g_headers);
	var result = {success: true};

	AB.getParam(html, result, 'balance', /баланс(?:[^>]*>){2}([\s\S]*?)<\//i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'bonus', /<span[^>]*>бонус(?:[^>]*>){2}([\s\S]*?)<\//i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, '__tariff', /<span[^>]*>тариф(?:[^>]*>){2}([\s\S]*?)<\//i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'internetStatus', /<span[^>]*>интернет(?:[^>]*>){2}([\s\S]*?)<\//i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'agreement', /№ договора(?:[^>]*>){2}([\s\S]*?)<\//i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'deadline', /<span[^>]*>активен до(?:[^>]*>){2}([\s\S]*?)<\//i, AB.replaceTagsAndSpaces, AB.parseDate);
	AB.getParam(html, result, 'metrosetStatus', /<span[^>]*>статус(?:[^>]*>){2}([\s\S]*?)<\//i, AB.replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}

function toBase64 (str) {
	var wordArray = CryptoJS.enc.Utf8.parse(str);
	return CryptoJS.enc.Base64.stringify(wordArray);
}
function fromBase64(str) {
	var parsedWordArray = CryptoJS.enc.Base64.parse(str);
	return parsedWordArray.toString(CryptoJS.enc.Utf8);
}