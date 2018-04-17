/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var baseurl = "https://my.ipnet.ua/";

var g_headers = {
	Accept: 'application/json, text/plain, */*',
	Origin: 'https://my.ipnet.ua',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36',
	'Content-Type': 'application/json;charset=UTF-8',
	Referer: baseurl, 
	'Accept-Language': 'ru,en-US;q=0.8,en;q=0.6'
}

function callApi(verb, params){
	var html = AnyBalance.requestPost(baseurl + 'api/v1/' + verb, params ? JSON.stringify(params) : '', addHeaders({}), {HTTP_METHOD: params ? 'POST' : 'GET'});

	return getJson(html);
}

var g_errors = {
	LOGIN_USER_NOT_FOUND: 'Невірний логін чи пароль!',
};

function throwError(json){
    var error = json.errors || json.message;
    if(error)
        throw new AnyBalance.Error(g_errors[error] || error, null, /USER_NOT_FOUND/i.test(error));
	
	AnyBalance.trace(JSON.stringify(json));
    throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');
	
    var baseurl = "https://my.ipnet.ua/";
	
    var json = callApi('user/login/', {
    	agg_id: prefs.login,
    	password: hex_md5(prefs.password)
    });
	
    if(!json.token){
    	throwError(json);
    }

    var parts = json.token.split(/\./g);
    var part1 = getJson(Base64.decode(parts[0]).replace(/\x00/g, ''));
    var part2 = getJson(Base64.decode(parts[1]).replace(/\x00/g, ''));

    var type = part1.typ;
    var user_id = part2.user_id;

    g_headers.Authorization = type + ' ' + json.token;

    json = callApi('auth/');
    if(!json.auth){
    	throwError(json);
    }

    json = callApi('user/' + user_id).data;

    var result = {success: true};
	
    getParam(json.tariff.type_name, result, '__tariff');
    getParam(json.agg_id, result, 'agreement');
	
    getParam(json.balance, result, 'balance');
    getParam(json.ipaddr, result, 'ip');
    getParam(json.state.state, result, 'status');
    getParam(json.date_minus*1000, result, 'till');
    
	if(isAvailable('bonus')) {
    	json = callApi('services/loyalty/' + user_id);
		getParam(json.data.points, result, 'bonus');
	}
	
    AnyBalance.setResult(result);
}