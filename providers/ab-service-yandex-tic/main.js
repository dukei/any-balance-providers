/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.116 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://yaca.yandex.ru/yca';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.domain, 'Введите домен!');

	var html = AnyBalance.requestGet(baseurl, g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestGet(baseurl + '/cy/ch/' + prefs.domain, g_headers);

	var result = {succes: true, __tariff: prefs.domain};

	if(!/<img[^>]+arr-hilite[^>]*>/i.test(html)) {
		var notFound = getParam(html, null, null, /<p[^>]+error-cy[^>]*>([\s\S]*?)<\/p>/, replaceTagsAndSpaces);
		if(notFound) {
			AnyBalance.trace(notFound);
			getParam(/не определён/.test(notFound) ? undefined : notFound, result, 'index', /[^\d]*(\d*)/i, null, parseBalance);
		} else {
			AnyBalance.trace(html);
			throw new AnyBalance.Error("Не удалось найти данные. Сайт изменён?")
		}
	} else {
		getParam(html, result, 'index', /<img[^>]+arr-hilite[^>]*>(?:[^]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	}

	AnyBalance.setResult(result);
}
