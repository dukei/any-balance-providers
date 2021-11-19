
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
	
	    var params = [
	    	['phone',prefs.login],
	    	['password',prefs.password],
	    ];
	
	    AnyBalance.trace('Пробуем войти по логину ' + prefs.login + ' и паролю...');
	
	    html = AnyBalance.requestPost(baseurl + '/rest/authorization', params, addHeaders({
	    	'Accept': '*/*',
	    	'accept-encoding': 'gzip, deflate, br',
	    	'origin': baseurl,
	    	'Referer': baseurl + '/',
	    	'x-requested-with': 'XMLHttpRequest',
            'x-troikagorod-app-uid': uid
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
		
	    	var captchaId = json.captcha.id;
	    	var captchaImg = AnyBalance.requestGet('https://api.troika-gorod.ru/auth_image/?' + captchaId, g_headers);
            var captcha = AnyBalance.retrieveCode('Вы входите с нового устройства.\nДля подтверждения входа введите текст с картинки', captchaImg, {inputType: 'number'});
		
	    	var params = [
	        	['captcha_code', captcha],
	        	['captcha_id',captchaId],
	    		['phone',prefs.login],
	        ];
	
	        html = AnyBalance.requestPost(baseurl + '/rest/authorization/captcha', params, addHeaders({
	        	'Accept': '*/*',
	        	'accept-encoding': 'gzip, deflate, br',
	        	'origin': baseurl,
	        	'Referer': baseurl + '/',
	        	'x-requested-with': 'XMLHttpRequest',
                'x-troikagorod-app-uid': uid
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
		
	    if (json.result == 'success' && json.nextStep == 'code') {
	     	AnyBalance.trace('Сайт затребовал подтверждение входа с помощью кода из SMS');
		
            var code = AnyBalance.retrieveCode('Пожалуйста, введите код подтверждения, высланный на номер ' + prefs.login, null, {inputType: 'number', time: 170000});
		
	     	var params = [
	         	['code', code],
	        	['password',prefs.password],
	    		['phone',prefs.login],
	        ];
	
	        html = AnyBalance.requestPost(baseurl + '/rest/authorization/code', params, addHeaders({
	        	'Accept': '*/*',
	        	'accept-encoding': 'gzip, deflate, br',
	        	'origin': baseurl,
	        	'Referer': baseurl + '/',
	        	'x-requested-with': 'XMLHttpRequest',
                'x-troikagorod-app-uid': uid
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
	getParam(json.experience, result, 'experience', null, null, parseBalance);
	getParam(json.unreadNotificationsCount, result, 'notifications', null, null, parseBalance);
	
	html = AnyBalance.requestGet(baseurl + '/api/profile/status/?region_id=2', AB.addHeaders({
		'accept': 'application/json',
        'Referer': baseurl + '/app/',
		'x-troikagorod-app-uid': uid,
		'x-troikagorod-auth-token': g_token
	}));
	
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
	getParam(json.game.level.name, result, 'level');
	getParam(json.game.level.percent, result, 'percent', null, null, parseBalance);
	getParam(json.game.nextLevelExperience, result, 'nextlevelexp', null, null, parseBalance);
	getParam(json.troika[0].number, result, 'cardnum', null, [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d\d)(\d\d\d)(\d\d\d)$/, '$1-$2-$3']);
	getParam(json.troika[0].number, result, '__tariff', null, [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d\d)(\d\d\d)(\d\d\d)$/, '$1-$2-$3']);
	getParam(json.user.region.name, result, 'region');
	var fio = json.user.name; // Если пользователь не указал в профиле фамилию, значение свойства "name" имеет вид "Имя null", поэтому делаем в виде сводки
	    if (json.user.surname)
	    	fio+=' '+json.user.surname;
	    getParam(fio, result, 'fio');
	getParam(prefs.login, result, 'phone', null, replaceNumber);

	AnyBalance.setResult(result);
}
