/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 			'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 	'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 		'keep-alive',
	'User-Agent': 		'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.116 Safari/537.36',
};

function main(){
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://lk.nn.tns-e.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl, g_headers);
	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже.');
	}

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
		} else {
			html = AnyBalance.requestPost(baseurl + 'handlers/index.php', {
				ls: prefs.login,
				pwd: prefs.password,
				action: 'doAuth',
			}, addHeaders({
				Referer: baseurl,
				'X-Requested-With': 'XMLHttpRequest',
				'Accept': 'text/plain, */*; q=0.01'
			}));
		}
	} else {
		throw new AnyBalance.Error("Картинка с кодом не найдена.");
	}

	if (!/1/i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Пользователь с таким логином и паролем не найден. Попробуйте еще раз.');
	}

	var result = {success: true};

	html = AnyBalance.requestPost(baseurl + 'handlers/top-panel.php', {
		action: 'getLsInfo'
	}, addHeaders({
		'X-Requested-With': 'XMLHttpRequest',
		'Accept': 'application/json, text/javascript, */*; q=0.01'
	}));
	var json = getJson(html);

	AB.getParam(json.BALANCE + '', 	result, 'balance', null, null, AB.parseBalance);
	AB.getParam(json.FIO, 			result, 'fio');

	if(isAvailable(['address', 'accrued', 'paid', 'to_pay'])) {
		html = AnyBalance.requestGet(baseurl, g_headers);

		AB.getParam(html, result, 'address', /Адрес:([^>]*>){2}/i,			AB.replaceTagsAndSpaces);
		AB.getParam(html, result, '__tariff', /Номер счета:([^>]*>){3}/i,	AB.replaceTagsAndSpaces);
		AB.getParam(html, result, 'accrued', /Начислено за([^>]*>){5}/i,	AB.replaceTagsAndSpaces, AB.parseBalance);
		AB.getParam(html, result, 'paid',    /Оплачено в ([^>]*>){5}/i,		AB.replaceTagsAndSpaces, AB.parseBalance);
		AB.getParam(html, result, 'to_pay',  /Итого к оплате([^>]*>){7}/i,	AB.replaceTagsAndSpaces, AB.parseBalance);
		AB.getParam(html, result, 'debt',    /Долг на([^>]*>){5}/i,			AB.replaceTagsAndSpaces, AB.parseBalance);
	}

	if(isAvailable(['last_pay_date', 'last_pay_sum']))
	{
		html = AnyBalance.requestGet(baseurl + 'lk-hist-payments', g_headers);

		getParam(html, result, 'last_pay_date', /Сумма([^>]*>){12}/i,	AB.replaceTagsAndSpaces, AB.parseDate);
		getParam(html, result, 'last_pay_sum', /Сумма([^>]*>){14}/i,	AB.replaceTagsAndSpaces, AB.parseBalance);
	}

	if(isAvailable(['last_ind_date', 'last_ind_day', 'last_ind_night']))
	{
		html = AnyBalance.requestGet(baseurl + 'lk-hist-counter', g_headers);

		AB.getParam(html, result, 'last_ind_date', /День([^>]*>){3}([^<]+)/i,	AB.replaceTagsAndSpaces, AB.parseDate);
		AB.getParam(html, result, 'last_ind_day', /День([^>]*>){14}/i,			AB.replaceTagsAndSpaces, AB.parseBalance);
		AB.getParam(html, result, 'last_ind_night', /Ночь([^>]*>){14}/i,		AB.replaceTagsAndSpaces, AB.parseBalance);
	}

	AnyBalance.setResult(result);
}
