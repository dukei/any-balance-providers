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
	var baseurl = 'https://uslugi.tatarstan.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'user/login', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'user_login_form_model[phone_number]') 
			return prefs.login;
		else if (name == 'user_login_form_model[password]')
			return prefs.password;

		return value;
	});
    
	html = AnyBalance.requestPost(baseurl + 'user/login', params, addHeaders({Referer: baseurl}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /error_explanation[^>]*>[\s\S]*?([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
    
    // получаем данные пользователя из личного кабинета
    html = AnyBalance.requestGet(baseurl + 'user', g_headers);
    
	var result = {success: true};
    
    var lastname = getParam(html, null, null, /Фамилия(?:[^>]*>){4}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    var firstname = getParam(html, null, null, /Имя(?:[^>]*>){4}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    // var snils = getParam(html, null, null, /СНИЛС(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    var inn = getParam(html, null, null, /ИНН(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    
    getParam(html, result, 'fio', /information[\s\S]*?<span>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    
    // Данные жкх пока не пашет
    if(isAvailable('')) {
        
    }
        
    // получаем данные о налоговой задолженности
    html = AnyBalance.requestGet(baseurl + 'taxes/index', g_headers);
	params = createFormParams(html, function(params, str, name, value) {
		if (name == 'inn')
			return prefs.inn || inn;
		else if (name == 'lastname')
			return lastname;
		else if (name == 'firstname')
			return firstname;

		return value;
	});
    
	html = AnyBalance.requestPost(baseurl + 'taxes/index', params, addHeaders({Referer: baseurl}));
    html = AnyBalance.requestGet(baseurl + 'taxes/debt', g_headers);
    
    var debt_table = getParam(html, null, null, /Налоговые\sзадолженности[\s\S]*?<table[\s\S]*?<tbody>([\s\S]*?)<\/tbody>[\s\S]*?<\/table>/i);
	var array = sumParam(debt_table, null, null, /<tr>[\s\S]*?<\/tr>/ig);
	var html_response = '';

    for(var i = 0; i < array.length; i++) {
        var current = array[i];
        
        var type = getParam(current, null, null, /<td(?:[^>]*>){4}([^<]*)/i) || 'Неизвестный тип налога'; // Транспортный налог
        var agency = getParam(current, null, null, /<td(?:[^>]*>){7}([^<]+)/i); // УПРАВЛЕНИЕ ФЕДЕРАЛЬНОГО КАЗНАЧЕЙСТВА ПО МОСКОВСКОЙ ОБЛАСТИ (Межрайонная ИФНС России № 3 по Московской области)
        var sum = getParam(current, null, null, /налог:(?:[^>]*>){2}([^<]*)/i); // Сумма налога
        var fine = getParam(current, null, null, /пеня:(?:[^>]*>){2}([^<]*)/i); // Пени
        var date = getParam(current, null, null, /(По состоянию на:[^>]*>[^<]*)/i, replaceTagsAndSpaces, html_entity_decode); // На дату
        // Формируем html
        html_response += type + ': ' + agency + ' <b>Налог: ' + sum + '.</b> ' + '<b>Пеня: ' + fine + '.</b>' + date + '<br/><br/>';
    }
    getParam(html_response, result, 'nalog_info', null);
	
	AnyBalance.setResult(result);
}