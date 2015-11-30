/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/30.0.1599.101 Safari/537.36',
	'Accept': 'application/json, text/plain, */*',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
	'X-Requested-With': 'XMLHttpRequest',
	'Content-Type': 'application/json;charset=UTF-8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Connection':'keep-alive',
};

var errors = {
	1: "Ошибка доступа. Введен неверный логин или пароль!",
	
}

function main(){
    var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.password, 'Введите пароль!');
	if(!/\d{10}/i.test(prefs.login)) throw new AnyBalance.Error('Номер телефона должен быть без пробелов и разделителей, в формате 707XXXXXXX или 747XXXXXXX!');
	
    var baseurl = "https://iself.tele2.kz/";
    AnyBalance.setDefaultCharset('utf-8'); 
	
	// Значала зачем-то проверяем номер, какую-то куку ставит еще...
	/*var json = {msisdn: prefs.login};
    var html = AnyBalance.requestPost(baseurl + 'auth/checkMsisdn.json', JSON.stringify(json), g_headers);
    json = getJson(html);
    if(json.oCurrState == '-1')
        throw new AnyBalance.Error('Введенный номер не принадлежит Tele2!');

    if(json.oCurrState != '2' && json.oCurrState != '1')
        throw new AnyBalance.Error('К сожалению, ваш номер обслуживается старым кабинетом и требует капчу. Поддержка этого кабинета появится позднее.');
*/
	if(!prefs.debug) {
		var html = AnyBalance.requestGet(baseurl + 'login', g_headers);
		
		var token = getParam(html, null, null, /constant\("csrf_token",\s+['"]([^"']*)/i);
		checkEmpty(token, 'Не удалось найти токен авторизации, сайт изменен?', true);
		
		var html = AnyBalance.requestPost(baseurl + 'captcha', JSON.stringify({same_origin_token: token}), addHeaders({Referer: baseurl + 'login'})); 
		
		var json = getJson(html);
		
		if(json.capcha64) {
			if(AnyBalance.getLevel() >= 7) {
				AnyBalance.trace('Пытаемся ввести капчу');
				captchaa = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", getParam(json.capcha64 || '', null, null, /,([\s\S]+)/i));
				AnyBalance.trace('Капча получена: ' + captchaa);
			} else {
				throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
			}
		} else {
			AnyBalance.trace('Похоже что капча не требуется...');
		}
		
		var json = {msisdn: prefs.login, password: prefs.password, same_origin_token: token, answer: captchaa};
		html = AnyBalance.requestPost(baseurl + 'auth/tele2', JSON.stringify(json), addHeaders({Referer: baseurl + 'login'})); 
		
		if(/"err"/i.test(html)){
			//Если в кабинет войти не получилось, то в первую очередь надо поискать в ответе сервера объяснение ошибки
			var error = getParam(html, null, null, /err":"([\s\S]*?)"/i, replaceTagsAndSpaces, html_entity_decode);
			if(error in errors)
				throw new AnyBalance.Error(errors[error]);
			if(error)
				throw new AnyBalance.Error(error);
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
		}
	}
	// Получаем данные о балансе
	html = AnyBalance.requestGet(baseurl + 'profile');
	
    var result = {success: true};
    getParam(html, result, 'fio', /"profile">[\s\S]*?([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /class="profile-balance">([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /class="header"[^>]*>([^<]*?)<\/div[^>]*>\s*<a href="tariffs"/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'phone', /"profile-phonenum"[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	
	try{
		if(isAvailable('internet_trafic', 'internet_trafic_night', 'min_left', 'sms_left', 'mms_left')) {
			token = getParam(html, null, null, /constant\("csrf_token",\s+['"]([^"']*)/i);
			var requestJson = {same_origin_token: token};
			// Сайт возвращает JSON c доп. балансами, они -то нам и нужны
			html = AnyBalance.requestPost(baseurl + 'balanceres', JSON.stringify(requestJson), addHeaders({Referer: baseurl + 'profile'}));
			json = getJson(html);

			for(var i=0; i<json.returns.length; ++i){
				var it = json.returns[i];
				var name = it.balanceName[0], units = it.unitName[0];
				var value = it.volume[0];
				sumDiscount(result, name, units, value);
			}

			html = AnyBalance.requestPost(baseurl + 'balancedis', JSON.stringify(requestJson), addHeaders({Referer: baseurl + 'profile'}));
			json = getJson(html);

			for(var i=0; i<json.returns.length; ++i){
				var it = json.returns[i];
				var name = it.dvtpName[0] + ' ' + it.name[0], units = '';
				var value = it.balance[0];
				sumDiscount(result, name, units, value);
			}
		}
	} catch(e){
		AnyBalance.trace('Ошибка при получении Интернет-пакетов: ' + e);
	}
    AnyBalance.setResult(result);
}

function sumDiscount(result, name, units, value){
	var bigname = name + units;
	AnyBalance.trace('Найдено ' + name + ' ' + value + ' ' + units);
	if(/шт|sms|смс/i.test(bigname)){
		sumParam(value + '', result, 'sms_left', null, null, parseBalance, aggregate_sum);
	}else if(/mms|ммс/i.test(bigname)){
		sumParam(value + '', result, 'mms_left', null, null, parseBalance, aggregate_sum);
	}else if(/минут/i.test(bigname)){
		sumParam(value + '', result, 'min_left', null, [/[\.,].*/, ''], parseBalance, aggregate_sum);
	}else if(/[гкмgkm][бb]/i.test(bigname) || /интернет/i.test(name)){
		var night = /ноч/i.test(bigname) ? '_night' : '';
		sumParam(value + 'мб', result, 'internet_trafic' + night, null, null, parseTraffic, aggregate_sum);
	}else{
		AnyBalance.trace('Неизвестная опция: ' + name);
	}
}