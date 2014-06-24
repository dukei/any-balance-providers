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

function getStateParams(html, param) {
	return getParam(html, null, null, new RegExp(param + "[^>]*value=['\"]([^'\"]+)", 'i'));
}

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://issa.life.com.by/';
	var baseurlOld = 'https://issa2.life.com.by/';
	
	checkEmpty(prefs.login, 'Введите номер телефона!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var main = 'ru/';
	var html = AnyBalance.requestGet(baseurl + main, g_headers);
	
    var matches = prefs.login.match(/^(\d{2})(\d{7})$/);
    if(!matches)
        throw new AnyBalance.Error('Пожалуйста, введите 9 последних цифр номера телефона (без префикса +375) без пробелов и разделителей.');
        
    html = AnyBalance.requestPost(baseurl + main, {
		csrfmiddlewaretoken:getStateParams(html, 'csrfmiddlewaretoken'),
		msisdn_code:matches[1],
		msisdn:matches[2],
		super_password:prefs.password,
		form:true,
		next:'/ru/'
	}, addHeaders({Referer: baseurl + main}));
	
	// Иногда после логина висит 500ая ошибка, при переходе на главную все начинает работать
	if(/Ошибка 500/i.test(html)) {
		AnyBalance.trace('Ошибка при логине... попробуем исправить...');
		html = AnyBalance.requestGet(baseurl + main + 'informaciya/abonent/', g_headers);
	}
	
    if(!/log-out/i.test(html)){
		if(/action\s*=\s*["']https:\/\/issa2\.life\.com\.by/i.test(html)) {
			AnyBalance.trace('Этот номер не поддерживается в новом кабинете, нас редиректит на старый адрес...');
			doOldCabinet(prefs, matches);
			return;
		}
        var error = getParam(html, null, null, /<div class="validation-summary-errors errorMessage">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
			
        throw new AnyBalance.Error("Не удалось зайти в личный кабинет. Сайт изменен?");
    }
	
    var result = {success: true, balance: null};
	
	getParam(html, result, '__tariff', [/Тарифный план([^<]+)/i, /Наименование тарифного плана(?:[^>]*>){2}([\s\S]*?)<\/td>/i], replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'fio', /ФИО(?:[^>]+>){2}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'phone', /Номер life(?:[^>]+>){2}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	// СМС/ММС
	sumParam(html, result, 'sms_left_other', /SMS на все сети(?:[^>]+>){2}([^<]+)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	sumParam(html, result, 'sms_left', /SMS внутри сети(?:[^>]+>){2}([^<]+)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	sumParam(html, result, 'mms_left', /MMS внутри сети(?:[^>]+>){2}([^<]+)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	// Минуты
	sumParam(html, result, 'min_left_other', /Звонки (?:на|во) (?:все|другие) сети(?:[^>]+>){2}([^<]+)/ig, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
    sumParam(html, result, 'min_left', /Звонки внутри сети(?:[^>]+>){2}([^<]+)/ig, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
	// Трафик
	sumParam(html, result, 'traffic_night_left', />\s*Ночной интернет(?:[^>]+>){2}([^<]+МБ)/ig, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
	sumParam(html, result, 'traffic_left', />\s*Интернет(?:[^>]+>){2}([^<]+МБ)/ig, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
	// Баланс
	getParam(html, result, 'balance', /Основной баланс:([^<]+)\s*<\/li>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balance_bonus', /Бонусный баланс:([^<]+)\s*<\/li>/i, replaceTagsAndSpaces, parseBalance);
	// Оплаченные обязательства	
	getParam(html, result, 'balance_corent', /Оплаченные обязательства(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	// Карманы
	getParam(html, result, 'carmani_min_left', /(?:&#34;|")карманы(?:&#34;|")(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	
	html = AnyBalance.requestGet(baseurl + 'ru/upravleniye-kontraktom/smena-tarifnogo-plana/', g_headers);
	getParam(html, result, '__tariff', /href="[^"]*">([^<]+)(?:[^>]*>){11}Активен/i, replaceTagsAndSpaces, html_entity_decode);
	
	// В новом кабинете нет баланса, очень круто :)
	/*if (AnyBalance.isAvailable('balance', 'balance_bonus') && (!isset(result.balance) || !isset(result.balance_bonus))) {
	    html = AnyBalance.requestPost(baseurlOld, {
			Code: matches[1],
			Phone: matches[2],
			password: prefs.password
		}, g_headers);
		
		if(!/\/Account.aspx\/Logoff/i.test(html)){
			var error = getParam(html, null, null, /<div class="validation-summary-errors errorMessage">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
			if(error)
				throw new AnyBalance.Error(error);
			throw new AnyBalance.Error("Не удалось зайти в личный кабинет. Сайт изменен?");
		}
		getParam(html, result, 'balance', /Текущий основной баланс:[\s\S]*?<div[^>]*>\s*(-?\d[\d\., \s]*)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'balance_bonus', /Текущий бонусный баланс:[\s\S]*?<div[^>]*>\s*(-?\d[\d\., \s]*)/i, replaceTagsAndSpaces, parseBalance);
	}*/

    AnyBalance.setResult(result);
}

function doOldCabinet(prefs, matches){
	var baseurl = 'https://issa2.life.com.by/';
	
	AnyBalance.trace('Получаем информацию из ' + baseurl);
	
    html = AnyBalance.requestPost(baseurl, {
        Code: matches[1],
        Phone: matches[2],
        password: prefs.password
    }, g_headers);
    
    if(!/\/Account.aspx\/Logoff/i.test(html)){
        var error = getParam(html, null, null, /<div class="validation-summary-errors errorMessage">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error("Не удалось зайти в личный кабинет. Сайт изменен?");
    }

    var result = {success: true};
	
    getParam(html, result, '__tariff', /Тарифный план:[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Текущий основной баланс:[\s\S]*?<div[^>]*>\s*(-?\d[\d\., \s]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'balance_bonus', /Текущий бонусный баланс:[\s\S]*?<div[^>]*>\s*(-?\d[\d\., \s]*)/i, replaceTagsAndSpaces, parseBalance);

    if (isAvailable(['traffic_left', 'min_left_other', 'min_left', 'traffic_night_left', 'sms_left', 'mms_left'])) {
    	html = AnyBalance.requestGet(baseurl + 'User.aspx/Index');
    	var table = getParam(html, null, null, /Остаток пакетов:[\s\S]*<table[^>]+class="longinfo"[^>]*>([\s\S]*?)<\/table>/i);
    	if (table) {
    		sumParam(html, result, 'traffic_left', /<tr[^>]*>\s*<td[^>]*>(?:[\s\S](?!<tr|НОЧНОЙ))*?<td[^>]*>((?:[\s\S](?!<tr))*?(?:[мmkкгg][бb]|байт|byte)[^<]*)<\/td>\s*<td[^>]*>/ig, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
    		sumParam(html, result, 'min_left_other', /<tr[^>]*>\s*<td[^>]*>(?:[\s\S](?!<tr))*?другие сети(?:[\s\S](?!<tr))*?<td[^>]*>((?:[\s\S](?!<tr))*?(?:мин|min)[^<]*)<\/td>\s*<td[^>]*>/ig, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
    		sumParam(html, result, 'min_left', /<tr[^>]*>\s*<td[^>]*>(?:[\s\S](?!<tr|другие сети))*?<td[^>]*>((?:[\s\S](?!<tr))*?(?:мин|min)[^<]*)<\/td>\s*<td[^>]*>/ig, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
    		sumParam(html, result, 'traffic_night_left', /<tr[^>]*>\s*<td[^>]*>(?:[\s\S](?!<tr))*?НОЧНОЙ(?:[\s\S](?!<tr))*?<td[^>]*>((?:[\s\S](?!<tr))*?(?:[мmkкгg][бb]|байт|byte)[^<]*)<\/td>\s*<td[^>]*>/ig, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
    		sumParam(html, result, 'sms_left', /<td[^>]*>(?:[\s\S](?!<tr))*?<td[^>]*>((?:[\s\S](?!<tr))*?(?:СМС|sms)[^<]*)<\/td>\s*<td[^>]*>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    		sumParam(html, result, 'mms_left', /<td[^>]*>(?:[\s\S](?!<tr))*?<td[^>]*>((?:[\s\S](?!<tr))*?(?:ММС|mms)[^<]*)<\/td>\s*<td[^>]*>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    	} else {
    		AnyBalance.trace('Информация по пакетам не найдена.');
    	}
    }
    AnyBalance.setResult(result);
}