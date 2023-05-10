/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает задолженность у Петербургской сбытовой компании

Сайт оператора: https://pesc.ru/
Личный кабинет: https://ikus.pesc.ru/
*/

var g_headers = {
	'user-agent': 'Dart/2.19 (dart:io)',
	'ra': 'ma',
	'mversion': '3.6.0',
	'customer': 'ikus-spb',
	'context': 'ikus-spb',
};

var baseurl = 'https://ikus.pesc.ru/';
var g_savedData;

function generateUUID() {
	function s4() {
  		return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
	}
  	return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

function main(){
    var prefs = AnyBalance.getPreferences();

    checkEmpty(prefs.login, 'Введите E-mail!');
    checkEmpty(prefs.password, 'Введите пароль!');

    AnyBalance.setDefaultCharset('utf-8');

    if(!g_savedData)
		g_savedData = new SavedData('pskpetersburg', prefs.login);

	g_savedData.restoreCookies();
	var token = g_savedData.get('token');
	g_headers['authorization'] = 'Bearer ' + token;
	
	var html = AnyBalance.requestGet(baseurl + 'api/v3/groups', g_headers);
	
	if (!html || AnyBalance.getLastStatusCode() > 500) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
    }
	
	var json = getExtJson(html);
	
	if(AnyBalance.getLastStatusCode() === 401){
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		delete g_headers['authorization'];
		clearAllCookies();

        html = AnyBalance.requestPost(baseurl + 'api/v3/auth/login', JSON.stringify({
	    	username:	prefs.login,
	    	password:	prefs.password,
			captchaCode: generateUUID(),
	    }), addHeaders({'content-type': 'application/json; charset=utf-8'}));

	    var json = getExtJson(html);
		
	    if(!json.access_token){
	    	AnyBalance.trace(html);
	    	var error = json.message || json.errors.reduce(function(acc, cur) { acc.push(cur.message); return acc; }, []).join(';\n');
	    	if(error)
	    		throw new AnyBalance.Error(error, null, /не найден|логин|парол/i.test(error));
	    	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	    }

	    var token = json.access_token;
		
		g_headers['authorization'] = 'Bearer ' + token;
	
	    html = AnyBalance.requestGet(baseurl + 'api/v3/groups', g_headers);
	    json = getExtJson(html);
		
		if(json.message || json.errors){
	    	AnyBalance.trace(html);
	    	var error = json.message || json.errors.reduce(function(acc, cur) { acc.push(cur.message); return acc; }, []).join(';\n');
	    	if(error)
	    		throw new AnyBalance.Error(error, null, /доступ/i.test(error));
	    	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	    }
		
		g_savedData.set('token', token);
		g_savedData.setCookies();
	    g_savedData.save();
	}else{
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
	}
	
	AnyBalance.trace(JSON.stringify(json));

    var accounts = [];
	
	html = AnyBalance.requestGet(baseurl + 'api/v5/accounts/', g_headers);
	var _json = getExtJson(html);
	
	for(var i=0; i<json.length; ++i){
		var g = json[i].id;
		
		for(var j=0; j<_json.length; ++j){
		    var _acc = _json[j];
			
		    if(_acc.objectId && _acc.objectId === g)
		        accounts.push(_acc);
		}
	}
        
	if(!accounts.length){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('У вас нет ни одного лицевого счета');
	}

	AnyBalance.trace('Найдено лицевых счетов: ' + accounts.length);

	var result = {success: true};

	for(var i=0; i<accounts.length; ++i){
		var acc = accounts[i];
		
		if(isAvailable('__tariff')){
			if(acc.address)
			    sumParam(acc.address, result, '__tariff', null, null, null, aggregate_join);
		}

		for(var j=0; j<acc.accountDisplayKey.length; ++j){
			var f = acc.accountDisplayKey[j];
			if(f.fieldCode === 'accountNumber')
				sumParam(f.fieldValue, result, 'licschet', null, null, null, aggregate_join);
		}

		var name_balance = 'balance' + (i || ''), name_peni = 'peni' + (i || '')

		AnyBalance.trace('Найден счет ' + acc.providerName + ' (' + acc.serviceName + ')');

		if(AnyBalance.isAvailable(name_balance, name_peni)){
			html = AnyBalance.requestGet(baseurl + 'api/v5/accounts/' + acc.accountId + '/data', g_headers);
			json = getExtJson(html);

			getParam(json.balanceDetails.balance, result, name_balance, null, null, parseBalanceMy);
			for(var k=0; k<json.balanceDetails.subServiceBalances.length; ++k){
				var ss = json.balanceDetails.subServiceBalances[k];
				sumParam(ss.fine, result, name_peni, null, null, null, aggregate_sum);
			}
		}
	}
	
	if(AnyBalance.isAvailable('email', 'phone', 'fio')){
	    html = AnyBalance.requestGet(baseurl + 'api/v3/profile', g_headers);
	    json = getExtJson(html);
		
		getParam(json.email, result, 'email');
		getParam(json.phoneNumber, result, 'phone', null, [replaceTagsAndSpaces, /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4']);
		getParam(json.firstName + ' ' + json.lastName, result, 'fio');
	}

    AnyBalance.setResult(result); 
}

function getExtJson(html){
	try{
		var json = getJson(html);
	}catch(e){
		AnyBalance.trace(html);
		
		if(!html)
			throw new AnyBalance.Error('Сайт временно работает с перебоями. Попробуйте еще раз позже');
		
		throw new AnyBalance.Error('Не удалось получить информацию. Пожалуйста, свяжитесь с разработчиком');
	}

	return json;
}

function parseBalanceMy(val) {
	var balance = parseBalance(val + '');
	if(!isset(balance))
		return null;
	
	return -(balance);
}
