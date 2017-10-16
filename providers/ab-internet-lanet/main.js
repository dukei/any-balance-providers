/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

var messages = {
    title: "Кабинет",
    wait: "загрузка...",
    copyright: "2003—2014 © Ланет Нетворк, интернет провайдер и кабельное телевидение",
    "city.kv": "Киев",
    "city.if": "Ивано-Франковск",
    "city.kl": "Калуш",
    "city.sd": "Северодонецк",
    "city.kp": "Каменец-Подольский",
    "city.vn": "Подолье",
    "city.ch": "Червоноград",
    "city.pk": "Прикарпатье",
    "city.sb": "Самбор",
    "city.vv": "Владимир-Волынский",
    "city.dr": "Дрогобыч",
    "socials.vk": "Вконтакте",
    "socials.vkontakte": "Вконтакте",
    "socials.fb": "Facebook",
    "socials.facebook": "Facebook",
    "socials.gg": "Google",
    "socials.google": "Google",
    "socials.tw": "Twitter",
    "socials.pending": "Учетная запись %s еще не связана с вашим профилем. Чтобы связать, войдите в кабинет любым другим способом.",
    "contacts.schedule": "График работы ЦОА",
    "contacts.schedule_wd": "Пн.—Пт.",
    "contacts.schedule_we": "Сб.—Вс.",
    "contacts.address": "Адрес ЦОА",
    "contacts.email": "Электронный адрес",
    "contacts.call_queue": "Очередь звонков",
    "contacts.wait_time": "Ожидание:",
    "contacts.wait_time_unit": ["сек.", "сек.", "сек."],
    "contacts.waiters": "В очереди:",
    "contacts.waiters_unit": ["звонок", "звонка", "звонков"],
    "menu.cabinet": "Личный кабинет",
    "menu.myprofile": "Мой профиль",
    "menu.rada": "Сообщество пользователей",
    "menu.city": "Выбрать город",
    "menu.socials": "Ланет в соц. сетях",
    "menu.socials.columbus": "Колумбус в социальных сетях",
    "menu.socials.bitternet": "БиттерНет в социальных сетях",
    "menu.lang.ru": "Рус",
    "menu.lang.ua": "Укр",
    "menu.callback": "Заказать звонок",
    "menu.callbackform.enterphone": "Укажите контакты",
    "menu.callbackform.phone": "Телефон",
    "menu.callbackform.send_request": "Заказать звонок",
    "menu.callback.message": "Перезвоните мне на",
    "menu.callback.accepted": "В ближайшее время оператор свяжется с вами",
    "menu.switchlang": "Українською",
    "menu.phonecode": "Контактный номер телефона",
    "menu.logout": "Выход",
    "login.placeholder": "Логин",
    "password.placeholder": "Пароль",
    "login.password.title": "Вход по паролю",
    "login.socials.title": "Войти через",
    "login.submit": "Войти",
    "login.wrong": "Неправильный логин или пароль",
    "login.wrong.zone": "С Вашего адреса доступ запрещен",
    "api.service.error": "системная ошибка, попробуйте повторить попытку позже",
    "api.phone.bad.format": "номер телефона должен быть в 12-значном цифровом формате",
    "ads.find_out": "Выяснить условия акции"
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    var baseurl = 'https://my.lanet.ua/';
	var html = AnyBalance.requestGet(baseurl + 'login.php', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var token = getParam(html, null, null, /new\s+Main\s*\(\s*"[^"]*"\s*,\s*"([^"]*)/, replaceSlashes);
	if(!token){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти токен авторизации. Сайт изменен?');
	}
	
    html = AnyBalance.requestPost(baseurl + 'login.php?api', {
		'method':'login',
		'parameters':'["'+prefs.login+'","'+prefs.password+'"]',
		'id':'3',
		'token': token
	}, addHeaders({'Referer': baseurl + 'login.php'}));
	
	var json = getJson(html);
	
    if(!json.status) {
        var error = getParam(html, null, null, /<td[^>]+class="form_error"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error);
			
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    if(!json.result[0]){
    	throw new AnyBalance.Error(messages[json.result[1]] || json.result[1], null, /login.wrong/i.test(json.result[1])); 
    }
	
	html = AnyBalance.requestGet(baseurl + 'client_info.php', g_headers);
	
    html = AnyBalance.requestPost(baseurl + 'client_info.php?api', {
		'batch':'[["getContract"],["getDeposit"],["getBonus"],["getName"], ["getPeriodInfo"], ["getMiss"]]',
		'id':'1',
		'token':token
	}, addHeaders({'Referer': baseurl + 'client_info.php'}));
	
	json = getJson(html);
	
	var result = {success: true};
	
	for(var i = 0; i < json.result.length; i++) {
		var current = json.result[i];
		if(current.name == 'getContract') {
			getParam(current.result + '', result, 'agreement');
		} else if(current.name == 'getDeposit') {
			getParam(current.result + '', result, 'balance', null, replaceTagsAndSpaces, parseBalanceMy);
		} else if(current.name == 'getMiss') {
			getParam(current.result + '', result, 'pay', null, replaceTagsAndSpaces, parseBalanceMy);
		} else if(current.name == 'getBonus') {
			getParam(current.result + '', result, 'bonus', null, replaceTagsAndSpaces, parseBalanceMy);
		} else if(current.name == 'getName') {
			getParam(current.result.last_name + ' ' + current.result.first_name, result, 'userName', null, replaceTagsAndSpaces);
		} else if(current.name == 'getPeriodInfo') {
			getParam(current.result.period_end, result, 'paytill', null, replaceTagsAndSpaces, parseBalance);
			getParam(current.result.connection_type.name, result, '__tariff', null, replaceTagsAndSpaces);
		}
	}
	
	function parseBalanceMy(str) {
		return parseBalance(str)/100;
	}
	
    AnyBalance.setResult(result);
}