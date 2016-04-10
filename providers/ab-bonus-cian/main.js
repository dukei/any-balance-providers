
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
	var baseurl = 'http://www.cian.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl, g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var params = {
        login: prefs.login,
        password: prefs.password
    };

	html = AnyBalance.requestPost(
        baseurl + 'api/users/validate/',
        params,
	    AB.addHeaders({
            Referer: baseurl,
            Accept: 'application/json, text/javascript, */*; q=0.01',
            'X-Requested-With': 'XMLHttpRequest'
        })
    );

    var json = AB.getJson(html);

    if (!json.logOnInfo) {
        if (json.errors) {
            var msg = '';
            json.errors.forEach(function(error) {
                msg += error.message + '\n';
            });
            throw new AnyBalance.Error(msg.replace(/\n$/, ''), null, /пользователь|пароль/i.test(msg));
        }

        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    json.logOnInfo.forEach(function(value) {
        if (value.logOnUrl.match(/cian\.ru\//i)) {
            var url = value.logOnUrl;
            var token = value.token;
            html = AnyBalance.requestGet(`http:${url}?login=${prefs.login}&token=${token}&persisten=false&_=${Date.now()}`);
        }
    });

    html = AnyBalance.requestGet(baseurl, g_headers);

	if (!/logout/i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = { success: true };

	AB.getParam(html, result, 'balance', /user_balance[^>]*>([^>]+>)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'id', /id:([^<]+)/i, AB.replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}
