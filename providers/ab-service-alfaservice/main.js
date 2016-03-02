
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
	var baseurl = 'http://alfaservice.jfservice.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl, g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var params = {
        l: prefs.login.replace(/\d*-(\d+)/, '$1'),
        p: prefs.password,
        r: 'no',
        c: '0',
        o: 172
    };

	var postHtml = AnyBalance.requestPost(
        baseurl + 'ajax/users.php',
        params,
        AB.addHeaders({
		    Referer: baseurl,
            'X-Requested-With': 'XMLHttpRequest'
	    })
    );

    html = AnyBalance.requestGet(baseurl + 'user-index.html');

	if (!/logout/i.test(html)) {
		var res = getJson(postHtml);
		if (/nope/i.test(res[0])) {
			throw new AnyBalance.Error(res[1], null, /(?:пароль|пользователь)/i.test(res[1]));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {
		success: true
	};

	AB.getParam(html, result, 'debt', /задолженность\D+([^<]+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'pay_date', /дата посл\. платежа[\s\S]*?<td>([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseDate);
	AB.getParam(html, result, 'pay_sum', /сумма посл\. платежа[\s\S]*?<td[^>]*>([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'account', /лицевой счет[\s\S]*?<td>([^<]+)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'address', /second_place[\s\S]*?<p[^>]*>([^<]+)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'email', /second_place[\s\S]*?e-mail[\s\S]*?>([^<]*)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'phone', /second_place[\s\S]*?телефон[\s\S]*?>([^<]*)/i, AB.replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}
