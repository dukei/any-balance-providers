﻿
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

var baseLoginUrl = 'https://id.rambler.ru';
var loginUrl = baseLoginUrl + '/login-20/login?theme=cinema&texts=cinema&rname=cinema&back=https%3A%2F%2Fkinoteatr.ru%2Fbonus%2F&param=iframe&iframeOrigin=https%3A%2F%2Fkinoteatr.ru';
var baseurl = 'https://kinoteatr.ru';

function randomString () {
  const tid = Date.now().toString(36)
  const uid = Math.random()
    .toString(36)
    .slice(2)
  return (tid + uid).slice(0, 17)
}

function callApi(method, params, headers){
	if(!params)
		params = [{}];

	var html = AnyBalance.requestPost(baseLoginUrl + '/jsonrpc', JSON.stringify({
		method: method,
		params: params,
 		rpc: "2.0",
 	}), addHeaders(addHeaders(headers || {}, {
 		Referer: loginUrl,
 		'X-Client-Request-Id': randomString(),
 		'Content-Type': 'application/json',
 		Origin: baseLoginUrl,
 	})));

 	var json = getJson(html);

 	if(json.result.status === 'OK')
 		return json.result;

 	var e = new AnyBalance.Error(json.result.error.strerror);
 	e.result = json.result;
 	throw e;
}

function login(){
	var prefs = AnyBalance.getPreferences();
	var html = AnyBalance.requestGet(loginUrl, g_headers);

	var json = callApi('Rambler::Id::get_variti_url');

    try{           
   	   	json = callApi('Rambler::Id::create_session', [{
            "login": prefs.login,
            "password": prefs.password,
            "short_session": 0,
            "via": {
                "project": "cinema",
                "type": "iframe"
            },
            "utm": {
                "referer": baseurl + "/bonus/"
            },
            "__vrtTicketId": json.vrt_ticket.vrtTicketId
   	   	}]);
   	}catch(e){
   		if(!e.result || !e.result.passable_by_captcha)
   			throw e;

   		AnyBalance.trace('Не удалось зайти без капчи, заходим с ней');

   	    var captcha = solveRecaptcha('Пожалуйста, докажите, что вы не робот', loginUrl, '6LeHeSkUAAAAANUvgxwQ6HOLXCT6w6jTtuJhpLU7');
   	    json = callApi('Rambler::Common::create_rate_limit_pass_token', [{
   	    	__rpcOrderId: 'recaptcha',
   	    	__rpcOrderValue: captcha,
   	    	method: 'Rambler::Id::create_session',
   	    	parameters: {
                "login": prefs.login,
                "password": prefs.password,
                "short_session": 0,
                "via": {
                    "project": "cinema",
                    "type": "iframe"
                },
                "utm": {
                    "referer": baseurl + "/bonus/"
                },
   	    	}
   	    }]);

   	    var passId = json.passId;
   	    var passValue = json.passValue;

   	    json = callApi('Rambler::Id::get_variti_url');

   	   	json = callApi('Rambler::Id::create_session', [{
   	   		__rlPassId: passId,
   	   		__rlPassValue: passValue,
            "__vrtTicketId": json.vrt_ticket.vrtTicketId,
            "login": prefs.login,
            "password": prefs.password,
            "short_session": 0,
            "via": {
                "project": "cinema",
                "type": "iframe"
            },
            "utm": {
                "referer": baseurl + "/bonus/"
            },
   	   	}]);
   	}

   	AnyBalance.saveCookies();
   	AnyBalance.saveData();
}

function loginKino(){
	var prefs = AnyBalance.getPreferences();
   	var html = AnyBalance.requestPost(baseurl + '/cgi-bin/api.pl', JSON.stringify({
   		"method":"UserLogin",
   		"params":{
   			"Login":prefs.login,
   			"Password":prefs.password
   		}
   	}), addHeaders({
   		Accept: 'application/json',
   		'Content-Type': 'application/json',
   		Referer: baseurl + '/bonus/',
   		'X-Requested-With': 'XMLHttpRequest',
   	}));

   	var json = getJson(html);
   	if(!json.result){
   		var error = json.error && json.error.message;
   		if(error)
   			throw new AnyBalance.Error(error, null, /email|парол/i.test(error));
   		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
   		
   	}
   	return json;
}

function main() {
	var prefs = AnyBalance.getPreferences();

	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

/*	AnyBalance.restoreCookies();

	try{
		callApi('Rambler::Id::get_profile_info', [
            {
                "get_accounts": 1,
                "get_cinema_creds": 1,
                "get_social_profiles": 1
            }
        ], {
   	   		Referer: baseurl + '/bonus/',
   	   		Origin: baseurl
   	   	});
   	}catch(e){
   		AnyBalance.trace('Не удалось зайти с сохраненной сессией: ' + e.message);
 		login();
	}

	var json = loginKino();
   	
   	json = callApi('Rambler::Id::Aux::get_rsidx', null, {
   		Referer: baseurl + '/bonus/',
   		Origin: baseurl
   	});
   	var token = json.result.token;
*/
	
	var json = loginKino();
	var token = json.result.SessionId;

   	var html = AnyBalance.requestGet(baseurl + '/bonus/?ajax=1&SessionId=' + encodeURIComponent(token), addHeaders({
   		Accept: 'application/json',
   		Referer: baseurl + '/bonus/',
   		'X-Requested-With': 'XMLHttpRequest',

   	}));

	var result = {
		success: true
	};

	json = getJson(html);

	try{
		var card = json.request_data.GetCardInfoResult.Card;
	    
	    if(json.request_data.CurrentBalance)
			AB.getParam(json.request_data.CurrentBalance, result, 'balance');
		else
			AB.getParam(json.content, result, 'balance', /программа лояльности[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
		

		AB.getParam(card.CategoryPercent, result, 'percent');
		AB.getParam(card.CategoryStatusName, result, 'status');
		AB.getParam(card.NextCategoryStatusBalance 
			- card.CurrentStatusBalance, result, 'left_for_next_status', null, replaceTagsAndSpaces, parseBalance);
		AB.getParam(card.CategoryConfirmationDate, result, 'left_for_next_status_till', null, replaceTagsAndSpaces, parseDateISO);
		AB.getParam(card.Number, result, 'num');
		AB.getParam(card.CategoryStatusName + ': ' + card.Category, result, '__tariff');

	}catch(e){
		AnyBalance.trace('Не удалось получить баланс по информации о карте: ' + e.message);

   	   	var html = AnyBalance.requestGet(baseurl + '/bonus/profile/?ajax=1&SessionId=' + encodeURIComponent(token), addHeaders({
   	   		Accept: 'application/json',
   	   		Referer: baseurl + '/bonus/',
   	   		'X-Requested-With': 'XMLHttpRequest',
   	    
   	   	}));
   	    
		json = getJson(html);
		var data = json.request_data;

		AB.getParam(data.CurrentBalance, result, 'balance');
		AB.getParam(data.UserInfo.CardNumber, result, 'num');
	}

	AnyBalance.setResult(result);
}
