
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
	var baseurl = 'http://ekb.esplus.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl, g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

    var error = AB.getParam(html, null, null, /function\s*onCheckLogin[\s\S]*?(Ошибка авторизации[^"]+)/i, AB.replaceTagsAndSpaces);
	var params = {
        login: prefs.login,
        pass: prefs.password
    };

	html = AnyBalance.requestPost(
        'https://lk.sesb.ru/Individual',
	    params,
        AB.addHeaders({ Referer: baseurl })
    );

	if (!/logout/i.test(html)) {
		if (error) {
			throw new AnyBalance.Error(error, null, /Неверный логин\/пароль/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {
		success: true
	};

    var balanceHtml = AB.getParam(html, null, null, /NameBalance[^>]*>((?:[^>]+>){5})/i, AB.replaceTagsAndSpaces);
    AB.getParam(balanceHtml, result, 'balance', null, null, AB.parseBalance);

    if (/долг/i.test(balanceHtml)) {
        result.balance *= -1;
    }

	AB.getParam(html, result, 'account', /LabelPersonalAccount[^>]*>([^>]+>)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'fio', /ФИО[^>]*>([^>]+>){2}/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, '__tariff', /договор[^>]*>([^>]+>){2}/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'address', /Адрес[^>]*>([^>]+>){2}/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'residents', /проживающих[^>]*>([^>]+>){2}/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'rooms', /комнат[^>]*>([^>]+>){2}/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'area', /Площадь[^>]*>([^>]+>){2}/i, AB.replaceTagsAndSpaces, AB.parseBalance);

	AnyBalance.setResult(result);
}
