/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_regions = {
    voronezh: mainVoronezh,
    belgorod: mainBelgorod,
    center: mainCenter,
    orel: mainBelgorod,
    oskol: mainBelgorod,
    lipetsk: mainBelgorod,
	tver: mainUniversal,
	lobnya: mainLobnya,
    murmansk: mainUniversal
};

function main(){
    var prefs = AnyBalance.getPreferences();

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

    var func = g_regions[prefs.region] || g_regions.center;
    var region = (g_regions[prefs.region] && prefs.region) || 'center';
    AnyBalance.trace("region: " + region);
    func(region);
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
        var error = getParam(html, null, null, /class="error"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
        if (error){
            throw new AnyBalance.Error (error);
        }
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
    getParam (html, result, 'subscriber', /Абонент[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam (html, result, 'contract', /Договор([^<(]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam (html, result, 'day_left', /Осталось[^\d]*([\d]+)/i, replaceTagsAndSpaces, parseBalance);

    var table = getParam(html, null, null, /<table[^>]*>(?:[\s\S](?!<\/table>))*?<th[^>]*>Договор(?:[\s\S](?!<\/table>))*?<th[^>]*>Текущий тариф[\s\S]*?<\/table>/i, [/<!--[\S\s]*?-->/g, '']);
    
    if(table) {
        if(/<th[^>]*>\s*Остаток трафика/i.test(table)) {
            AnyBalance.trace('Найден остаток трафика');
            getParam(table, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
            getParam(table, result, 'status', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
            getParam(table, result, 'trafficLeft', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficGb);
        } else {
            getParam(table, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
            getParam(table, result, 'status', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
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
        var periodId = getParam(html, null, null, /<select[^>]+name="selper"[^>]*>\s*<option[^>]+value="([^"]*)/i, null, html_entity_decode);
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
	
    getParam (html, result, 'balance', /Лицевой счет:(?:[^>]*>){4}баланс(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam (html, result, 'subscriber', /Приветствуем Вас,([^<]*)/i, replaceTagsAndSpaces);
    getParam (html, result, 'contract', /<b>\s*Лицевой счет:(?:[^>]*>){2}([^<,]*)/i, replaceTagsAndSpaces);
    getParam (html, result, 'day_left', /дней до ухода в финансовую блокировку:(?:[^>]*>){2}\s*(\d+)/i, replaceTagsAndSpaces, parseBalance);
	sumParam(html, result, '__tariff', /Тарифный план:([\s\S]*?)(?:<\/span>|<a)/i, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
    getParam (html, result, 'bonus_balance', /Баланс:([^<]*)балл/i, replaceTagsAndSpaces, parseBalance);
    sumParam (html, result, '__tariff', /(<strong[^>]*>\s*Бонусный счет[\s\S]*?)Баланс/i, replaceTagsAndSpaces, html_entity_decode, aggregate_join);

    AnyBalance.setResult(result);
}

function mainUniversal(region){
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
	html = AnyBalance.requestGet(baseurl + '?pr%5Bcontrol%5D%5Bkernel%5D%5Brecord%5D=23&pr%5Bcontrol%5D%5Bkernel%5D%5Bparent%5D=19&menu=19');
    
	var result = {success: true};
	
    getParam (html, result, 'balance', /Лицевой счет:(?:[^>]*>){4}баланс|Баланс:(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam (html, result, 'subscriber', /Приветствуем Вас,([^<]*)/i, replaceTagsAndSpaces);
    getParam (html, result, 'contract', /<b>\s*Лицевой счет:|ЛС:(?:[^>]*>){2}([^<,]*)/i, replaceTagsAndSpaces);
    getParam (html, result, 'day_left', /дней до ухода в финансовую блокировку:|до списания абонентской платы осталось(?:[^>]*>){2}\s*(\d+)/i, replaceTagsAndSpaces, parseBalance);
	sumParam(html, result, '__tariff', /Тарифный план:([\s\S]*?)(?:<\/span>|<a)/i, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
    getParam (html, result, 'bonus_balance', /Баланс:([^<]*)балл/i, replaceTagsAndSpaces, parseBalance);
    sumParam (html, result, '__tariff', /(<strong[^>]*>\s*Бонусный счет[\s\S]*?)Баланс/i, replaceTagsAndSpaces, html_entity_decode, aggregate_join);

    AnyBalance.setResult(result);
}

function mainBelgorod(region){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('windows-1251');
    var baseurl = 'https://selfcare.netbynet.ru/'+region+'/';
	
    AnyBalance.trace ("Trying to enter selfcare at address: " + baseurl);
    var html = requestPostMultipart (baseurl + "?", {
    	'LOGIN': prefs.login,
    	'PASSWD': prefs.password,
    	'URL': 'selfcare.puzzle.su',
    	'subm.x': 31,
    	'subm.y': 4
    });
	
    if(!/\?exit=1/i.test(html)){
        var error = getParam (html, null, null, /<font[^>]+color=['"]red['"][^>]*>([\s\S]*?)<\/font>/i, replaceTagsAndSpaces);
        if (error){
            throw new AnyBalance.Error (error);
        }
        throw new AnyBalance.Error ("Не удаётся войти в личный кабинет. Сайт изменен?");
    }
	
    AnyBalance.trace ("It looks like we are in selfcare...");
	
    var result = {success: true};
	
    html = AnyBalance.requestGet(baseurl + '?pr%5Bcontrol%5D%5Bkernel%5D%5Brecord%5D=23&pr%5Bcontrol%5D%5Bkernel%5D%5Bparent%5D=19&menu=19');
	
    AnyBalance.trace("Parsing data...");
	
    getParam (html, result, 'balance', /<b[^>]*>Лицевой счет:[\s\S]*?баланс:([\s\S]*?)<br/i, replaceTagsAndSpaces, parseBalance);
    getParam (html, result, 'subscriber', /Приветствуем Вас,([^<]*)/i, replaceTagsAndSpaces);
    getParam (html, result, 'contract', /<b[^>]*>Лицевой счет:([\s\S]*?),/i, replaceTagsAndSpaces);
    getParam (html, result, 'day_left', /(?:Количество дней до ухода в финансовую блокировку|До списания абонентской платы осталось):([\s\S]*?)<br/i, replaceTagsAndSpaces, parseBalance);
    getParam (html, result, 'bonus_balance', /Баланс:([\s\S]*?)\s*балл/i, replaceTagsAndSpaces, parseBalance);
    sumParam(html, result, '__tariff', /Тарифный план:([\s\S]*?)(?:<\/span>|<a)/i, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
    sumParam (html, result, '__tariff', /(<strong[^>]*>\s*Бонусный счет[\s\S]*?)Баланс/i, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
	
    // Статус договора 
    getParam (html, result, 'status', /Текущий статус договора:([\s\S]*?)<br/i, replaceTagsAndSpaces, html_entity_decode);
    getParam (html, result, 'abonday', /Суточная абонентская плата:([\s\S]*?)<br/i, replaceTagsAndSpaces, parseBalance);
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
	//sumParam(html, result, '__tariff', /Тарифный план:([\s\S]*?)(?:<\/span>|<a)/i, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
    //getParam (html, result, 'bonus_balance', /Баланс:([^<]*)балл/i, replaceTagsAndSpaces, parseBalance);
    //sumParam (html, result, '__tariff', /(<strong[^>]*>\s*Бонусный счет[\s\S]*?)Баланс/i, replaceTagsAndSpaces, html_entity_decode, aggregate_join);

    AnyBalance.setResult(result);
}