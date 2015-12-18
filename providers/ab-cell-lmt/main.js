/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language':'ru,en;q=0.8',
	'Cache-Control': 'max-age=0',
	'Connection':'keep-alive',
	'Origin':'https://mans.lmt.lv',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2272.101 Safari/537.36'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://mans.lmt.lv/ru/';
    var SITE_MIGHT_BE_CHANGED = 'Не удалось зайти. Сайт изменен или проблемы на сайте.';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'auth', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

    var params = createFormParams(html, function(params, str, name, value) {
        switch (name) {
            case 'login-name':
                return prefs.login;
            case 'login-pass':
                return prefs.password;
            case 'login-code':
                return getCaptcha(html);
            default:
                return value;
        }
    });

    // Check is done in order to skip redundant requests
    if (!params.hasOwnProperty('update')) {
        var authXhrHeaders = addHeaders({'Referer': baseurl + 'auth', 'X-Requested-With': 'XMLHttpRequest'});

        var res = AnyBalance.requestPost(
            baseurl + 'auth/login',
            params,
            authXhrHeaders
        );

        try {
            res = JSON.parse(res);
        }
        catch(e) {
            AnyBalance.trace(res);
            throw new AnyBalance.Error(SITE_MIGHT_BE_CHANGED);
        }

        if (!res.success) {
            AnyBalance.trace(html);
            var msg = res.error && res.error.msg ? res.error.msg : SITE_MIGHT_BE_CHANGED;
            throw new AnyBalance.Error(msg, null, true);
        }

        res = AnyBalance.requestGet(baseurl + 'auth/access_info', authXhrHeaders);
        html = AnyBalance.requestGet(baseurl + 'index.php', g_headers);
    }
	
	var result = {success: true};
    var dateReplaces = [replaceTagsAndSpaces, /[^\d:\-]+/, ' '];
	
	getParam(html, result, 'balance', getRegEx('Остаток на счету'), replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'advance_duration', getRegEx('Срок действия аванса', true), dateReplaces, parseDate);
    getParam(html, result, 'usage_duration', getRegEx('Срок использования', true), dateReplaces, parseDate);
	getParam(html, result, '__tariff', getRegEx('Тарифный план'), replaceTagsAndSpaces);
    getParam(html, result, 'service_package', /пакеты услуг[^]*?>[^]*?>(.*?)<\/td>[^]*?<\/table>/i, replaceTagsAndSpaces, parseServicePackage);

	AnyBalance.setResult(result);
}

function getCaptcha(html) {
    if(AnyBalance.getLevel() >= 7) {
        AnyBalance.trace('Пытаемся ввести капчу');

        var captchaUrl = getParam(html, null, null, /login-code-img.*src=["']([^"']*)['"]/i);
        var captchaImg = AnyBalance.requestGet(captchaUrl);

        AnyBalance.trace('Капча получена: ' + captchaImg);
        return AnyBalance.retrieveCode('Пожалуйста, введите код с картинки', captchaImg);
    }
    else {
        throw new AnyBalance.Error('К сожалению, сайт https://mans.lmt.lv ввел капчу для входа в личный кабинет.');
    }
}

function parseServicePackage(value) {
    var res = parseDate(value);
    if (!res) {
        res = value;
    }
    return res;
}

function getRegEx(searchString, isPeriodValue) {
    var fstRe = isPeriodValue ? '[^]*?' : '[^>]*>\\s*',
        lastRe = '<td[^>]*>([^]*?)<\/td>';
    return new RegExp(searchString + fstRe + lastRe, 'i')
}
