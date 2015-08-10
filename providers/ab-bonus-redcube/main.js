/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
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
    var baseurl = 'http://www.redcube.ru/';
	
    checkEmpty (prefs.number, 'Введите номер карты!');
    var res = /(\d{2})\.(\d{2})\.(\d{4})/.exec(prefs.db_date);
	if (!res)
        throw new AnyBalance.Error ('Введите дату рождения в формате ДД.ММ.ГГГГ');
	
	AnyBalance.trace('Trying to enter selfcare at address: ' + baseurl);
	
    enter(baseurl + 'client_info/check/', {'data[ClientInfoUser][bcard]': prefs.number});
	
    var html = enter(baseurl + 'client_info/login', {
    	'data[ClientInfoUser][BirthDate][day]': res[1],
    	'data[ClientInfoUser][BirthDate][month]': res[2],
    	'data[ClientInfoUser][BirthDate][year]': res[3],
    });
	
    // Проверка на корректный вход
    if (/Номер Вашей карты:</.exec(html)) {
		AnyBalance.trace('It looks like we are in selfcare...');
    } else {
    	//AnyBalance.trace('Have not found logOff... Unknown error. Please contact author.');
    	throw new AnyBalance.Error('Неизвестная ошибка. Пожалуйста, свяжитесь с автором провайдера.');
    }
	
    var result = {success: true};
    // ФИО
    getParam(html, result, 'customer', /Уважаем(?:ый|ая)\s*([^!]*)!/i, replaceTagsAndSpaces, html_entity_decode);
    // Номер карты
    getParam(html, result, 'cardNumber', /Номер Вашей карты(?:[^>]*>){4}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
    // Остаток бонусов
    getParam(html, result, 'bonus', /Остаток бонусов(?:[^>]*>){4}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
    // Сумма всех покупок
    getParam(html, result, 'costPurchase', /Сумма всех покупок(?:[^>]*>){4}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
    // Дата последней операции
    getParam(html, result, 'dateLastOperation', /Дата последней операции(?:[^>]*>){4}([\s\S]*?)<\//i);
	
    AnyBalance.setResult(result);
}