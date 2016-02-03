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

function phoneNumberFormat(num) {
    var m = /^(\d\d)(\d{3})(\d\d)(\d\d)$/.exec(num);
    return m ? '+375 (' + m[1] + ') ' + m[2] + ' ' + m[3] + ' ' + m[4] : '';
}

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://internet.mts.by/';
	AnyBalance.setDefaultCharset('utf-8');
    
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
    
    var login = phoneNumberFormat(prefs.login);
    checkEmpty(login, 'Введите корректный логин!');
   
	var html = AnyBalance.requestGet(baseurl + 'login', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
    var inputParams = {
        phone_number: login,
        password: prefs.password
    };
    var params = AB.createFormParams(html, function (params, str, name, value) {
        return inputParams[name] || value;
    });
    
	html = AnyBalance.requestPost(baseurl + 'session', params, addHeaders({
        Referer: baseurl
    }));
	
	if (!/logout/i.test(html)) {
		var error = AB.getElement(html, /<div[^>]+?class="[^"]*?flash-error/i, replaceTagsAndSpaces);
        if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /баланс:(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'number', /Мой номер:(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /Мой тарифный план:(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'network', /Сеть:(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'ip', /IP-адрес:(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'traffic', /Остаток трафика:(?:[\s\S]*?)data-text="([\s\S]*?)"/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'next_topup', /Следующее пополнение трафика:(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDateWord);
	
	AnyBalance.setResult(result);
}