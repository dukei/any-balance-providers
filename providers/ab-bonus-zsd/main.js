/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию о бонусах на карте Клуба Перекресток.

Сайт магазина: http://www.perekrestok.ru/
Личный кабинет: https://prcab.x5club.ru/cwa/
*/

var g_headers = {
	'Content-Type':'text/json',
	'User-Agent':'okhttp/3.10.0'
};

var baseurl = "https://mcabinet.nch-spb.com/onyma/system/api/"
var token='';


function callApi(verb, Params){
	AnyBalance.trace('====================================================\nverb='+verb);
	if (token) verb+='&auth_token='+token;
	if(Params) {
		var html = AnyBalance.requestPost(baseurl +'jsonex?function='+ verb , JSON.stringify(Params), g_headers);
	}else{
		var html = AnyBalance.requestGet(baseurl +'json?function='+ verb, g_headers);
	}
	AnyBalance.trace('html:\n'+html+'\n====================================================');
	if(!html)
		return {__empty: true};

	var json = getJson(html);
	if(json.error){
		throw new AnyBalance.Error(json.error.text, null, /парол/i.test(json.error.description));
	}
	return json;
}


function main () {
    var prefs = AnyBalance.getPreferences ();
    AnyBalance.setDefaultCharset('utf-8');
	checkEmpty(prefs.login, 'Ввведите логин');
	checkEmpty(prefs.password, 'Введите пароль.');
    token=AnyBalance.getData('token'+prefs.login);
    if (token){
    	AnyBalance.trace('Найден старый токен. Проверяем');
    	try{
    		var info = callApi('onm_api_toll_api_contract_info');
    	}catch(e){
                AnyBalance.trace(e.message+'\nТокен не подешел. Нужна авторизация');
    		token='';
    		AnyBalance.setData('token'+prefs.login,'');
    		AnyBalance.saveData();
    	}
    }
    if (!token){
    	AnyBalance.trace('Входим в кабинет ' + baseurl);
    	var json = callApi('open_session',{
		user: prefs.login,
		pass: prefs.password,
		realm: "WHSD"
		});
    	token=json.return;
    	var info = callApi('onm_api_toll_api_contract_info');
    }
    if (!info||!info.return|!info.return[0]||!info.return[0].remainder){
    	token='';
    	AnyBalance.setData('token'+prefs.login,token);
    	AnyBalance.saveData();
    	throw new AnyBalance.Error('Не удалось войти в личный кабинет'); 
    	}
    info=info.return[0];
    var result = {success: true};
    result.balance=info.remainder;
    result.contract_date=parseDate(info.contract_date);
    result.contract_num=info.contract_num;
    AnyBalance.setData('token'+prefs.login,token);
    AnyBalance.saveData();
    AnyBalance.setResult (result);
}
