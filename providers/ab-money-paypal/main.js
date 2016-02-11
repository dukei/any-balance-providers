/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	Accept: 'application/json',
	'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 5.1.1; D6503 Build/23.4.A.1.232)',
	Authorization: 'Basic QVY4aGRCQk04MHhsZ0tzRC1PYU9ReGVlSFhKbFpsYUN2WFdnVnB2VXFaTVRkVFh5OXBtZkVYdEUxbENxOg==',
	Connection: 'Keep-Alive'
};

function main(){
    var prefs = AnyBalance.getPreferences();

    AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Enter e-mail!');
	checkEmpty(prefs.password, 'Enter password!');
    
	logInAPI(prefs);
	return;
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

function logInAPI(prefs) {
	var baseurl = 'http://api.paypal.com/v1/';
	var hex = hex_md5(prefs.login + ' android id');

	var deviceId = hex.substr(0, 16);
	var visitId = 'd3aacf450dd6aa992cfba77067560733'; //В программе клиенте это хардкод
	var bssid = generateHex('5c:f4:ab:xx:xx:xx', hex.substr(16, 6));
	var mac = generateHex('44:d4:e0:xx:xx:xx', hex.substr(22, 6));
	var imei = generateImei(prefs.login, '35472406******L');
	var simsn = generateSimSN(prefs.login, '897010266********L');
	var pairing_id = hex_md5(prefs.login + ' pairing id'); 
	var gsfid = hex_md5(prefs.login + ' gsf id').substr(0, 16); 
	var linkerid = makeGuid(hex_md5(prefs.login + ' linker id'));
	var appguid = makeGuid(hex_md5(prefs.login + ' app guid'));
	var risk_session = makeGuid(hex_md5(prefs.login + ' risk session'));
	var timestamp = new Date().getTime();
	var ip = "192.168.1." + Math.floor(30 + Math.random()*30);
	
	var cac = {
  		"visitId": visitId,
  		"visitorId": deviceId,
  		"deviceLanguage": "ru",
  		"deviceLocale": "ru_RU",
  		"appName": "com.paypal.android.p2pmobile",
  		"appGuid": appguid,
  		"appVersion": "5.15",
  		"sdkVersion": "1.7.5",
  		"deviceOS": "Android",
  		"deviceOSVersion": "5.1.1",
  		"deviceMake": "Sony",
  		"deviceModel": "D6503",
  		"deviceType": "Android",
  		"deviceNetworkType": "LTE",
  		"deviceNetworkCarrier": "MegaFon"
	};

	var deviceInfo = {
		"device_identifier":cac.visitorId,
		"device_os":"Android",
		"device_os_version":"5.1.1",
		"device_name":"D6503",
		"device_model":"D6503",
		"device_type":"Android",
		"device_key_type":"ANDROIDGSM_PHONE",
		"pp_app_id":"APP-5LW75608UK041945U",
		"is_device_simulator":false
	};
/*
	var json = requestAPI('get', baseurl + 'mwf/config', null, addHeaders({
		'X-PayPal-ConsumerApp-Context': encodeURIComponent(JSON.stringify(cac)),
		Authorization: 'Basic d3aacf450dd6aa992cfba77067560733'
	}));

	var json = requestAPI('post', baseurl + 'oauth2/token', {
		grant_type:	'client_credentials',
		response_type:	'token id_token',
		deviceInfo:	JSON.stringify(deviceInfo),
		return_authn_schemes:	true,
		app_info:	JSON.stringify({
			"device_app_id": deviceInfo.pp_app_id,
			"client_platform":"AndroidGSM",
			"app_version":"1.75",
			"app_category":"3"
		})
	}, addHeaders({
		'X-PayPal-ConsumerApp-Context': encodeURIComponent(JSON.stringify(cac)),
		Authorization: 'Basic QVY4aGRCQk04MHhsZ0tzRC1PYU9ReGVlSFhKbFpsYUN2WFdnVnB2VXFaTVRkVFh5OXBtZkVYdEUxbENx'
	}));
*/
	var json = requestAPI('post', baseurl + 'mwf/proxy-auth/token', {
		password: prefs.password,
		appInfo: JSON.stringify({"device_app_id":"PayPal","client_platform":"AndroidGSM","app_version":cac.appVersion,"app_category":"3"}),
		rememberMe:	false,
		email:	prefs.login,
		grantType:	'password',
		riskData:	JSON.stringify({
			"app_guid":cac.appGuid,
			"app_id":cac.appName,
			"app_version":cac.appVersion,
			"bssid":bssid,
			"cell_id":10000000 + Math.floor(Math.random()*10000000),
			"comp_version":"3.3.2.release",
			"conf_url":"https:\/\/www.paypalobjects.com\/webstatic\/risk\/dyson_config_android_v3.json",
			"conf_version":"3.0",
			"conn_type":"WIFI",
			"device_id":imei,
			"device_model":"D6503",
			"device_name":"D6503",
			"device_uptime":1330327547,
			"ip_addrs":ip,
			"ip_addresses":[ip],
			"linker_id":linkerid,
			"locale_country":"RU",
			"locale_lang":"ru",
			"location":{"lat":55 + Math.random(),"lng":37 + Math.random(),"acc":51,"timestamp":timestamp - Math.floor(Math.random()*1000000)},
			"location_area_code":9722,
			"mac_addrs":mac,
			"os_type":"Android",
			"os_version":"5.1.1",
			"payload_type":"full",
			"phone_type":"gsm",
			"risk_comp_session_id":risk_session,
			"roaming":false,
			"sim_operator_name":"MegaFon",
			"sim_serial_number":simsn,
			"sms_enabled":true,
			"ssid":"\"Krawlly\"",
			"subscriber_id":"25002" + Math.abs(crc32(prefs.login + ' subs id')),
			"timestamp":timestamp,
			"total_storage_space":12426248192,
			"tz_name":"Москва, стандартное время",
			"network_operator":"25002",
			"source_app":0,
			"source_app_version":"5.15",
			"is_emulator":false,
			"is_rooted":false,
			"pairing_id":pairing_id,
			"app_first_install_time":1454948952033,
			"app_last_update_time":1454948952033,
			"android_id":cac.visitorId,
			"serial_number":"BH90TCH" + hex.substr(28,3).toUpperCase(),
			"gsf_id":gsfid,
			"proxy_setting":"" 
		}),
		deviceInfo:	JSON.stringify(deviceInfo),
		firstPartyClientId: cac.visitId,
		redirectUri: 'http://authenticator.live.paypal.com/response.jsp'
	}, addHeaders({
		'X-PayPal-ConsumerApp-Context': encodeURIComponent(JSON.stringify(cac))
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
		var error = json.result && json.result.message;
		if(error)
			throw new AnyBalance.Error(error, null, /проверьте свои данные|Invalid user credentials/i.test((json.result && json.result.debugMessage) || error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Error calling API method!');
	}
	
	return json;
}
