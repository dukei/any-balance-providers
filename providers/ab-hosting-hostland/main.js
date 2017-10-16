
var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Encoding': 'gzip, deflate',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36'
};

function main() {
	var baseurl = 'https://panel.hostland.ru/';

	var prefs = AnyBalance.getPreferences();
	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	AnyBalance.setDefaultCharset('utf-8');

	var html = AnyBalance.requestGet(baseurl, g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestPost(baseurl, {
		name_panel: prefs.login,
		passwd: prefs.password,
		submit: ''
	}, AB.addHeaders({ Referer: baseurl }));

	if (!/exit\.png/.test(html)) {
		var error = AB.getParam(html, null, null, /error_login[^>]+>([^<]+)</i, AB.replaceTagsAndSpaces);
		if (error) 
			throw new AnyBalance.Error(error, null, /логин|пароль/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
	}

	var result = { success: true };

	var key = new Date().getTime() + '3';
	var data = getJson(AnyBalance.requestPost(
		baseurl + 'ajax/win_function.php?JsHttpRequest='+key+'-xml', 
		'str=33%2C31%2C1%2C29%2C32&str2=33&str3=1&str4=0', 
		AB.addHeaders({ Referer: baseurl })
	));

	if (!data.js || !data.js.str)
		throw new AnyBalance.Error('Не получить данные. Сайт изменен?');

	html = data.js.str;

	AB.getParam(html, result, 'server', /Сервер(?:[^>]+>){2}([^<]+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'registration', /Дата регистрации(?:[^>]+>){2}([^<]+)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, '__tariff', /Тарифный план(?:[^>]+>){3}([^<]+)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'total', /Место на сервере(?:[^>]+>){3}([^<]+)/i, AB.replaceTagsAndSpaces, AB.parseTraffic);

	var temp = AB.getParam(html, null, null, /Занимаемого места:((?:[\s\S](?!\/td>))+)/i, AB.replaceTagsAndSpaces);
	AB.getParam(temp, result, 'used', /(^[^\(]+)/i, AB.replaceTagsAndSpaces, AB.parseTraffic);
	AB.getParam(temp, result, 'usedMySQL', /\(из них ([^\)\-]+)/i, AB.replaceTagsAndSpaces, AB.parseTraffic);
	AB.getParam(temp, result, 'used_proc', /\s(\S+)%$/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	
	temp = AB.getParam(html, null, null, /Стоимость тарифного плана в месяц:((?:[\s\S](?!\/td>))+)/i, AB.replaceTagsAndSpaces);
	AB.getParam(temp, result, 'yearly_month', /^(\S+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(temp, result, 'monthly_month', /месяцев\s+(\S+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'option_month', /Дополнительные услуги(?:[^>]+>){3}([^<]+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);

	AB.getParam(html, result, 'count_domain', /Домены на аккаунте(?:[^>]+>){3}([^<]+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'count_ftp', /FTP аккаунты(?:[^>]+>){3}([^<]+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'count_db', /Базы на аккаунте(?:[^>]+>){3}([^<]+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'count_email', /Почтовые ящики(?:[^>]+>){3}([^<]+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'count_bonus', /Доменные бонусы(?:[^>]+>){2}([^<]+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	
	temp = AB.getParam(html, null, null, /Денег на счету:((?:[\s\S](?!\/td>))+)/i, AB.replaceTagsAndSpaces);
	AB.getParam(temp, result, 'account', /(\S+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(temp, result, 'account_bonus', /из них\s+(\S+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(temp, result, 'account_day', /хватит на\s+(\S+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	
	AB.getParam(html, result, 'client_name', /<input[^>]+client_name[^>]+value="?([^"]+)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'client_org', /<input[^>]+client_org[^>]+value="?([^"]+)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'client_adress', /<input[^>]+adress[^>]+value="?([^"]+)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'client_phone', /<input[^>]+phone[^>]+value="?([^"]+)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'client_email', /<input[^>]+mailid[^>]+value="?([^"]+)/i, AB.replaceTagsAndSpaces);
	AnyBalance.setResult(result);
}
