
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
	var baseurl = 'http://social-card.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите номер транспортной карты!');

	var html = AnyBalance.requestGet(baseurl + 'proverka-balansa-transportnoy-karty/', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestGet('http://81.23.146.8:81/default.aspx', g_headers);

    var params = {
        '__EVENTTARGET': '',
        '__EVENTARGUMENT': '',
        '__VIEWSTATE': AB.getParam(html, null, null, /viewstate[^>]*?value="([^"]+)/i),
        'cardnum': prefs.login,
        'checkcode': getCaptcha(html),
        'Button2': 'Выполнить запрос',
        '__EVENTVALIDATION': AB.getParam(html, null, null, /eventvalidation[^>]*?value="([^"]+)/i)
    };

	html = AnyBalance.requestPost(
        'http://81.23.146.8:81/default.aspx',
        params,
	    AB.addHeaders({
		    Referer: 'http://81.23.146.8:81/default.aspx'
	    })
    );

	if (!/карта №/i.test(html)) {
		var error = AB.getParam(html, null, null, [/"ErrorMessage">([^>]+>)/i, /customValidator[^>]*>([^>]+>)/i], AB.replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error);
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {
		success: true
	};

	AB.getParam(html, result, 'ticket', /проездной билет([^>]+>){4}/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'activePeriod', /действует(?:[^>]+>){2}((?:[^>]+>){4})/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'resource', /ресурс сейчас([^>]+>){4}/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'documentPresentDate', /последнее предъявление([^>]+>){4}/i, AB.replaceTagsAndSpaces, AB.parseDate);
	AB.getParam(html, result, 'route', /маршрут([^>]+>){4}/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'transportType', /вид транспорта([^>]+>){4}/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'operation', /операция([^>]+>){4}/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'chargeDate', /дата и время пополнения([^>]+>){4}/i, AB.replaceTagsAndSpaces, AB.parseDate);
	AB.getParam(html, result, 'chargePlace', /пункт пополнения([^>]+>){4}/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'chargedResource', /Ресурс пополнен на([^>]+>){4}/i, AB.replaceTagsAndSpaces, AB.parseBalance);

	AnyBalance.setResult(result);
}

function getCaptcha(html) {
    var imgSrc = AB.getParam(html, null, null, /(captchaimage[^"]+)/i);
    var captchaImg = AnyBalance.requestGet('http://81.23.146.8:81/' + imgSrc);
    return AnyBalance.retrieveCode('Пожалуйста, введите цифры с картинки.', captchaImg, {inputType: 'number'});
}