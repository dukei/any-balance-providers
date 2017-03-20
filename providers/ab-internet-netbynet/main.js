/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36',
};

var baseurl = 'https://my.netbynet.ru/api/';

function callAPI(verb, getParams, postParams, addheaders, checkResult){
	var url = baseurl + verb, method = 'GET';
	
	if(getParams)
		url += '?' + createUrlEncodedParams(getParams);

	var paramsAreNotJson = postParams && postParams.__paramsAreNotJson;
	if(postParams)
		method = 'POST';
	else
		postParams = '';

	var headers = addHeaders({
		'X-Requested-With': 'XMLHttpRequest'
	});

	if(postParams && !paramsAreNotJson)
		headers['Content-Type'] = 'application/json; charset=utf-8';
	if(addheaders)
		headers = addHeaders(addheaders, headers);

	var html, tries = 0, maxTries = 5;
	do{
		if(tries > 0){
			AnyBalance.trace('Retrying request: ' + tries + '/' + maxTries);
			AnyBalance.sleep(1000);
		}
		html = AnyBalance.requestPost(url, 
			typeof(postParams) == 'string' || paramsAreNotJson ? postParams : JSON.stringify(postParams), 
			addHeaders(headers), 
			{HTTP_METHOD: method}
		);
//	}while((/Server Hangup/i.test(AnyBalance.getLastStatusString()) || (502 == AnyBalance.getLastStatusCode() && /Server Hangup/i.test(html))) && (++tries <= maxTries));
	}while(500 <= AnyBalance.getLastStatusCode() && 503 >= AnyBalance.getLastStatusCode() && (++tries <= maxTries));

	var json = (checkResult || getJson)(html);
	if(json.resultCode)
		throw new AnyBalance.Error(json.resultText, null, /парол/i.test(json.resultText));
	return json;
}

function main(){
    var prefs = AnyBalance.getPreferences();

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var json = callAPI('v1/get-way', {accountNumber: prefs.login});
	json = callAPI('v2/login', null, {"accountNumber":prefs.login,"password":prefs.password,"captchaCode":""});

	if(json.needChangePassword)
		throw new AnyBalance.Error('NetByNet требует сменить пароль. Пожалуйста, зайдите на https://my.netbynet.ru через браузер, смените пароль и введите новый пароль в настройки провайдера', null, true);

	var result = {success: true};

	if(AnyBalance.isAvailable('balance')){
		json = callAPI('v1/get-balance');
		getParam(json.accountBalance, result, 'balance');
	}

	json = callAPI('v1/get-internet-accounts-details');
	var acct = json.internetAccounts[0];
	if(acct){
		getParam(acct.tariffPlan.name, result, '__tariff');
		getParam(acct.statusName, result, 'status');
	}

	if(AnyBalance.isAvailable('subscriber', 'contract')){
		json = callAPI('v1/get-profile-info');
		getParam(json.contacts.fullName, result, 'subscriber');
		getParam(json.number, result, 'contract');
	}

	if(AnyBalance.isAvailable('bonus_balance', 'abon', 'minpay', 'minpay_till')){
		json = callAPI('v1/get-balance-details');
		getParam(json.bonusBalance == -1 ? undefined : json.bonusBalance, result, 'bonus_balance');
		getParam(json.nextPayment, result, 'minpay');
		getParam(json.nextPaymentDate, result, 'minpay_till', null, null, parseDateISO);
	}

/*
    var func = g_regions[prefs.region] || g_regions.center;
    var region = (g_regions[prefs.region] && prefs.region) || 'center';
    AnyBalance.trace("region: " + region);
    func(region);
    */

    AnyBalance.setResult(result);
}

function mainCenter(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://stat.netbynet.ru/';

    AnyBalance.trace ("Trying to enter selfcare at address: " + baseurl);
    var html = AnyBalance.requestPost (baseurl + "main", {
    	login: prefs.login,
        password: prefs.password
    });

    if(!/logout/i.test(html)){
        var error = getParam(html, null, null, /class="error"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
        if (error){
            throw new AnyBalance.Error (error, null, /парол/i.test(error));
        }
        if(/ПЕРЕАДРЕСАЦИЯ В НОВЫЙ ЛК/i.test(html))
        	throw new AnyBalance.Error('Необходимо зарегистрироваться в https://my.netbynet.ru и ввести логин и пароль от него в настройки провайдера', null, true);
        	
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	
    AnyBalance.trace ("It looks like we are in selfcare...");
	
    var result = {success: true};
	
    AnyBalance.trace("Parsing data...");
    // Тариф выцепить сложно, пришлось ориентироваться на запись после остатка дней
    value = html.match (/Осталось[\s\S]*?<td>(.*?)<\/td>/i);
    if (value && value[1].indexOf ('нет') == -1)
		result.__tariff = value[1];

    getParam (html, result, 'balance', /<span[^>]+class="balance"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam (html, result, 'subscriber', /Абонент[^>]*>([^<]*)/i, replaceTagsAndSpaces);
    getParam (html, result, 'contract', /Договор([^<(]*)/i, replaceTagsAndSpaces);
    getParam (html, result, 'day_left', /Осталось[^\d]*([\d]+)/i, replaceTagsAndSpaces, parseBalance);

    var table = getParam(html, null, null, /<table[^>]*>(?:[\s\S](?!<\/table>))*?<th[^>]*>Договор(?:[\s\S](?!<\/table>))*?<th[^>]*>Текущий тариф[\s\S]*?<\/table>/i, [/<!--[\S\s]*?-->/g, '']);
    
    if(table) {
        if(/<th[^>]*>\s*Остаток трафика/i.test(table)) {
            AnyBalance.trace('Найден остаток трафика');
            getParam(table, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
            getParam(table, result, 'status', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
            getParam(table, result, 'trafficLeft', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficGb);
        } else {
            getParam(table, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
            getParam(table, result, 'status', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
        }
    } else {
		AnyBalance.trace('Не удалось найти таблицу с тарифным планом. Сайт изменен?');
	}
	
	if (AnyBalance.isAvailable ('promised_payment')) {
        AnyBalance.trace ("Fetching stats...");
        html = AnyBalance.requestGet(baseurl + "stats");
        AnyBalance.trace("Parsing stats...");

        // Обещанные платежи
        var promised_payments = getParam(html, null, null, /<a[^>]+rel="promise"[\s\S]*?<li>/i);
        if (promised_payments) {
            getParam (promised_payments, result, 'promised_payment', /<tr>(?:[\s\S]*?<td[^>]*>){5}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        }
    }

/*  //Работает, но не надо
    if (AnyBalance.isAvailable ('trafficIn', 'trafficOut')) {
        AnyBalance.trace ("Fetching traffic periods...");
        html = AnyBalance.requestGet(baseurl + "ajax/ajax.php?action=contrSelector");
        AnyBalance.trace("Parsing traffic periods...");
        var periodId = getParam(html, null, null, /<select[^>]+name="selper"[^>]*>\s*<option[^>]+value="([^"]*)/i, replaceHtmlEntities);
        if(periodId){
            html = AnyBalance.requestGet(baseurl + "ajax/ajax.php?action=period&period_id=" + periodId);
            getParam(html, result, 'trafficIn', /<table[^>]+id="periods_details"(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficGb);
            getParam(html, result, 'trafficOut', /<table[^>]+id="periods_details"(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficGb);
        }else{
            AnyBalance.trace('Не удалось найти период для получения трафика');
        }
    }
*/
//    AnyBalance.requestGet (baseurl + "logout");


    AnyBalance.setResult(result);
}

function mainVoronezh(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://selfcare.netbynet.ru/voronezh/';

    AnyBalance.trace ("Trying to enter selfcare at address: " + baseurl);
    var html = requestPostMultipart (baseurl + "?", {
    	'pr[form][auto][form_save_to_link]': 0,
    	'pr[form][auto][login]': prefs.login,
    	'pr[form][auto][password]': prefs.password,
    	'pr[form][auto][form_event]': 'Войти'
    }, {'Accept-Charset': 'windows-1251'});

    if(!/'\?exit=1'/i.test(html)){
        var error = sumParam (html, null, null, /<font[^>]+color=['"]red['"][^>]*>([\s\S]*?)<\/font>/ig, replaceTagsAndSpaces, null, aggregate_join);
        if (error){
            throw new AnyBalance.Error (error);
        }
        throw new AnyBalance.Error ("Не удаётся войти в личный кабинет. Сайт изменен?");
    }
	html = AnyBalance.requestGet(baseurl + '?pr%5Bcontrol%5D%5Bkernel%5D%5Brecord%5D=23&pr%5Bcontrol%5D%5Bkernel%5D%5Bparent%5D=19&menu=19');
    
	var result = {success: true};
	
    getParam (html, result, 'balance', /Баланс:\s*<\/span>\s*<b>[^<]+/i, replaceTagsAndSpaces, parseBalance);
    getParam (html, result, 'subscriber', /Приветствуем Вас,([^<]*)/i, replaceTagsAndSpaces);
    getParam (html, result, 'contract', /<span[^>]*>\s*ЛС:(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces);
    getParam (html, result, 'day_left', /дней до ухода в финансовую блокировку:[^>]*>\s*(\d+)/i, replaceTagsAndSpaces, parseBalance);
	sumParam(html, result, '__tariff', /Тарифный план:([\s\S]*?)(?:<\/span>|<a)/i, replaceTagsAndSpaces, null, aggregate_join);
    getParam (html, result, 'bonus_balance', /Баланс:([^<]*)балл/i, replaceTagsAndSpaces, parseBalance);
    sumParam (html, result, '__tariff', /(<strong[^>]*>\s*Бонусный счет[\s\S]*?)Баланс/i, replaceTagsAndSpaces, null, aggregate_join);

    AnyBalance.setResult(result);
}

function mainUniversal(region){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://selfcare.netbynet.ru/' + region + '/';

    AnyBalance.trace ("Trying to enter selfcare at address: " + baseurl);
    var html = requestPostMultipart (baseurl + "?", {
    	'pr[form][auto][form_save_to_link]': 0,
    	'pr[form][auto][login]': prefs.login,
    	'pr[form][auto][password]': prefs.password,
    	'pr[form][auto][form_event]': 'Войти'
    }, {'Accept-Charset': 'windows-1251'});

    if(!/'\?exit=1'/i.test(html)){
        var error = sumParam (html, null, null, /<font[^>]+color=['"]red['"][^>]*>([\s\S]*?)<\/font>/ig, replaceTagsAndSpaces, null, aggregate_join);
        if (error){
            throw new AnyBalance.Error (error);
        }
        throw new AnyBalance.Error ("Не удаётся войти в личный кабинет. Сайт изменен?");
    }
	html = AnyBalance.requestGet(baseurl + '?pr%5Bcontrol%5D%5Bkernel%5D%5Brecord%5D=23&pr%5Bcontrol%5D%5Bkernel%5D%5Bparent%5D=19&menu=19');
    
	var result = {success: true};
	
    getParam (html, result, 'balance', /Баланс:(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam (html, result, 'subscriber', /Приветствуем Вас,([^<]*)/i, replaceTagsAndSpaces);
    getParam (html, result, 'contract', /<b>\s*Лицевой счет:|ЛС:(?:[^>]*>){2}([^<,]*)/i, replaceTagsAndSpaces);
    getParam (html, result, 'day_left', /(?:дней до ухода в финансовую блокировку:|до списания абонентской платы осталось)(?:[^>]*>){1,3}\s*(\d+)/i, replaceTagsAndSpaces, parseBalance);
	sumParam(html, result, '__tariff', /Тарифный план:([\s\S]*?)(?:<\/span>|<a)/i, replaceTagsAndSpaces, null, aggregate_join);
    getParam (html, result, 'bonus_balance', /Баланс:([^<]*)балл/i, replaceTagsAndSpaces, parseBalance);
    sumParam (html, result, '__tariff', /(<strong[^>]*>\s*Бонусный счет[\s\S]*?)Баланс/i, replaceTagsAndSpaces, null, aggregate_join);

    getParam (html, result, 'abon', /Ежемесячная абонентская плата:([\s\S]*?)(?:<br|<font|<\/div)/i, replaceTagsAndSpaces, parseBalance);
    getParam (html, result, 'status', /Текущий статус договора:([\s\S]*?)(?:<br|<font|<\/div)/i, replaceTagsAndSpaces);
    getParam (html, result, 'abonday', /Суточная абонентская плата:([\s\S]*?)(?:<br|<font|<\/div)/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}

function mainBelgorod(region){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('windows-1251');
    var baseurl = 'https://selfcare.netbynet.ru/'+region+'/';

    var html = AnyBalance.requestGet(baseurl);
	
    AnyBalance.trace ("Trying to enter selfcare at address: " + baseurl);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже.');
	}

	var form = AB.getElement(html, /<div[^>]+class=['"]right['"]/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удаётся найти форму входа! Сайт изменен?');
	}

	var params = AB.createFormParams(form, function(params, str, name, value) {
		if (/login/i.test(name)) {
			return prefs.login;
		} else if (/password/i.test(name)) {
			return prefs.password;
		}

		return value;
	});

    var html = requestPostMultipart (baseurl + "?", params);
	
    if(!/\?exit=1/i.test(html)){
		var form = AB.getElement(html, /<div[^>]+class=['"]right['"]/i);
        var error = getElement(form, /<font[^>]+color=['"]red['"]/i, replaceTagsAndSpaces);
        if (error){
            throw new AnyBalance.Error (error, null, /парол/i.test(error));
        }
        throw new AnyBalance.Error ("Не удаётся войти в личный кабинет. Сайт изменен?");
    }
	
    AnyBalance.trace ("It looks like we are in selfcare...");
	
    var result = {success: true};
	
    html = AnyBalance.requestGet(baseurl + '?pr%5Bcontrol%5D%5Bkernel%5D%5Brecord%5D=23&pr%5Bcontrol%5D%5Bkernel%5D%5Bparent%5D=19&menu=19');
	
    AnyBalance.trace("Parsing data...");
	
    getParam (html, result, 'balance', />\s*Баланс:(?:[^>]*>){1,3}\s*([\d.,-]+)/i, replaceTagsAndSpaces, parseBalance);
    getParam (html, result, 'subscriber', /Приветствуем Вас,([^<]+)/i, replaceTagsAndSpaces);
    getParam (html, result, 'contract', /<b[^>]*>Лицевой счет:([\s\S]*?),/i, replaceTagsAndSpaces);
    getParam (html, result, 'day_left', /(?:Количество дней до ухода в финансовую блокировку|До списания абонентской платы осталось):([\s\S]*?)<br/i, replaceTagsAndSpaces, parseBalance);
    getParam (html, result, 'bonus_balance', /Баланс:([^<]+)\s*балл/i, replaceTagsAndSpaces, parseBalance);
    sumParam(html, result, '__tariff', /Тарифный план:([\s\S]*?)(?:<\/span>|<a)/i, replaceTagsAndSpaces, null, aggregate_join);
    sumParam (html, result, '__tariff', /(<strong[^>]*>\s*Бонусный счет[\s\S]*?)Баланс/i, replaceTagsAndSpaces, null, aggregate_join);
	
    // Статус договора 
    getParam (html, result, 'status', /Текущий статус договора:([\s\S]*?)<br/i, replaceTagsAndSpaces);
    getParam (html, result, 'abonday', /Суточная абонентская плата:([\s\S]*?)<br/i, replaceTagsAndSpaces, parseBalance);
    getParam (html, result, 'abon', /Ежемесячная абонентская плата:([\s\S]*?)<br/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}

function mainEkaterinburg(region) {
  var prefs = AnyBalance.getPreferences();
  var baseurl = 'https://selfcare.netbynet.ru/'+region+'/';

  var html = requestPostMultipart (baseurl + "index.php", {
    'pr[form][auto][form_save_to_link]': 0,
    'pr[form][auto][login]': prefs.login,
    'pr[form][auto][password]': prefs.password,
    'pr[form][auto][form_event]': 'Войти'
  }, {'Accept-Charset': 'windows-1251'});

  if(!/'\?exit=1'/i.test(html)){
    var error = sumParam (html, null, null, /<font[^>]+color=['"]red['"][^>]*>([\s\S]*?)<\/font>/ig, replaceTagsAndSpaces, null, aggregate_join);
    if (error){
      throw new AnyBalance.Error(error);
    }
    throw new AnyBalance.Error ("Не удаётся войти в личный кабинет. Сайт изменен?");
  }

  var result = {success: true};

  getParam (html, result, 'balance', /баланс:(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
  getParam (html, result, 'status', /Текущий статус договора:([\s\S]*?)<br/i, replaceTagsAndSpaces);
  getParam (html, result, 'abon', /Ежемесячная абонентская плата:([\s\S]*?)<br/i, replaceTagsAndSpaces, parseBalance);

  AnyBalance.setResult(result);
}

function mainLobnya(region){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://selfcare.netbynet.ru/'+region+'/';

    AnyBalance.trace ("Trying to enter selfcare at address: " + baseurl);
    var html = requestPostMultipart (baseurl + "?", {
    	'pr[form][auto][form_save_to_link]': 0,
    	'pr[form][auto][login]': prefs.login,
    	'pr[form][auto][password]': prefs.password,
    	'pr[form][auto][form_event]': 'Войти'
    }, {'Accept-Charset': 'windows-1251'});

    if(!/'\?exit=1'/i.test(html)){
        var error = sumParam (html, null, null, /<font[^>]+color=['"]red['"][^>]*>([\s\S]*?)<\/font>/ig, replaceTagsAndSpaces, null, aggregate_join);
        if (error){
            throw new AnyBalance.Error (error);
        }
        throw new AnyBalance.Error ("Не удаётся войти в личный кабинет. Сайт изменен?");
    }
	//html = AnyBalance.requestGet(baseurl + '?pr%5Bcontrol%5D%5Bkernel%5D%5Brecord%5D=23&pr%5Bcontrol%5D%5Bkernel%5D%5Bparent%5D=19&menu=19');
    
	var result = {success: true};
	
    getParam (html, result, 'balance', /баланс:([\s\d.,-]+)руб/i, replaceTagsAndSpaces, parseBalance);
    getParam (html, result, 'subscriber', /Приветствуем Вас,([^<]+)/i, replaceTagsAndSpaces);
    getParam (html, result, 'contract', />\s*(?:ЛС|Лицевой счет):([^<,]+)/i, replaceTagsAndSpaces);
    getParam (html, result, 'day_left', /дней до ухода в финансовую блокировку:(?:[^>]*>){1,2}\s*(\d+)/i, replaceTagsAndSpaces, parseBalance);
	//sumParam(html, result, '__tariff', /Тарифный план:([\s\S]*?)(?:<\/span>|<a)/i, replaceTagsAndSpaces, null, aggregate_join);
    //getParam (html, result, 'bonus_balance', /Баланс:([^<]*)балл/i, replaceTagsAndSpaces, parseBalance);
    //sumParam (html, result, '__tariff', /(<strong[^>]*>\s*Бонусный счет[\s\S]*?)Баланс/i, replaceTagsAndSpaces, null, aggregate_join);

    AnyBalance.setResult(result);
}