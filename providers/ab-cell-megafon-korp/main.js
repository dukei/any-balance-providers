/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36',
};

function getRegions() {
	var html = AnyBalance.requestGet('https://lk.megafon.ru/b2blinks/', g_headers);
	
	var regions = sumParam(html, null, null, /data-value="[^"]+(?:[^>]*>){3}[^<]+/ig)
	
	AnyBalance.trace('Регионов: ' + regions.length);
	
	var values='';
	var entries='';
	for(var i= 0; i < regions.length; i++) {
		var curr = regions[i];
		
		var val = getParam(curr, null, null, /data-value="([^"]+)/i, replaceTagsAndSpaces);
		var name = getParam(curr, null, null, />([^<]+)$/i, replaceTagsAndSpaces);
		
		if(!val || !name)
			throw new AnyBalance.Error('Ошибка при поиске регионов!');
		
		values += val + '|';
		entries += name + '|';
	}
	
	
	AnyBalance.trace('values: ' + values);
	AnyBalance.trace('entries: ' + entries);
	
}

var g_conversion = {
	kavkaz: 'https://kvk-b2blk.megafon.ru/'
};

function main() {
    var prefs = AnyBalance.getPreferences();

    AB.checkEmpty(prefs.login, 'Введите логин!');
    AB.checkEmpty(prefs.password, 'Введите пароль!');

    AnyBalance.setDefaultCharset('utf-8');
    var region = prefs.region || 'center';
    var baseurl = g_conversion[region] || ('https://' + (prefs.region || 'center') + '.b2blk.megafon.ru/');

    AnyBalance.trace('Регион: ' + baseurl);

    var html = AnyBalance.requestGet(baseurl + 'sc_cp_apps/login', g_headers);

    if(!html || AnyBalance.getLastStatusCode() > 400){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    html = AnyBalance.requestPost(baseurl + 'sc_cp_apps/loginProcess', {
        j_username: prefs.login,
        j_password: prefs.password,
    }, AB.addHeaders({
    	Referer: baseurl + 'sc_cp_apps/login',
    	'X-Requested-With': 'XMLHttpRequest',
    	Accept: 'application/json, text/javascript, */*; q=0.01',
    }));

    var json = getJson(html);
    if(!json.redirect || /error/i.test(json.redirect)){
    	if(json.redirect)
    		html = AnyBalance.requestGet(joinUrl(baseurl, json.redirect), AB.addHeaders({
    			Referer: baseurl + 'sc_cp_apps/login',
		    }));

    	var error = getElement(html, /<[^>]+error-text/i, replaceTagsAndSpaces);
        if (error)
            throw new AnyBalance.Error(error, null, /парол/i.test(error));

        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var tries = 1, maxTries = 10;
    do{
	    var ok = AnyBalance.requestGet(baseurl + 'sc_cp_apps/isUserDataCached', AB.addHeaders({
    		Referer: baseurl + 'sc_cp_apps/login',
    		'X-Requested-With': 'XMLHttpRequest',
	    }));
	    ok = getJson(ok);

	    if(ok === true || ok.status == 'USER_CACHED'){
	        AnyBalance.trace('Информация обновлена');
	    	break;
	    }

	    if(tries == 1){
    		AnyBalance.trace('Обновляем информацию...');
	        AnyBalance.requestPost(baseurl + 'sc_cp_apps/cacheUserData', '', AB.addHeaders({
    			Referer: baseurl + 'sc_cp_apps/login',
    			'X-Requested-With': 'XMLHttpRequest',
	        }));
	    }

	    if(++tries > maxTries)
	    	throw new AnyBalance.Error('Информация не может быть обновлена. Сайт изменен?');

	    AnyBalance.trace('Проверяем ещё раз, не обновлена ли информация (' + tries + '/' + maxTries + ')');
	    AnyBalance.sleep(2000);
    }while(true);

    html = AnyBalance.requestGet(joinUrl(baseurl, json.redirect), AB.addHeaders({
    	Referer: baseurl + 'sc_cp_apps/login',
    }));

    if(!/logout/i.test(html)){
    	var error = getElement(html, /<[^>]+error-text/i, replaceTagsAndSpaces);
    	if(error)
    		throw new AnyBalance.Error(error);
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не удалось получить счета после авторизации. Сайт изменен?');
    }

    var result = {success: true};

    AB.getParam(html, result, 'balance', /<dt[^>]*>\s*Текущий баланс[\s\S]*?class="money[^>]*>([\s\S]*?)<span/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'abonCount', /<dt[^>]*>\s*Абонентов[\s\S]*?class="span28[^>]*>([^<]+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    
    if (AB.isAvailable('unpaids')) {
        var elemUnpaids = AB.getElement(html, /<div\s[^>]*\bunpaidBillsCount\b/);
        if (elemUnpaids) {
            elemUnpaids = AB.getElement(elemUnpaids, /<span[^>]+class="[^"']*?\bmoney/, AB.replaceTagsAndSpaces, AB.parseBalance);
            AB.getParam(elemUnpaids, result, 'unpaids');
        }
    }

    html = AnyBalance.requestGet(baseurl + 'sc_cp_apps/subscriber/mobile/list?from=0&size=' + 128, AB.addHeaders({'X-Requested-With':'XMLHttpRequest'}));

    try {
        var json = AB.getJson(html);

        var account;
        for(var i = 0; i < json.mobile.length; i++) {
            var curr = json.mobile[i];
            if(!prefs.phone) {
                account = curr;
                AnyBalance.trace('Номер в настройках не задан, возьмем первый: ' + curr.msisdn);
                break;				
            }

            if(AB.endsWith(curr.msisdn, prefs.phone)) {
                account = curr;
                AnyBalance.trace('Нашли нужный номер: ' + curr.msisdn);
                break;
            }
        }

        if(!account) {
            AnyBalance.trace(JSON.stringify(json));
            throw new AnyBalance.Error('Не удалось найти ' + (prefs.phone ? 'номер телефона с последними цифрами ' + prefs.phone : 'ни одного номера телефона!'));
        }

        AnyBalance.trace('Успешно получили данные по номеру: ' + curr.msisdn);
        AnyBalance.trace(JSON.stringify(account));

        AB.getParam(account.msisdn, result, 'phone_name', null, AB.replaceTagsAndSpaces);
        AB.getParam(account.account.name, result, 'name_name', null, AB.replaceTagsAndSpaces);

        if(AnyBalance.isAvailable('min_left', 'sms_left')){
            getDiscounts(baseurl, account, result);
        }

        function getDLValue(html, name, title) {
            if (AnyBalance.isAvailable(name)) {
                var elem = AB.getElement(html, RegExp('<dl[^>]*>(?=\s*<dt[^>]*>\s*' + title.replace(/\s/g, ' ') + '\s*</dt\s*>)', 'i'));
                elem = AB.getElement(elem, /<span[^>]+class="[^"]*money[^"]*"[^>]*>/i);
                AB.getParam(elem, result, name, null, AB.replaceTagsAndSpaces, AB.parseBalance);
            }
        }

        if (AnyBalance.isAvailable('amountTotal', 'amountLocal', 'abon', 'charges')) {
            var htmlExp = AnyBalance.requestGet(baseurl + 'sc_cp_apps/subscriber/finances/' + account.id, g_headers);
            getDLValue(htmlExp, 'amountTotal', 'Расходы с начала периода');
            getDLValue(htmlExp, 'amountLocal', 'Трафик');
            getDLValue(htmlExp, 'abon', 'Абонентская плата');
            getDLValue(htmlExp, 'charges', 'Разовые начисления');
        }

        if(AnyBalance.isAvailable('prsnl_balance')){
            var htmlBudget = AnyBalance.requestGet(baseurl + 'sc_cp_apps/subscriber/budget/' + account.id, g_headers);
            getDLValue(htmlBudget, 'prsnl_balance', 'Баланс');
        }
    } catch (e) {
        AnyBalance.trace(e.message);
        AnyBalance.trace('Не удалось получить данные по номеру телефона, свяжитесь, пожалуйста, с разработчиками.');
    }

    AnyBalance.setResult(result);
}

function getDiscounts(baseurl, account, result){
    var html = AnyBalance.requestGet(baseurl + 'sc_cp_apps/subscriber/info/' + account.id + '/discounts', addHeaders({'X-Requested-With':'XMLHttpRequest'}));
    if(!/^\s*\{/i.test(html)){
        if(/Сервис временно недоступен/i.test(html)){
            AnyBalance.trace('Не удаётся получить дискаунты для этого номера: сервис временно недоступен');
            return;
        }

        AnyBalance.trace('Не удаётся получить дискаунты для этого номера: ' + html);
        return;
    }

    AnyBalance.trace('Найдены дискаунты: ' + html);
    json = getJson(html);
    for (var discgroup in json.discounts) {
        var group = json.discounts[discgroup];
        if(!group || !AB.isArray(group)) continue;

        for(var i=0; i<group.length; ++i){
            var d = group[i];
            AnyBalance.trace('Найдена скидка: ' + d.name + ' ' + d.volume + ' ' + d.measure);
            if(/мин/i.test(d.measure)){
                AnyBalance.trace('Это минуты');
                AB.sumParam(d.volume, result, 'min_left', null, null, null, AB.aggregate_sum);
            }else if(/шт|смс|sms/i.test(d.measure)){
                AnyBalance.trace('Это смс');
                AB.sumParam(d.volume, result, 'sms_left', null, null, null, AB.aggregate_sum);
            }else{
                AnyBalance.trace('неизвестная скидка: ' + JSON.stringify(d));
            }
        }
    }

}