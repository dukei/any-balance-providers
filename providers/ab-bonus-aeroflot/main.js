/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Language': 'ru,ru-RU;q=0.9,en-US;q=0.8,en;q=0.7,uk;q=0.6',
	'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'Content-Type':'application/json',
	'Origin':'https://www.aeroflot.ru',
	'Referer':'https://www.aeroflot.ru/',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
};

var baseurl = 'https://gw.aeroflot.ru/api/pr/';
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

var tier_level = {
	BASIC: 'Базовый',
	SILVER: 'Серебряный',
	GOLD: 'Золотой',
	PLATINUM: 'Платиновый'
};

function main() {
    var prefs = AnyBalance.getPreferences();
	
	var baseurl = "https://gw.aeroflot.ru/api/pr/";
	AnyBalance.setDefaultCharset('utf-8');
	
	var token = AnyBalance.getData('token' + prefs.login);
	
    //1. найти frontend/static/js/aac.release.... в get https://www.aeroflot.ru/personal/login
	//2. скачать и найти в нем CLIENT_ID и CLIENT_SECRET
	
	var CLIENT_ID = '52965ca1-f60e-46e3-834d-604e023600f2';
	var CLIENT_SECRET = 'rU0gE3yP1wV0dY6nJ8kY8pD6pI5dF7xP5nH5nR4cH3sC0rK2rR';
	
	g_headers['X-IBM-Client-Id'] = CLIENT_ID;
	g_headers['X-IBM-Client-Secret'] = CLIENT_SECRET;

    if(token){
        g_headers.authorization = token;
        AnyBalance.trace('Токен авторизации сохранен. Пробуем войти...');
        try{
            var json = callAPI('LKAB/Profile/v3/get', {lang: "ru", data: {}});
			AnyBalance.trace('Успешно вошли по accessToken');
        }catch(e){
			AnyBalance.trace('Не удалось войти по accessToken');
	        var token = '';
            AnyBalance.setData('token' + prefs.login, '');
            AnyBalance.saveData('token' + prefs.login, '');
	    }
    }
	
    if(!token){
        checkEmpty(prefs.login, 'Введите логин');
        checkEmpty(prefs.login, 'Введите пароль');
	
	    AnyBalance.trace('Сессия новая. Будем логиниться заново...');
	
	    var html = AnyBalance.requestGet('https://www.aeroflot.ru/personal/login', g_headers);

        var params = {
            "lang": "ru",
            "data": {
                "oidc": {
                    "clientId": CLIENT_ID,
                    "scopes": [
                        "openid",
                        "user-loyalty-profile",
                        "personal-cabinet",
                        "feedback"
                    ],
                    "responseTypes": [
                        "code",
                        "id_token",
                        "token"
                    ],
                    "nonce": Math.random().toString(),
                    "redirectUri": "https://www.aeroflot.ru/auth/app"
                },
                "auth": {
                    "login": prefs.login,
                    "password": prefs.password
                },
                "tfa": {
                    "fingerprint": "a2d6c37b8f2363c821b8f7a0575a9dcd",
                    "fingerprintRaw": "{\"excludes\":{\"userAgent\":true,\"language\":true,\"timezoneOffset\":true,\"timezone\":true,\"sessionStorage\":true,\"localStorage\":true,\"indexedDb\":true,\"openDatabase\":true,\"addBehavior\":true,\"plugins\":true,\"fonts\":true,\"fontsFlash\":true,\"audio\":true,\"hasLiedLanguages\":true,\"adBlock\":true,\"enumerateDevices\":true,\"wasRedirect\":false}}"
                },
                "relogin": true
            }
        }

        AnyBalance.setCookie('aeroflot.ru', 'AF_preferredLanguage', 'ru');
        AnyBalance.setCookie('aeroflot.ru', 'AF_preferredLocale', 'ru');

        var json = callAPI('AAC/Authorization/v1/get', params);

        if(!json.data.tokens){
	        AnyBalance.trace(html);
	        throw new AnyBalance.Error('Не удалось получить токен авторизации. Сайт изменен?');
	    }
	
        g_headers.authorization = json.data.tokens.tokenType + ' ' + json.data.tokens.accessToken;

        var json = callAPI('LKAB/Profile/v3/get', {lang: "ru", data: {}});
        AnyBalance.setData('token' + prefs.login, g_headers.authorization);
        AnyBalance.saveData();
    }

    var result = {success: true};
	
	var loyaltyInfo = json.data && json.data.loyaltyInfo;
	var contactInfo = json.data && json.data.contact;
	
	getParam(loyaltyInfo.miles.balance + '', result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(loyaltyInfo.currentYearStatistics.qualifyingMiles   + '', result, 'qmiles', null, replaceTagsAndSpaces, parseBalance);
	getParam(loyaltyInfo.currentYearStatistics.segments   + '', result, 'segments', null, replaceTagsAndSpaces, parseBalance);
	getParam(loyaltyInfo.currentYearStatistics.businessSegments  + '', result, 'segmentsBusiness', null, replaceTagsAndSpaces, parseBalance);
	getParam(loyaltyInfo.miles.activityDate , result, 'milesActivityDate', null, replaceTagsAndSpaces, parseDateISO);
	getParam(loyaltyInfo.miles.expirationDate , result, 'milesExpirationDate', null, replaceTagsAndSpaces, parseDateISO);
	getParam(loyaltyInfo.tierLevelExpirationDate , result, 'levelExpirationDate', null, replaceTagsAndSpaces, parseDateISO);
	getParam(loyaltyInfo.regDate , result, 'regDate', null, replaceTagsAndSpaces, parseDateISO);
	getParam(tier_level[loyaltyInfo.tierLevel]||loyaltyInfo.tierLevel, result, 'level');
	getParam(loyaltyInfo.loyaltyId , result, '__tariff');
	getParam(loyaltyInfo.loyaltyId, result, 'partnum');
	
	var regName = {};
	sumParam(contactInfo.firstName, regName, '__rn', null, null, null, create_aggregate_join(' '));
	sumParam(contactInfo.middleName, regName, '__rn', null, null, null, create_aggregate_join(' '));
	sumParam(contactInfo.lastName, regName, '__rn', null, null, null, create_aggregate_join(' '));
	getParam(regName.__rn, result, 'regname');
	
	getParam(contactInfo.forumNickName, result, 'nickname');
	getParam(contactInfo.email, result, 'email');
	getParam(contactInfo.phones && contactInfo.phones[0] && contactInfo.phones[0].phoneNumber, result, 'phone', null, replaceNumber);
	
	var person = {};
	sumParam(contactInfo.firstNameRu, person, '__pn', null, null, null, create_aggregate_join(' '));
	sumParam(contactInfo.middleNameRu, person, '__pn', null, null, null, create_aggregate_join(' '));
	sumParam(contactInfo.lastNameRu, person, '__pn', null, null, null, create_aggregate_join(' '));
	getParam(person.__pn, result, 'fio', null, null, capitalFirstLetters);
	
    AnyBalance.setResult(result);
}

function callAPI(location, params) {
	AnyBalance.trace('Запрос: ' + location);
	
	var html = AnyBalance.requestPost(baseurl + location, JSON.stringify(params), g_headers);
	
    AnyBalance.trace('Ответ:' + html);
	
	if(!html || AnyBalance.getLastStatusCode() > 401) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
	}
	
	var json = getJson(html);
	
	if(json.errors && json.errors.length > 0){
		var error = json.errors[0].userMessage;
		if(/робот/i.test(error)){
			AnyBalance.trace('Аэрофлот требует решить капчу');
			params.data.auth.captchaText = solveRecaptcha(error, 'https://www.aeroflot.ru/aac/app/ru-ru/login', '6LfPVBETAAAAAFL_KotHis1PSaeI3UV11RplpwTo');
			return callAPI(location, params);
		}else{
			throw new AnyBalance.Error(error, false, /парол/i.test());	
		}
	}
	
	if(json.data.consents && json.data.consents.isNeeded) 
		throw new AnyBalance.Error('Требуется согласие с пользовательским соглашением. Предоставьте его через сайт или мобильное приложение Аэрофлот',false,true);
	
	if(json.data.tfa && json.data.tfa.isNeeded){
	    if (json.data.tfa.action == 'enter_pin'){
	   	    var code = json.data.tfa.code;
		    var tfa = callAPI('AAC/SmsInfo/Limits/v1/get',{lang:"ru",confirmationToken:code})
//		    var pin = AnyBalance.retrieveCode('На Ваш номер +'+json.data.tfa.smsinfo.phone.fullNumber+' направлен код подтверждения. Попыток: '+(tfa.data.attemptLimit.total-tfa.data.attemptLimit.current)+' из '+tfa.data.attemptLimit.total+'Введите полученный код', null, {
		    var pin = AnyBalance.retrieveCode('На Ваш номер направлен код подтверждения. Введите полученный код', null, {
				inputType: 'number',
				minLength: 4,
				maxLength: 4,
				time: 180000//(tfa.data.timeSecondsLimit.total-tfa.data.timeSecondsLimit.current)
			});
		    var tfa = callAPI('AAC/2FA/Confirm/v1/get', {lang: "ru", data: {code: code, pin: pin.toString()}})
	    }else{
		    AnyBalance.trace(JSON.stringify(json));
		    throw new AnyBalance.Error('Не поддерживаемый тип подтверждения авторизации: ' + json.data.tfa.action);
	    }
	}
	
	return json;
}

var ALPHABET_STRING = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
var ALPHABET_SIZE = ALPHABET_STRING.length;

function mainAppAPI(prefs) {
    
    AnyBalance.setDefaultCharset('utf-8');
	
	var json = apiCall('POST:services/v.1/app_auth/hello?_preferredLanguage=ru', {
		email: prefs.login
	});
	
	if(json.data.hash_alg != 'PBKDF2')
		throw new AnyBalance.Error('Данный алгоритм шифрования еще не поддерживается ' + json.data.hash_alg);
	
	var password = prefs.password;
	var salt = json.data.passwd_salt + '';
	var nonce = json.data.nonce + '';
	var captcha = json.data.captcha_url;
	var cfg = {
		keySize: 5,
		iterations: json.data.hash_iter
	};
	
	var hash1 = CryptoJS.PBKDF2(password, salt, cfg);
	var cnonce = cnonceGenerator();
	var hash2 = CryptoJS.SHA1(hash1 + nonce + cnonce) + '';

	if(captcha) {
		AnyBalance.trace('Пытаемся ввести капчу');
		captcha = AnyBalance.requestGet(captcha);
		captcha = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
		AnyBalance.trace('Капча получена: ' + captcha);
	}

	json = apiCall('POST:services/v.1/app_auth/welcome?_preferredLanguage=ru', {
		passwd_hash2: hash2 + '',
		cnonce: cnonce,
		captcha: captcha
	});
	
	var profileJson = apiCall('GET:ws/v.0.0.2/json/profile_info');
	
    var result = {success: true};
	
	getParam(profileJson.data.mileBalance + '', result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(profileJson.data.currentYearMiles + '', result, 'qmiles', null, replaceTagsAndSpaces, parseBalance);
	getParam(profileJson.data.currentYearSegments + '', result, 'segments', null, replaceTagsAndSpaces, parseBalance);
	getParam(profileJson.data.currentYearBusinessSegments + '', result, 'segmentsBusiness', null, replaceTagsAndSpaces, parseBalance);
	getParam(profileJson.data.milesActivityDate, result, 'milesActivityDate', null, replaceTagsAndSpaces, parseDateISO);
	getParam(profileJson.data.milesExpirationDate, result, 'milesExpirationDate', null, replaceTagsAndSpaces, parseDateISO);
	getParam(profileJson.data.tierExpirationDate, result, 'levelExpirationDate', null, replaceTagsAndSpaces, parseDateISO);
	getParam(tier_level[profileJson.data.tierLevel]||profileJson.data.tierLevel, result, 'level');
	getParam(profileJson.data.loyalty_id, result, '__tariff');
	getParam(profileJson.data.loyalty_id, result, 'partnum');
	
    AnyBalance.setResult(result);
}

function cnonceGenerator() {
	return getRandomString(16, 32);
}

function getRandomString(minLength, maxLength) {
	//must start with leading 1
	var allowedChars = ALPHABET_STRING;
	var result = "1";

	for(var i=0; i<maxLength; ++i) {
		result += allowedChars.charAt(Math.floor(Math.random() * allowedChars.length));
	}
	
	return result;
}

function mainSite(prefs) {
    checkEmpty(prefs.login, 'Введите логин');
    checkEmpty(prefs.login, 'Введите пароль');

    var baseurl = "https://www.aeroflot.ru/personal/";
    AnyBalance.setDefaultCharset('utf-8');

    var html = AnyBalance.requestGet(baseurl + 'login', g_headers);
    
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'login') 
			return prefs.login;
		else if (name == 'password')
			return prefs.password;

		return value;
	});
     
    html = requestPostMultipart(baseurl + 'login', params, addHeaders({
    	Origin: "https://www.aeroflot.ru",
    	Referer: baseurl + 'login'
    }));

	if (!/\/personal\/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="[^"]*error[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /указали неправильные реквизиты/.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}

    var result = {success: true};
	
    getParam(html, result, 'balance', /<td[^>]+id="member_miles_value"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /<div[^>]+class="name"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);

    if(/signconsentform/i.test(html)){
	AnyBalance.trace('Аэрофлот просит подписать согласие какое-то. Подписываем, ибо иначе придется отказываться от всех милей всё равно.');
	var form = getParam(html, null, null, /<form[^>]+name="signconsentform"[^>]*>([\s\S]*?)<\/form>/i);
	var params = createFormParams(form);
	html = requestPostMultipart(baseurl + 'sign_consent', params, addHeaders({
        	Origin: "https://www.aeroflot.ru",
        	Referer: baseurl + 'sign_consent'
        }));
    }

    if(AnyBalance.isAvailable('qmiles', 'segments')){
	var html = AnyBalance.requestPost(baseurl + 'services/widgets_bulk', {
		widgets:'["miles_exp_date","miles_summary"]',
	}, addHeaders({
    		Origin: "https://www.aeroflot.ru",
    		Referer: AnyBalance.getLastUrl(),
		'X-Requested-With':'XMLHttpRequest'
	}));
	var json = getJson(html);
	if(json.data){
		for(var i=0; i<json.data.length; ++i){
			var o = json.data[i];
			if(!isset(o.current_year_miles_amount))
				continue;
			
    			getParam(o.current_year_miles_amount, result, 'qmiles');
    			getParam(o.current_year_segments_amount, result, 'segments');
			break;
		}
	}else{
		AnyBalance.trace('Информация о квалификационных милях не вернулась: ' + html);
	}
		
    }

    if(AnyBalance.isAvailable('balance') && !isset(result.balance)){
        AnyBalance.trace('Баланс не на странице. Попробуем получить аяксом.');
	html = AnyBalance.requestGet(baseurl + 'ajax/mile_balance', addHeaders({Referer: baseurl, 'X-Requested-With': 'XMLHttpRequest'}));
        getParam(html, result, 'balance', /\d+/i, replaceTagsAndSpaces, parseBalance);
    }
	
    AnyBalance.setResult(result);
}