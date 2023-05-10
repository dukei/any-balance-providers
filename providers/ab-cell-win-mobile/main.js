
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'application/json, text/plain, */*',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Connection': 'keep-alive',
	'Origin': 'https://lknew.mobile-win.ru',
    'Platform': 'web',
	'Referer': 'https://lknew.mobile-win.ru/',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36'
};

var baseurl = 'https://appnew.mobile-win.ru/api/v1/';
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

function saveTokens(json){
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setData('accessToken', json.token);
//	AnyBalance.setData('idToken', json.id_token);
	AnyBalance.setData('refreshToken', json.refreshToken);
    AnyBalance.setData('expiresIn', json.expire);
//	AnyBalance.setData('sessionState', json.session_state);
//	AnyBalance.setData('tokenType', json.token_type);
	AnyBalance.saveData();
}

function callApi(verb, params){
	var accessToken = AnyBalance.getData('accessToken');
	
	var method = 'GET', headers = g_headers;
	if(params){
		method = 'POST';
		headers['Content-Type'] = 'application/json;charset=UTF-8';
	}
	
	headers['Authorization'] = '';
	
	if(accessToken && !/auth\/login/i.test(verb)){
		headers['Authorization'] = accessToken;
	}
	
	AnyBalance.trace('Запрос: ' + baseurl + verb);
	var html = AnyBalance.requestPost(baseurl + verb, JSON.stringify(params), headers, {HTTP_METHOD: method});
	var json = getJson(html);
	AnyBalance.trace('Ответ: ' + JSON.stringify(json));
	if(json.status && json.status.status_http != 200) {
	    var error = json.status.description;
        if(error) {
	    	AnyBalance.trace(html);
        	throw new AnyBalance.Error(error, null, /парол/i.test(error));	
        }
		
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменён?');
    }
	
	json = json.data;

	return json;
}

function loginPure(verb, params, method){  // метод под вопросом
	var prefs = AnyBalance.getPreferences();
	
    var json = callApi('client/auth/login', {login: prefs.login, password: prefs.password, type: 'password'}, 'POST');

	if(json.token){
	    AnyBalance.trace('Токен авторизации получен');
	}else{
		throw new AnyBalance.Error('Не удалось получить токен авторизации. Сайт изменён?');
	}
	
	AnyBalance.setData('login', prefs.login);
	AnyBalance.saveData();
	saveTokens(json);
}

function loginAccessToken(){
	var prefs = AnyBalance.getPreferences();
	var accessToken = AnyBalance.getData('accessToken');
	try{
	    AnyBalance.trace('Токен сохранен. Пробуем войти...');
		var json = callApi('client');
		AnyBalance.trace('Успешно вошли по accessToken');
		return true;
	}catch(e){
		AnyBalance.trace('Не удалось войти по accessToken: ' + e.message);
		saveTokens({});
		return false;
	}
}
/*
function loginRefreshToken(){
	var prefs = AnyBalance.getPreferences();
	var refreshToken = AnyBalance.getData('refreshToken');
	try{
		AnyBalance.trace('Токен устарел. Пробуем обновить...');
		var json = callApi('client/auth/token', {grant_type: 'refresh_token', login: prefs.login, refresh_token: refreshToken}, 'POST');
		AnyBalance.trace('Успешно вошли по refreshToken');
		saveTokens(json);
		return true;
	}catch(e){
		AnyBalance.trace('Не удалось войти по refreshToken: ' + e.message);
		saveTokens({});
		return false;
	}
}
*/
function loginToken(){
	var prefs = AnyBalance.getPreferences();
	
	if(!AnyBalance.getData('accessToken')){
		AnyBalance.trace('Токен не сохранен. Будем логиниться');
		return false;
	}
	
	if(AnyBalance.getData('accessToken') && (AnyBalance.getData('login') !== prefs.login)){
		AnyBalance.trace('Токен соответствует другому логину');
		return false;
	}

	if(loginAccessToken())
		return true;
	
//	return loginRefreshToken(); // Пока рефреш в кабинете не реализован
}

function login(){
	if(!loginToken()){
		loginPure();
	}
}

function main() {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(/^\d{10}$/.test(prefs.login), 'Введите номер телефона (10 цифр без пробелов и разделителей)!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var cc = {};

	login();

	var result = {success: true};
	
	var json;
	
	json = callApi('client/balance');
	
	getParam(json.balance, result, 'balance', null, null, parseBalance);
	getParam(json.bonuses, result, 'bonuses', null, null, parseBalance);
	
	if(json.remains){
		getCounters(json.remains);
	}else{
		AnyBalance.trace('Не удалось получить информацию по остаткам');
	}
	
	function getCounters(val){
        AnyBalance.trace('Все остатки: '+ JSON.stringify(val));
        for(var i=0; i<val.length; ++i){
        	var rem = val[i];
			var unlim = /-1$/i.test(rem.quota.value); //Безлимитные пакеты имеют значение -1
        	if(rem.quota.type == 'phone' || /минут[ы]?|звонки/i.test(rem.name)){ // Минуты
			    if(unlim){
				    AnyBalance.trace('Безлимитный пакет минут ' + rem.name + '. Пропускаем...');
				    continue;
				}
        		setCounter(rem, 'min')
        	}else if(rem.quota.type == 'sms' || /sms|смс|сообщени[й|я]/i.test(rem.name)){ // SMS
			    if(unlim){
				    AnyBalance.trace('Безлимитный пакет SMS ' + rem.name + '. Пропускаем...');
				    continue;
				}
        		setCounter(rem, 'sms')
        	}else if(rem.quota.type == 'internet' || /интернет|трафик/i.test(rem.name)){ // Гигабайты
			    if(unlim){
				    AnyBalance.trace('Безлимитный пакет трафика ' + rem.name + '. Пропускаем...');
				    continue;
				}
        		setCounter(rem, 'traffic')
        	}else{
        		AnyBalance.trace('Неизвестный тип данных: ' + JSON.stringify(rem));
			}
        }
    }

    function setCounter(rem, counter){
       	if(!cc[counter]){
    		cc[counter] = 1;
    	}else{
	    	cc[counter] += 1;
		}
   	    if(rem.quota.unit_id == '3'){ // Это Гигабайты
   	    	getParam(rem.value + ' Gb', result, counter + '_left' + cc[counter], null, null, parseTraffic);
   	    }else if(rem.quota.unit_id == '4'){ // Это Мегабайты
   	    	getParam(rem.value + ' Mb', result, counter + '_left' + cc[counter], null, null, parseTraffic);
		}else{
			getParam(rem.value, result, counter + '_left' + cc[counter], null, null, parseBalance);
		}
   	    if(prefs.needPref || !AnyBalance.isAvailable(counter + '_left' + cc[counter])){
   	    	result[counter + '_left_name' + cc[counter]] = (rem.name + ': ');
		}
		
		var dat = getParam(rem.expires.replace(/(\d*)-(\d*)-(\d*)(T?[\s\S]*)/, '$3.$2.$1'), null, null, null, null, parseDate);
        if(dat && (!result.dateOfExpire || dat > result.dateOfExpire)){
			getParam(dat, result, 'dateOfExpire');
		}
    }
	
	json = callApi('client/tariffs');
	
	getParam(json.name, result, '__tariff');
	getParam(json.price, result, 'abon', null, null, parseBalance);
	
	if(AnyBalance.isAvailable(['total_spent', 'total_payments'])){
		var dt = new Date();
	    var startDate = dt.getFullYear() + '-' + n2(dt.getMonth()+1) + '-' + '01';
	    var finishDate = dt.getFullYear() + '-' + n2(dt.getMonth()+1) + '-' + n2(dt.getDate());
		
	    json = callApi('client/costs/statistics?start_date=' + startDate + '&finish_date=' + finishDate);
	    
	    getParam(json.charges_sum, result, 'total_spent', null, null, parseBalance);
		getParam(json.pay_sum, result, 'total_payments', null, null, parseBalance);
	}
	
	if(AnyBalance.isAvailable(['last_oper_date', 'last_oper_sum', 'last_oper_desc'])){
		var dt = new Date();
	    var dtPrev = new Date(dt.getFullYear(), dt.getMonth()-1, dt.getDate());
	    var startDate = dtPrev.getFullYear() + '-' + n2(dtPrev.getMonth()+1) + '-' + n2(dtPrev.getDate());
	    var finishDate = dt.getFullYear() + '-' + n2(dt.getMonth()+1) + '-' + n2(dt.getDate());
		
	    json = callApi('client/costs?start_date=' + startDate + '&finish_date=' + finishDate);
	    
	    if(json && json.length > 0){
			AnyBalance.trace('Найдено операций: ' + json.length);
			for(var i=0; i<json.length; ++i){
				var p = json[i];
				
				if(p.type == 'payments' || p.type == 'service'){
					getParam(p.date, result, 'last_oper_date', null, null, parseDateISO);
				    getParam(p.total_sum, result, 'last_oper_sum', null, null, parseBalance);
				    getParam(p.description, result, 'last_oper_desc');
					
					break;
				}
			}
		}else{
			AnyBalance.trace('Не удалось получить историю операций');
		}
	}
	
	if(AnyBalance.isAvailable(['email', 'phone', 'fio'])){
	    json = callApi('client');
	    
	    getParam(json.email, result, 'email');
	    getParam(json.msisdn, result, 'phone', null, replaceNumber);
	    getParam(json.full_name, result, 'fio', null, null, capitalFirstLetters);
	}
	
	AnyBalance.setResult(result);
}	