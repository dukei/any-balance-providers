
var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Encoding': 'gzip, deflate',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36'
};

function main() {
	var baseurl = 'https://online.sibeco.su/';

	var prefs = AnyBalance.getPreferences();
	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	AnyBalance.setDefaultCharset('utf-8');

	var html = AnyBalance.requestGet(baseurl + 'LoginLK.aspx', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var __EVENTTARGET = AB.getParam(html, null, null, /__EVENTTARGET[^>]+value="([^"]*)/i);
	var __EVENTARGUMENT = AB.getParam(html, null, null, /__EVENTARGUMENT[^>]+value="([^"]*)/i);
	var __VIEWSTATE = AB.getParam(html, null, null, /__VIEWSTATE[^>]+value="([^"]*)/i);
	var __EVENTVALIDATION = AB.getParam(html, null, null, /__EVENTVALIDATION[^>]+value="([^"]*)/i);

	if (__EVENTTARGET === null || __EVENTARGUMENT === null || __VIEWSTATE === null || __EVENTVALIDATION === null) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось получить параметры входа. Проблемы на сайте или сайт изменен.');
	}

	html = AnyBalance.requestPost(baseurl + 'LoginLK.aspx', {
		__EVENTTARGET: __EVENTTARGET,
		__EVENTARGUMENT: __EVENTARGUMENT,
		__VIEWSTATE: __VIEWSTATE,
		__EVENTVALIDATION: __EVENTVALIDATION,
		'ctl00$ContentPlaceHolder1$tbName': prefs.login,
		'ctl00$ContentPlaceHolder1$tbPass': prefs.password,
		'ctl00$ContentPlaceHolder1$btLogin.x': Math.floor(Math.random() * 99) + 1,
		'ctl00$ContentPlaceHolder1$btLogin.y': Math.floor(Math.random() * 19) + 1,
		'ctl00$hfTestJS': 'Y'
	}, AB.addHeaders({ Referer: baseurl + 'LoginLK.aspx' }));

	if (!/ctl00\$ExitLK/i.test(html)) {
		var error = AB.getParam(html, null, null, /ctl00_ContentPlaceHolder1_lbLogin[^>]+>([^<]+)/i, AB.replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /логин|пароль/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
	}

	var account = prefs.account ? prefs.account : AB.getParam(html, null, null, />(\d{8,})</i);
	if (!account) {
		throw new AnyBalance.Error('В кабинете пользователя не надено ни одного лицевого счета.', null, true);
	}

	var tr = AB.getParam(html, null, null, new RegExp('((?:[\\s\\S](?!<tr))+)>[^\\d<]*' + account + '[^\\d<]*<\\/td>', 'i'));
	if (!tr) {
		throw new AnyBalance.Error('В кабинете пользователя не надено лицевого счета: ' + account, null, true);
	}
	tr = AB.getParam(tr, null, null, /__doPostBack\(([^\)]+)/i, AB.replaceTagsAndSpaces);
	if (!tr) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось получить информацию по лицевому счету. Проблемы на сайте или сайт изменен.');
	}
	var eventList = getJsonEval('[' + tr + ']');

	__EVENTTARGET = eventList[0];
	__EVENTARGUMENT = eventList[1];
	__VIEWSTATE = AB.getParam(html, null, null, /__VIEWSTATE[^>]+value="([^"]*)/i);
	__VIEWSTATEENCRYPTED = AB.getParam(html, null, null, /__VIEWSTATEENCRYPTED[^>]+value="([^"]*)/i);
	__EVENTVALIDATION = AB.getParam(html, null, null, /__EVENTVALIDATION[^>]+value="([^"]*)/i);

	html = AnyBalance.requestPost(baseurl + 'AbonList.aspx', {
		__EVENTTARGET: __EVENTTARGET,
		__EVENTARGUMENT: __EVENTARGUMENT,
		__VIEWSTATE: __VIEWSTATE,
		__VIEWSTATEENCRYPTED: __VIEWSTATEENCRYPTED,
		__EVENTVALIDATION: __EVENTVALIDATION
	}, AB.addHeaders({ Referer: baseurl + 'AbonList.aspx' }));

	var result = { success: true };

	AB.getParam(html, result, 'heat_pay', /_lbLeftPay[^>]*>([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'heat_peni', /_lbLeftPeni[^>]*>([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'heat_date', /_lbLeftDate[^>]*>\(на([^\)]*)/i, AB.replaceTagsAndSpaces, AB.parseDate);
	
	AB.getParam(html, result, 'heat_lastpay', /_lbLeftLastPay[^>]*>([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'heat_lastdate', /_lbLeftDay[^>]*>\(([^\)]*)/i, AB.replaceTagsAndSpaces, AB.parseDate);

	AB.getParam(html, result, 'water_pay', /_lbRightPay[^>]*>([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'water_peni', /_lbRightPeni[^>]*>([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'water_date', /_lbRightDate[^>]*>\(на([^\)]*)/i, AB.replaceTagsAndSpaces, AB.parseDate);

	AB.getParam(html, result, 'water_lastpay', /_lbRightLastPay[^>]*>([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'water_lastdate', /_lbRightDay[^>]*>\(([^\)]*)/i, AB.replaceTagsAndSpaces, AB.parseDate);
	
	AnyBalance.setResult(result);
}
