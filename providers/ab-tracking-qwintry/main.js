
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
qwintry
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
	var baseurl = 'http://logistics.qwintry.com/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.number, 'Enter tracking number!');

	var html = AnyBalance.requestGet(baseurl + 'login', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestGet(baseurl + 'track?tracking=' + prefs.number, g_headers);

	if (!/Current\s+status/i.test(html)) {
		var error = AB.getParam(html, null, null, /<div[^>]*class="[^"]*danger[^"]*"[^>]*>([\s\S]*?)<\/div/i, AB.replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /not\s+exist/i.test(error));
		}
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {
		success: true
	};

	AB.getParam(html, result, 'tracking', /<title>([\s\S]*?)<\/title>/i, AB.replaceTagsAndSpaces);

	var
		infoTable = AB.getElement(html, /<table[^"]*class="[^"]*table[^"]*"[^>]*>/i),
		trArray = AB.sumParam(infoTable, null, null, /<tr[^>]*>([\s\S]*?)<\/tr>/gi);

	AB.getParam(trArray[trArray.length - 1], result, 'create_time', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces,
		AB.parseDate);
	AB.getParam(trArray[trArray.length - 1], result, 'status', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
	AB.getParam(trArray[trArray.length - 1], result, 'message', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);

	if (AnyBalance.isAvailable('trackingLog')) {
		try {
			var
				time, status, message, trackingLog = [];

			for (var i = trArray.length - 1; i > 0; i--) {
				time = AB.getParam(trArray[i], null, null, /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
				status = AB.getParam(trArray[i], null, null, /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
				message = AB.getParam(trArray[i], null, null, /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
				trackingLog.push('Create Time: <b> ' + time + ' </b> ' + 'Status: ' + status + '. ' + 'Message: ' + message);
			}
			AB.getParam(trackingLog.join('<br/>'), result, 'trackingLog');
		} catch (e) {
			AnyBalance.trace('Ошибка при получении Tracking log: ' + e);
		}
	}

	AnyBalance.setResult(result);
}
