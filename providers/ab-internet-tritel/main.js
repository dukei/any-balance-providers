
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
	var baseurl = 'http://users.tritel.net.ru/index.php';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestPost(
        baseurl,
        {
            ulogin: prefs.login,
		    upassword: prefs.password
	    },
        AB.addHeaders({Referer: baseurl})
    );

    if (!html || AnyBalance.getLastStatusCode() > 400) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    html = AnyBalance.requestGet(baseurl, g_headers);

	if (!/Выйти/i.test(html)) {
		var error = AB.getParam(html, null, null, /"content"[\s\S]*?<td[^>]*>([\s\S]+?)<\/td>/i, AB.replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /учетные данные/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {
		success: true
	};

	AB.getParam(html, result, 'balance', /Баланс[\s\S]*?<td>([^<]+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, '__tariff', /Тариф<[\s\S]*?<td>([^<]+)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'tariff_cost', /Стоимость тарифа[\s\S]*?<td>([^<]+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'status', /Состояние счета[\s\S]*?<td>([^<]+)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'phone', /Мобильный[\s\S]*?<td>([^<]+)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'address', /Адрес[\s\S]*?<td>([^<]+)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'contract', /Договор[\s\S]*?<td>([^<]+)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'pay_id', /Платежный ID[\s\S]*?<td>([^<]+)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'ip_address', /IP<[\s\S]*?<td>([^<]+)/i, AB.replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}
