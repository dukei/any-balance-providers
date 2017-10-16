
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
    var baseurl = 'http://ffp.angara.aero/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

    var html = AnyBalance.requestGet(baseurl + 'frame/login', AB.addHeaders({ referer: baseurl }));

    if (!html || AnyBalance.getLastStatusCode() > 400) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

	var params = {
        todo: '',
        label_validate_error: '',
        username: prefs.login,
        password: prefs.password,
        capcha_num: getCaptcha(html, baseurl),
        subm: 'Войти'
    };

	html = AnyBalance.requestPost(
        baseurl + 'frame/login/',
        params,
        AB.addHeaders({
		    referer: baseurl + 'frame/login/'
	    })
    );

	if (!/logout/i.test(html)) {
		var error = AB.getParam(html, null, null, /"error">([^>]+>)/i, AB.replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /(?:логин или пароль|credentials)/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {
		success: true
	};

	AB.getParam(html, result, 'balance', /SkyBlue([^>]+>){7}/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'name', /SkyBlue([^>]+>){5}/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'account_num', /SkyBlue([^>]+>){3}/i, AB.replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}

function getCaptcha(html, url) {
    var captchaUrl = AB.getParam(html, null, null, /(securimage[^"]+)/);
    if (captchaUrl) {
        var captchaImg = AnyBalance.requestGet(url + captchaUrl + Math.random());
        return AnyBalance.retrieveCode('Введите код с картинки', captchaImg);
    }
    return '';
}
