
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
	var baseurl = 'https://www.giffgaff.com/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'auth/login', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var params = {
        redirect: '',
        p_next_page: '',
        nickname: prefs.login,
        password: prefs.password,
        login_security_token: AB.getParam(html, null, null, /login_security_token[^>]*value="([^"]+)/i),
        submit_button: 'Log in'
    };

	html = AnyBalance.requestPost(
        baseurl + 'auth/login',
        params,
        AB.addHeaders({
		    Referer: baseurl + 'auth/login'
	    })
    );

	if (/login_security_token/i.test(html)) {
		var error = AB.getParam(html, null, null, /notice-errors(?:[^>]*>){4}([^>]+>){2}/i, AB.replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /name and password/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {
		success: true
	};

	AB.getParam(html, result, 'balance', /balance-box([^>]+>){4}/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'accountName', /user-details([^>]+>){4}/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'phone', /user-details([^>]+>){14}/i, AB.replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}
