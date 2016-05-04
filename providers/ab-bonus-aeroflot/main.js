/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Language': 'ru,en-US;q=0.8,en;q=0.6',
	'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.99 Safari/537.36'
};

var g_APIheaders = {
	'User-Agent': 'Mobile Application/2.5.0.377 (Android 5.0)'
};

var baseurl = "https://www.aeroflot.ru/personal/";

function main() {
    var prefs = AnyBalance.getPreferences();
	
    checkEmpty(prefs.login, 'Введите логин');
    checkEmpty(prefs.login, 'Введите пароль');
	
	mainAppAPI(prefs);
}

function apiCall(method, params) {
	var m = method.split(':');
	
	if(m[0] == 'POST') {
		var html = AnyBalance.requestPost(baseurl + m[1], params, g_APIheaders);
	} else {
		var html = AnyBalance.requestGet(baseurl + m[1], g_APIheaders);
	}
	
	var json = getJson(html);
	
	if(!json.isSuccess) {
		if(json.errors) {
			var errors = [];
			
			for(var i = 0; i < json.errors.length; i++) {
				errors.push(json.errors[i].message);
			}
			
			if(errors.length > 0) {
				var err = errors.join(', ');
				if(/User does not have subscription on sms info/i.test(err)){
					throw new AnyBalance.Error("Аэрофлот требует обязательной подписки на SMS-информирование для входа в личный кабинет. Войдите на https://www.aeroflot.ru/personal через браузер, выполните инструкции в личном кабинете.");
				}

				throw new AnyBalance.Error(err, null, /неправильные реквизиты/i.test(err));
			}
		}
		
		throw new AnyBalance.Error('Error in apiCall!');
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
	getParam(profileJson.data.tierLevel, result, 'level');
	
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