/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	Connection: 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.120 Safari/537.36'
};

var baseurl = 'https://yoomoney.ru/';
var g_csrf;
var g_savedData;

function callApi(verb, params){
	if(!g_csrf)
		throw new AnyBalance.Error('CSRF token not set!');

	var html = AnyBalance.requestPost(baseurl + verb, JSON.stringify(params), addHeaders({
		Referer: baseurl,
		'Content-Type': 'application/json;charset=UTF-8',
		'x-csrf-token': g_csrf
	}));
	if (verb=='yooid/signin/api/process/start/standard' && AnyBalance.getLastStatusCode()==404)
		return 	 callApi ('yooid/signin/api/process/start',params);

	var json = JSON.parse(html);
	if(json.status === 'error'){
		AnyBalance.trace(html);
		var error = json.message || (json.errors && JSON.stringify(json.errors));
		throw new AnyBalance.Error(error, null, /PASSWORD|ACCOUNT/i.test(error));
	}

	return json;
}

function login(){
	var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.login, 'Введите логин в ЮMoney!');
	checkEmpty(prefs.password, 'Введите пароль, используемый для входа в систему ЮMoney.');
	
	if(!g_savedData)
		g_savedData = new SavedData('yoomoney', prefs.login);

	g_savedData.restoreCookies();

	var html = AnyBalance.requestGet(baseurl, g_headers);
	var data = getJsonObject(html, /window.__layoutData__\s*=/);
	if(data && data.user && data.user.uid){
		AnyBalance.trace('Already logged in to ' + data.user.userName + ' (' + data.user.maskedPhone + ')');
	}else{
		AnyBalance.trace('Logging in anew');
		html = AnyBalance.requestGet(baseurl + 'yooid/signin?origin=Wallet&returnUrl=https%3A%2F%2Fyoomoney.ru%2F', g_headers);
		g_csrf = getParam(html, /__secretKey__="([^"]*)/);
		if(!g_csrf){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удаётся найти информацию для входа. Сайт изменен?');
		}
		var data = getJsonObject(html, /__data__=/);
	    
		var jsonProcess = callApi('yooid/signin/api/process/start/standard', {
			"sessionId":data.tmx.sessionId,
			"login":prefs.login,
			"origin":"Wallet"
		});
	    
	    
        var json = callApiProgress('yooid/signin/api/login/set', {
        	"login":prefs.login,
        	"processId":jsonProcess.result.processId,
        	"loginType":jsonProcess.result.loginType
        });
        var _json = json;
        
		function getNextStepData(json){
			if(!json.result)
				return json.result;
	    
			if(json.result.nextStepData)
				return json.result.nextStepData;
	    
			if(json.result.nextStep)
				return json.result;
		}
	    
		while(_json.result && getNextStepData(_json)){
			_json = processStep(jsonProcess.result, getNextStepData(_json));
		}
		
		html = AnyBalance.requestGet(baseurl);
	}

	g_savedData.setCookies();
	g_savedData.save();
	return html;
}

function callApiProgress(verb, params){
	var json;
	do{
		if(json)
			AnyBalance.sleep(1000);

		json = callApi(verb, params);
		AnyBalance.trace(verb + ': ' + JSON.stringify(json));
	}while(json.status === 'progress');
	
	var status = json.result && json.result.status;
	if(status && !/^(SUCCESS|ok)$/i.test(status)){
		var error = json.result.message || json.result.status;
		throw new AnyBalance.Error(error, null, /ACCOUNT|PASSWORD/i.test(error));
	}

	return json;
}

function processStep(data, stepData){
	var prefs = AnyBalance.getPreferences();
	AnyBalance.trace('Processing step ' + stepData.nextStep);
	var json;
	if(stepData.nextStep === 'SetPassword'){
		json = callApiProgress('yooid/signin/api/password/set', {
			"processId":data.processId,
			"loginType":data.loginType,
			"password":prefs.password
		});
	}else if(stepData.nextStep === 'SetConfirmationCode'){
		var code = AnyBalance.retrieveCode('Пожалуйста, введите код, который послан вам на ' + stepData.maskedRecipient, null, {inputType: 'number', time: 170000});
		var verbs = {
			PhoneNumber: 'otp/check/phone',
			Email: 'otp/check/mail',
		};

		if(!verbs[data.loginType])
			throw new AnyBalance.Error('Неизвестный тип входа: ' + data.loginType);

		json = callApiProgress('yooid/signin/api/' + verbs[data.loginType], {
			"contextId": data.processId,
			"answer": code
		});
	}else if(stepData.nextStep === 'Complete'){
		json = callApiProgress('yooid/signin/api/process/complete', {
			"processId":data.processId,
			"loginType":data.loginType,
		});
	}else if(stepData.nextStep === 'SelectAccount'){
		AnyBalance.trace('Multiple accounts found: ' + JSON.stringify(stepData.accounts));
		var acc = stepData.accounts.filter(function(a){return a.migrationRequirement === 'NotRequired'});
		if(!acc[0])
			throw new AnyBalance.Error('Не удалось найти готовый для входа аккаунт!');
		
		json = callApiProgress('yooid/signin/api/account/select', {
			"processId":data.processId,
			"loginType":data.loginType,
			"uid": acc[0].uid
		});
	}else{
		throw new AnyBalance.Error('Неизвестный шаг');
	}

	return json;
}

function loginAndGetBalance(prefs, result) {
	checkEmpty(prefs.login, 'Введите логин в Яндекс.Деньги!');
	checkEmpty(prefs.password, 'Введите пароль, используемый для входа в систему Яндекс.Деньги. Не платежный пароль, а именно пароль для входа!');
	
	AnyBalance.setDefaultCharset('UTF-8');

	var html = login();
	
	var ld = getJsonObject(html, /window.__layoutData__\s*=/);
	var status={identified:'Идентифицированный', anonymous:'Анонимный',named:'Именной'};
	if(ld){
		AnyBalance.trace('Загружаем из layoutData');
		getParam(ld.user.accountId, result, 'number');
		getParam(ld.user.accountId, result, '__tariff');
		getParam(ld.user.userName, result, 'userName');
		getParam(status[ld.user.accountStatus]||ld.user.accountStatus, result, 'accountStatus');
		getParam(ld.balance.rub.availableAmount, result, 'balance', null, null, parseBalance);
		var sk = ld.secretKey;

		if(ld.balance.bonus){
			getParam(ld.balance.bonus.availableAmount, result, 'bonus', null, null, parseBalance);
		}else{
			var html = AnyBalance.requestGet(baseurl + 'ajax/layout/accounts?sk=' + encodeURIComponent(sk), addHeaders({
				Accept: 'application/json, text/plain, */*',
				Referer: baseurl
			}));
			var json = getJson(html);
			getParam(json.balances.bonus.availableAmount, result, 'bonus', null, null, parseBalance);
		}
		   try{
			var html = AnyBalance.requestGet(baseurl + 'ajax/layout/curtain-cards?sk=' + encodeURIComponent(sk), addHeaders({
				Accept: 'application/json, text/plain, */*',
				Referer: baseurl
			}));
			var json = getJson(html).ownCards;
			if (json && json.length>0){
				json=json[0];
				getParam(json.cardNumber.substr(-8), result, 'cardNumber');
				getParam(json.expirationDate, result, 'cardDate',null,null,parseDate);
				
			}
		   }catch(e){
			AnyBalance.trace('Ошибка получения информации по доп.картам'+e.message);
		   }
			//getParam(json.balances.bonus.availableAmount, result, 'bonus');

	}else{
		AnyBalance.trace('Загружаем по-старинке');
		getParam(html, result, 'number', /Номер кошелька(?:[^>]*>){2}(\d{10,20})/i, replaceTagsAndSpaces);
		
		var textsum = getElements(html, [/<button/ig, /balance__icon/i])[0];
		if(textsum)
			textsum = replaceAll(textsum, replaceTagsAndSpaces);
    
		AnyBalance.trace('Предположительно баланс где-то здесь: ' + textsum);
    
		if(!textsum || /\*{3}/.test(textsum)) {
		    AnyBalance.trace('Сумма спрятана. Будем пытаться найти...');
			//var text = AnyBalance.requestGet(baseurl + "tunes.xml", g_headers);
			//Теперь ключ и баланс в такой структурке: 
			//<div class="balance i-bem" data-bem="{&quot;balance&quot;:{&quot;amount&quot;:{&quot;sum&quot;:112.88,&quot;code&quot;:&quot;643&quot;},&quot;isHidden&quot;:true,&quot;setSumFlagUrl&quot;:&quot;/ajax/sum-visibility?sk=u8c9727f96af623dcb0814a3da5451cd6&quot;}}">
		    var params = getParam(html, null, null, /<div[^>]+class="[^>]*\bbalance\b[^>]+data-bem=[']([^']*)/i, replaceHtmlEntities, getJson);
		    AnyBalance.trace('Получаем баланс из ' + JSON.stringify(params));
		    if(params && params.balance && params.balance.amount && isset(params.balance.amount.sum)){
		    	getParam(params.balance.amount.sum, result, 'balance', null, null, parseBalance);
		    }else{
				AnyBalance.trace(html);
				throw new AnyBalance.Error('Не удаётся найти спрятанный баланс! Сайт изменен?');
			}
		} else {
		    getParam(textsum, result, 'balance', null, replaceTagsAndSpaces, parseBalance);
		}
    
		getParam(html, result, 'bonus', /Скол`ько у вас баллов[\s\S]*?<div[^>]+balance__item[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	}
}

function processHistory(result) {
	if(!AnyBalance.isAvailable('transactions'))
		return;
	
	var maxCount = 100;
	var startCount = 0;

	result.transactions = [];
	
	for(var z=1; z<=10; z++) {
		var html = AnyBalance.requestGet(baseurl + 'ajax/history/partly?ncrnd=72010&history_shortcut=history_all&start-record=' + startCount + '&record-count=' + maxCount, addHeaders({'X-Requested-With': 'XMLHttpRequest'}));
		startCount +=maxCount;
		var json = getJson(html);		
		
		AnyBalance.trace('Найдено транзакций: ' + json.history.length);
		for(var i=0; i < json.history.length; ++i) {
			var h = {};
			
			getParam((json.history[i].type == 2 ? '-' : '') + json.history[i].sum + '', h, 'transactions.sum', null, replaceTagsAndSpaces, parseBalance);
			getParam(json.history[i].name, h, 'transactions.name', null, replaceTagsAndSpaces);
			getParam(json.history[i].date, h, 'transactions.time', null, replaceTagsAndSpaces, parseDateISO);
			
			result.transactions.push(h);
		}
		if(!json.hasMore) {
			AnyBalance.trace('Транзакций больше нет...');	
			break;
		}
	}
}

function getCombinedHistory(){
	return [];
	var maxCount = 100;
	var htmlBalls = AnyBalance.requestGet(baseurl + 'ajax/load-bonus-history?recordCount=' + maxCount, addHeaders({'X-Requested-With': 'XMLHttpRequest'}));
	var jsonBalls = getJson(htmlBalls);		
	var htmlTrns = AnyBalance.requestGet(baseurl + 'ajax/history/partly?ncrnd=72010&history_shortcut=history_all&start-record=0&record-count=' + maxCount, addHeaders({'X-Requested-With': 'XMLHttpRequest'}));
	var jsonTrns = getJson(htmlTrns);

	combineHistory(jsonTrns, jsonBalls);
    return jsonTrns.history;
}

function combineHistory(jsonTrns, jsonBalls){
    for(var i=0, j=0; i<jsonBalls.items.length; ++i){
    	var balls = jsonBalls.items[i];
    	
    	var timeBa = parseDateISOSilent(balls.date);
    	var typeBa;
    	if(/за пятый|в категории месяца/i.test(balls.name))
    		typeBa = 'card';
    	else if(/за плат[её]ж в интернете/i.test(balls.name))
    		typeBa = 'internet';
    	else if(balls.isIncoming === false)
    		typeBa = 'balls';
    	else{
    		AnyBalance.trace('Тип начисления баллов неизвестен: ' + balls.name + '\n' + JSON.stringify(balls));
    		typeBa = 'unknown';
    	}

    	if(typeBa === 'balls') //Списание баллов
    		continue;

    	//Домотаем до первой транзакции произошедшей НЕ ПОЗДНЕЕ начисления баллов
    	for(;j<jsonTrns.history.length && parseDateISOSilent(jsonTrns.history[j].date) > timeBa; ++j);
    	if(j >= jsonTrns.history.length)
    		break;

    	for(var j1=j; j1<jsonTrns.history.length; ++j1){
        	var trns = jsonTrns.history[j];
    		var timeTr = parseDateISOSilent(trns.date);
    		if(timeBa - timeTr > 5*60*1000) //Слишком удалились по времени от начисления баллов
    			break;
    		if(typeBa === 'card' && !trns.flags['is-meta-ycard-operation'])
    			continue; //Нужна карточная операция, а это не карточная
    		if(typeBa === 'internet' && !trns.flags['is-out-shop'])
    		    continue; //Нужна оплата интернет-магазину, а это не она
        	
        	trns.__balls = balls;
        	j = j1 + 1;
        	
        	break;
        }

        if(!trns.__balls){
        	AnyBalance.trace('Не удалось найти транзакцию для баллов ' + JSON.stringify(balls));
        }
    }

    AnyBalance.trace(i + '/' + jsonBalls.items.length + ' баллов поставлены в соответствие транзакциям');
}
