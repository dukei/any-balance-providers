
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 			'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 	'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 		'keep-alive',
	'User-Agent': 		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.77 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://lk.yar.tns-e.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl, g_headers);
	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже.');
	}
	
    var captchaDiv = getElement(html, /<div[^>]+class="captcha"/i);
    if(!/^<div[^>]+display:\s*none/i.test(captchaDiv)){
		var captchaSRC = getParam(html, null, null, /<img src="([^"]*)"[^>]+id="captchaimg"[^>]*>/i);
		if (!captchaSRC) {
			throw new AnyBalance.Error("Не удалось найти ссылку на капчу. Сайт изменён?");
		}
		var captchaIMG = AnyBalance.requestGet(baseurl+captchaSRC, g_headers);
		if(captchaIMG) {
			var captchaResponse = AnyBalance.retrieveCode('Пожалуйста, введите код с картинки.', captchaIMG);
	    
			html = AnyBalance.requestPost(baseurl+'lib/js/captcha/captcha_checker.php', {
				vpb_captcha_code:captchaResponse
			}, addHeaders({
				'X-Requested-With': 'XMLHttpRequest',
				'Accept': '*/*'
			}));
	    
			if(!/1/.test(html)) {
				throw new AnyBalance.Error("Введенный Вами код неправильный.");
			}
		} else {
			throw new AnyBalance.Error("Картинка с кодом не найдена.");
		}
	}

	html = AnyBalance.requestPost(baseurl + 'handlers/index.php', {
		ls: prefs.login,
		pwd: prefs.password,
		action: 'doAuth',
	}, addHeaders({
		Referer: baseurl,
		'X-Requested-With': 'XMLHttpRequest',
		'Accept': 'text/plain, */*; q=0.01'
	}));

	if (!/1/i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Пользователь с таким логином и паролем не найден. Попробуйте еще раз.', true);
	}

	var result = {success: true};

	html = AnyBalance.requestGet(baseurl + '', g_headers);

	getParam(html, result, 'balance', /<div[^>]+balance-value[^>]*>([\s\S]*?)<\/div>/i, replaceHtmlEntities, parseBalance);
	getParam(html, result, 'to_pay', /koplate="([^"]*)/i, replaceHtmlEntities, parseBalance);
	getParam(html, result, 'fio', /Клиент:[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);

	AB.getParam(html, result, 'address', /Адрес:[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, 			AB.replaceTagsAndSpaces);
	AB.getParam(getElement(html, /<div[^>]+dropdown-ls-menu/i), result, '__tariff', null, AB.replaceTagsAndSpaces);
	AB.getParam(getElement(html, /<div[^>]+dropdown-ls-menu/i), result, 'licschet', null, AB.replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}
