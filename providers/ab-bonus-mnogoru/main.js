/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.7,en;q=0.4',
	'Connection': 'keep-alive',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36'
};

function main(){
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');

	var baseurl = 'https://www.mnogo.ru/';
	
	var id = AnyBalance.getData('id' + prefs.login);
	var token = AnyBalance.getData('token' + prefs.login);
	
	AnyBalance.restoreCookies();
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
	}
	
	var html = AnyBalance.requestGet(baseurl + 'userapi/login/token', addHeaders({
		'Accept': 'application/json, text/plain, */*',
		'Authorization': 'Bearer ' + token,
		'Content-Type': 'application/x-www-form-urlencoded',
		'Referer': baseurl + 'content/'
	}));
	
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
	if(!json.result || json.state !== 'ok'){
	    AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		clearAllCookies();
		
	    var params = {};
		
		checkEmpty(prefs.login, 'Введите логин!');
	    if (!/@/i.test(prefs.login) && prefs.login.length < 8)
	    	throw new AnyBalance.Error('Номер карты должен содержать не менее 8 символов, проверьте поле', false, true);
		
		if (!/@/i.test(prefs.login)){
	        checkEmpty(prefs.password, 'Введите пароль!');
			var urlPart1 = 'card';
			params.card_number = prefs.login;
        }else{
			var urlPart1 = 'email';
			params.email = prefs.login;
		}
		
		if (prefs.method === 'pass'){
	        checkEmpty(prefs.password, 'Введите пароль!');
			var urlPart2 = 'password';
			params.password = prefs.password;
        }
	    
	    if (prefs.method === 'birth'){
	        checkEmpty(/(\d{2})\D(\d{2})\D(\d{4})/.test(prefs.birthday), 'Дата рождения должна быть в формате ДД.ММ.ГГГГ, например: 28.04.1980');
			var urlPart2 = 'birthday';
            
		    var matches = /(\d{2})\D(\d{2})\D(\d{4})/.exec(prefs.birthday);
	        if(!matches)
	        	throw new AnyBalance.Error('Дата рождения должна быть в формате ДД.ММ.ГГГГ, например: 28.04.1980');
		
		    var dt = new Date(matches[2]+'/'+matches[1]+'/'+matches[3]);
	        if(isNaN(dt))
	        	throw new AnyBalance.Error('Неверная дата ' + prefs.birthday);
		
			params.birthday_date = dt.getFullYear() + '-' + n2(dt.getMonth()+1) + '-' + n2(dt.getDate());
		}
	    
	    var html = AnyBalance.requestPost(baseurl + 'userapi/login/' + urlPart1 + '/' + urlPart2, JSON.stringify(params), addHeaders({
	    	'Accept': 'application/json, text/plain, */*',
	    	'Content-Type': 'application/x-www-form-urlencoded',
	    	'Referer': baseurl + 'content/'
	    }));
	
	    var json = getJson(html);
	    AnyBalance.trace(JSON.stringify(json));

	    if (json.state !== 'ok') {
	    	var error = json.errors;
	    	if (error)
				var strError = JSON.stringify(error);
				if (/not_found/i.test(strError))
					throw new AnyBalance.Error('Пользователь с такими учетными данными не существует');
				if (/password_incorrect/i.test(strError))
					throw new AnyBalance.Error('Неверный логин или пароль');
                if (/bad_format/i.test(strError))
					throw new AnyBalance.Error('Неверный формат учетных данных');
				
	    		throw new AnyBalance.Error(error, null, /not_found|incorrect/i.test(error));
	    	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	    }
	
	    var id = json.result.id;
	    var token = json.result.auth_token;
	
	    AnyBalance.setData('id' + prefs.login, id);
	    AnyBalance.setData('token' + prefs.login, token);
	    AnyBalance.saveCookies();
	    AnyBalance.saveData();
    }else{
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
		var id = json.result.id;
	    var token = json.result.auth_token;
	
	    AnyBalance.setData('id' + prefs.login, id);
	    AnyBalance.setData('token' + prefs.login, token);
	    AnyBalance.saveCookies();
	    AnyBalance.saveData();
	}
	
	var result = {success: true};
	
	var html = AnyBalance.requestPost(baseurl + 'userapi/user/api/users/get', JSON.stringify({
		"filter":{
			"user_id":{
				"eq":id
			}
		},
		"schema":["cards","points_balance_main","first_name","contacts","is_password_set","external_accounts","auth_type"],
		"limit":1,
		"offset":0
	}), addHeaders({
		'Accept': 'application/json, text/plain, */*',
		'Authorization': 'Bearer ' + token,
		'Content-Type': 'application/x-www-form-urlencoded',
		'Referer': baseurl + 'content/'
	}));
	
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
	getParam(json.result.users[0].points_balance_main, result, 'balance', null, null, parseBalance);
	getParam(json.result.users[0].cards[0].number, result, 'cardnum');
    getParam(json.result.users[0].first_name, result, 'username');
	getParam(json.result.users[0].cards[0].number, result, '__tariff');
    
	AnyBalance.setResult(result);
}
