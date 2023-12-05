/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
    'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.6,en;q=0.4',
	'Cache-Control':' max-age=0',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.67 Safari/537.36'
};

var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

function main(){
    var prefs = AnyBalance.getPreferences();
	
	AB.checkEmpty(prefs.login, 'Введите DREID приемника!');
    AB.checkEmpty(prefs.password, 'Введите пароль!');
	
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = 'https://selfcare-api.tricolor.ru/';

    var html = AnyBalance.requestPost(baseurl + 'selfcare-api/v1/auth/token', JSON.stringify({
        grant_type: 'password',
        username: prefs.login,
        password: prefs.password
    }), AB.addHeaders({
	    	'Accept': 'application/json, text/plain, */*',
			'Content-Type': 'application/json',
	    	'Origin': 'https://lk.tricolor.ru',
            'Referer': 'https://lk.tricolor.ru/',
	    }));

    if(/crash-content/i.test(html))
    	throw new AnyBalance.Error('Сервис временно недоступен. Попробуйте еще раз позже');

    var json = AB.getJson(html);
    if (!json.access_token) {
    	AnyBalance.trace(html);
    	if(json.userMessage) {
            throw new AnyBalance.Error(json.userMessage, null, /логин|парол/i.test(json.userMessage));
        }

    	throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var accessToken = json.access_token;
	var refreshToken = json.refresh_token;
	
    html = AnyBalance.requestGet(baseurl + 'selfcare-api/v1/united/accounts', AB.addHeaders({
		'Authorization': 'Bearer ' + accessToken
	}));

    var accounts = AB.getJson(html);
	
	AnyBalance.trace('Найдено подключенного оборудования: ' + accounts.length);

	if(accounts.length < 1)
		throw new AnyBalance.Error('У вас нет подключенного оборудования');

	var curAcc;
	for(var i=0; i<accounts.length; ++i){
		var acc = accounts[i];
		AnyBalance.trace('Найдено оборудование № ' + acc.tricolorID);
		if(!curAcc && (!prefs.num || endsWith(acc.tricolorID, prefs.num))){
			AnyBalance.trace('Выбрано оборудование № ' + acc.tricolorID);
			curAcc = acc;
		}
	}

	if(!curAcc)
		throw new AnyBalance.Error('Не удалось найти оборудование с последними цифрами ' + prefs.num);
	
	var tricolorId = curAcc.tricolorID;

    if (prefs.num && curAcc) {
		AnyBalance.trace('Переключаемся на оборудование № ' + tricolorId);
	    var html = AnyBalance.requestPost(baseurl + 'selfcare-api/v1/auth/token', JSON.stringify({
            grant_type: 'refresh_token',
            refresh_token: refreshToken
        }), AB.addHeaders({
	    	'Accept': 'application/json, text/plain, */*',
			'Authorization': 'Bearer ' + accessToken,
			'Content-Type': 'application/json',
	    	'Origin': 'https://lk.tricolor.ru',
            'Referer': 'https://lk.tricolor.ru/',
	    }));

        var json = AB.getJson(html);
        if (!json.access_token) {
        	AnyBalance.trace(html);
        	throw new AnyBalance.Error('Не удалось получить новый токен доступа. Сайт изменен?');
        }

        var accessToken = json.access_token;
	    var refreshToken = json.refresh_token;
		
		var html = AnyBalance.requestPost(baseurl + 'selfcare-api/v1/united/changeAccount', JSON.stringify({
            newTricolorId: tricolorId
        }), AB.addHeaders({
	    	'Accept': 'application/json, text/plain, */*',
			'Authorization': 'Bearer ' + accessToken,
			'Content-Type': 'application/json',
	    	'Origin': 'https://lk.tricolor.ru',
            'Referer': 'https://lk.tricolor.ru/',
	    }));

        var json = AB.getJson(html);
        if (!json.access_token) {
        	AnyBalance.trace(html);
        	throw new AnyBalance.Error('Не удалось переключиться на оборудование № ' + tricolorId + '. Сайт изменен?');
        }

        var accessToken = json.access_token;
	    var refreshToken = json.refresh_token;
	}

	var result = {success: true};
	
	var html = AnyBalance.requestGet(baseurl + 'selfcare-api/v1/billing/balance', AB.addHeaders({
		'Accept': 'application/json, text/plain, */*',
		'Authorization': 'Bearer ' + accessToken,
		'Content-Type': 'application/json',
	  	'Origin': 'https://lk.tricolor.ru',
        'Referer': 'https://lk.tricolor.ru/',
	}));
	
	AnyBalance.trace('Баланс: ' + html);
	
	json = AB.getJson(html);
	
	AB.getParam(json.balance, result, 'balance', null, null, parseBalance);
	
	var html = AnyBalance.requestGet(baseurl + 'selfcare-api/v1/user/profile/registrationInfo', AB.addHeaders({
		'Accept': 'application/json, text/plain, */*',
		'Authorization': 'Bearer ' + accessToken,
		'Content-Type': 'application/json',
	  	'Origin': 'https://lk.tricolor.ru',
        'Referer': 'https://lk.tricolor.ru/',
	}));
	
	AnyBalance.trace('Информация по оборудованию: ' + html);
	
	json = AB.getJson(html);

    AB.getParam(json.smartCardId, result, '__tariff');
	AB.getParam(json.agreementNumber, result, 'agreement');
	AB.getParam(json.agreementDate.replace(/(\d{4})-(\d\d)-(\d\d)/,'$3.$2.$1'), result, 'agreementdate', null, null, parseDate);
    AB.getParam(json.agreementState, result, 'agreementstate');
	AB.getParam(json.smartCardId, result, 'device');
	AB.getParam(json.data.modelName, result, 'model');
	AB.getParam(json.data.installationAddress.fullText, result, 'address');
	var fio = json.data.firstName;
	if (json.data.thirdName)
	   	fio += ' ' + json.data.thirdName;
	if (json.data.secondName)
	   	fio += ' ' + json.data.secondName;
	AB.getParam(fio, result, 'fio');
	AB.getParam(json.data.mobilePhone, result, 'phone', null, replaceNumber);

    var html = AnyBalance.requestGet(baseurl + 'selfcare-api/v1/billing/services?all=false&withBackground=false', AB.addHeaders({
		'Accept': 'application/json, text/plain, */*',
		'Authorization': 'Bearer ' + accessToken,
		'Content-Type': 'application/json',
	  	'Origin': 'https://lk.tricolor.ru',
        'Referer': 'https://lk.tricolor.ru/',
	}));
	
	AnyBalance.trace('Информация по услугам: ' + html);
	
	json = AB.getJson(html);
	
	if(json.length < 1) {
		AnyBalance.trace('Нет подключенных услуг');
    }else{
		AnyBalance.trace('Найдено подключенных услуг: ' + json.length);
//		AB.getParam(json[0].tariffs[0].description, result, '__tariff');

        var n = 1;
        var services = [];
        for(var i=0; json && i<json.length; ++i){
        	var si = json[i];
        	var name = si.name;
        	if(si.status != 'active'){
        		AnyBalance.trace('Услуга ' + name + ' неактивна. Пропускаем...');
        		continue;
        	}

            services.push(si.serviceId);
            AB.getParam(name, result, 'service' + n);
	    	AB.getParam('' + si.subscriptionInfo.endDate.replace(/(\d{4})-(\d\d)-(\d\d)/,'$3.$2.$1'), result, 'tilldate' + n, null, null, parseDate);
            AB.getParam('' + si.subscriptionInfo.remainingDays, result, 'daysleft' + n, null, null, parseBalance);
        	++n;
        }
	}

    AnyBalance.setResult(result);
}