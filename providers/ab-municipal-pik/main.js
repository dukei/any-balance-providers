/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Connection': 'Keep-Alive',
    'Origin': 'https://new.pik-comfort.ru',
    'Referer': 'https://new.pik-comfort.ru/',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
	'X-User-Meta-Data': '{"appType":"WebApp","OS":"Windows","osVersion":"10","browser":"Chrome","browserVersion":"129.0.0.0","browserEngine":"Blink 129.0.0.0","appVersionName":"1.30.9","appVersionCode":"-","device":" ","userTimezone":180}'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://new-api.pik-software.ru';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите номер телефона!');
    checkEmpty(/^\d{10}$/.test(prefs.login), 'Введите номер телефона - 10 цифр без пробелов и разделителей!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	AnyBalance.trace('Пробуем войти в личный кабинет...');
	
	html = AnyBalance.requestGet(baseurl + '/check-status/?phone=7' + prefs.login, addHeaders({
		'Content-Type': 'application/json'
	}));
	
	if(AnyBalance.getLastStatusCode() >= 500 || !html)
		throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
	
	var json = getJson(html);
		
	if (json.auth != 'password') {
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }
	
	html = AnyBalance.requestPost(baseurl + '/api-token-auth/', JSON.stringify({
        "username": "7" + prefs.login,
        "password": prefs.password
    }), addHeaders({
		'Content-Type': 'application/json;charset=UTF-8'
	}));
	
	var json = getJson(html);
		
	if (json.code == 'invalid') {
	    var error = json.message;
        if (error) {
	    	AnyBalance.trace(html);
        	throw new AnyBalance.Error('Неверный номер телефона или пароль!', null, /Invalid input/i.test(error));	
        }

        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }
	
	var token = json.token;
	var user = json.user;
	
	html = AnyBalance.requestGet(baseurl + '/api/v20/aggregate/dashboard/?notifications_size=0', addHeaders({
		'Authorization': 'Token ' + token,
		'X-Source': 'web'
	}));
	
	var json = getJson(html);
	
	var result = {success: true};
	
	AnyBalance.trace('Найдено лицевых счетов: ' + json.accounts.length);

	if(json.accounts.length < 1)
		throw new AnyBalance.Error('У вас нет ни одного лицевого счета');

	var curAcc;
	for(var i=0; i<json.accounts.length; ++i){
		var acc = json.accounts[i];
		AnyBalance.trace('Найден лицевой счет ' + acc.number);
		if(!curAcc && (!prefs.num || endsWith(acc.number, prefs.num))){
			AnyBalance.trace('Выбран лицевой счет ' + acc.number);
			curAcc = acc;
		}
	}

	if(!curAcc)
		throw new AnyBalance.Error('Не удалось найти лицевой счет с последними цифрами ' + prefs.num);
	
	var accUid = curAcc._uid;
	
	getParam(curAcc.number, result, 'account');
	getParam(curAcc.number, result, '__tariff');
	getParam(curAcc.address, result, 'address');
	
	if(AnyBalance.isAvailable('email', 'phone', 'fio')) {
	    getParam(json.email, result, 'email');
	    getParam(json.phone, result, 'phone', null, [replaceTagsAndSpaces, /.*(\d)(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+$1 $2 $3-$4-$5']);
	    getParam(json.last_name + ' ' + json.first_name + ' ' + json.middle_name, result, 'fio');
	}
	
	html = AnyBalance.requestGet(baseurl + '/api/v20/aggregate/accounts/' + accUid + '/?tickets_size=27', addHeaders({
		'Authorization': 'Token ' + token,
		'X-Source': 'web'
	}));
	
	var json = getJson(html);
	
	var monthes = {0: 'Январь', 1: 'Февраль', 2: 'Март', 3: 'Апрель', 4: 'Май', 5: 'Июнь', 6: 'Июль', 7: 'Август', 8: 'Сентябрь', 9: 'Октябрь', 10: 'Ноябрь', 11: 'Декабрь'};
	
	if(AnyBalance.isAvailable('balance', 'charge', 'chargecorrect', 'period', 'debt', 'incomingbalance', 'paid', 'penalty', 'subsidy')) {
	    var items = json.receipts;
	    if(items && items.length && items.length > 0){
	    	AnyBalance.trace('Найдено начислений: ' + items.length);
	    	getParam(items[0].debt, result, 'balance', null, null, parseBalance);
			getParam(items[0].charge, result, 'charge', null, null, parseBalance);//
			getParam(items[0].charge_correct, result, 'chargecorrect', null, null, parseBalance);//
	    	var lastPeriod = getParam(items[0].period, null, null, null, null, parseDateISO);
			if(lastPeriod){
			    var dt = new Date(lastPeriod);
			    getParam(monthes[dt.getMonth()] + ' ' + dt.getFullYear(), result, 'period');
			}
			getParam(items[0].incoming_balance, result, 'incomingbalance', null, null, parseBalance);
			getParam(items[0].paid, result, 'paid', null, null, parseBalance);
			getParam(items[0].penalty, result, 'penalty', null, null, parseBalance);
			getParam(items[0].subsidy, result, 'subsidy', null, null, parseBalance);
	    }else{
 	    	AnyBalance.trace('Не удалось получить данные по последнему начислению');
 	    }
	}
	
	if(AnyBalance.isAvailable('paymentday', 'readingday')) {
	    getParam(json.final_payment_date, result, 'paymentday', null, null, parseDateISO);
	    getParam(json.final_reading_date, result, 'readingday', null, null, parseDateISO);
	}

    if(AnyBalance.isAvailable('lastpaysum', 'lastpaydate', 'lastpayplace')) {
	    var items = json.payments;
	    if(items && items.length && items.length > 0){
	    	AnyBalance.trace('Найдено платежей: ' + items.length);
	    	getParam(items[0].amount, result, 'lastpaysum', null, null, parseBalance);
	    	getParam(items[0].payment_date, result, 'lastpaydate', null, null, parseDateISO);
			getParam(items[0].payment_point, result, 'lastpayplace');
	    }else{
 	    	AnyBalance.trace('Не удалось получить данные по последнему платежу');
 	    }
	}
	
	AnyBalance.setResult(result);
}