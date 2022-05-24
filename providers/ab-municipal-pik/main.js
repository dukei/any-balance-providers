/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'application/json, text/plain, */*',
	'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Connection': 'Keep-Alive',
	'Host': 'new-api.pik-software.ru',
    'Origin': 'https://new.pik-comfort.ru',
    'Referer': 'https://new.pik-comfort.ru/',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.84 Safari/537.36 OPR/85.0.4341.75',
	'X-User-Meta-Data': '{"appType":"WebApp","OS":"Windows","osVersion":"10","browser":"Chrome","browserVersion":"100.0.4896.127","browserEngine":"Blink 100.0.4896.127","appVersionName":"1.20.0","appVersionCode":"-","device":" ","userTimezone":180}'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://new-api.pik-software.ru';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите номер телефона!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	AnyBalance.trace('Пробуем войти в личный кабинет...');
	
	html = AnyBalance.requestGet(baseurl + '/check-status/?phone=7' + prefs.login, addHeaders({
		'Content-Type': 'application/json'
	}));
	
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
	
	html = AnyBalance.requestGet(baseurl + '/api/v10/aggregate/dashboard-list/?tickets_size=27', addHeaders({
		'Authorization': 'Token ' + token,
		'X-Source': 'web'
	}));
	
	var json = getJson(html);
	
	var result = {success: true};
	
	var info = json.results[0];
	
	AnyBalance.trace('Найдено лицевых счетов: ' + info.accounts.length);

	if(info.accounts.length < 1)
		throw new AnyBalance.Error('У вас нет ни одного лицевого счета');

	var curAcc;
	for(var i=0; i<info.accounts.length; ++i){
		var acc = info.accounts[i];
		AnyBalance.trace('Найден лицевой счет ' + acc.number);
		if(!curAcc && (!prefs.num || endsWith(acc.number, prefs.num))){
			AnyBalance.trace('Выбран лицевой счет ' + acc.number);
			curAcc = acc;
		}
	}

	if(!curAcc)
		throw new AnyBalance.Error('Не удалось найти лицевой счет с последними цифрами ' + prefs.num);
	
	var importId = curAcc.import_id;
	
	getParam(curAcc.number, result, 'account');
	getParam(curAcc.number, result, '__tariff');
	getParam(curAcc.address, result, 'address');
	
	if(AnyBalance.isAvailable('balance', 'charge', 'chargecorrect', 'period', 'debt', 'incomingbalance', 'paid', 'penalty', 'subsidy')) {
	    var items = curAcc.receipts;
	    if(items){
	    	AnyBalance.trace('Найдено начислений: ' + items.length);
	    	getParam(items[0].debt, result, 'balance', null, null, parseBalance);
			getParam(items[0].charge, result, 'charge', null, null, parseBalance);//
			getParam(items[0].charge_correct, result, 'chargecorrect', null, null, parseBalance);//
	    	getParam(items[0].period, result, 'period', null, null, parseDateISO);
			getParam(items[0].incoming_balance, result, 'incomingbalance', null, null, parseBalance);
			getParam(items[0].paid, result, 'paid', null, null, parseBalance);//
			getParam(items[0].penalty, result, 'penalty', null, null, parseBalance);
			getParam(items[0].subsidy, result, 'subsidy', null, null, parseBalance);
	    }else{
 	    	AnyBalance.trace('Не удалось получить данные по последнему начислению');
 	    }
	}
	
	if(AnyBalance.isAvailable('paymentday', 'readingday')) {
	    var payDay = curAcc.final_payment_day;
	    var readDay = curAcc.final_reading_day;
	    var now = new Date();
	    var curDate = now.getDate();
	    if (payDay >= curDate) {
            var addp = 1;
	    } else {
	    	var addp = 2;
	    }
	
	    if (readDay >= curDate) {
            var addr = 1;
	    } else {
	    	var addr = 2;
	    }
	
	    var payDate = payDay + '.' + (now.getMonth() + addp) + '.' + now.getFullYear();
	    var readDate = readDay + '.' + (now.getMonth() + addr) + '.' + now.getFullYear();
	
	    getParam(payDate, result, 'paymentday', null, null, parseDate);
	    getParam(readDate, result, 'readingday', null, null, parseDate);
	}

    if(AnyBalance.isAvailable('lastpaysum', 'lastpaydate', 'lastpayplace')) {
	    var items = curAcc.payments;
	    if(items){
	    	AnyBalance.trace('Найдено платежей: ' + items.length);
	    	getParam(items[0].amount, result, 'lastpaysum', null, null, parseBalance);
	    	getParam(items[0].payment_date, result, 'lastpaydate', null, null, parseDateISO);
			getParam(items[0].payment_point, result, 'lastpayplace');
	    }else{
 	    	AnyBalance.trace('Не удалось получить данные по последнему платежу');
 	    }
	}
	
	getParam(info.phone.replace(/.*(\d)(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+$1 $2 $3-$4-$5'), result, 'phone');
	getParam(info.last_name + ' ' + info.first_name + ' ' + info.middle_name, result, 'fio');
	
	AnyBalance.setResult(result);
}