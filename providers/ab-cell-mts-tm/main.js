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
	var baseurl = 'https://ihelper.mts.tm/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите номер телефона!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'work.html', g_headers);
	html = AnyBalance.requestGet(baseurl + 'work.html', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var sid3 = getParam(html, null, null, /name=["']sid3["'][\s\S]*?value="([^"]+)/i);

    var params = createFormParams(html, function(params, input, name, value){
        var undef;
        if(name == 'user_input_timestamp')
            value = undef;
        else if(name == 'sid3')
            value = sid3;
        else if(name == 'user_input_0')
            value = '_next';
        else if(name == 'user_input_1')
            value = prefs.login;
        else if(name == 'user_input_2')
            value = prefs.password;

        return value;
    });
    
    html = requestPostMultipart(baseurl, params, g_headers);

	if (!/Баланс/i.test(html)) {
		var error = getParam(html, null, null, /class="info_error[^>]*>([\s\S]*?)<\/tr/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Пароль введен не верно|Номер телефона введен не верно/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /баланс(?:[^>]*>){1}([\s\S]*?)<\/td/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /ФИО(?:[^>]*>){1}([\s\S]*?)<\/td/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /Тарифный план(?:[^>]*>){1}([\s\S]*?)<\/td/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'acc_num', /Номер лицевого счета(?:[^>]*>){1}([\s\S]*?)<\/td/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'minutes_avail', /Доступно по скидке - Количество минут за период(?:[^>]*>){1}([\s\S]*?)<\/td/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'minutes_used', /Использовано по скидке - Количество минут за период(?:[^>]*>){1}([\s\S]*?)<\/td/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'packages_avail', /Доступно по скидке - Пакетов за период \(получено и передано\)(?:[^>]*>){1}([\s\S]*?)<\/td/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'packages_used', /Использовано по скидке - Пакетов за период \(получено и передано\)(?:[^>]*>){1}([\s\S]*?)<\/td/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}