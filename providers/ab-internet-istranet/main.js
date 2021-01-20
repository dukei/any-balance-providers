/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.31 (KHTML, like Gecko) Chrome/26.0.1410.64 Safari/537.31',
};

var baseurl = "https://lk.istranet.ru/";

function callApi(verb, params){
	var html = AnyBalance.requestPost(baseurl + verb, JSON.stringify(params), addHeaders({
		'Content-Type': 'application/json;charset=UTF-8',
		Referer: baseurl
	}));

	return getJson(html);
}

function main(){
    var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	AnyBalance.setDefaultCharset('UTF-8');

	var json = callApi('login', {
		login: prefs.login,
		password: prefs.password
	});

	if(!json.sessionid){
		var error = json.message;
		if (error)	throw new AnyBalance.Error(error);
		
		AnyBalance.trace(JSON.stringify(json));
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
    var result = {success: true};
	
	var sessionid = json.sessionid;

    json = callApi('info', {sessionid: sessionid});

    getParam(json.full_name, result, 'fio');
    getParam(json.actual_address, result, 'account');
    getParam(json.user_id, result, 'id');
    getParam(json.balance, result, 'balance');
    getParam(json.tariff.date, result, 'payDate', null ,null , parseDateWord);
    if (json.credit.status=='possible'){
	    getParam(json.credit.cost, result, 'balanceCredit');
	    result.sufbalanceCredit='р. на '+json.credit.time;
	    }
	getParam(json.status ? 'Выключен' : 'Включен', result, 'status');
	getParam(json.tariff.name+' ('+json.tariff.services[0].cost+' р.)', result, '__tariff');
	
    AnyBalance.setResult(result);
}