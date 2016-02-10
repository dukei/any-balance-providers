
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
	var baseurl = 'https://my.obit.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl, g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var params = {
        action: 'logon',
        username: prefs.login,
        password: prefs.password
    };

	html = AnyBalance.requestPost(
        baseurl + 'logon',
        params,
        AB.addHeaders({
            Referer: baseurl
        })
    );

	if (!/\/logout/i.test(html)) {
		var error = AB.getParam(html, null, null, /div[^>]+class=(?:"|')err(?:"|')>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /(?:пароль|имя пользователя)/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

    html = AnyBalance.requestGet(baseurl + 'fin');

	var result = {
		success: true
	};

	AB.getParam(html, result, 'balance', /Баланс:([\s\S]+?)<br>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'personal_account', /Договор([\s\S]+?)<\/div>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'status', /Статус:([\s\S]+?)<br>/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'deadline', /израсходования средств:([\s\S]+?)<br>/i, AB.replaceTagsAndSpaces, AB.parseDate);

	AnyBalance.setResult(result);
}
