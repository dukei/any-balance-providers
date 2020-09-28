/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
var g_headers = {
	'Accept': 'application/json, text/plain, */*; q=0.01',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.120 Safari/537.36',
};

function main() {
    var prefs = AnyBalance.getPreferences();

    checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(prefs.password, 'Введите пароль!');

    AnyBalance.setDefaultCharset('utf-8');
    var baseurl = 'https://b2blk.megafon.ru/';
    var baseurlApi = 'https://b2blk.megafon.ru/ws/v1.0/';

    var html = AnyBalance.requestGet(baseurl + 'login', g_headers);

    if(!html || AnyBalance.getLastStatusCode() > 400){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    g_headers.Referer = baseurl;

    html = AnyBalance.requestPost(baseurlApi + 'auth/process', {
    	captchaTime: +new Date(),
        username: prefs.login,
        password: prefs.password,
    }, addHeaders({
    	Referer: baseurl + 'login',
    	'X-Requested-With': 'XMLHttpRequest',
    }));

    var json = getJson(html);
    if(!json.data || json.error){
    	var error = json.error && json.error.code;
        if (error)
            throw new AnyBalance.Error(error, null, /password/i.test(error));

        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }


    if(json.data.isCaptchaShouldBeShown){
    	AnyBalance.trace('Мегафон потребовал рекапчу');

    	let ct = (+new Date());
    	var img = AnyBalance.requestGet(baseurl + 'captcha?' + ct, addHeaders({Referer: baseurl + 'login'}));

    	html = AnyBalance.requestPost(baseurlApi + 'auth/process', {
    		captchaTime: ct,
        	username: prefs.login,
        	password: prefs.password,
        	captcha: AnyBalance.retrieveCode('Пожалуйста, введите код с картинки', img)
    	}, addHeaders({
    		Referer: baseurl + 'login',
    		'X-Requested-With': 'XMLHttpRequest',
    	}));

    	json = getJson(html);
    }

    if(json.data.cached === false){
    	for(var i=0; i<20; ++i){
    		AnyBalance.requestGet(baseurlApi + 'user/cache/status', addHeaders({Referer: baseurl + 'login'}));
    		AnyBalance.trace("Ожидаем загрузку кэша: " + (i+1) + '/' + 20 + ': ' + AnyBalance.getLastStatusCode());
    		if(AnyBalance.getLastStatusCode() == 200)
    			break;
    		AnyBalance.sleep(3000);
    	}
    }

    html = AnyBalance.requestGet(baseurlApi + 'user/auth', addHeaders({Referer: baseurl + 'login'}));
    var user = getJson(html).data;

    var result = {success: true};

    html = AnyBalance.requestGet(baseurlApi + 'widget/accounts/balance/' + user.user.accountId, addHeaders({Referer: baseurl + 'login'}));
    json = getJson(html).data;
    
    getParam(json.accountNumber, result, 'licschet');
    getParam(user.user.username, result, 'phone_name');

    try {
        var account;
        
        //Получаем инфу из апи
    	var pageCount = 32;
    	var totalCount = pageCount;
        var phone = prefs.phone && prefs.phone.replace(/\D/g, '');
        
    	for(var startIndex = 0; !account && startIndex<totalCount; startIndex += pageCount){
    		html = AnyBalance.requestGet(baseurlApi + 'subscriber/mobile/list?from=' + startIndex 
    		    + '&size=' + pageCount,
    		    addHeaders({'X-Requested-With':'XMLHttpRequest', Referer: baseurl + 'subscriber/mobile'}));
    	
            var json = getJson(html).data;
            totalCount = json.count && json.count > 0 ? json.count : totalCount;
    		AnyBalance.trace('Got ' + startIndex + ':' + (startIndex+pageCount) + ' of ' + totalCount + ' subscribers');
            
            for(var i = 0; i < json.elements.length; i++) {
                var curr = json.elements[i];
                if(!phone) {
                    account = curr;
                    AnyBalance.trace('Номер в настройках не задан, возьмем первый: ' + curr.msisdn);
                    break;
                }
            
                if(endsWith(curr.msisdn, phone)) {
                    account = curr;
                    AnyBalance.trace('Нашли нужный номер: ' + curr.msisdn);
                    break;
                }
            }
        }

        if(!account) {
            AnyBalance.trace(JSON.stringify(json));
            throw new AnyBalance.Error('Не удалось найти ' + (prefs.phone ? 'номер телефона с последними цифрами ' + prefs.phone : 'ни одного номера телефона!'));
        }

        AnyBalance.trace('Успешно получили данные по номеру: ' + account.msisdn);
        AnyBalance.trace(JSON.stringify(account));

        if(account.ratePlan && account.account && account.account.id){
        	getParam(account.account.number, result, 'licschet');
        	getParam(account.msisdn, result, 'phone_name');

        	getParam(account.balance && account.balance.value, result, 'balance', null, null, parseBalance);
        	getParam(account.ratePlan.def, result, '__tariff');
        	getParam(account.account.name, result, 'name_name');
        }else{
        	AnyBalance.trace('Пришлось получать данные из инфы о подписчике');
        	var html = AnyBalance.requestGet(baseurl + 'subscriber/info/' + account.id, addHeaders({Referer: baseurl + 'b2b/subscriber/mobile'}));
        	var json = getJson(html);

        	getParam(json.profile.subscriberId, result, 'licschet');
        	getParam(json.profile.msisdn, result, 'phone_name');

        	getParam(json.profile.ratePlanName, result, '__tariff');
        	getParam(json.subscriber.statusDef, result, 'status');
        	getParam(json.profile.msisdn + ' - ' + json.profile.profileFio, result, 'name_name');
        }

        if(AnyBalance.isAvailable('min_left', 'sms_left')){
            getDiscounts(baseurl, account, result);
        }

        if (AnyBalance.isAvailable('amountTotal', 'amountLocal', 'abon', 'charges')) {
            var htmlExp = AnyBalance.requestGet(baseurl + 'subscriber/finances/' + account.id, g_headers);
            var json = getJson(htmlExp);

            getParam(json.financeProfile.subscriberCostsEntity.periodAmount, result, 'amountTotal');
            getParam(json.financeProfile.subscriberCostsEntity.trafficAmount, result, 'amountLocal');
            getParam(json.financeProfile.subscriberCostsEntity.feeAmount, result, 'abon');
            getParam(json.financeProfile.subscriberCostsEntity.chargesAmount, result, 'charges');
        }

        if(AnyBalance.isAvailable('prsnl_balance')){
            var htmlBudget = AnyBalance.requestGet(baseurl + 'subscriber/budget/' + account.id, g_headers);
            var json = getJson(htmlBudget);
            getParam(json.subscriberBudget && json.subscriberBudget.balance, result, 'prsnl_balance');
        }

        if(account.account){
        	getAccount(baseurl, account.account.number, result);
        }else{
            AnyBalance.trace('Номер не прикреплен к Л\С, пропускаем инфу по счету');
        }	
    } catch (e) {
        AnyBalance.trace(e.message);
        AnyBalance.trace('Не удалось получить данные по номеру телефона, свяжитесь, пожалуйста, с разработчиками.');
    }

    AnyBalance.setResult(result);
}

function getDiscounts(baseurl, account, result){
    var html = AnyBalance.requestGet(baseurl + 'subscriber/info/' + account.id + '/discounts', addHeaders({'X-Requested-With':'XMLHttpRequest'}));
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
                var mb = parseTraffic(d.volume + d.measure);
                if(mb >= 9999999){
                	AnyBalance.trace('Это безлимит, пропускаем');
                	continue;
                }
                var cat = 'traffic_left';
                if(/интернет/i.test(d.name) && /европ/i.test(d.name))
                	cat = 'traffic_left_europe';
                else if(/интернет/i.test(d.name) && /поп.+стран/i.test(d.name))
                	cat = 'traffic_left_pop_countries';
                else if(/остальн.+стран/i.test(d.name))
                	cat = 'traffic_left_other_countries'
                else if(/интернет/i.test(d.name) && /СНГ/i.test(d.name))
                	cat = 'traffic_left_sng';

                AnyBalance.trace('Относим ' + mb + ' МБ к ' + cat);
                sumParam(mb, result, cat, null, null, null, aggregate_sum);
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

	var html = AnyBalance.requestGet(baseurl + 'account', addHeaders({Accept: 'text/html'}));
    var acc;
    if(!/accountInfo/i.test(AnyBalance.getLastUrl())){
        html = AnyBalance.requestGet(baseurl + 'account/list?from=0&size=' + 32 + '&_=' + (+new Date()), addHeaders({'X-Requested-With':'XMLHttpRequest', Referer: baseurl + 'b2b/account'}));
        json = getJson(html);
        if(!json.account || !json.account.length){
        	AnyBalance.trace(html);
        	throw new AnyBalance.Error('Не удалось найти лицевые счета после успешного входа');
        }
        
        for(var i=0; i<json.account.length; ++i){
        	acc = json.account[i];
        	AnyBalance.trace('Найден лицевой счет ' + acc.number + ', контракт ' + acc.contract);
        	if(!accnum || acc.number.endsWith(accnum)){
        		getParam(acc.balance.value, result, 'balance');
			    getParam(acc.subsCount, result, 'abonCount');
			    getParam(acc.conditionBalance.value, result, 'balance_if');
			    break;
        	}
        }
        
        if(i >= json.account.length)
        	throw new AnyBalance.Error('Не удалось найти лицевой счет с последними цифрами ' + accnum);

        getParam(acc.number, result, 'licschet');
    }else{
    	getParam(html, result, 'balance', /<dt[^>]*>\s*Текущий баланс[\s\S]*?class="money[^>]*>([\s\S]*?)<span/i, replaceTagsAndSpaces, parseBalance);
    	getParam(html, result, 'balance_if', /<dt[^>]*>\s*Текущий условный баланс[\s\S]*?class="money[^>]*>([\s\S]*?)<span/i, replaceTagsAndSpaces, parseBalance);
	    getParam(html, result, 'abonCount', /<dt[^>]*>\s*Абонентов[\s\S]*?class="span76[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	    getParam(html, result, 'licschet', /Лицевой счет\s*(\d+)/i, replaceTagsAndSpaces);
    }
    
    if (isAvailable('unpaids')) {
    	if(acc){
	        html = AnyBalance.requestGet(baseurl + 'b2b/account/accountInfo/' + acc.id, addHeaders({
    			Accept: 'text/html',
    			Referer: baseurl,
	        }));
	    }

        var elemUnpaids = getElement(html, /<div\s[^>]*\bunpaidBillsCount\b/);
        if (elemUnpaids) {
            elemUnpaids = getElement(elemUnpaids, /<span[^>]+class="[^"']*?\bmoney/, replaceTagsAndSpaces, parseBalance);
            getParam(elemUnpaids, result, 'unpaids');
        }
    }


}
