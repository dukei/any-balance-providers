/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	Accept: 'application/json',
	'Accept-Language': 'en_US',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36',
	Origin: null
};

function main(){
    var prefs = AnyBalance.getPreferences();

    AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Enter e-mail!');
	checkEmpty(prefs.password, 'Enter password!');
    
	logInOpenAuth();
	return;
}

function logInOpenAuth(){
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://api.paypal.com/v1/';

	var html = AnyBalance.requestPost(baseurl + 'oauth2/token', {
		grant_type:	'client_credentials'
    }, addHeaders({
    	Authorization: 'Basic ZDNhYWNmNDUwZGQ2YWE5OTJjZmJhNzcwNjc1NjA3MzM6N2NlYmJhMWJmMTRjYjg1OA=='
    }));

    var json = getJson(html);

	html = AnyBalance.requestPost(baseurl + 'oauth2/login', {
		email:	prefs.login,
		grant_type:	'password',
		password:	prefs.password,
		redirect_uri:	'https://www.paypalmobiletest.com'
    }, addHeaders({
    	Referer: baseurl + 'oauth2/token',
    	Authorization: 'Bearer ' + json.access_token
    }));

    json = getJson(html);
    if(!json.access_token){
    	if(json.error)
    		throw new AnyBalance.Error(json.error_description||json.error, null, /invalid_user/i.test(json.error));
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }

	html = AnyBalance.requestGet(baseurl + 'wallet/@me/financial-instruments', addHeaders({
		Referer: baseurl + 'oauth2/login',
    	Authorization: 'Bearer ' + json.access_token
    }));

    json = getJson(html);
	var result = {success: true};
	
	for(var i=0; i<json.account_balance.balances.length; i++) {
		var curr = json.account_balance.balances[i];
		if(curr.currency == 'USD') {
			getParam(curr.available.total.amount, result, 'balance', null, null, parseBalance);
		} else if(curr.currency == 'EUR') {
			getParam(curr.available.total.amount, result, 'balance_eur', null, null, parseBalance);
		} else if(curr.currency == 'SEK') {
			getParam(curr.available.total.amount, result, 'balance_sek', null, null, parseBalance);
		} else if(curr.currency == 'RUB') {
			getParam(curr.available.total.amount, result, 'balance_rub', null, null, parseBalance);
		}else{
		    AnyBalance.trace('Unknown currency ' + curr.currency + ': ' + JSON.stringify(curr));
		}
	}

	result.__tariff = prefs.login;
	
    AnyBalance.setResult(result);

}

function generateHex(mask, digits){
	var i=0;
	return mask.replace(/x/ig, function(){
		return digits[i++];
	});
}

function makeGuid(hash){
	return hash.replace(/(\w{8})(\w{4})(\w{4})(\w{4})(\w{12})/, '$1-$2-$3-$4-$5');
}

function getAuthChecksum(cac, timestamp){
	var prefs = AnyBalance.getPreferences();
	var data = [];
	data.push(cac.appName);
	data.push(cac.appGuid);
	data.push(cac.visitorId);
	data.push(prefs.login);
	data.push(prefs.password.substr(0, 3));
	data.push(timestamp);
	
	var hash = CryptoJS.SHA256(data.join(''));
	return CryptoJS.enc.Base64.stringify(hash);
}

function hex_md5(str){
	return CryptoJS.MD5(str).toString();
}

function logInAPI(prefs) {
	var baseurl = 'https://api-m.paypal.com/v1/';
	var hex = hex_md5(prefs.login + ' android_id');

	var deviceId = hex.substr(0, 16);
	var visitId = 'd3aacf450dd6aa992cfba77067560733'; //В программе клиенте это хардкод
	var bssid = generateHex('5c:f4:ab:xx:xx:xx', hex.substr(16, 6));
	var mac = generateHex('98:0d:2e:xx:xx:xx', hex.substr(22, 6));
	var imei = generateImei(prefs.login, '35721005******L');
	var simsn = generateSimSN(prefs.login, '897019913********L');
	var pairing_id = hex_md5(prefs.login + ' pairing id'); 
	var gsfid = hex_md5(prefs.login + ' gsf id').substr(0, 16); 
	var linkerid = makeGuid(hex_md5(prefs.login + ' linker_id'));
	var appguid = "636cdf5c-585f-4e3f-bf8f-33df6454b526"; //makeGuid(hex_md5(prefs.login + ' app_guid'));
	var risk_session = makeGuid(hex_md5(prefs.login + ' risk session'));
	var timestamp = new Date().getTime();
	var ip = "192.168.1." + Math.floor(30 + Math.random()*30);

	g_headers['paypal-client-metadata-id'] = '8bd1708fcfe7493ab8c07e9e1452681c';

	
	var cac = {
  		"deviceLanguage": "ru",
  		"deviceNetworkType": "Unknown",
  		"deviceLocale": "ru_RU",
  		"deviceNetworkCarrier": "Unknown",
  		"deviceModel": "HTC Desire 600 dual sim",
  		"visitId": "d3aacf450dd6aa992cfba77067560733",
  		"sdkVersion": "2.5.9.2",
  		"usageTrackerSessionId": "07164020",
  		"appName": "com.paypal.android.p2pmobile",
  		"deviceMake": "HTC",
  		"deviceOSVersion": "4.1.2",
  		"appVersion": "6.4.2",
  		"deviceType": "Android",
  		"visitorId": deviceId,
  		"appGuid": appguid,
  		"deviceId": deviceId,
  		"deviceOS": "Android"
	};

	var deviceInfo = {
  		"is_device_simulator": false,
  		"device_os": "Android",
  		"device_model": cac.deviceModel,
  		"device_os_version": "4.1.2",
  		"device_name": "cp3dug",
  		"device_identifier": deviceId,
  		"device_type": "Android",
  		"pp_app_id": "APP-3P637985EF709422H",
  		"device_key_type": "ANDROIDGSM_UNDEFINED"
	};

	var timestamp = new Date().getTime();
	var json = requestAPI('post', baseurl + 'mfsauth/proxy-auth/token', {
		adsChallengeId:	'0ce844f8-381d-40ab-9fbb-0b00d6c26d7c',
		appInfo:	JSON.stringify({"app_version":cac.appVersion,"app_category":"3","client_platform":"AndroidGSM","device_app_id":"PayPal"}),
		authNonce:	getAuthChecksum(cac, timestamp),
		compatProgress:	'IC_ER-DC_AF-8',
		deviceInfo:	JSON.stringify(deviceInfo), //'{"is_device_simulator":false,"device_os":"Android","device_model":"HTC Desire 600 dual sim","device_os_version":"4.1.2","device_name":"cp3dug","device_identifier":deviceId,"device_type":"Android","pp_app_id":"APP-3P637985EF709422H","device_key_type":"ANDROIDGSM_UNDEFINED"}',
		email:	prefs.login,
		firstPartyClientId:	'd3aacf450dd6aa992cfba77067560733',
		grantType:	'password',
		password:	prefs.password,
		redirectUri:	'http://authenticator.live.paypal.com/response.jsp',
		rememberMe:	'false',
		riskData:	JSON.stringify({
  			"sms_enabled": true,
  			"app_first_install_time": 1468234707906,
  			"location": {
  			  "timestamp": timestamp - Math.round(Math.random() * 1000000), //До 15 мин раньше запроса
  			  "acc": 23.3 + Math.round(Math.random()*100)/1000,
  			  "lng": 37.5 + Math.round(Math.random()*1000000)/10000000,
  			  "lat": 55.8 + Math.round(Math.random()*1000000)/10000000
  			},
  			"source_app": 0,
  			"conf_url": "https:\/\/www.paypalobjects.com\/webstatic\/risk\/dyson_config_android_v3.json",
  			"is_rooted": false,
  			"network_operator": "",
  			"payload_type": "full",
  			"ip_addrs": "192.168.1.34",
  			"app_version": cac.appVersion,
  			"is_emulator": false,
  			"source_app_version": cac.appVersion,
  			"conn_type": "WIFI",
  			"comp_version": "3.5.4.release",
  			"os_type": "Android",
  			"timestamp": 1468867638611, //Math.ceil(Math.random()*3), //На пару миллисекунд раньше посылки апроса
  			"risk_comp_session_id": risk_session,//"c0d4da0b-0e77-423e-b6d6-4a1843ae3484",
  			"android_id": deviceId,
  			"app_last_update_time": 1468867256162,
  			"device_model": cac.deviceModel,
  			"device_name": deviceInfo.device_name,
  			"sim_serial_number": simsn,
  			"sim_operator_name": "Beeline",
  			"ssid": "Krawlly",
  			"roaming": false,
  			"ds": false,
  			"device_uptime": 549400000 + Math.round(Math.random()*10000),
  			"phone_type": "unknown (5)",
  			"mac_addrs": mac,
  			"dc_id": "bfa4741e045caec0b9ec1f33933e7122",
//  			"proxy_setting": "host=192.168.1.48,port=8888",
  			"subscriber_id": "250991613654679",
  			"ip_addresses": [
  			  "192.168.1.34"
  			],
  			"device_id": imei,
  			"app_guid": cac.appGuid,
  			"locale_lang": "ru",
  			"serial_number": "FA37WWB01680",
  			"os_version": "4.1.2",
  			"locale_country": "RU",
  			"bssid": bssid,
  			"pairing_id": "6af64f13a75e46f7933bfcaff58eba3b",
  			"tz": 10800000,
  			"linker_id": linkerid,
  			"pm": "bf137b47",
  			"conf_version": "3.0",
  			"app_id": "com.paypal.android.p2pmobile",
  			"total_storage_space": 5044297728,
  			"tz_name": "East Africa Time"
		}),
		timeStamp:	timestamp

	}, addHeaders({
		'X-PayPal-ConsumerApp-Context': encodeURIComponent(JSON.stringify(cac)),
		'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
	}));

	cac.visitId = json.result.firstPartyUserAccessToken.tokenValue;
	cac.riskVisitorId = json.result.riskVisitorId;
	
	json = requestAPI('get', baseurl + 'mwf/wallet/@me/paypal-account', null, addHeaders({
		'Authorization': json.result.firstPartyUserAccessToken.tokenType + ' ' + json.result.firstPartyUserAccessToken.tokenValue,
		'X-PayPal-ConsumerApp-Context': encodeURIComponent(JSON.stringify(cac))

	}));
	
	var result = {success: true};
	
	for(var i=0; i<json.result.balance.currencyBalances.length; i++) {
		var curr = json.result.balance.currencyBalances[i];
		if(curr.currencyCode == 'USD') {
			getParam(curr.available.value/curr.available.scale, result, 'balance');
		} else if(curr.currencyCode == 'EUR') {
			getParam(curr.available.value/curr.available.scale, result, 'balance_eur');
		} else if(curr.currencyCode == 'SEK') {
			getParam(curr.available.value/curr.available.scale, result, 'balance_sek');
		} else if(curr.currencyCode == 'RUB') {
			getParam(curr.available.value/curr.available.scale, result, 'balance_rub');
		}else{
		    AnyBalance.trace('Unknown currency ' + curr.currencyCode + ': ' + JSON.stringify(curr));
		}
	}

	result.__tariff = json.result.details.displayName;
	
    AnyBalance.setResult(result);
}

function requestAPI(method, url, params, headers) {
	if(method == 'post')
		var html = AnyBalance.requestPost(url, params, headers);
	else
		var html = AnyBalance.requestGet(url, headers);
	
	json = getJson(html);
	if(!json.access_token && (!json.result || json.result.code)) {
		var error = (json.result && json.result.message) || json.message;
		if(error)
			throw new AnyBalance.Error(error, null, /проверьте свои данные|Invalid user credentials/i.test((json.result && json.result.debugMessage) || error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Error calling API method!');
	}
	
	return json;
}
