/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	Connection: 'Keep-Alive',
	'User-Agent': 'Dalvik/2.1.0 (Linux; Android 9; ONEPLUS A3010_28_190625)',
	'X-Request-ID': '',
	'X-Device-ID': '',
	'os-version': '28',
	'device-model': 'OnePlus3T',
	'instance-id': '',
	'vendor': 'OnePlus',
	'channel': 'mobile',
	'Client-Version': '5060',
	'platform': 'android'

};

function initIds(){
	var prefs = AnyBalance.getPreferences();
    g_headers['instance-id'] = hex_md5(prefs.login).replace(/(\w{8})(\w{4})(\w{4})(\w{4})(\w{12})/, '$1-$2-$3-$4-$5'),
    g_headers['X-Device-ID'] = hex_md5(prefs.login).substr(-20);
}

function generateHex(size){
	var s = '', alphabet = '0123456789abcdef';
	for(var i=0; i<size; ++i){
		s += alphabet.charAt(Math.floor(Math.random()*alphabet.length)); 
	}
	return s;
}

function callApi(verb, params, _headers, allowed_statuses){
	var method = 'GET', params_str = '', headers = g_headers;
	if(params){
		params_str = JSON.stringify(params);
		method = 'POST';
		headers = addHeaders({'Content-Type': 'application/json; charset=UTF-8'}, headers);
	}

	var rid = generateHex(16);
	verb = verb.replace(/%RID%/g, rid);
	headers = addHeaders({'X-Request-ID': rid}, headers);

	if(!allowed_statuses)
		allowed_statuses = ['OK'];
	else
		allowed_statuses.push('OK');
	
	if(_headers)
		headers = addHeaders(_headers, headers);
	
	var html = AnyBalance.requestPost('https://card.ozon.ru/api/' + verb, params_str, headers, {HTTP_METHOD: method});
	var json = getJson(html);
	if(allowed_statuses.indexOf(json.status) < 0){
		var error = (json.messages || []).map(function(m){ return m.code }).join(';\n');
		if(error)
			throw new AnyBalance.Error(error,null, /AUTH_WRONG/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	return json;
}

function callPageJson(url, params){
	return callApi('composer-api.bx/page/json/v1?url=' + encodeURIComponent(url.replace(/^ozon:\//, '')), params);
}

function generateUUID() {
	function s4() {
  		return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
	}
  	return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}


function getDefaultProp(obj){
	for(var prop in obj){
		if(/-default-/.test(prop))
			return obj[prop];
		return obj;
	}
}

function loginPure(){
	var prefs = AnyBalance.getPreferences(), json;
	
	var login = prefs.login;
    if(/^\d{10}$/.test(prefs.login)){
    	AnyBalance.trace('Вход по телефону');
    	login = '+7' + login;
    }else if(/^\d{13}^/.test(prefs.login)){
    	AnyBalance.trace('Вход по штрихкоду');
    }else{
    	throw new AnyBalance.Error('Введите в качестве логина телефон (10 цифр) или штрих-код карты (13 цифр) без пробелов и разделителей!', null, true);
    }
    
    var json = callApi('v0001/authentication/auth-by-secret', {
  		"loginMethod": "",
    	"principal": login,
    	"secret": prefs.password,
    	"type": "AUTO"
	}, {"login-method": "api-pwd"}, ['OTP_REQUIRED']);

	if(json.status === 'OTP_REQUIRED'){
		var code = AnyBalance.retrieveCode('Пожалуйста, введите код для подтверждения входа в Ozon.Card, высланный Вам в СМС', null, {inputType: "number", time: 300000});
        callApi('v0001/authentication/confirm', {"otp":code,"principal":login}, {"login-method": "api-pwd"}, ['OTP_REQUIRED']);
	}
}

function saveAuthToken(at){
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setData('authToken', at);
	AnyBalance.setData('login', prefs.login);
	AnyBalance.saveData();
	setAuthHeader(at);
}

function setAuthHeader(at){
	if(at)
		g_headers.Authorization = (at.token_type || at.tokenType) + ' ' + (at.access_token || at.accessToken);
	else
		delete g_headers.Authorization;
}

function login(){
	loginPure();
}

function main() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(/^\d+$/.test(prefs.login), 'Введите телефон или штрих-код карты. Только цифры без пробелов и разделителей!');
	checkEmpty(prefs.password, 'Введите пароль!');

	initIds();

	login();

	var result = {success: true};

	var json = callApi('v0002/cards?rid=%RID%');
	AnyBalance.trace('Найдено ' + json.data.length + ' карт');

	for(var i=0; i<json.data.length; ++i){
		var card = json.data[i];
		var name = card.name + ' *' + card.panTail + ' ' + card.expirationDate;
		AnyBalance.trace("Найдена карта " + name);
		if((prefs.num && pref.num === card.panTail) || (!prefs.num && i==0)){
			AnyBalance.trace('Выбираем эту карту');
			getParam(name, result, '__tariff');
			getParam(card.panTail, result, 'num');
			getParam(card.expirationDate, result, 'till', null, null, parseDate);

			for(var j=0; j<card.equities.length;++j){
				var eq = card.equities[j];
				if(eq.type == 'FUNDS'){
					getParam(eq.amount, result, 'balance', null, null, parseBalance);
				}else if(eq.type == 'BNS'){
					getParam(eq.amount, result, 'bonus', null, null, parseBalance);
				}else if(eq.type == 'BNS_AVAILABLE'){
					getParam(eq.amount, result, 'bonus_available', null, null, parseBalance);
				}else if(eq.type == 'BNS_DELAY'){
					getParam(eq.amount, result, 'bonus_delay', null, null, parseBalance);
				}else if(eq.type == 'CREDIT_LIMIT_AMOUNT_REMAINING'){
					getParam(eq.amount, result, 'limit', null, null, parseBalance);
				}else if(eq.type == 'OWN_AMOUNT_REMAINING'){
					getParam(eq.amount, result, 'own', null, null, parseBalance);
				}else if(eq.type == 'BNS_DEBT'){
					getParam(eq.amount, result, 'bonus_debt', null, null, parseBalance);
				}
			}
		}
	}

	result.__tariff = prefs.login;
	
	AnyBalance.setResult(result);
}

