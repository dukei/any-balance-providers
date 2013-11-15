/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию о бонусах на накопительной карте сети магазинов Красный Куб.

Сайт магазина: http://www.redcube.ru/
Личный кабинет: http://www.redcube.ru/clients/club/cabinet/
*/

function enter(url, data) {
	var html = AnyBalance.requestPost(url, data);

	var error = getParam(html, null, null, /<div[^>]+id="dangerMessage"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	if (error)
		throw new AnyBalance.Error(error);

	return html;
}

function main () {
    AnyBalance.setDefaultCharset ('utf-8');

    var prefs = AnyBalance.getPreferences ();
    var baseurl = 'http://club.redcube.ru/';

    checkEmpty (prefs.number, 'Введите номер карты!');
    var res = /(\d{2})\.(\d{2})\.(\d{4})/.exec(prefs.db_date);
	if (!res)
        throw new AnyBalance.Error ('Введите дату рождения в формате ДД.ММ.ГГГГ');

    AnyBalance.trace('Trying to enter selfcare at address: ' + baseurl);

    enter(baseurl, {
    	_method: 'POST',
    	'data[Auth][card]': prefs.number,
    	serverurl: 'http://www.redcube.ru',
    	text: 'Найти'
    });

    var html = enter(baseurl, {
    	_method: 'POST',
    	'data[Auth][date][day]': res[1],
    	'data[Auth][date][month]': res[2],
    	'data[Auth][date][year]': res[3],
    	serverurl: 'http://www.redcube.ru',
    	text: 'Найти'
    });

    // Проверка на корректный вход
    if (/">Выйти</.exec(html)) {
		AnyBalance.trace('It looks like we are in selfcare...');
    } else {
    	//AnyBalance.trace('Have not found logOff... Unknown error. Please contact author.');
    	throw new AnyBalance.Error('Неизвестная ошибка. Пожалуйста, свяжитесь с автором провайдера.');
    }
	
    var result = {success: true};
    // ФИО
    getParam(html, result, 'customer', /Уважаем(?:ый|ая)\s*([^!]*)!/i, replaceTagsAndSpaces, html_entity_decode);
    // Номер карты
    getParam(html, result, 'cardNumber', /Номер\s*Вашей\s*карты[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    // Остаток бонусов
    getParam(html, result, 'bonus', /Остаток\s*бонусов[^\d]*(\d+[.,]?\d*)/i, replaceTagsAndSpaces, parseBalance);
    // Сумма всех покупок
    getParam(html, result, 'costPurchase', /Сумма\s*всех\s*покупок[^\d]*(\d+[.,]?\d*)/i, replaceTagsAndSpaces, parseBalance);
    // Дата последней операции
    getParam(html, result, 'dateLastOperation', /Дата\s*последней\s*операции[^\d]*(\d{2}.\d{2}.\d{4})/i);

    AnyBalance.setResult(result);
}