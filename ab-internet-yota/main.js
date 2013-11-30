/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для интернет-провайдера LTE Yota

Сайт оператора: http://www.yota.ru/ru/
Личный кабинет: https://my.yota.ru/
*/

function aggregateToBalances(vals, result, name){
    for(var i=0; i<vals.length; ++i){
        var thisname = name + (i ? i : '');
        if(AnyBalance.isAvailable(thisname))
            result[thisname] = vals[i];
    }
}

function createBalancesAggregate(result, name) { 
	return function(vals) {
		aggregateToBalances(vals, result, name) 
	}
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://my.yota.ru/selfcare/";

	checkEmpty(prefs.login, 'Пожалуйста, введите логин в личный кабинет Yota!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
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
            IDToken3:prefs.password,
            IDToken2:prefs.password,
            IDToken1:login
        });
    } else {
        html = AnyBalance.requestGet(baseurl + 'devices');
    }
	
    if(!/\/selfcare\/logout/.test(html)){
        var error = getParam(html, null, null, /id="site-fastclick"[^>]*>([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, html_entity_decode);
        if(!error)
            error = getParam(html, null, null, /id="selfcare-not-available"[^>]*>([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
		if(!/404 not found/.test(html))
			throw new AnyBalance.Error("В данный момент превышено допустимое количество подключений к серверу. Попробуйте обновить данные позже.");
		
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Неверный логин-пароль?');
    }

    var result = {success: true};

	var lastUrl = AnyBalance.getLastUrl();
	
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

		getParam(html, result, 'balance', /<dd[^>]+id="balance-holder"[^>]*>([^{]*?)<\/dd>/i, replaceTagsAndSpaces, parseBalance);
		sumParam(html, null, null, /<div[^>]+class="cost"[^>]*>([^{]*?)<\/div>/ig, replaceTagsAndSpaces, parseBalance, createBalancesAggregate(result, 'abon'));
		sumParam(html, null, null, /<div[^>]+class="speed"[^>]*>([^{]*?)<\/div>/ig, replaceTagsAndSpaces, html_entity_decode, createBalancesAggregate(result, 'speed'));
		sumParam(html, result, '__tariff', /<h3[^>]+class="device-title"[^>]*>([\S\s]*?)<\/h3>/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
		sumParam(html, null, null, /<div[^>]+class="time[^"]*"[^>]*>([\S\s]*?)<\/div>/ig, replaceTagsAndSpaces, parseTimeInterval, createBalancesAggregate(result, 'timeleft'));

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