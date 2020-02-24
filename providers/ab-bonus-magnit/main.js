
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	// Mobile
	//'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+',
	// Desktop
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

var g_apiHeaders = {
	'Connection': 'Keep-Alive',
	'User-Agent': 'okhttp/3.12.0'
};

function callApi(verb, postParams, addH){
	var method = 'GET';
	var h = g_apiHeaders;
	if(isset(postParams)){
		method = 'POST';
	}

	if(addH)
		h = addHeaders(addH, h);
	
	var html = AnyBalance.requestPost('https://moy.magnit.ru/b2c/' + verb, postParams, h, {HTTP_METHOD: method});

	if(!html)
		return {__empty: true};

	var json = getJson(html);
	if(json.error && json.error !== 'OTP_REQUIRED'){
		AnyBalance.trace(html);
		throw new AnyBalance.Error(json.message, null, /парол|password/i.test(json.error.description));
	}

	return json;
}

function login(){
	var prefs = AnyBalance.getPreferences();
	delete g_apiHeaders.Authorization;

	var json = callApi('login', {
		username: '7' + prefs.login,
		password: prefs.password,
		channel: 'O',
		mobileSystem:	'A'
	});

	if(json.error === 'OTP_REQUIRED'){
		AnyBalance.trace(json.message);
		var code = AnyBalance.retrieveCode('Пожалуйста, введите код из SMS для входа в ЛК Магнит', null, {inputType: 'number', timeout: 180000});
		json = callApi('login', {
			username: '7' + prefs.login,
			password: prefs.password,
			channel: 'O',
			mobileSystem:	'A'
		}, {
			'X-CLM-OTP-Token': code
		});
	}

	if(!json.access_token){
		AnyBalance.trace(JSON.stringify(json));
		throw AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	AnyBalance.setData('login', prefs.login);
	AnyBalance.setData('access_token', json.access_token);
	AnyBalance.setData('refresh_token', json.refresh_token);
	AnyBalance.saveData();
}

function setAuthHeaders(){
	var at = AnyBalance.getData('access_token');
	g_apiHeaders.Authorization = 'Bearer ' + at;
	//g_apiHeaders.queryMode = '2';
}

function main() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите номер телефона!');
	AB.checkEmpty(/^\d{10}$/.test(prefs.login), 'Введите 10 цифр номера телефона без пробелов и разделителей, например, 9261234567 !');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var _login = AnyBalance.getData('login');
	if(_login !== prefs.login){
		login();
	}
	
	setAuthHeaders();
	var json;

	try{
		json = callApi('me');
		if(json.anonymized)
			throw new AnyBalance.Error('Not logged in');
	}catch(e){
		//Надо бы по рефреш токену восстановить здесь доступ
		//но пока просто логин
		login();
		setAuthHeaders();
		
		json = callApi('me');
		if(json.anonymized){
			AnyBalance.trace(JSON.stringify(json));
			throw new AnyBalance.Error('Не удалось зайти в личный кабинет после попытки авторизации. Сайт изменен?');
		}
	}


	var result = {
		success: true
	};

	AB.getParam(json.mainPointsBalance/100, result, 'balance');
	AB.getParam(json.firstName, result, 'fio');
	AB.getParam(json.mainIdentifier, result, '__tariff');
	AB.getParam(json.statusName, result, 'status');

	AnyBalance.setResult(result);
}
