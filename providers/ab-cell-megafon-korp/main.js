﻿/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
var g_headers = {
	'Accept': 'application/json, text/javascript, */*; q=0.01',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36',
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

    checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(prefs.password, 'Введите пароль!');

    AnyBalance.setDefaultCharset('utf-8');
    var region = prefs.region || 'center';
    var baseurl = g_conversion[region] || ('https://' + (prefs.region || 'center') + '.b2blk.megafon.ru/');

    AnyBalance.trace('Регион: ' + baseurl);

    var html = AnyBalance.requestGet(baseurl + 'b2b/login', g_headers);

    if(!html || AnyBalance.getLastStatusCode() > 400){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    g_headers.Referer = baseurl + 'b2b/';

    html = AnyBalance.requestPost(baseurl + 'b2b/loginProcess', {
        j_username: prefs.login,
        j_password: prefs.password,
    }, addHeaders({
    	Referer: baseurl + 'b2b/login',
    	'X-Requested-With': 'XMLHttpRequest',
    	Accept: 'application/json, text/javascript, */*; q=0.01',
    }));

    var json = getJson(html);
    if(!json.redirect || /error/i.test(json.redirect)){
    	if(json.redirect){
    		html = AnyBalance.requestGet(joinUrl(baseurl, json.redirect), addHeaders({
    			Referer: baseurl + 'b2b/login',
		    }));
		    try{ json = getJson(html) }catch(e){}
		}

    	var error = (json && json.errorMessage) || getElement(html, /<[^>]+error-text/i, replaceTagsAndSpaces);
        if (error)
            throw new AnyBalance.Error(error, null, /парол/i.test(error));

        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var tries = 1, maxTries = 10;
    do{
	    var ok = AnyBalance.requestGet(baseurl + 'b2b/isUserDataCached', addHeaders({
    		Referer: baseurl + 'b2b/login',
    		'X-Requested-With': 'XMLHttpRequest',
            Accept: 'application/json, text/javascript, */*; q=0.01',
	    }));
	    ok = getJson(ok);

	    if(ok === true || ok.status == 'USER_CACHED'){
	        AnyBalance.trace('Информация обновлена');
	    	break;
	    }

	    if(tries == 1){
    		AnyBalance.trace('Обновляем информацию...');
	        AnyBalance.requestPost(baseurl + 'b2b/cacheUserData', '', addHeaders({
    			Referer: baseurl + 'b2b/login',
    			'X-Requested-With': 'XMLHttpRequest',
	        }));
	    }

	    if(++tries > maxTries)
	    	throw new AnyBalance.Error('Информация не может быть обновлена. Сайт изменен?');

	    AnyBalance.trace('Проверяем ещё раз, не обновлена ли информация (' + tries + '/' + maxTries + ')');
	    AnyBalance.sleep(2000);
    }while(true);

    html = AnyBalance.requestGet(joinUrl(baseurl, json.redirect), addHeaders({
    	Accept: 'text/html',
    	Referer: baseurl + 'b2b/login',
    }));

    if(!/logout/i.test(html)){
    	var error = getElement(html, /<[^>]+error-text/i, replaceTagsAndSpaces);
    	if(error)
    		throw new AnyBalance.Error(error);
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не удалось получить счета после авторизации. Сайт изменен?');
    }

    var result = {success: true};

    html = AnyBalance.requestGet(baseurl + 'b2b/subscriber/mobile', g_headers);

    html = AnyBalance.requestGet(baseurl + 'b2b/subscriber/mobile/list?from=0&size=' + 128 + '&_=' + (+new Date()), addHeaders({'X-Requested-With':'XMLHttpRequest', Referer: baseurl + 'b2b/subscriber/mobile'}));

    try {
        var json = getJson(html);

        var account;
        for(var i = 0; i < json.mobile.length; i++) {
            var curr = json.mobile[i];
            if(!prefs.phone) {
                account = curr;
                AnyBalance.trace('Номер в настройках не задан, возьмем первый: ' + curr.msisdn);
                break;
            }

            if(endsWith(curr.msisdn, prefs.phone)) {
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

        getParam(account.balance && account.balance.value, result, 'balance', null, null, parseBalance);
        getParam(account.ratePlan.def, result, '__tariff');
        getParam(account.account.number, result, 'licschet');
        getParam(account.msisdn, result, 'phone_name');
        getParam(account.account.name, result, 'name_name');

        if(AnyBalance.isAvailable('min_left', 'sms_left')){
            getDiscounts(baseurl, account, result);
        }

        function getDLValue(html, name, title) {
            if (AnyBalance.isAvailable(name)) {
                var elem = getElement(html, RegExp('<dl[^>]*>(?=\s*<dt[^>]*>\s*' + title.replace(/\s/g, ' ') + '\s*</dt\s*>)', 'i'));
                elem = getElement(elem, /<span[^>]+class="[^"]*money[^"]*"[^>]*>/i);
                getParam(elem, result, name, null, replaceTagsAndSpaces, parseBalance);
            }
        }

        if (AnyBalance.isAvailable('amountTotal', 'amountLocal', 'abon', 'charges')) {
            var htmlExp = AnyBalance.requestGet(baseurl + 'b2b/subscriber/finances/' + account.id, g_headers);
            getDLValue(htmlExp, 'amountTotal', 'Расходы с начала периода');
            getDLValue(htmlExp, 'amountLocal', 'Трафик');
            getDLValue(htmlExp, 'abon', 'Абонентская плата');
            getDLValue(htmlExp, 'charges', 'Разовые начисления');
        }

        if(AnyBalance.isAvailable('prsnl_balance')){
            var htmlBudget = AnyBalance.requestGet(baseurl + 'b2b/subscriber/budget/' + account.id, g_headers);
            getDLValue(htmlBudget, 'prsnl_balance', 'Баланс');
        }

        getAccount(baseurl, account.account.number, result);
    } catch (e) {
        AnyBalance.trace(e.message);
        AnyBalance.trace('Не удалось получить данные по номеру телефона, свяжитесь, пожалуйста, с разработчиками.');
    }

    AnyBalance.setResult(result);
}

function getDiscounts(baseurl, account, result){
    var html = AnyBalance.requestGet(baseurl + 'b2b/subscriber/info/' + account.id + '/discounts', addHeaders({'X-Requested-With':'XMLHttpRequest'}));
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
        if(!group || !isArray(group)) continue;

        for(var i=0; i<group.length; ++i){
            var d = group[i];
            AnyBalance.trace('Найдена скидка: ' + d.name + ' ' + d.volume + ' ' + d.measure);
            if(/мин/i.test(d.measure)){
                AnyBalance.trace('Это минуты');
                sumParam(d.volume, result, 'min_left', null, null, null, aggregate_sum);
            }else if(/Базовый sms/i.test(d.name)){
                AnyBalance.trace('Это смс на мегафон');
                sumParam(d.volume, result, 'sms_left_megafon', null, null, null, aggregate_sum);
            }else if(/шт|смс|sms/i.test(d.measure)){
                AnyBalance.trace('Это смс');
                sumParam(d.volume, result, 'sms_left', null, null, null, aggregate_sum);
            }else if(/[мгкmgk][бb]/i.test(d.measure)){
                AnyBalance.trace('Это интернет');
                sumParam(d.volume + d.measure, result, 'traffic_left', null, null, parseTraffic, aggregate_sum);
            }else{
                AnyBalance.trace('неизвестная скидка: ' + JSON.stringify(d));
            }
        }
    }

}

function getAccount(baseurl, accnum, result){
	var prefs = AnyBalance.getPreferences();
	AnyBalance.trace('Получаем информацию по лицевому счету ' + accnum + ', потому что он связан с запрошенным номером телефона');
	if(prefs.lsnum && !accnum.endsWith(prefs.lsnum))
		AnyBalance.trace('В настройках требуется неправильный лицевой счет! Игнорируем.');

	var html = AnyBalance.requestGet(baseurl + 'b2b/account', addHeaders({Accept: 'text/html'}));
    var acc;
    if(!/accountInfo/i.test(AnyBalance.getLastUrl())){
        html = AnyBalance.requestGet(baseurl + 'b2b/account/list?from=0&size=' + 128 + '&_=' + (+new Date()), addHeaders({'X-Requested-With':'XMLHttpRequest', Referer: baseurl + 'b2b/account'}));
        json = getJson(html);
        if(!json.account || !json.account.length){
        	AnyBalance.trace(html);
        	throw new AnyBalance.Error('Не удалось найти лицевые счета после успешного входа');
        }
        
        for(var i=0; i<json.account.length; ++i){
        	acc = json.account[i];
        	AnyBalance.trace('Найден лицевой счет ' + acc.contract);
        	if(!accnum || acc.contract.endsWith(accnum)){
        		getParam(acc.balance.value, result, 'balance');
			    getParam(acc.subsCount, result, 'abonCount');
			    break;
        	}
        }
        
        if(i >= json.account.length)
        	throw new AnyBalance.Error('Не удалось найти лицевой счет с последними цифрами ' + accnum);

        getParam(acc.contract, result, 'licschet');
    }else{
    	getParam(html, result, 'balance', /<dt[^>]*>\s*Текущий баланс[\s\S]*?class="money[^>]*>([\s\S]*?)<span/i, replaceTagsAndSpaces, parseBalance);
	    getParam(html, result, 'abonCount', /<dt[^>]*>\s*Абонентов[\s\S]*?class="span76[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	    getParam(html, result, 'licschet', /Лицевой счет\s*(\d+)/i, replaceTagsAndSpaces);
    }
    
    if (isAvailable('unpaids')) {
    	if(acc){
	        html = AnyBalance.requestGet(baseurl + 'b2b/account/accountInfo/' + acc.id, addHeaders({
    			Accept: 'text/html',
    			Referer: baseurl + 'b2b/',
	        }));
	    }

        var elemUnpaids = getElement(html, /<div\s[^>]*\bunpaidBillsCount\b/);
        if (elemUnpaids) {
            elemUnpaids = getElement(elemUnpaids, /<span[^>]+class="[^"']*?\bmoney/, replaceTagsAndSpaces, parseBalance);
            getParam(elemUnpaids, result, 'unpaids');
        }
    }


}
