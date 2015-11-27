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
	var baseurl = 'http://cp.sprinthost.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl, g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var params = createFormParams(html, function (params, str, name, value) {
		if (name == 'username')
			return prefs.login;
		else if (name == 'password')
			return prefs.password;
		return value;
	});

	html = AnyBalance.requestPost(baseurl, {
		action: 'login',
		username: prefs.login,
		password: prefs.password
	}, addHeaders({Referer: baseurl}));

	var json = getJson(html);

	if (!json.status)
		throw new AnyBalance.Error("Неправильный логин или пароль.");
	else if (json.newip) {
		var error = getParam(json.content, null, null, null, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /подозрительного IP/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	html = AnyBalance.requestPost(baseurl + 'CMD_LOGIN', params, addHeaders({Referer: baseurl}));
	var result = {success: true};

	getParam(html, result, 'balance', /<div[^>]+id="user_info"[^>]*>(?:[\s\S]*?<td[^>]*>){8}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'currentTariff', /<div[^>]+id="user_info"[^>]*>(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'tariffCost', /<div[^>]+id="user_info"[^>]*>(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'dBonus', /<div[^>]+id="user_info"[^>]*>(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'bonus', /<div[^>]+id="user_info"[^>]*>(?:[\s\S]*?<td[^>]*>){10}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'daysLeft', /<div[^>]+id="user_info"[^>]*>(?:[\s\S]*?<td[^>]*>){12}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'accountID', /<div[^>]+="index_menu"[^>]*>(?:[\s\S]*?<strong[^>]*>){2}([\s\S]*?)<\/strong>/i, replaceTagsAndSpaces, html_entity_decode);

	var totalDisckSpace = getParam(html, null, null, /<span[^>]+id="usage_param_quota"[^>]*>[\s\S]*?<\/span>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(totalDisckSpace+'mb', result, 'totalDiskSpace', null, null, parseTraffic);

	if(isAvailable(['diskSpaceUsed', 'filesOnAcc', 'FTPs', 'dataBases', 'domains', 'vdomains']))
	{
		html = AnyBalance.requestPost(baseurl+'HTM_HOME?action=updateCounters');
		json=getJson(html);

		getParam(json.quota+'mb', result, 'diskSpaceUsed', null, null, parseTraffic);
		getParam(json.files_num, result, 'filesOnAcc');
		getParam(json.ftp, result, 'FTPs', null, replaceTagsAndSpaces, parseBalance);
		getParam(json.mysql, result, 'dataBases', null, replaceTagsAndSpaces, parseBalance);
		getParam(json.domainptr, result, 'domains');
		getParam(json.vdomains, result, 'vdomains');
	}

	if (isAvailable('fio'))
	{
		html = AnyBalance.requestGet(baseurl+'HTM_ACCOUNT_INFO', g_headers);
		getParam(html, result, 'fio', /<div[^>]+class="thin"[^>]*>(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	}

	AnyBalance.setResult(result);
}