
var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Encoding': 'gzip, deflate',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36'
};


function main() {
	/*
	кабинетов два:
	- https://stat.seven-sky.net/cgi-bin/clients/login
	- https://lk.seven-sky.net/
	точка входа https://lk.seven-sky.net/ulogin.jsp
	*/

	var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var flagLK = prefs.type == 'lk';

	var baseurl, reTest, postData;
	if (flagLK) {
		baseurl = 'https://lk.seven-sky.net/login.jsp';
		reTest = /exit.jsp|action=logout/i;
		postData = {
			p_logname: prefs.login,
			p_pwd: prefs.password
		};
	}
	else {
		baseurl = 'https://stat.seven-sky.net/cgi-bin/clients/login';
		reTest = /logout/i;
		postData = {
			login: prefs.login,
			password: prefs.password,
		};
	}

	AnyBalance.setDefaultCharset('utf-8');
	var html = AnyBalance.requestGet(baseurl, g_headers);
	if (!html || AnyBalance.getLastStatusCode() > 399) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	AnyBalance.sleep(2000);
	html = AnyBalance.requestPost(baseurl, postData, addHeaders({ Referer: baseurl }));
	if (!reTest.test(html)) {
		var error = getParam(html, null, null, /<p[^>]+class="hi"[^>]*>([^<]+)/, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Проверьте логин и пароль/i.test(error));

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет: ' + prefs.type + '. Проблемы на сайте или сайт изменен.');
	}

	var result = { success: true };

	if (flagLK) {
		getParam(html, result, 'balance', /<li>\s*Баланс:(?:<[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
		//getParam(html, result, 'days', /<li[^>]*>\s*Дней до блокировки:(?:<[^>]*>){1}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, '__tariff', /Ваш тарифный план[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces);
		getParam(html, result, 'account', /Лицевой счет №\s*(\d+)/i, replaceTagsAndSpaces, parseBalance);
	}
	else {
		var text = AB.getParam(html, null, null, null, AB.replaceTagsAndSpaces);

		AB.getParam(text, result, 'balance', /Ваш баланс:([\s\S]+)руб/i, AB.replaceTagsAndSpaces, AB.parseBalance);
		//AB.getParam(text, result, 'fio', /Статистика пользователя:([\s\S]+), счет/i, AB.replaceTagsAndSpaces);
		AB.getParam(text, result, 'account', /Статистика пользователя:[\s\S]+, счет N\s*(\d+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	}

	AnyBalance.setResult(result);
}
