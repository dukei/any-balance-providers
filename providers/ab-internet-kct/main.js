
var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Encoding': 'gzip, deflate',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36'
};

function main() {
	var baseUrl = 'http://kct.net.ua/';
	var targetUrl = 'https://stats.kct.net.ua:9443/';

	var prefs = AnyBalance.getPreferences();
	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	AnyBalance.setDefaultCharset('utf-8');

	var html = AnyBalance.requestGet(baseUrl, g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestPost(targetUrl, {
		user: prefs.login,
		passwd: prefs.password
	}, AB.addHeaders({ Referer: baseUrl }));

	if (!/logout/.test(html)) {
		var error = AB.getParam(html, null, null, /err_message(?:[^>]+>){3}([^<]+)/i, AB.replaceTagsAndSpaces);
		if (error) 
			throw new AnyBalance.Error(error, null, /логин|пароль/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
	}

	var sid = AB.getParam(html, null, null, /<input[^>]+sid[^>]+value=["']?([^>"']+)/i, AB.replaceTagsAndSpaces);
	if (!sid) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не найден параметр сессии. Проблемы на сайте или сайт изменен.');
	}

	var result = { success: true };

	AB.getParam(html, result, 'deposit', /Депозит:(?:[^>]+>){3}([^<]+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'fio', /ФИО:(?:[^>]+>){3}([^<]+)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'phone', /Телефон:(?:[^>]+>){3}([^<]+)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'address', /Адрес:(?:[^>]+>){3}([^<]+)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'date', /Договор Дата:(?:[^>]+>){3}([^<]+)/i, AB.replaceTagsAndSpaces, AB.parseDateISO);
	AB.getParam(html, result, 'status', /Статус:(?:[^>]+>){3}([^<]+)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'payment_date', />Дата:(?:[^>]+>){3}([^<]+)/i, AB.replaceTagsAndSpaces, AB.parseDateISO);
	AB.getParam(html, result, 'payment_sum', />Сумма:(?:[^>]+>){3}([^<]+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);

	html = AnyBalance.requestGet(targetUrl + 'index.cgi?index=43&sid=' + sid, AB.addHeaders({ Referer: targetUrl }));
	AB.getParam(html, result, 'internet_days', /Услуга завершится через (\d+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, '__tariff', /Тарифный план:(?:[^>]+>){3}([^<]+)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'internet_ip', /Статический IP:(?:[^>]+>){2}([^<]+)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'internet_status', /Статус:(?:[^>]+>){3}([^<]+)/i, AB.replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}
