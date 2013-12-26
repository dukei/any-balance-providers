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
	
	var main = 'ru/login/?next=/ru/';
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
    
    if(!/log-out/i.test(html)){
        var error = getParam(html, null, null, /<div class="validation-summary-errors errorMessage">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error("Не удалось зайти в личный кабинет. Сайт изменен?");
    }

    var result = {success: true};
	
	getParam(html, result, '__tariff', /Тарифный план([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'fio', /ФИО(?:[^>]+>){2}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'phone', /Номер life(?:[^>]+>){2}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);

	sumParam(html, result, 'sms_left', /SMS внутри сети(?:[^>]+>){2}([^<]+)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	sumParam(html, result, 'mms_left', /MMS внутри сети(?:[^>]+>){2}([^<]+)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	sumParam(html, result, 'min_left_other', /Звонки на другие сети(?:[^>]+>){2}([^<]+)/ig, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
    sumParam(html, result, 'min_left', /Звонки внутри сети(?:[^>]+>){2}([^<]+)/ig, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
	sumParam(html, result, 'traffic_left', /Интернет(?:[^>]+>){2}([^<]+)/ig, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
	//sumParam(html, result, 'traffic_night_left', /<tr[^>]*>\s*<td[^>]*>(?:[\s\S](?!<tr))*?НОЧНОЙ(?:[\s\S](?!<tr))*?<td[^>]*>((?:[\s\S](?!<tr))*?(?:[мmkкгg][бb]|байт|byte)[^<]*)<\/td>\s*<td[^>]*>/ig, replaceTagsAndSpaces, parseTraffic, aggregate_sum);	
	// В новом кабинете нет баланса, очень круто :)
	if (AnyBalance.isAvailable('balance', 'balance_bonus')) {
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
	}

    AnyBalance.setResult(result);
}