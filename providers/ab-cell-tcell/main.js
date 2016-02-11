
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
	var baseurl = 'http://my.tcell.tj';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestPost(baseurl + '/ru/Account/LogOn', {
		Login: prefs.login,
        Password: prefs.password
	}, AB.addHeaders({
		Referer: baseurl
	}));
    
    if (!html || AnyBalance.getLastStatusCode() >= 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
    
    var errorText = getElement(html, /<div[^>]*?validation-summary-errors/i, replaceTagsAndSpaces);
    
    if (errorText) {
        throw new AnyBalance.Error(errorText, false, /логин|номер\s+телефона|парол/i.test(errorText));
    }
    
    if (/\/Terms($|\?|#)/i.test(AnyBalance.getLastUrl())) {
        html = AnyBalance.requestPost(baseurl + '/ru/Terms/AcceptTerms', {}, AB.addHeaders({
            Referer: AnyBalance.getLastUrl(),
            Origin: baseurl
        }));
        
        var json = AB.getJson(html);
        
        if (json.Status != 'Success') {
            AnyBalance.trace(html);
            throw new AnyBalance.Error(json.Message || 'Не удалось зайти в личный кабинет. Сайт изменен?');
        }
        
        html = AnyBalance.requestGet(baseurl + '/ru/Cabinet', g_headers);
    }

	if (!/logout/i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
    
	var result = {
		success: true
	};
    
    var titleRX = /<div[^>]*?header[^>]*>\s*<div[^>]*?title[^>]*>([^<]+)/i;
    function itemRX(title) {
        title = title.replace(/([\.\(\)])/g, '\\$1').replace(/\s+/g, '\\s+');
        return RegExp('<div[^>]*?name[^>]*>\\s*<div[^>]*>\\s*' + title + ':?\\s*<span[^>]*>([^<]+)', 'i');
    }
    
    var parent = getElement(html, /<div[^>]*?id="base"/i);
    
    var groups = getElements(parent, /<div[^>]*?class="group"/ig);
    
    getParam(groups[0], result, 'phone', titleRX, AB.replaceTagsAndSpaces);
    getParam(groups[0], result, 'fio', itemRX('ФИО'), AB.replaceTagsAndSpaces);
    getParam(groups[0], result, 'status', itemRX('Статус абонента'), AB.replaceTagsAndSpaces);
    getParam(groups[0], result, '__tariff', itemRX('Тариф'), AB.replaceTagsAndSpaces);
    
    getParam(groups[1], result, 'balance', titleRX, AB.replaceTagsAndSpaces, AB.parseBalance);
    getParam(groups[1], result, 'minus', itemRX('Расходы (тек. месяц)'), AB.replaceTagsAndSpaces, AB.parseBalance);
    getParam(groups[1], result, 'plus', itemRX('Приходы (тек. месяц)'), AB.replaceTagsAndSpaces, AB.parseBalance);
    
    if (AnyBalance.isAvailable('services')) {
        var services = [];
        parent = getElement(html, /<div[^>]*?id="serviceList"/i);
        var servicesHtml = getElements(parent, /<div[^>]*?class="[^"]*?\bservice\b/ig);
        for (var i = 0; i < servicesHtml.length; ++i) {
            var serv = getElement(servicesHtml[i], /<div[^>]*?name/i, replaceTagsAndSpaces);
            if (serv) {
                services.push(serv);
            }
        }
        if (services.length) {
            result.services = services.join(', ');
        }
    }
    
	AnyBalance.setResult(result);
}
