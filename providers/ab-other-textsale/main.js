
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	// Mobile
	//'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+',
	// Desktop
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://www.textsale.ru/';
	AnyBalance.setDefaultCharset('windows-1251');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(
        baseurl + 'loginform.php',
        AB.addHeaders({
            'Referer': baseurl,
            'X-Requested-With': 'XMLHttpRequest'
        })
    );

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

    var captchaCode = getCaptcha(baseurl, html);

	var params = {
        nickform: prefs.login,
        passwordform: hex_md5(hex_md5(prefs.password) + captchaCode),
        caform: captchaCode
    };

	html = AnyBalance.requestPost(
        baseurl + 'login.php',
        params,
        AB.addHeaders({
		    Referer: baseurl
	    })
    );

	if (!/logout/i.test(html)) {
		var error = AB.getParam(html, null, null, /([\s\S]+?)<form/i, AB.replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /парол/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {
		success: true
	};

	AB.getParam(html, result, 'balance', /Баланс:([^>]+>){2}/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'wallet', /Номер кошелька:([^>]+>){2}/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'status', /Статус:[\s\S]*?selected[^>]*>([^<]+)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'rating', /Рейтинг(?:[^>]+>){3}:([^<]+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);

    var subUrl = AB.getParam(html, null, null, /mwnoramka[^>]*>[\s\S]*?<a href="\/?([^"]+)/i);

    html = AnyBalance.requestGet(baseurl + subUrl, g_headers);

    AB.getParam(html, result, 'likes', /Нравится([^>]+>){2}/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'boughtArticles', /куплено статей:([^>]+>){2}/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'purchaseSpeed', /скорость покупок:((?:[^>]+>){3})/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'copywriters', /копирайтеров:([^>]+>){2}/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'purchaseEffectiveness', /эффективность покупок:([^>]+>){2}/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'negativeFeedback', /отрицательных отзывов:([^>]+>){2}/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'positiveFeedback', /положительных отзывов:([^>]+>){2}/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'registerDate', /дата регистрации:([^>]+>){2}/i, AB.replaceTagsAndSpaces, AB.parseDateISO);

	AnyBalance.setResult(result);
}

function getCaptcha(url, html) {
    AnyBalance.trace('Trying to recognize captcha');
    var imgLink = AB.getParam(html, null, null, /caform[^>]*>[\s\S]*?img\s*src="\/?([^"]+)/i);
    var captchaImg = AnyBalance.requestGet(url + imgLink);
    return AnyBalance.retrieveCode('Введите код с картинки', captchaImg);
}
