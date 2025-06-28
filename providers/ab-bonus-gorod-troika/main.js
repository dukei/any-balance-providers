
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.6,en;q=0.4',
	'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36'
};

var baseurl = 'https://gorodtroika.ru';
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(?:\d)?(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

function generateUUID() {
	function s4() {
  		return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
	}
  	return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

function main() {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');
	
	AnyBalance.trace ('Пробуем войти в личный кабинет...');

    var uid = AnyBalance.getData('app-uid');
    var g_token = AnyBalance.getData('token');
	
	html = AnyBalance.requestGet(baseurl + '/api/profile/account?region_id=2', AB.addHeaders({
		'accept': 'application/json',
        'Referer': baseurl + '/app/',
		'x-troikagorod-app-uid': uid,
		'x-troikagorod-auth-token': g_token
	}));
	
	if (/UserNotLogged/i.test(html)) {
    	AnyBalance.trace('Сессия новая. Будем логиниться заново...');
    	clearAllCookies();
		
		checkEmpty(prefs.login, 'Введите логин!');
        if (/^\d+$/.test(prefs.login)){
	        checkEmpty(/^\d{10}$/.test(prefs.login), 'Введите номер телефона - 10 цифр без пробелов и разделителей!');
	    }
	    checkEmpty(prefs.password, 'Введите пароль!');

        var uid = AnyBalance.getData('app-uid');
	    if(!uid){
		    uid = generateUUID();
		    AnyBalance.setData('app-uid', uid);
		    AnyBalance.saveData();
	    }
		
		html = AnyBalance.requestGet(baseurl + '/app/sign-in', AB.addHeaders({'Referer': baseurl + '/'}));
	
	    AnyBalance.trace('Пробуем войти по логину ' + prefs.login + ' и паролю...');
	
	    html = AnyBalance.requestPost(baseurl + '/api/authorization/phone', [
		['phone',prefs.login]
		], addHeaders({
	    	'Accept': 'application/json',
	    	'accept-encoding': 'gzip, deflate, br',
	    	'origin': baseurl,
	    	'Referer': baseurl + '/app/sign-in',
	    	'x-requested-with': 'XMLHttpRequest',
            'x-troikagorod-app-uid': uid,
			'x-troikagorod-auth-token': ''
	    }));
	
	    var json = getJson(html);
	    AnyBalance.trace(JSON.stringify(json));
	
	    if (!json.result || json.result != 'success') {
            if (json.errors[0].descriptions[0].message) {
	        	var error = json.errors[0].descriptions[0].message;
             	if (error) {
	        		AnyBalance.trace(html);
             		throw new AnyBalance.Error(error);	
            	}

             	AnyBalance.trace(html);
            	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменён?');
            }
        }
	
	    if (json.result == 'success' && json.nextStep == 'captcha') {
	    	AnyBalance.trace('Сайт затребовал подтверждение входа с помощью ввода текста с картинки');
			
			html = AnyBalance.requestGet(baseurl + '/api/authorization/captcha/metadata?phone=' + prefs.login + '&region_id=2', addHeaders({
	        	'Accept': 'application/json',
	        	'accept-encoding': 'gzip, deflate, br',
	        	'origin': baseurl,
	        	'Referer': baseurl + '/app/sign-in',
	        	'x-requested-with': 'XMLHttpRequest',
                'x-troikagorod-app-uid': uid,
		    	'x-troikagorod-auth-token': ''
	        }));
	
	        var json = getJson(html);
	        AnyBalance.trace(JSON.stringify(json));
		
	    	var captchaId = json.captcha.id;
	    	var captchaImg = AnyBalance.requestGet('https://api.troika-gorod.ru/auth_image/?' + captchaId, g_headers);
            var captcha = AnyBalance.retrieveCode('Вы входите с нового устройства.\nДля подтверждения входа введите текст с картинки', captchaImg, {inputType: 'number'});
		
	    	var params = [
			    ['captcha_id',captchaId],
	        	['captcha_code', captcha],
	    		['phone',prefs.login],
	        ];
	
	        html = AnyBalance.requestPost(baseurl + '/api/authorization/captcha', params, addHeaders({
	        	'Accept': 'application/json',
	        	'accept-encoding': 'gzip, deflate, br',
	        	'origin': baseurl,
	        	'Referer': baseurl + '/app/sign-in',
	        	'x-requested-with': 'XMLHttpRequest',
                'x-troikagorod-app-uid': uid,
		    	'x-troikagorod-auth-token': ''
	        }));
	
	        var json = getJson(html);
	        AnyBalance.trace(JSON.stringify(json));
		
	    	if (!json.result || json.result != 'success') {
                if (json.errors[0].descriptions[0].message) {
	            	var error = json.errors[0].descriptions[0].message;
                 	if (error) {
	            		AnyBalance.trace(html);
                		throw new AnyBalance.Error(error);	
                	}

                	AnyBalance.trace(html);
                	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменён?');
                }
            }
	    }
		
	    if (json.result == 'success' && json.nextStep == 'phone_confirm') {
	     	AnyBalance.trace('Сайт затребовал подтверждение входа с помощью входящего звонка');
			
			html = AnyBalance.requestGet(baseurl + '/api/authorization/phone/confirm/metadata?phone=' + prefs.login + '&region_id=2', addHeaders({
	        	'Accept': 'application/json',
	        	'accept-encoding': 'gzip, deflate, br',
	        	'origin': baseurl,
	        	'Referer': baseurl + '/app/sign-in',
	        	'x-requested-with': 'XMLHttpRequest',
                'x-troikagorod-app-uid': uid,
		    	'x-troikagorod-auth-token': ''
	        }));
	
	        var json = getJson(html);
	        AnyBalance.trace(JSON.stringify(json));
		
			var code = AnyBalance.retrieveCode('Пожалуйста, введите последние 4 цифры номера телефона из звонка, поступившего на ваш номер ' + '+7' + prefs.login, null, {inputType: 'number', time: 170000});
		
	     	var params = [
			    ['phone',prefs.login],
	         	['code', code],
	        ];
	
	        html = AnyBalance.requestPost(baseurl + '/api/authorization/phone/confirm', params, addHeaders({
	        	'Accept': 'application/json',
	        	'accept-encoding': 'gzip, deflate, br',
	        	'origin': baseurl,
	        	'Referer': baseurl + '/app/sign-in',
	        	'x-requested-with': 'XMLHttpRequest',
                'x-troikagorod-app-uid': uid,
		    	'x-troikagorod-auth-token': ''
	        }));
	
	        var json = getJson(html);
	        AnyBalance.trace(JSON.stringify(json));
		
	    	if (!json.result || json.result != 'success') {
                if (json.errors[0].descriptions[0].message) {
	            	var error = json.errors[0].descriptions[0].message;
                	if (error) {
	            		AnyBalance.trace(html);
                		throw new AnyBalance.Error(error);	
                	}

                	AnyBalance.trace(html);
                	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменён?');
                }
            }
        }
		
		if (json.result == 'success' && json.nextStep == 'password') {
		
	     	var params = [
			    ['phone',prefs.login],
	         	['password', prefs.password],
	        ];
	
	        html = AnyBalance.requestPost(baseurl + '/api/authorization/password', params, addHeaders({
	        	'Accept': 'application/json',
	        	'accept-encoding': 'gzip, deflate, br',
	        	'origin': baseurl,
	        	'Referer': baseurl + '/app/sign-in',
	        	'x-requested-with': 'XMLHttpRequest',
                'x-troikagorod-app-uid': uid,
		    	'x-troikagorod-auth-token': ''
	        }));
	
	        var json = getJson(html);
	        AnyBalance.trace(JSON.stringify(json));
		
	    	if (!json.result || json.result != 'success') {
                if (json.errors[0].descriptions[0].message) {
	            	var error = json.errors[0].descriptions[0].message;
                	if (error) {
	            		AnyBalance.trace(html);
                		throw new AnyBalance.Error(error);	
                	}

                	AnyBalance.trace(html);
                	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменён?');
                }
            }
        }
	
	    var g_token = json.token;
	    AnyBalance.trace('Токен авторизации: ' + g_token);

        AnyBalance.setData('token', g_token);
	    AnyBalance.saveCookies();
	    AnyBalance.saveData();
    } else {
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
    	AnyBalance.restoreCookies();
    }

	var result = {success: true};
	
	html = AnyBalance.requestGet(baseurl + '/api/profile/account?region_id=2', AB.addHeaders({
		'accept': 'application/json',
        'Referer': baseurl + '/app/',
		'x-troikagorod-app-uid': uid,
		'x-troikagorod-auth-token': g_token
	}));
	
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
	getParam(json.availableBonuses, result, 'balance', null, null, parseBalance);
	getParam(json.expectedBonuses, result, 'expected', null, null, parseBalance);
	var currExp = getParam(json.experience, result, 'experience', null, null, parseBalance);
	getParam(json.unreadNotificationsCount, result, 'notifications', null, null, parseBalance);
	
	html = AnyBalance.requestGet(baseurl + '/api/site/wallet?region_id=2', AB.addHeaders({
		'accept': 'application/json',
        'Referer': baseurl + '/app/',
		'x-troikagorod-app-uid': uid,
		'x-troikagorod-auth-token': g_token
	}));
	
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
	if(json.elements && json.elements.length > 0){
		AnyBalance.trace('Найдено виджетов: ' + json.elements.length);
		for(var i=0; json.elements && i<json.elements.length; ++i){
		    var element = json.elements[i];
			
			if(element.type == 'troika'){
				var _tikets = [];
				for(var j=0; element.tickets && j<element.tickets.length; ++j){
		    	    var ticket = element.tickets[j];
					AnyBalance.trace('Найден билет: ' + ticket.name);
				    
				    if(/Кошел[её]к/i.test(ticket.name)){
						getParam(ticket.value, result, 'wallet', null, null, parseBalance);
					}else{
						_tikets.push(ticket);
					}
				}
			}else if(element.type == 'subscription'){
				getParam((element.name ? element.name + ': ' : '') + element.statusName, result, 'subscription');
			}
		}
		
        if(_tikets && _tikets.length > 0){
			for(var k=0; _tikets && k<_tikets.length; ++k){
				var name_tickettype = 'tickettype' + (k || ''), name_ticketdays = 'ticketdays' + (k || '');
		        var t = _tikets[k];
				
			    getParam(t.name, result, name_tickettype, null, null, null);
				getParam(t.value, result, name_ticketdays, null, null, parseBalance);
			}
		}
	}else{
		AnyBalance.trace('Не удалось получить данные по виджетам');
	}
	
	html = AnyBalance.requestGet(baseurl + '/api/profile/status/?region_id=2', AB.addHeaders({
		'accept': 'application/json',
        'Referer': baseurl + '/app/',
		'x-troikagorod-app-uid': uid,
		'x-troikagorod-auth-token': g_token
	}));
	
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
	getParam(json.game.level.name, result, 'level');
	var lvlNum = json.game.level.number;
	getParam('Уровень ' + lvlNum, result, 'levelnum');
	getParam(json.game.level.percent, result, 'percent', null, null, parseBalance);
	var nextExp = getParam(json.game.nextLevelExperience, result, 'nextlevelexp', null, null, parseBalance);
	if (currExp && nextExp)
		getParam(nextExp - currExp, result, 'tonextlevel', null, null, parseBalance);
	getParam(json.troika[0].number, result, 'cardnum', null, [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d\d)(\d\d\d)(\d\d\d)$/, '$1-$2-$3']);
	getParam(json.troika[0].number, result, '__tariff', null, [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d\d)(\d\d\d)(\d\d\d)$/, '$1-$2-$3']);
	getParam(json.user.region.name, result, 'region');
	var fio = json.user.name; // Если пользователь не указал в профиле фамилию, значение свойства "name" имеет вид "Имя null", поэтому делаем в виде сводки
	    if (json.user.surname)
	    	fio+=' '+json.user.surname;
	    getParam(fio, result, 'fio');
	getParam(prefs.login, result, 'phone', null, replaceNumber);
	
	if(isAvailable(['currmonthvisitscount', 'totalvisitscount', 'totalstationscount'])){
	    html = AnyBalance.requestGet(baseurl + '/api/troika/visits/history?limit=1&region_id=2', AB.addHeaders({
		    'accept': 'application/json',
            'Referer': baseurl + '/app/',
		    'x-troikagorod-app-uid': uid,
		    'x-troikagorod-auth-token': g_token
	    }));
	    
	    var json = getJson(html);
	    AnyBalance.trace(JSON.stringify(json));
		
		if(json.metadata){
		    getParam(json.metadata.currentMonthVisitsCount, result, 'currmonthvisitscount', null, null, parseBalance);
		    getParam(json.metadata.totalVisitsCount, result, 'totalvisitscount', null, null, parseBalance);
			getParam(json.metadata.stationsCount, result, 'totalstationscount', null, null, parseBalance);
		}else{
		    AnyBalance.trace('Не удалось получить статистику поездок');
	    }
	}
	
	if(isAvailable(['last_trip_desc', 'last_trip_date'])){
	    html = AnyBalance.requestGet(baseurl + '/api/troika/visits?limit=10&region_id=2', AB.addHeaders({
		    'accept': 'application/json',
            'Referer': baseurl + '/app/',
		    'x-troikagorod-app-uid': uid,
		    'x-troikagorod-auth-token': g_token
	    }));
	    
	    var json = getJson(html);
	    AnyBalance.trace(JSON.stringify(json));
		
	    if(json.elements && json.elements.length > 0){
		    AnyBalance.trace('Найдено поездок: ' + json.elements.length);
		    for(var i=0; json.elements && i<json.elements.length; ++i){
		        var element = json.elements[i];
				
				if(element.station && element.station.lines && element.station.lines.length){
					var _lines = {};
					for(var j=0; j<element.station.lines.length; ++j){
						var line = element.station.lines[j];
                        
						sumParam(line.name, _lines, '__n', null, null, null, create_aggregate_join(' → '));
					}
				}
				
				getParam(element.name + ((_lines && _lines.__n) ? ' → ' + _lines.__n : ''), result, 'last_trip_desc');
				getParam(element.entryAt + '+03:00:00', result, 'last_trip_date', null, null, parseDateISO);
			    
				break;
		    }
	    }else{
		    AnyBalance.trace('Не удалось получить данные по поездкам');
	    }
	}
	
	if(isAvailable(['last_oper_desc', 'last_oper_date', 'last_oper_sum', 'last_oper_bonuses', 'last_oper_experience'])){
	    html = AnyBalance.requestGet(baseurl + '/api/profile/operations?limit=50&region_id=2&sort=date&sort_order=desc', AB.addHeaders({
		    'accept': 'application/json',
            'Referer': baseurl + '/app/',
		    'x-troikagorod-app-uid': uid,
		    'x-troikagorod-auth-token': g_token
	    }));
	    
	    var json = getJson(html);
	    AnyBalance.trace(JSON.stringify(json));
	    
	    if(json.elements && json.elements.length > 0){
		    AnyBalance.trace('Найдено операций: ' + json.elements.length);
		    for(var i=0; json.elements && i<json.elements.length; ++i){
		        var element = json.elements[i];
				
				getParam(element.name, result, 'last_oper_desc');
				getParam(element.createdAt + '+03:00:00', result, 'last_oper_date', null, null, parseDateISO);
			    getParam(element.amount, result, 'last_oper_sum', null, null, parseBalance);
				getParam(element.bonuses, result, 'last_oper_bonuses', null, null, parseBalance);
				getParam(element.experience, result, 'last_oper_experience', null, null, parseBalance);
			    
				break;
		    }
	    }else{
		    AnyBalance.trace('Не удалось получить данные по операциям');
	    }
	}

	AnyBalance.setResult(result);
}
