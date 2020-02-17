/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':           'application/json',
	'Accept-Language':  'en-US,en;q=0.9,ru;q=0.8,ru-RU;q=0.7',
	'Connection':       'keep-alive',
	'User-Agent':       'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.120 Safari/537.36',
};


function callApi(verb, params){
	var baseurl = 'https://api.motivtelecom.ru/client/v1/';
	var headers = addHeaders({
		Referer: 'https://lk.motivtelecom.ru/'
	});
	if(callApi.s_token)
		headers.Authorization = 'Bearer ' + callApi.s_token;
	var options = {HTTP_METHOD: 'GET'};
	if(params !== undefined){
	    headers['Content-Type'] = 'application/json';
	    options = {HTTP_METHOD: 'POST'};
	}

	html = AnyBalance.requestPost(baseurl + verb, params && JSON.stringify(params), headers, options);
	var json = getJson(html);

	if(json.code){
		AnyBalance.trace(html);
		var error = (json.details && JSON.parse(json.details).error_description) || json.message; 
		throw new AnyBalance.Error(error, null, /парол/i.test(error));
	}

	if(verb === 'auth')
		callApi.s_token = json.access_token;

	return json;

}

function main(){
	AnyBalance.setDefaultCharset('utf-8');
	
    var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    var json = callApi('auth', {username: prefs.login, password: prefs.password});

    json = callApi('me');

    var result = {success: true};

    getParam(json.balance.value, result, 'balance');
    getParam(json.name, result, 'userName');
    getParam(json.tariff.title, result, '__tariff');
    getParam(json.username, result, 'phone');
    getParam(json.status.title, result, 'status');

    try{
    	json = callApi('me/remains');

    	for(var i=0; i<json.length; ++i){
    		var r = json[i];
    		if(r.type === 'VOICE'){
    			getParam(r.rest_amount, result, 'min');
    		}else if(r.type === 'DATA'){
    			getParam(r.rest_amount + r.unit, result, 'traf', null, null, parseTraffic);
    		}else if(r.type === 'SMS'){
    			getParam(r.rest_amount, result, 'sms');
    		}else{
    			AnyBalance.trace('Неизвестный остаток: ' + JSON.stringify(r));
    		}
    	}
    }catch(e){
    	AnyBalance.trace('Не удалось получить остатки: ' + e.message);
    }

    if(AnyBalance.isAvailable('services_free', 'services_paid')){
    	json = callApi('me/service');

    	var paid = 0, free = 0;
    	for(var i=0; i<json.length; ++i){
    		json[i].fee ? ++paid : ++free;
    	}

    	getParam(paid, result, 'services_paid');
    	getParam(free, result, 'services_free');
    }

    AnyBalance.setResult(result);
}