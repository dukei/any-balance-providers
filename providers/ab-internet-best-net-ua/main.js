
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
	var baseurl = 'https://my.best.net.ua/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'login', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

    var params = {
        'login': prefs.login,
        'password': prefs.password,
        'Submit.x': 51,
        'Submit.y': 17,
        'Submit': 'Увійти'
    };

	html = AnyBalance.requestPost(
        baseurl + 'login',
	    params,
        AB.addHeaders({ Referer: baseurl + 'login' })
    );

	if (!/logout/i.test(html)) {
		var error = AB.getParam(html, null, null, /error[^>]*>([^>]+>)/i, AB.replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /логин и пароль/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {
		success: true
	};

	AB.getParam(html, result, 'balance', /баланс([^>]+>){3}/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'summaryOfServices', /підсумок за послуги([^>]+>){3}/i, AB.replaceTagsAndSpaces, AB.parseBalance);

	AB.getParam(html, result, 'internetService', /lk_main_tbl(?:[^>]+>){10}[\s\S]*?Послуга([^>]+>){3}/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, '__tariff', /lk_main_tbl(?:[^>]+>){10}[\s\S]*?Тариф([^>]+>){3}/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'internetPrice', /lk_main_tbl(?:[^>]+>){10}[\s\S]*?Вартість([^>]+>){3}/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'internetAddress', /lk_main_tbl(?:[^>]+>){10}[\s\S]*?Адрес([^>]+>){2}/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'internetStatus', /lk_main_tbl(?:[^>]+>){10}[\s\S]*?Статус([^>]+>){3}/i, AB.replaceTagsAndSpaces);

    AB.getParam(html, result, 'ktbService', /lk_main_tbl(?:[^>]+>){35}[\s\S]*?Послуга([^>]+>){5}/i, AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'ktbPrice', /lk_main_tbl(?:[^>]+>){35}[\s\S]*?Вартість([^>]+>){3}/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'ktbAddress', /lk_main_tbl(?:[^>]+>){35}[\s\S]*?Адрес([^>]+>){2}/i, AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'tvAmount', /lk_main_tbl(?:[^>]+>){35}[\s\S]*?телевізорів([^>]+>){2}/i, AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'ktbStatus', /lk_main_tbl(?:[^>]+>){35}[\s\S]*?Статус([^>]+>){2}/i, AB.replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}
