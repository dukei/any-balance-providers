/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://my.yota.ru:443/selfcare/";

	checkEmpty(prefs.login, 'Пожалуйста, введите логин в личный кабинет Yota!');
	checkEmpty(prefs.password, 'Пожалуйста, введите пароль!');
	
    var html, login, old_token;
    if(!prefs.__dbg){
        if(/@/.test(prefs.login)){
            AnyBalance.trace("Пытаемся войти по e-mail");
            html = AnyBalance.requestPost(baseurl + 'login/getUidByMail', {value: prefs.login});
            login = getParam(html, null, null, /^ok\|(.*)/i, replaceTagsAndSpaces);
            if(!login)
                throw new AnyBalance.Error('Данный емейл (' + prefs.login + ') не зарегистрирован в Yota.');
            AnyBalance.trace("Определили лицевой счет: " + login);
            old_token = prefs.login;
        }else if(prefs.login.replace(/\D/gi, "").length > 10){
            AnyBalance.trace("Пытаемся войти по номеру телефона");
            html = AnyBalance.requestPost(baseurl + 'login/getUidByPhone', {value: prefs.login.replace(/\D/gi, "")});
            login = getParam(html, null, null, /^ok\|(.*)/i, replaceTagsAndSpaces);
            if(!login)
                throw new AnyBalance.Error('Данный телефон (' + prefs.login + ') не зарегистрирован в Yota.');
            AnyBalance.trace("Определили лицевой счет: " + login);
            old_token = prefs.login;
        } else {
            AnyBalance.trace("Пытаемся войти по лицевому счету.");
            login = prefs.login;
        }
        
        html = AnyBalance.requestPost('https://login.yota.ru/UI/Login', {
            'goto':baseurl + 'loginSuccess',
            gotoOnFail:baseurl + 'loginError',
            org:'customer',
            'old-token':old_token,
            IDToken2:prefs.password,
            IDToken1:login
        });
    } else {
        html = AnyBalance.requestGet(baseurl + 'devices');
    }
	var lastUrl = AnyBalance.getLastUrl();
	
    if(!/\/selfcare\/logout/.test(html)){
        var error = getParam(html, null, null, /id="site-fastclick"[^>]*>([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, html_entity_decode);
        if(!error)
            error = getParam(html, null, null, /id="selfcare-not-available"[^>]*>([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
		if(/404 not found/i.test(html) || /error-site-fastclick/i.test(lastUrl))
			throw new AnyBalance.Error("В данный момент превышено допустимое количество подключений к серверу. Попробуйте обновить данные позже.");
		
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Неверный логин-пароль?');
    }

    var result = {success: true};
	
	if(/corp\./i.test(lastUrl)) {
		AnyBalance.trace('Это корпоративный кабинет.');
		html = AnyBalance.requestGet('https://corp.yota.ru/selfcare/devices');
		
		getParam(html, result, 'balance', /"account-money"[^>]*>([^{]*?)<\/dd>/i, replaceTagsAndSpaces, parseBalance);
		sumParam(html, result, '__tariff', /<h3[^>]+class="[^"]*device-title[^"]*"[^>]*>([\S\s]*?)<\/h3>/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
		
		if(AnyBalance.isAvailable('licschet', 'agreement', 'fio', 'email', 'phone')){
			html = AnyBalance.requestGet('https://corp.yota.ru/selfcare/profile');
			getParam(html, result, 'licschet', /(?:Номер лицевого сч(?:e|ё)та|Personal Account Number)(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
			getParam(html, result, 'phone', /(?:Телефон|Mobile Phone Number)(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
			getParam("Корпоративный", result, 'agreement');
			getParam(html, result, 'fio', /(?:Компания|Company)(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
			getParam(html, result, 'email', /(?:Эл\. почта|E-mail)(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		}
		
		AnyBalance.setResult(result);
	} else {
		AnyBalance.trace('Похоже на кабинет для физических лиц.');
		if(!/<span[^>]*>Yota 4G<\/span>/i.test(html)) {
			AnyBalance.trace('Открылась не страница по устройству. Надо открыть нужную страницу. Страница: ' + lastUrl);
			html = AnyBalance.requestGet(baseurl + 'devices');
		}

		var devices = sumParam(html, null, null, /<form[^>]+class="tariff-choice-form"[^>]*>([\s\S]*?)<\/form>/ig);
		if(devices.length > 0){
			var idx = 0, n = 0;
			var devrefs = (prefs.devices || '*,*,*,*,*').split(/\s*,\s*/g);
			for(var i=0; i<devrefs.length; ++i){
				var device = null;
				if(devrefs[i] == '*'){
					if(idx >= devices.length){
						AnyBalance.trace("All the devices are listed, breaking...");
						break;
					}else{
						device = devices[idx++];
					}
				}else{
					for(var j=0; j<devices.length; ++j){
						var icc = getParam(devices[j], null, null, /ICCID:([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
						if(!icc){
							AnyBalance.trace("Can not find device ICCID: " + devices[j]);
							continue;
						}
						if(endsWith(icc, devrefs[i])){
							device = devices[j];
							break;
						}
					}

					if(!device){
							AnyBalance.trace("Could not find device ending with " + devrefs[i]);
							++n;
							continue;
					}
					AnyBalance.trace("Found device ICCID:" + icc + ', ends with ' + devrefs[i]);
				}

				var suffix = n==0 ? '' : '' + n;
				++n;
				getParam(device, result, 'abon' + suffix, /<div[^>]+class="cost"[^>]*>([^{]*?)<\/div>/ig, replaceTagsAndSpaces, parseBalance);
				getParam(device, result, 'speed' + suffix, /<div[^>]+class="speed"[^>]*>([^{]*?)<\/div>/ig, replaceTagsAndSpaces, html_entity_decode);
				sumParam(device, result, '__tariff', /<h3[^>]+class="device-title"[^>]*>([\S\s]*?)<\/h3>/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
				getParam(device, result, 'timeleft' + suffix, /<div[^>]+class="time[^"]*"[^>]*>([\S\s]*?)<\/div>/ig, replaceTagsAndSpaces, parseTimeInterval);
			}
		}

		getParam(html, result, 'balance', /<dd[^>]+id="balance-holder"[^>]*>([^{]*?)<\/dd>/i, replaceTagsAndSpaces, parseBalance);
		if(AnyBalance.isAvailable('licschet', 'agreement', 'fio', 'email', 'phone')){
			html = AnyBalance.requestGet(baseurl + 'profile');
			getParam(html, result, 'licschet', /(?:Номер лицевого счета|Personal Account Number)[\S\s]*?<div[^>]+class="value"[^>]*>([\S\s]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
			getParam(html, result, 'agreement', /(?:Тип договора|Contract Type)[\S\s]*?<div[^>]+class="value"[^>]*>([\S\s]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
			getParam(html, result, 'fio', /(?:Фамилия Имя|>Name<)[\S\s]*?<div[^>]+class="value"[^>]*>([\S\s]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
			getParam(html, result, 'email', /E-mail[\S\s]*?<div[^>]+class="value"[^>]*>([\S\s]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
			getParam(html, result, 'phone', /(?:Мобильный телефон|Mobile Phone Number)[\S\s]*?<div[^>]+class="value"[^>]*>([\S\s]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		}
		
		AnyBalance.setResult(result);		
	}
}

function parseTimeInterval(str){
    var val = parseBalance(str);
    if(!isset(val))
        return;
    var units = getParam(str, null, null, /\d+\s*(.)/);
    switch(units){
        case 'Д':
        case 'д':
            val*=86400;
            break;
        case 'ч':
        case 'Ч':
            val*=3600;
            break;
        case 'м':
        case 'М':
            val*=60;
            break;
	default:
            AnyBalance.trace('Не удалось выяснить единицы изменения для интервала ' + str);
            return;
    }
    AnyBalance.trace('Получили ' + val + ' сек из ' + str);
    return val;
}