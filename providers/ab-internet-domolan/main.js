
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.6,en;q=0.4',
	'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.88 Safari/537.36'
};

var baseurl = 'https://lk.domolan.ru';
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

function main() {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');
	
	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');
	
	AnyBalance.trace ('Пробуем войти в личный кабинет...');
	
	html = AnyBalance.requestGet(baseurl + '/csrfToken', addHeaders({
		'Accept': 'application/json, text/plain, */*',
       	'Referer': baseurl + '/lk/login'
	}), g_headers);
	
	var g_token = getJson(html)._csrf;
	if (g_token) {
	    AnyBalance.trace ('Токен получен: ' + g_token);
	}else{
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось получить токен авторизации. Сайт изменён?');
	}
		
	var html = AnyBalance.requestPost(baseurl + '/api/login', JSON.stringify({
        "login": prefs.login,
        "password": prefs.password
    }), addHeaders({
		'Accept': 'application/json, text/plain, */*',
       	'Content-Type': 'application/json',
		'Host': 'lk.domolan.ru',
		'Origin': baseurl,
       	'Referer': baseurl + '/lk/login',
	    'X-CSRF-Token': g_token
	}), g_headers);

	if (AnyBalance.getLastStatusCode() === 400) {
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Неверный логин или пароль!');
	}
		
	if (AnyBalance.getLastStatusCode() === 403) {
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменён?');
	}
	
	var result = {success: true};
	
	if (AnyBalance.isAvailable('balance', 'pin', '__tariff', 'abon', 'speed', 'fio', 'phone', 'block_till', 'block_from')) {
	    html = AnyBalance.requestGet(baseurl + '/api/user/data', g_headers);
		var json = getJson(html);
		
        getParam(json.balance, result, 'balance', null, null, parseBalance);
	    getParam(json.payPIN, result, 'pin');
		var tariffId = json.tariffId;
		getParam(json.tariffs[tariffId].name, result, '__tariff');
		getParam(json.tariffs[tariffId].price, result, 'abon', null, null, parseBalance);
		getParam(json.tariffs[tariffId].speed[0], result, 'speed', null, null, parseBalance);
		getParam(json.address, result, 'address');
		getParam(json.name, result, 'fio');
		getParam(json.phone, result, 'phone', null, replaceNumber);
		getParam(json.daysBeforeBlock, result, 'block_till', null, null, parseBalance);
		getParam(json.blocked, result, 'block_from', null, null, parseDate);
	}
	
	if (AnyBalance.isAvailable('balance_start', 'cab_tv', 'lastpay_sum', 'lastpay_date', 'pay_month')) {
		html = AnyBalance.requestPost(baseurl + '/api/balance/history', JSON.stringify({
            "monthDelta": 0
        }), addHeaders({
			'Accept': 'application/json, text/plain, */*',
        	'Content-Type': 'application/json',
		  	'Host': 'lk.domolan.ru',
			'Origin': baseurl,
        	'Referer': baseurl + '/lk',
		   	'X-CSRF-Token': g_token
		}), g_headers);
		
		var json = getJson(html);
		
		if (json) {
		    for(var i=0; i<json.length; ++i){
		        var caption = json[i].caption;
		        if(/Баланс на/i.test(caption)){
		        	getParam(json[i].itog, result, 'balance_start', null, null, parseBalance);
		        }
		    	if(/Услуга кабельного телевидения/i.test(caption)){
		        	getParam(json[i].itog, result, 'cab_tv', null, null, parseBalance);
		        }
		    	if(/Оплата/i.test(caption)){
		        	getParam(json[i].itog, result, 'lastpay_sum', null, null, parseBalance);
		    		getParam(json[i].caption, result, 'lastpay_date', /Оплата[\s\S]*\(([\s\S]*)\)/i, replaceTagsAndSpaces, parseDate);
		    		sumParam(json[i].itog, result, 'pay_month', null, null, parseBalance, aggregate_sum);
		        }
	        }
		} else {
			AnyBalance.trace('Не удалось получить историю платежей');
		}
	}
	
	AnyBalance.setResult(result);
}
