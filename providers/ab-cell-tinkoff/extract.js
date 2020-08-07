/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток и другие параметры карт банка Тинькофф Кредитные Системы, используя мобильное приложение.
*/

var g_headers = {
    'User-Agent': 'okhttp/3.11.0'
}

var g_baseurl = 'https://tapi.tinkoff.ru/';
var g_sessionid;
var g_postParams = {
	mobile_device_model:	'ONEPLUS A3010',
	mobile_device_os:		'android',
	appVersion:				'2.9',
	screen_width:			'1080',
	root_flag:				'false',
	appName:				'mobile',
	origin: 				'mobile,ib5,loyalty,platform',
	deviceId:				undefined,
    connectionType:			'WiFi',
	platform:				'android',
	screen_dpi:				'420',
	mobile_device_os_version:	'9',
	screen_height:			'1920',
	fingerprint:			'OnePlus ONEPLUS A3010/android: 9/TCSMB/5.2.1###1080x1920x32###180###false###false###',
};

function requestJson(action, data, options) {
	var params = [], html;
	if(!options) options = {};

	if(data) {
		for (var name in data) {
			params.push(encodeURIComponent(name) + '=' + encodeURIComponent(data[name]));
		}
	}

	// Заполняем параметры, которые есть всегда
	params.push(encodeURIComponent('platform') + '=' + encodeURIComponent(g_postParams.platform));
	params.push(encodeURIComponent('deviceId') + '=' + encodeURIComponent(getDeviceId()));
	params.push(encodeURIComponent('appVersion') + '=' + encodeURIComponent(g_postParams.appVersion));
	if(g_sessionid)
		params.push(encodeURIComponent('moSessionId') + '=' + encodeURIComponent(g_sessionid));

	if(options.post) {
		html = AnyBalance.requestPost(g_baseurl + action + '?' + params.join('&'), options.post, g_headers);
	}else{
		html = AnyBalance.requestGet(g_baseurl + action + '?' + params.join('&'), g_headers);
	}

	var json = getJson(html);
	
	if(json.resultCode != 'OK' && !options.noException) {
		AnyBalance.trace('Ошибка: ' + action + ', ' + json.message);
		throw new AnyBalance.Error((options.scope ? options.scope + ': ' : '') + (json.message || (json.payload && json.payload.details)), null, /INVALID_REQUEST_DATA/i.test(json.resultCode));
	}
	
	return json;
}

function getDataName(){
	var prefs = AnyBalance.getPreferences();
	return 'tcm_' + prefs.login;
}

function createPass(size){
	var s = '', alphabet = '0123456789abcdef';
	for(var i=0; i<size; ++i){
		s += alphabet.charAt(Math.floor(Math.random()*alphabet.length)); 
	}
	return s;
}

function getDeviceId(){
	var data = AnyBalance.getData(getDataName(), {});
	if(!data.deviceid){
		data.deviceid = createPass(16);
		AnyBalance.setData(getDataName(), data);
		AnyBalance.saveData();
	}
	return data.deviceid;
}

function loginByPhone(){
	var prefs = AnyBalance.getPreferences();
	var data = AnyBalance.getData(getDataName());

	var newSessionId;
	if(data.token){
		try{
			var json = requestJson('auth/sign_up', {token: data.token});
			newSessionId = json.payload.moSessionId;
		}catch(e){
			AnyBalance.trace('Не удалось войти с прежним токеном, получаем новый');
		}	
	}

	if(!newSessionId){
        var json = requestJson('auth/request_token_onboarding', {msisdn: '+7' + prefs.login, onContact: prefs.on_contact || false});
    
        var code = AnyBalance.retrieveCode('Пожалуйста, введите код из СМС, посланное на номер ' + json.payload.maskedMsisdn, null, {inputType: 'number', timeout: 300000});
    
        var conf = requestJson('auth/confirm_token_onboarding', {code: code, confirmationId: json.payload.confirmationId});
		json = requestJson('auth/sign_up', {token: conf.payload.token});
        newSessionId = json.payload.moSessionId;

    	var token = conf.payload.token;
    	var data = AnyBalance.getData(getDataName());
    
    	AnyBalance.setData(getDataName(), joinObjects({
        	token: token,
        }, data));
        AnyBalance.saveData();
    }

    g_sessionid = newSessionId;
}

function login() {
	var prefs = AnyBalance.getPreferences();

	checkEmpty(prefs.login, 'Введите ваш номер телефона!');
	checkEmpty(/^\d{10}$/.test(prefs.login), 'Введите ваш номер телефона, 10 цифр без пробелов и разделителей, например, 9261234567 !');

    if(!g_sessionid) {
        var json = requestJson('util/session');

        g_sessionid = json.payload.moSessionId;

        loginByPhone();

        __setLoginSuccessful();
    }else{
        AnyBalance.trace('сессия уже установлена. Используем её.');
    }

	return g_sessionid;
}

function processInfo(result){
	var json = requestJson('user/info');
	getParam(jspath1(json, '$.payload.balances[?(@.type=="current")].volume.amount'), result, 'balance');
	getParam(jspath1(json, '$.payload.balances[?(@.type=="credit")].volume.amount'), result, 'limit');
	getParam(jspath1(json, '$.payload.info.name') + ' ' + jspath1(json, '$.payload.info.patronymic') + ' ' + jspath1(json, '$.payload.info.surname'), result, 'fio');
	getParam(jspath1(json, '$.payload.info.msisdn'), result, 'phone', null, [/7(\d{3})(\d{3})(\d\d)(\d\d)/, '+7($1)$2-$3-$4']);
	
	getParam(jspath1(json, '$.payload.subscribers[0].groups[?(@.name.match(/вонки/i))].services[?(@.name.match(/минут/i))].prepaid.volume'), result, 'min');
	getParam(jspath1(json, '$.payload.subscribers[0].groups[?(@.name.match(/интернет/i))].services[?(@.name.match(/[МГКMGK][БB]/i))].prepaid.volume') + 
	 jspath1(json, '$.payload.subscribers[0].groups[?(@.name.match(/интернет/i))].services[?(@.name.match(/[МГКMGK][БB]/i))].prepaid.units.volume'), result, 'internet', null, null, parseTraffic);

}

