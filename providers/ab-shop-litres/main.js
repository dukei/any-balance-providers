/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'application/json, text/plain, */*',
	'Accept-Language':'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'App-Id': '115',
	'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'Origin': 'https://www.litres.ru',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
	'Ui-Currency': 'RUB',
    'Ui-Language-Code': 'ru'
};

var baseurl = 'https://www.litres.ru/';
var baseurlApi = 'https://api.litres.ru/foundation/api/';
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

function main() {
	var prefs = AnyBalance.getPreferences();
    
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	g_headers['Session-Id'] = AnyBalance.getData('sId' + prefs.login);
	
	AnyBalance.restoreCookies();
	
	AnyBalance.trace('Пробуем войти в личный кабинет...');
	
	var html = AnyBalance.requestGet(baseurlApi + 'users/me', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 500){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
	}
	
	var json = getJson(html);
	
	AnyBalance.trace(JSON.stringify(json));
	
	if(AnyBalance.getLastStatusCode() > 400){
	    AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		clearAllCookies();
	    
	    var html = AnyBalance.requestPost(baseurlApi + 'auth/login-available', JSON.stringify({
            "login": prefs.login
        }), addHeaders({
		    'Content-Type': 'application/json',
		    'Referer': baseurl + 'auth/login/'
	    }));
	    
	    var json = getJson(html);
	    
	    AnyBalance.trace(JSON.stringify(json));
	    
	    if(json.error || json.status !== 200) {
		    var error = json.error.title;
		    if (error)
			    throw new AnyBalance.Error(error, null, /логин|парол|incorrect/i.test(error));
		    
		    AnyBalance.trace(html);
		    throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	    }
	    
	    var html = AnyBalance.requestPost(baseurlApi + 'auth/login', JSON.stringify({
            "login": prefs.login,
            "password": prefs.password
        }), addHeaders({
		    'Content-Type': 'application/json',
		    'Referer': baseurl + 'auth/login/'
	    }));
	    
	    var json = getJson(html);
	    
	    AnyBalance.trace(JSON.stringify(json));
	    
	    if(json.error || json.status !== 200) {
		    var error = json.error.title;
		    if (error)
			    throw new AnyBalance.Error(error, null, /логин|парол|incorrect/i.test(error));
		    
		    AnyBalance.trace(html);
		    throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	    }
	    
	    if(!json.payload.data.sid)
			throw new AnyBalance.Error('Не удалось получить идентификатор сессии. Сайт изменен?');
	    
	    AnyBalance.setData('sId' + prefs.login, json.payload.data.sid);
		AnyBalance.saveCookies();
    	AnyBalance.saveData();
		
		g_headers['Session-Id'] = AnyBalance.getData('sId' + prefs.login);
    }else{
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
	}
	
	var result = {success: true};
    
	var html = AnyBalance.requestGet(baseurlApi + 'users/me/detailed', addHeaders({'Referer': baseurl}));
	
	var json = getJson(html);
	
	AnyBalance.trace('Профиль: ' + JSON.stringify(json));
	
	var data = json.payload && json.payload.data;
	
	var g_abon = {true: 'Подключена', false: 'Не подключена'};
	
    getParam(data.account.display, result, 'balance', null, null, parseBalance);
	getParam(data.account.bonus, result, 'bonus', null, null, parseBalance);
	getParam(data.cart.purchased_count, result, 'books', null, null, parseBalance);
	getParam(data.cart.deferred_count, result, 'deferred', null, null, parseBalance);
	getParam(data.cart.items_count, result, 'basket', null, null, parseBalance);
	getParam(data.profile.registered_at, result, 'regdate', null, null, parseDateISO);
	getParam(g_abon[data.abonement.is_active]||data.abonement.is_active, result, 'abonement');
	getParam(data.abonement.valid_till, result, 'abonementtill', null, null, parseDateISO);
	getParam(data.profile.nickname, result, 'nickname');
	getParam(data.profile.nickname ? data.profile.nickname : data.login, result, '__tariff');
    getParam(data.profile.email, result, 'email');
	getParam(data.profile.phone_number, result, 'phone', null, replaceNumber);
	var fio = data.profile.first_name;
	var lastName = data.profile.last_name; 
	if(lastName)
		fio += ' ' + lastName;
	getParam(fio, result, 'fio');
	
	if (AnyBalance.isAvailable('lastoperdate', 'lastopersum', 'lastoperdesc')) {
		var html = AnyBalance.requestGet(baseurlApi + 'users/me/operations?limit=50', addHeaders({'Referer': baseurl + 'me/payment/history/'}));
	    
	    var json = getJson(html);
	    
	    AnyBalance.trace('Операции: ' + JSON.stringify(json));
		
		var data = json.payload && json.payload.data;
		
	    if(data){
	    	AnyBalance.trace('Найдено операций: ' + data.length);
			
			var g_oper_type = {PROMOCODE_ACTIVATION: 'Активация промокода'};
			
	        for(var i = 0; i<data.length; i++){
	    		var oper = data[0]
	        	getParam(oper.date, result, 'lastoperdate', null, null, parseDateISO);
				getParam(oper.amount||0, result, 'lastopersum', null, null, parseBalance);
		        getParam(g_oper_type[oper.specific_data.operation_type]||oper.specific_data.operation_type, result, 'lastoperdesc');
	        }
	    }else{
 	    	AnyBalance.trace('Не удалось получить данные по операциям');
	    }
    }	
	
	AnyBalance.setResult(result);
}