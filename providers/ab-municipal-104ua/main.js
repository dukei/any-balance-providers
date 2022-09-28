/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
    'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'Original': 'https://account.104.ua/ua',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36'
};

var g_headersApi = {
    'Connection': 'Keep-Alive',
    'Accept-Encoding': 'gzip',
    'User-Agent': 'okhttp/3.3.0',
    'X-Application-Key': 'd43a63c9302bf27bf53749542c84a39e8769b2d2',
    'Content-Type': 'application/x-www-form-urlencoded',
    'Accept-Language': 'ru-RU'
};

var baseurl = 'https://account.104.ua';
var baseurlLk = 'https://ok.104.ua';
var baseurlApi = 'https://mobile.104.ua/billing/api/v2/';
var g_savedData;
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+38 ($1) $2-$3-$4'];

function callApi(cmd, params) {
    if ('string' == typeof params) {
        var html = AnyBalance.requestPost(baseurlApi + cmd, params, g_headersApi);
    } else {
        var html = AnyBalance.requestGet(baseurlApi + cmd, g_headersApi);
    }
    var json = getJson(html);
    if (json.status_message) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error(json.status_message);
    }
    if (!json.data) return {};
    if (json.data.session_id) g_headersApi['X-Session-Id'] = json.data.session_id;
    return json.data;
}

function main() {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');
	
	if(!g_savedData)
		g_savedData = new SavedData('104-ua', prefs.login);

	g_savedData.restoreCookies();
	
	AnyBalance.trace ('Пробуем войти в личный кабинет...');
	
	var html = AnyBalance.requestGet(baseurl + '/ua/account/index', g_headers);
	
	if(AnyBalance.getLastStatusCode() >= 500){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
    }
	
	if(!/logout/i.test(html)){
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		clearAllCookies();
    	
		checkEmpty(prefs.login, 'Введите логин!');
		checkEmpty(prefs.password, 'Введите пароль!');
		
		var html = AnyBalance.requestGet(baseurl + '/ua/login', g_headers);
		
		var form = getElement(html, /<form[^>]+class="loginpage-form\s?"[^>]*>/i);
		if(!form){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось найти форму входа! Сайт изменен?');
		}
	        
		var params = AB.createFormParams(form, function(params, str, name, value) {
			if (name == 'username') {
				return prefs.login;
			} else if (name == 'password') {
				return prefs.password;
			}
	        
			return value;
		});
			
		html = AnyBalance.requestPost(baseurl + '/ua/login', params, addHeaders({
        	'Content-Type': 'application/x-www-form-urlencoded',
        	'Referer': baseurl + '/ua/login'
		}), g_headers);

	    if (!/logout/i.test(html)){
	    	var error = getParam(html, null, null, /<div[^>]+class="loginpage-form__error[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	    	if (error)
	    		throw new AnyBalance.Error(error, null, /логін|пароль/i.test(error));
	    	AnyBalance.trace(html);
	    	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	    }
	
	    g_savedData.setCookies();
	    g_savedData.save();
    
	}else{
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
    }

	var result = {success: true};
	
	var fio = getParam(html, null, null, /Ім\’я[\s\S]*?value=\s*?"([^"]*)/i, replaceTagsAndSpaces);
	var middleName = getParam(html, null, null, /По батькові[\s\S]*?value=\s*?"([^"]*)/i, replaceTagsAndSpaces);
	var lastName = getParam(html, null, null, /Прізвище[\s\S]*?value=\s*?"([^"]*)/i, replaceTagsAndSpaces);
	if (middleName)
		fio += ' ' + middleName;
	if (lastName)
		fio += ' ' + lastName;
	getParam(fio, result, 'fio');
	getParam(html, result, 'phone', /Телефон[\s\S]*?value=\s*?"([^"]*)/i, replaceNumber);
	
	var html = AnyBalance.requestGet(baseurl + '/ua/services/client/individual', g_headers);
	
	var json = getJson(html);
	var services = json.data.services; // Ищем карточку с лицевыми счетами физ. лиц
	var accounts = getElements(services, /<section[^>]+class="td[^>]*>/ig); // Перебираем все лицевые счета в кабинете
	
	AnyBalance.trace('Найдено лицевых счетов: ' + accounts.length);

	if(accounts.length < 1)
		throw new AnyBalance.Error('У вас нет ни одного лицевого счета');

	var curAccNum;
	var curAccHref;
	for(var i=0; i<accounts.length; ++i){
		var account = getParam(accounts[i], null, null, /Особовий рахунок[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		var href = getParam(accounts[i], null, null, /<a[^>]+href="([^>"]*)/i, replaceTagsAndSpaces);
		var address = getParam(accounts[i], null, null, /Особовий рахунок(?:[\s\S]*?<div[^>]*>){2}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		AnyBalance.trace('Найден лицевой счет ' + account);
		if(!curAccNum && (!prefs.num || endsWith(account, prefs.num))){
			AnyBalance.trace('Выбран лицевой счет ' + account);
			curAccNum = account;
			curAccHref = href;
			result.ls = curAccNum;
			result.__tariff = curAccNum;
			result.address = address;
		}
	}

	if(!curAccNum)
		throw new AnyBalance.Error('Не удалось найти лицевой счет с последними цифрами ' + prefs.num);
	
    var html = AnyBalance.requestGet(baseurl + curAccHref, g_headers);
	
	var html = AnyBalance.requestGet(baseurlLk + '/ua/calculations', addHeaders({
    	'Referer': baseurl + '/ua/'
	}), g_headers);
	
	getParam(html, result, ['balance', 'currency'], /Баланс[\s\S]*?readings-widget__info-price overpayment[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', 'balance'], /Баланс[\s\S]*?readings-widget__info-price overpayment[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'invoice_month', /Рахунок за[\s\S]*?readings-widget__info-price[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'price', /Тариф[\s\S]*?span[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'power', /Потужність[\s\S]*?date[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'debt', /Заборгованість[\s\S]*?accent[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /Особовий рахунок:[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	getParam(html, result, 'ls', /Особовий рахунок:[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	getParam(html, result, 'address', /<div[^>]+class="account__address[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
    
	if (AnyBalance.isAvailable('deliveryPay')) {
	    var html = AnyBalance.requestPost(baseurlLk + '/ua/ajx/individual/calculations/history/table/delivery/volumes', {
	    	page: 1,
            epp: 10,
            meta: ''
	    }, addHeaders({
	    	'Accept': 'application/json, text/javascript, */*; q=0.01',
	    	'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        	'Referer': baseurl + '/ua/calculations'
	    }), g_headers);
	
	    var json = getJson(html);
	    var hist = json.data.html; // История расчетов за последние 10 месяцев
	    var items = getElements(hist, /<div[^>]+class="history-full-content__item[^>]*>/ig); // Перебираем все записи истории
	
	    AnyBalance.trace('Найдено записей в истории расчетов: ' + items.length);

	    if(items && items.length > 0){
			var res = '<strong>Історія за ' + items.length + ' місяців</strong>';
	        for(var i=0; i<items.length; ++i){
	        	var item = items[i];
	        	var date = getParam(item, null, null, /<div[^>]+class="first[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	        	var volume = getParam(item, null, null, /<div[^>]+class="second[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	        	var sum = getParam(item, null, null, /<div[^>]+class="fourth[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
			    res += '<br>' + date + ': ' + sum;
			}
			getParam(res, result, 'deliveryPay');
	    }else{
	    	AnyBalance.trace('Не удалось получить историю расчетов');
	    }
	}
	
	if (AnyBalance.isAvailable(['meterages', 'meter_no'])) {
	    var html = AnyBalance.requestGet(baseurlLk + '/ua/meterage', addHeaders({
        	'Referer': baseurl + '/ua/'
	    }), g_headers);
	
	    getParam(html, result, 'meter_no', /Лічильник №([\s\S]*?)<\/h[1|2|3]>/i, replaceTagsAndSpaces);
	
	    var hist = getElement(html, /<div class="history-list[^>]*>/i); // Ищем историю показаний
		var items = getElements(hist, /<div[^>]+class="history-item[^>]*>/ig); // Перебираем все записи истории
	
	    AnyBalance.trace('Найдено записей в истории показаний: ' + items.length);

	    if(items && items.length > 0){
			var res = '<strong>Історія за ' + items.length + ' місяців</strong>';
	        for(var i=0; i<items.length; ++i){
	        	var item = items[i];
	        	var date = getParam(item, null, null, /<p[^>]+class="date[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);
	        	var volume = getParam(item, null, null, /<p[^>]+class="volume[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);
			    res += '<br>' + date + ': ' + volume;
			}
			getParam(res, result, 'meterages');
	    }else{
	    	AnyBalance.trace('Не удалось получить историю показаний');
	    }
	}
	
	if (AnyBalance.isAvailable('consumption_year', 'consumptions')) {
	    var html = AnyBalance.requestGet(baseurlLk + '/ua/consumption', addHeaders({
        	'Referer': baseurl + '/ua/'
	    }), g_headers);
		
	    var date = new Date();
		var endDate = date.getFullYear() + '-' + ('0' + (date.getMonth() + 1)).slice(-2) + '-01T00:00:00.000Z';
		
		var html = AnyBalance.requestPost(baseurlLk + '/ua/ajx/individual/consumption/history/chart', {
	    	account_no: curAccNum,
            period_type: 'y',
            end_date: endDate
	    }, addHeaders({
	    	'Accept': 'application/json, text/javascript, */*; q=0.01',
	    	'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        	'Referer': baseurlLk + '/ua/consumption',
			'X-Requested-With': 'XMLHttpRequest'
	    }), g_headers);
	
	    var json = getJson(html);
	
	    var pr = json.data.periods;
		var pw = json.data.power;
		var vl = json.data.volumes;
	
	    AnyBalance.trace('Найдено записей в истории потребления: ' + pr.length);

	    if(pr && pr.length > 0){
			var res = '<strong>Історія за ' + pr.length + ' місяців</strong>';
	        for(var i=0; i<pr.length; ++i){
	        	var prItem = pr[i];
				var pwItem = pw[i];
				var vlItem = vl[i];
				sumParam(vlItem, result, 'consumption_year', null, null, parseBalanceSilent, aggregate_sum);
			    res += '<br>' + prItem.replace(/(\d{4})-(\d{2})-(\d{2})/, '$3.$2.$1') + ': ' + vlItem + ' м³' + '<br>(' + pwItem + ' кВт•год)';
			}
			getParam(res, result, 'consumptions');
	    }else{
	    	AnyBalance.trace('Не удалось получить историю потребления');
	    }
	}
	
	if (AnyBalance.isAvailable('last_payment')) {
	    var html = AnyBalance.requestGet(baseurlLk + '/ua/payments', addHeaders({
        	'Referer': baseurlLk + '/ua/'
	    }), g_headers);
		
		var hist = getElement(html, /<div[^>]+class="history-list[\s\S]*?tab-delivery[^>]*>/i); // Ищем историю платежей
		var items = getElements(hist, /<div[^>]+class="item[^>]*>/ig); // Перебираем все записи истории
	
	    AnyBalance.trace('Найдено записей в истории платежей: ' + items.length);

	    if(items && items.length > 0){
			var res = '';
	        for(var i=0; i<items.length; ++i){
	        	var date = getParam(items[0], null, null, /Платіж[\s\S]*?(?:[^>]*>){8}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
				if (date && (/\.\d\d$/i.test(date)))
					var date = date.replace(/(\d{2})\.(\d{2})\.(\d{2})/, '$1.$2.20$3');
	        	var sum = getParam(items[0], null, null, /Платіж[\s\S]*?(?:[^>]*>){6}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
			    res += date + ': ' + sum;
				break;
			}
			getParam(res, result, 'last_payment');
	    }else{
	    	AnyBalance.trace('Не удалось получить историю платежей');
	    }
	}
	
	if (AnyBalance.isAvailable('address', 'fio', 'eic_code', 'people_count', 'heated_area')) {
	    var html = AnyBalance.requestGet(baseurlLk + '/ua/account', addHeaders({
        	'Referer': baseurlLk + '/ua/'
	    }), g_headers);
		
		getParam(html, result, 'address', /Адреса[\s\S]*?<p[^>]+class[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);
		getParam(html, result, 'fio', /Власник[\s\S]*?<p[^>]+class[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);
		getParam(html, result, 'eic_code', /EIC-код[\s\S]*?<p[^>]+class[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);
		getParam(html, result, 'people_count', /Зареєстровано[\s\S]*?<p[^>]+class[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'heated_area', /Опалювальна площа[\s\S]*?<p[^>]+class[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseBalance);
	}

	AnyBalance.setResult(result);
}

function mainApi() {
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');
    var id = AnyBalance.getData('X-Session-Id');
    if (id) {
        g_headersApi['X-Session-Id'] = id;
        AnyBalance.trace('Обнаружена старая сессия. Проверяем');
        try {
            var j = callApi('users/' + prefs.login + '/accounts')[0];
            AnyBalance.trace('Сессия в порядке. Используем её');
        } catch (e) {
            AnyBalance.trace('Сессия испорчена');
            AnyBalance.trace(e.message);
            id = '';
            g_headersApi['X-Session-Id'] = id;
        }
    }
    if (!id) {
        AnyBalance.trace('Вход с логином и паролем');
        checkEmpty(prefs.login, 'Введите логин!');
        checkEmpty(prefs.password, 'Введите пароль!');

        callApi('users/' + prefs.login + '/sessions?password=' + prefs.password + '&device_id=1', '');
        var j = callApi('users/' + prefs.login + '/accounts')[0];
    }
    var account_no = j.account_no;
    var result = {
        success: true
    };
    result.fio = j.full_name;

    j = callApi('users/' + prefs.login);
    result.balance = -j.saldo;
    result.phone = j.mobile_phone || j.landing_phone || j.main_phone || j.logon_phone;
    result.address = j.full_address;
    result.email = j.email || j.logon_name;
    result.people_count = j.people_count;
    result.eic_code = j.eic_code;
    result.price_main = j.price_main;
    result.ls = j.account_no;
    if (j.last_payment_sum) result.last_payment = j.last_payment_sum.toFixed(2) + ' грн. ' + j.last_payment_created_at.replace(/(\d{4})-(\d{2})-(\d{2})/, '$3.$2.$1');

    j = callApi('accounts/' + account_no + '/delivery');
    result.balance_rasp = -j.saldo_distribution;
    result.price_rasp = j.price_distribution;

    var range = '?created_at_range[start]=' + getFormattedDate({format: 'YYYY-MM-DD',offsetMonth: 6}) + '&created_at_range[end]=' + getFormattedDate('YYYY-MM-DD');
    if (AnyBalance.isAvailable(['meterages', 'meter_no'])) {
        j = callApi('users/' + prefs.login + '/meters/meterages' + range);
        if (j.length > 0) {
            result.meterages = j.map(data => data.value_source + ' ' + data.created_at.replace(/(\d{4})-(\d{2})-(\d{2})/, '$3.$2.$1') + '<br><strong>' + data.value + '(+' + data.delta + ')</strong>').join('<br><br>');
            result.meter_no = j[0].meter_no;
        }
    }
    if (AnyBalance.isAvailable('deliveryPay')) {
        j = callApi('accounts/' + account_no + '/delivery/payments' + range);
        if (j.length > 0) result.deliveryPay = j.map(data => data.value.toFixed(2) + ' грн. ' + data.created_at.replace(/(\d{4})-(\d{2})-(\d{2})/, '$3.$2.$1')).join('<br>');
    }
    if (AnyBalance.isAvailable('gasPay')) {
        j = callApi('users/' + prefs.login + '/payments' + range);
        if (j.length > 0) result.gasPay = j.map(data => data.value.toFixed(2) + ' грн. ' + data.created_at.replace(/(\d{4})-(\d{2})-(\d{2})/, '$3.$2.$1')).join('<br>');
    }

    AnyBalance.setData('X-Session-Id', g_headersApi['X-Session-Id']);
    AnyBalance.saveData();
    AnyBalance.setResult(result);
}