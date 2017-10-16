
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function generateUUID() {
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

function s4() {
  return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
}

var baseurl = 'https://vsesrazu-raiffeisen.ru/';
var auth_token;

function callApi(verb, getParams, postParams){
	var method = 'GET';
	if(isset(postParams))
		method = 'POST';
	
	var rn = generateUUID();
	var html = AnyBalance.requestPost(baseurl + 'cft-pcl/api/v1/' + verb, postParams && JSON.stringify(postParams), addHeaders({
		Referer: baseurl,
		RequestNumber: rn,
		AuthToken: auth_token,
		'Content-Type': 'application/json;charset=UTF-8'
	}), {HTTP_METHOD: method});

	var json = getJson(html);
	if(json.response.code != 0){
		AnyBalance.trace(html);
		throw new AnyBalance.Error(json.response.message, null, /Not found user|password/i.test(json.response.message));
	}

	return json.response.data;
}

function main() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var isCaptcha = callApi('captcha/isshow');
	var token;
	if(isCaptcha){
		token = solveRecaptcha('Пожалуйста, докажите, что вы не робот', baseurl, '6Lf9LwkUAAAAAPPqLQEQIvp4uWYyyfyUHWhRT5t1');
	}

	var json = callApi('security/login/email', null, {
		email: prefs.login,
		password: prefs.password,
		token: token
	});

	auth_token = json.auth_token;

	var result = {
		success: true
	};

	json = callApi('client');

	AB.getParam(json.balance/100, result, 'balance');
	AB.getParam(json.fields.FIRST_NAME + ' ' + json.fields.LAST_NAME, result, 'fio');
	AB.getParam(json.fields.FIRST_NAME + ' ' + json.fields.LAST_NAME, result, '__tariff');

	AnyBalance.setResult(result);
}
