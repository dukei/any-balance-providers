/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у сотового оператора МТС (Украина). Вход через PDA-версию.

Сайт оператора: http://mts.com.ua/
Личный кабинет: https://ihelper-prp.mts.com.ua/SelfCarePda/
*/

var g_apiHeaders = {
    Connection: 'keep-alive',
	Accept: 'application/json, text/plain, */*',
	Origin: 'file://',
	'Accept-Encoding': null,
	'User-Agent': 'Mozilla/5.0 (Linux; Android 8.0; ONEPLUS A3010 Build/OPR6.170623.013) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.116 Crosswalk/18.48.477.13 Mobile Safari/537.36',
	'Content-Type': 'application/json;charset=UTF-8'
}

function parseTrafficMb(str){
    var val = parseBalance(str);
    if(isset(val))
        val = Math.round(val/1024*100)/100;
    return val;
}

function main(){
    var prefs = AnyBalance.getPreferences();

    checkEmpty(prefs.login, 'Введите номер телефона для входа в интернет-помощник!');
    checkEmpty(prefs.password, 'Введите пароль для входа в интернет-помощник!');

	if(prefs.phone && !/^\d+$/.test(prefs.phone)) {
		throw new AnyBalance.Error('В качестве номера необходимо ввести 9 цифр номера, например, 501234567, или не вводить ничего, чтобы получить информацию по основному номеру.');
	}

	main_api();
}



function callApi(requests){
	//Почему-то апи плохо понимает UTF-16. Приходится через бинарник перекодировать
	var html = AnyBalance.requestPost('https://cscapp.vodafone.ua/eai_mob/start.swe?SWEExtSource=JSONConverter&SWEExtCmd=Execute', JSON.stringify({
		"requests": requests,
		"params":{
			"version":"1.0.5",
			"language":"en",
			"source":"android 8",
			"token": callApi.token || null,
			"manufacture":"OnePlus",
			"childNumber":""
		}
	}), g_apiHeaders, { options: { FORCE_CHARSET: 'base64' }});

	var response = decodeUTF16LE(Base64.decode(html));
	var json = getJson(response);
	return json;
}

//Braindead decoder that assumes fully valid input
function decodeUTF16LE( binaryStr ) {
    var cp = [];
    for( var i = 0; i < binaryStr.length; i+=2) {
        cp.push( 
             binaryStr.charCodeAt(i) |
            ( binaryStr.charCodeAt(i+1) << 8 )
        );
    }

    return String.fromCharCode.apply( String, cp );
}

function throwApiError(res, verb){
	if(res.error){
		AnyBalance.trace('Result of ' + verb + ': ' + JSON.stringify(res));
		var message = getMtsErrorText(res.error) || 'Ошибка ' + verb + ': ' + res.error;
		throw new AnyBalance.Error(message, null, res.error == 202);
	}
}

function callApi1(verb, request){
    var params = {};
    params[verb] = request || {};

    var json = callApi(params);

    var res = json[verb];
	throwApiError(res, verb);

	return json[verb].values;

}

function parseBalanceRound(str){
	var b = parseBalance(str);
	if(isset(b))
		b = Math.round(b*100)/100
	return b;
}

function main_api(){
    var prefs = AnyBalance.getPreferences();

    var token = AnyBalance.getData('token_' + prefs.login), json;

    if(token){
    	callApi.token = token;
    	AnyBalance.trace("We have token saved. Trying to get access");

    	json = callApi({
    		checkBlockService: {
    			language: 'en',
    			source: 'android 8',
    			token: token,
    			version: '1.0.5'
    		}
    	});

    	if(json.checkBlockService.error){
    		AnyBalance.trace('Previous token is invalid: ' + json.checkBlockService.error);
    		token = null;
    	}
    }

    if(!token){
    	AnyBalance.trace("Need to log in");

    	json = callApi({login: {id: prefs.login, password: prefs.password}});
    	var tempToken, justRegistered;

    	if(json.login.error == 0){
    		tempToken = json.login.values.tempToken;
    		AnyBalance.trace('Got tempToken from login');
    	}else if(json.login.error == 202){
    		AnyBalance.trace('Number should be registered first');
    		json = callApi1('recoveryRegister', {action: 1, id: prefs.login});
    		AnyBalance.trace('Got tempToken from register');
    		justRegistered = true;
    		tempToken = json.tempToken;
    	}else{
    		throwApiError(json.login, 'login');
    	}

    	var code = AnyBalance.retrieveCode('Пожалуйста, введите код, отправленный вам по SMS на номер ' + prefs.login, null, {inputType: 'number', time: 180000});
    	
    	json = callApi1('getToken', {action: 0, id: prefs.login, parentToken: "", rememberMe: true, tempToken: tempToken, tpass: code});

    	token = callApi.token = json.token;
    	AnyBalance.setData('token_' + prefs.login, token);
    	AnyBalance.saveData();

    	if(justRegistered){
    		AnyBalance.trace('Setting new password (actually, password, entered in settings)');
    		callApi1('newPassword', {password: prefs.password, rememberMe: true});
    	}
    }

    var result = {success: true};

    if(AnyBalance.isAvailable('balance')){
    	AnyBalance.trace('Getting balance');
    	json = callApi1('balance');

    	getParam(json.balance + '', result, 'balance', null, null, parseBalanceRound);
    }

    if(isAvailable('__tariff')){
    	AnyBalance.trace('Getting balance');
    	json = callApi1('currentPlan');

    	getParam(json.name, result, '__tariff');
    }

    if(AnyBalance.isAvailable('sms_left', 'min_left', 'traffic_left', 'bonus_balance')){
    	AnyBalance.trace('Getting remainders');
    	json = callApi({countersMain: {}, countersMainDPI: {}, getBonus: {}});
    	AnyBalance.trace('Remainders: ' + JSON.stringify(json));

    	if(!json.countersMain.error){
    		var val = json.countersMain.values;
    		for(var i=0; i<val.length; ++i){
    			var rem = val[i];
    			if(rem.type == 'SMSMMS'){
    				getParam(rem.amount + '', result, 'sms_left', null, null, parseBalance);
    			}else if(rem.type == 'Minutes'){
    				getParam(rem.amount + '', result, 'min_left', null, null, parseBalance);
    			}else{
    				AnyBalance.trace('Unknown remainder: ' + JSON.stringify(rem));
    			}
    		}
    	}else{
    		AnyBalance.trace('Could not get countersMain: ' + JSON.stringify(json.countersMain));
    	}

    	if(!json.countersMainDPI.error){
    		var val = json.countersMainDPI.values;
    		getParam(val.amount + val.unit, result, 'traffic_left', null, null, parseTraffic);
    	}else{
    		AnyBalance.trace('Could not get countersMainDPI: ' + JSON.stringify(json.countersMainDPI));
    	}

    	if(!json.getBonus.error){
    		var val = json.getBonus.values;
    		getParam(val.balance + '', result, 'bonus_balance', null, null, parseBalance);
    	}else{
    		AnyBalance.trace('Could not get getBonus: ' + JSON.stringify(json.getBonus));
    	}
    }

    getParam(prefs.login, result, 'phone');

    AnyBalance.setResult(result);
}

