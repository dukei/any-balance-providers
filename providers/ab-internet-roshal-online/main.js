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
    var baseurl = 'http://netstat.atnr.ru/';
    AnyBalance.setDefaultCharset('utf-8');

    checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(prefs.password, 'Введите пароль!');

    var html = AnyBalance.requestGet(baseurl, g_headers);

    if(!html || AnyBalance.getLastStatusCode() > 400){
            AnyBalance.trace(html);
            throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    var params = createFormParams(html, function(params, str, name, value) {
            if (name == 'login') 
                    return prefs.login;
            else if (name == 'password')
                    return prefs.password;
            return value;
    });

    html = AnyBalance.requestPost(baseurl, params, addHeaders({Referer: baseurl}));

    if (!/logout/i.test(html)) {
            var error = getParam(html, null, null, /<p[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
            if (error)
                    throw new AnyBalance.Error(error, null, /Неверно указаны логин или пароль/i.test(error));
            AnyBalance.trace(html);
            throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    
    function RX(title) {
        return RegExp('<tr[^>]*>\\s*<td[^>]*?utm-cell[^>]*>\s*' +
            title.replace(/\s+/g, '\\s+') +
            ':?\s*</td\\s*>\\s*<td[^>]*>\\s*([^<]+)', 'i');
    }
    function RXCell(n, g) {
        return RegExp('<tr[^>]*>(?:[\\s\\S]*?<td[^>]*?utm-cell[^>]*>){' + n + '}([^<]+)', g ? 'ig': 'i');
    }
    
    var table = AB.getElement(html, /<table[^>]*?utm-table/i);
    
    if (!table) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
    
    getParam(table, result, 'status', RX('состояние интернета'), replaceTagsAndSpaces);
    getParam(table, result, 'balance', RX('Баланс'), replaceTagsAndSpaces, parseBalance);
    getParam(table, result, 'fio', RX('ФИО'), replaceTagsAndSpaces);
    getParam(table, result, 'credit', RX('Кредит'), replaceTagsAndSpaces, parseBalance);
    getParam(table, result, 'accountID', RX('Основной лицевой счет'), replaceTagsAndSpaces);
    
    if (AnyBalance.isAvailable('adress')) {
        html=AnyBalance.requestGet(baseurl+'?module=user_details', g_headers);
        table = AB.getElement(html, /<table[^>]*?utm-table/i);
        getParam(table, result, 'adress', RX('Фактический адрес'), replaceTagsAndSpaces);
    }

    if (AnyBalance.isAvailable(['currentTariff', 'deadline', 'cost', 'writtenOff'])) {
        html=AnyBalance.requestGet(baseurl+'?module=41_services', g_headers);
        table = AB.getElement(html, /<table[^>]*?utm-table/i);
        
        sumParam(table, result, 'cost', RXCell(6, true), replaceTagsAndSpaces, parseBalance, AB.aggregate_sum);
        sumParam(table, result, 'writtenOff', RXCell(7, true), replaceTagsAndSpaces, parseBalance, AB.aggregate_sum);
        getParam(table, result, 'currentTariff', RXCell(3), replaceTagsAndSpaces);
        getParam(table, result, 'deadline', RXCell(5), replaceTagsAndSpaces, parseDate);
    }




    /*
        
		<counter id="currentTariff" name="Текущий тариф" type="text"/>
		<counter id="cost" name="Абонентская плата" units=" p"/>
		<counter id="writtenOff" name="Списано абонентской платы" units=" p"/>
		<counter id="deadline" name="Конец расчётного периода" type="time" format="dd/mm/yyyy"/>
        */

	AnyBalance.setResult(result);
}