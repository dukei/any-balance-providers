/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у сотового оператора МТС (Украина). Вход через PDA-версию.

Сайт оператора: http://mts.com.ua/
Личный кабинет: https://ihelper-prp.mts.com.ua/SelfCarePda/
*/

var g_apiHeaders = {
    Connection: 'keep-alive',
	Accept: 'application/json, text/plain, */*',
	Origin: 'https://my.vodafone.ua',
//	Origin: 'file://',
	'Accept-Encoding': null,
	'User-Agent': 'Mozilla/5.0 (Linux; Android 8.0; ONEPLUS A3010 Build/OPR6.170623.013) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.116 Crosswalk/18.48.477.13 Mobile Safari/537.36',
	'Content-Type': 'application/manifest+json; charset=UTF-8'
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
			"version":"2.0.7",
			"accessType": "",
			"language": callApi.lang,
			"source":"android 8",
			"token": callApi.token || null,
			"manufacture":"OnePlus",
			"childNumber":"",
                        "spinner": 0
		}
	}), g_apiHeaders, { options: { FORCE_CHARSET: 'base64' }}
	);

	var response = decodeUTF16LE(Base64.decode(html));
        response = response.replace(/[\u0000-\u0019]+/g,""); 
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
        callApi.lang = prefs.lang;
    	AnyBalance.trace("We have token saved. Trying to get access");

    	json = callApi({
    		checkBlockService: {
    			language: 'en',
    			source: 'android 8',
    			token: token,
    			version: '2.0.7'
    		}
    	});
    	if(json.checkBlockService.error){
    		AnyBalance.trace('Previous token is invalid: ' + json.checkBlockService.error);
    		token = null;
    	}
    }

    if(!token){
    	AnyBalance.trace("Need to log in");
    	json = callApi({loginV2: {id: prefs.login}});
    	var tempToken;
    	
    	if(json.loginV2.error == 0){
    		tempToken = json.loginV2.values.tempToken;
    		AnyBalance.trace('Got tempToken from login');
    	}else{
    		throwApiError(json.loginV2, 'login');
    	}

    	if (/\d{8}/i.test(prefs.password)) {
    		AnyBalance.trace("Вход по PUK коду");
	        json = callApi1('getToken', {action: 0, id: prefs.login, parentToken: "", rememberMe: true, tempToken: tempToken, tpass: "", puk: prefs.password});
    	}
        token = callApi.token = json.token;
        if(!token){
        	AnyBalance.trace("Вход по SMS");
   		var code = AnyBalance.retrieveCode('Пожалуйста, введите код, отправленный вам по SMS на номер ' + prefs.login, null, {inputType: 'number', time: 180000});
	    	json = callApi1('getToken', {action: 0, id: prefs.login, parentToken: "", rememberMe: true, tempToken: tempToken, tpass: code});
	    	token = callApi.token = json.token;
    	}
        if(!token) throwApiError(json.loginV2, 'login');
    	AnyBalance.setData('token_' + prefs.login, token);
    	AnyBalance.saveData();

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
	    if(isAvailable('info')){
    		getParam(json.desc+' ('+json.regularCost+ (prefs.lang=='en' ? ' UAH': ' грн.')+')', result, 'info');
    	}

    }



    if(AnyBalance.isAvailable('sms_left', 'min_left', 'traffic_left', 'bonus_balance')){
    	AnyBalance.trace('Getting remainders');
    	json = callApi({countersMainV2: {}, countersMainDPI: {}, getBonus: {}});
    	AnyBalance.trace('Remainders: ' + JSON.stringify(json));
    	var sms_left='';
    	var min_left='';
    	if(!json.countersMainV2.error){
    		var val = json.countersMainV2.values.counters;
                val.sort(function (a, b) {return b.mainFlg.localeCompare(a.mainFlg);});
    		for(var i=0; i<val.length; ++i){
    			var rem = val[i];
    			if(rem.type == 'SMSMMS' && 0+sms_left<5){
    				getParam(rem.remainValue + '', result, 'sms_left'+sms_left, null, null, parseBalance);
                                if (prefs.needSuf) result['suf_sms_left' + sms_left] = '/' + rem.fullValue;
                                if (prefs.needPref) result['pre_sms_left' + sms_left] = rem.name + ' ';
                                if (sms_left) {sms_left+=1} else {sms_left=1};
    			}else if(rem.type == 'Minutes' && 0+min_left<5){
    				getParam(rem.remainValue + '', result, 'min_left'+min_left, null, null, parseBalance);
                                if (prefs.needSuf) result['suf_min_left' + min_left] = '/'+rem.fullValue;
                                if (prefs.needPref) result['pre_min_left' + min_left] = rem.name + ' ';
                                if (min_left) {min_left+=1} else {min_left=1};
    			}else{
    				AnyBalance.trace('Unknown remainder: ' + JSON.stringify(rem));
    			}
    		}
                getParam(json.countersMainV2.values.dateOfExpire + '', result, 'dateOfExpire', null, null, parseDate);
                getParam(json.countersMainV2.values.endTP.endedDateTP + '', result, 'endTP', null, null, parseDate);

    	}else{
    		AnyBalance.trace('Could not get countersMainV2: ' + JSON.stringify(json.countersMainV2));
    	}

    	if(!json.countersMainDPI.error){
    		var val = json.countersMainDPI.values;
    		getParam(val.amount + val.unit, result, 'traffic_left', null, null, parseTraffic);
    		if (prefs.needSuf) result['suf_traffic_left']='/' + parseTraffic(val.total + val.totalunit);
   	}else{
    		AnyBalance.trace('Could not get countersMainDPI: ' + JSON.stringify(json.countersMainDPI));
    	}

    	if(!json.getBonus.error){
    		var val = json.getBonus.values;
    		getParam(val.balance + '', result, 'bonus_balance', null, null, parseBalance);
                if(isAvailable('info') && val.debitBonusesCount>0) {
                	var bonusText;
                	if (pref.lang=='en'){
                		bonusText=val.debitBonusesCount + ' bonuses will be debited ' + getFormattedDate('MM-DD-YY',new Date(parseDate(val.debitBonusesDate)));
                	}else{ if  (pref.lang=='ua'){
                		bonusText=getFormattedDate('DD.MM.YYYY',new Date(parseDate(val.debitBonusesDate)))+' р. буде списано '+val.debitBonusesCount+' бонусів.';
                	}else{
                		bonusText=getFormattedDate('DD.MM.YYYY',new Date(parseDate(val.debitBonusesDate)))+' г. будет списано '+val.debitBonusesCount+' бонусов.';
                	}}
                	result['info']=result['info'] + '. ' + bonusText;
                }else{
    			AnyBalance.trace('Could not get getBonus: ' + JSON.stringify(json.getBonus));
                }
    	}
    }

    getParam(prefs.login, result, 'phone');

    AnyBalance.setResult(result);
}

