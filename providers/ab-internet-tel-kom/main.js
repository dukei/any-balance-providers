
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
	var baseurl = 'http://cabinet.tel-kom.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl, g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var params = {
        'user_login': prefs.login,
        'user_pass': prefs.password,
        'app': 'app'
    };

	var postHtml = AnyBalance.requestPost(
        baseurl + 'submit.php',
        params,
        AB.addHeaders({
		    'Referer': baseurl,
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json, text/javascript, */*'
	    })
    );

    html = AnyBalance.requestGet(baseurl + 'info.php', g_headers);

	if (!/logout/i.test(html)) {
		var error = AB.getParam(postHtml, null, null, /txt:([^}]+)/i, [AB.replaceTagsAndSpaces, /['"]/g, '']);
		if (error) {
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {
		success: true
	};

	AB.getParam(html, result, 'balance', /balanceAll[^>]*>([^>]+>){2}/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, '__tariff', /тарифный план([^>]+>){3}/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'monthlyPayment', /Список услуг([^>]+>){20}/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'deducted', /Список услуг([^>]+>){22}/i, AB.replaceTagsAndSpaces, AB.parseBalance);

    var dates = getPeriodDates();

    html = AnyBalance.requestGet(
        baseurl + 'info.php?action=payment&start_date=' + dates.startDate + '&end_date=' + dates.endDate,
        g_headers
    );

    AB.getParam(html, result, 'paymentDate', /info-mess([^>]*>){18}/i, AB.replaceTagsAndSpaces, AB.parseDateISO);
    AB.getParam(html, result, 'paymentSum', /info-mess([^>]*>){22}/i, AB.replaceTagsAndSpaces, AB.parseBalance);


    html = AnyBalance.requestGet(baseurl + 'info.php?action=service', g_headers);

    AB.getParam(html, result, 'dailyDeductionDate', /info-mess([^>]*>){18}/i, AB.replaceTagsAndSpaces, AB.parseDateISO);
    AB.getParam(html, result, 'dailyDeductionSum', /info-mess([^>]*>){22}/i, AB.replaceTagsAndSpaces, AB.parseBalance);

	AnyBalance.setResult(result);
}

function getPeriodDates() {
    var now = new Date(),
        prevMonth = new Date(),
        re = /[^\d-].+/;

    prevMonth.setMonth(now.getMonth() - 1);

    return {
        startDate: prevMonth.toISOString().replace(re, ''),
        endDate: now.toISOString().replace(re, '')
    };
}
