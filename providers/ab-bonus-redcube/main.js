/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    //'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Encoding': 'gzip, deflate, sdch',
    'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Connection': 'keep-alive',
    //'Upgrade-Insecure-Requests': 1,
    // Mobile
    //'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+',
    // Desktop
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function enter(url, data) {
	var html = AnyBalance.requestPost(
        url,
        data,
        AB.addHeaders({
            'Referer': url,
            'Content-Type': 'application/x-www-form-urlencoded'
        })
    );

	var error = AB.getParam(html, null, null, /<div[^>]+id="dangerMessage"[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);
	if (error) {
        throw new AnyBalance.Error(error);
    }

	return html;
}

function main () {
    AnyBalance.setDefaultCharset('utf-8');
	
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'http://www.redcube.ru/';
	
    AB.checkEmpty(prefs.number, 'Введите номер карты!');
    var res = /(\d{2})\.(\d{2})\.(\d{4})/.exec(prefs.db_date);
	if (!res) {
        throw new AnyBalance.Error('Введите дату рождения в формате ДД.ММ.ГГГГ');
    }
	
	var html = AnyBalance.requestGet(baseurl, g_headers);

    if (!html || AnyBalance.getLastStatusCode() > 400) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }
	
    enter(baseurl + 'client_info/check/', {'data[ClientInfoUser][bcard]': prefs.number});
	
    html = enter(baseurl + 'client_info/login', {
    	'data[ClientInfoUser][BirthDate][day]': res[1],
    	'data[ClientInfoUser][BirthDate][month]': res[2],
    	'data[ClientInfoUser][BirthDate][year]': res[3]
    });

    html = AnyBalance.reqeustGet(baseurl + 'client_info/balance/', g_headers);

    // Проверка на корректный вход
    if (/Номер Вашей карты:</.exec(html)) {
		AnyBalance.trace('It looks like we are in selfcare...');
    } else {
    	//AnyBalance.trace('Have not found logOff... Unknown error. Please contact author.');
    	throw new AnyBalance.Error('Неизвестная ошибка. Пожалуйста, свяжитесь с автором провайдера.');
    }
	
    var result = {success: true};
    // ФИО
    AB.getParam(html, result, 'customer', /Уважаем(?:ый|ая)\s*([^!]*)!/i, AB.replaceTagsAndSpaces);
    // Номер карты
    AB.getParam(html, result, 'cardNumber', /Номер Вашей карты(?:[^>]*>){4}([\s\S]*?)<\//i, AB.replaceTagsAndSpaces);
    // Остаток бонусов
    AB.getParam(html, result, 'bonus', /Остаток бонусов(?:[^>]*>){4}([\s\S]*?)<\//i, AB.replaceTagsAndSpaces, AB.parseBalance);
    // Сумма всех покупок
    AB.getParam(html, result, 'costPurchase', /Сумма всех покупок(?:[^>]*>){4}([\s\S]*?)<\//i, AB.replaceTagsAndSpaces, AB.parseBalance);
    // Дата последней операции
    AB.getParam(html, result, 'dateLastOperation', /Дата последней операции(?:[^>]*>){4}([\s\S]*?)<\//i);
	
    AnyBalance.setResult(result);
}