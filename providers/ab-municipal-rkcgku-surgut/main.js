
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
	var baseurl = 'https://pay.rkc-gku.ru';
    var addressUrl = baseurl + '/app_main_pay/Address.aspx/';
    var dataUrl = baseurl + '/app_main_pay/Account.aspx/AddComm';
	AnyBalance.setDefaultCharset('utf-8');
    
    var html = AnyBalance.requestGet(dataUrl, g_headers);
    
    if (!html || AnyBalance.getLastStatusCode() >= 400) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }
    
    var params = {
        serviceId: prefs.service,
        LC: '',
        WebSite: '/app_main_pay/'
    };
    
    function norm(str, b) {
        return (b && str 
            ? str.replace(/^[\s\(\)\.]*|[\s\(\)\.]*$/g, '').replace(/[\s\(\)\.]{2,}/g, ' ')
            : str || '').toUpperCase();
    }
    
    var field = 'serviceId';
    for (var i = 0; i < configSelects.length; ++i) {
        var req = {};
        req[field] = params[field];
        field = configSelects[i][2];
        var html = AnyBalance.requestPost(addressUrl + configSelects[i][0], req, g_headers);
        
        var json = AB.getJson(html);
        
        if (!prefs[configSelects[i][1]] && (json.length == 1)) {
            params[field] = json[0].Value;
        } else {
            if (!prefs[configSelects[i][1]]) {
                throw new AnyBalance.Error(configSelects[i][3], false, true);
            }
            
            var cmpValue = norm(prefs[configSelects[i][1]], configSelects[i][5]);

            for (var j = 0; j < json.length; ++j) {
                var text = norm(json[j].Text, configSelects[i][5]);
                if (text == cmpValue) {
                    params[field] = json[j].Value;
                    break;
                }
            }
            if (!params[field]) {
                throw new AnyBalance.Error(configSelects[i][4] + ' ' + cmpValue);
            }
        }
    }
    
    html = AnyBalance.requestPost(dataUrl, params, AB.addHeaders({
        Referer: dataUrl,
        Origin: baseurl,
        'Content-Type': 'application/x-www-form-urlencoded'
    }));

    var ls = AB.getParam(html, null, null, /Лицевой\s+счет:?\s*(?:<[^>]*>)?\s*(\d+)/i);
    
    if (!ls) {
        AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
    
    var result = {
		success: true
	};
    
    AB.getParam(ls, result, 'ls');

    if (AnyBalance.isAvailable('balance')) {
        var plus  = AB.getParam(html, null, null, /Переплата:\s*([^<]+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
        var minus = AB.getParam(html, null, null, /Долг:\s*([^<]+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
        
        result.balance = (plus || 0) - (minus || 0);
    }
	AB.getParam(html, result, 'date', /Дата:\s*([^<]+)/i, AB.replaceTagsAndSpaces, AB.parseDate);

	AnyBalance.setResult(result);
}

var configSelects = [
    ['UkByService', 'company', 'companyId', 'Не указана организация', 'Не найдена организация', true],
    ['StreetsByCompany', 'street', 'streetId', 'Не указана улица', 'Не найдена улица', true],
    ['HousesByCompanyStreet', 'house', 'houseId', 'Не указан дом ', 'Не найден дом'],
    ['FlatsByHouse', 'flat', 'flatId', 'Не указана квартира', 'Не найдена квартира']
];
