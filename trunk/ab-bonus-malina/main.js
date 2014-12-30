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

function main () {
    var prefs = AnyBalance.getPreferences ();
    var baseurl = 'http://malina.ru/';

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');	

    AnyBalance.trace ('Trying to enter selfcare at address: ' + baseurl);
	
    var html = AnyBalance.requestGet(baseurl + 'msk/', g_headers); // Запрос необходим для формирования cookie с регионом MSK
    
	var captchaa;
	if(AnyBalance.getLevel() >= 7) {
		AnyBalance.trace('Пытаемся ввести капчу');
		
		var json = getJson(AnyBalance.requestGet(baseurl + 'captcha/refresh/?_=' + new Date().getTime(), addHeaders({'X-Requested-With': 'XMLHttpRequest'})));
		AnyBalance.setOptions({forceCharset:'base64'});
		var captcha = AnyBalance.requestGet(baseurl + 'captcha/image/' + json.key);
		captchaa = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
		AnyBalance.setOptions({forceCharset:'utf-8'});
		AnyBalance.trace('Капча получена: ' + captchaa);
	}else{
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
	}
	
	html = AnyBalance.requestPost(baseurl + 'msk/pp/login/', {
    	'csrfmiddlewaretoken': getParam(html, null, null, /csrfmiddlewaretoken[^>]*value=["']([^"']+)["']/i),
    	'contact': prefs.login,
    	'password': prefs.password,
    	'next': '',
		'captcha_0':json.key,
		'captcha_1':captchaa
    }, addHeaders({'X-Requested-With': 'XMLHttpRequest'}));
	
	var json = getJson(html);
	
    // Проверка на корректный вход
    if (json.status != 'ok') {
    	// Проверка неправильной пары логин/пароль
		if(json.errors['__all__']) {
			var error = json.errors['__all__'].join(', ');
		} else {
			var error = json.errors['__all__'];
		}
		
		if(isArray(json.errors))
			var error = json.errors.join(', ');
		
    	if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		throw new AnyBalance.Error('Не удалось зайти на персональную страницу. Сайт изменен?');
    }
	
	html = AnyBalance.requestGet (baseurl + 'pp/', g_headers);
	if(/change_password/i.test(AnyBalance.getLastUrl()))
		AnyBalance.trace('Малина заставляет вас сменить пароль. Пока вы не смените пароль, провайдер будет возвращать только баланс');
	
    AnyBalance.trace ('It looks like we are in selfcare...');
	
    if (!/class="acc-points"/i.test(html))
        throw new AnyBalance.Error ('Невозможно найти информацию об аккаунте, свяжитесь с разработчиками!');
	
	AnyBalance.trace ('Parsing data...');
	
    var result = {success: true};
	
	getParam (html, result, 'balance', /"acc-points"(?:[^>]*>){2}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam (html, result, 'accountNumber', /Номер счета(?:[^>]*>){2}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam (html, result, 'customer', /Владелец счета(?:[^>]*>){2}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam (html, result, 'status', /Статус счета(?:[^>]*>){2}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam (html, result, 'availableForPay', /Доступно к обмену на товары и услуги(?:[^>]*>){2}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	
    // Накоплено основных баллов
    //getParam (html, result, 'mainPoints', /<th[^>]*>Владелец счета[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    // Накоплено EXPRESS-баллов
    //getParam (html, result, 'expressPoints', $table, 'tr:contains("EXPRESS") td', parseBalance);
    // Израсходовано баллов
    //getParam (html, result, 'gonePoints', $table, 'tr:contains("Израсходовано баллов") td', parseBalance);
    // Сгорело баллов
    //getParamFind (result, 'burnPoints', $table, 'tr:contains("Сгорело баллов") td', parseBalance);
	
    if (AnyBalance.isAvailable ('burnInThisMonth')) {
        html = AnyBalance.requestGet (baseurl + 'pp/forecast/');

        getParam(html, result, 'burnInThisMonth', /Баллов, которые сгорят в ближайшие месяцы([^<]+)/i, null, parseBalance);
    }
	
    AnyBalance.setResult (result);
}
