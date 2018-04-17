/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Процедура входа в Google-Аккаунт.
Вынесено в отдельный файл чтобы удобнее было переносить в другие провайдеры.
*/

function googleLogin(prefs) {
	var baseurlLogin = 'https://accounts.google.com/';

	function isLoggedIn(html) {
		return /logout/i.test(html);
	}

	function isLoginSuccesful(html) {
		if (!isLoggedIn(html)) {
			var error = getParam(html, null, null, /<span[^>]+id="errormsg[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
			if (error)
				throw new AnyBalance.Error(error, null, /парол|password/i.test(error));
			
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Can`t log in, is the site changed?');
		}
		return true;
	}
	
	// Прежде чем входить, вынем куки
	// Почему-то иногда падает, завернем
	try {
		AnyBalance.restoreCookies();
	} catch(e) {}
	
	var html = AnyBalance.requestGet(baseurlLogin, g_headers);

	if(!isLoggedIn(html)){
		var form = getElement(html, /<form[^>]+gaia_loginform/i);
		
		if(!form){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Can`t find find login form, is site changed?');
		}
	    
	    if(/<input[^>]+name="Email"(?:[^<](?!readonly))*>/i.test(form)){
	    	AnyBalance.trace('found login form, proceeding');
            var params = createFormParams(form, function(params, str, name, value) {
            	if(name == 'Email')
            		return prefs.login;
             	return value;
            });
			
			html = AnyBalance.requestPost(baseurlLogin + 'AccountLoginInfo', params, addHeaders({Referer: AnyBalance.getLastUrl()}));
	        
			form = getElement(html, /<form[^>]+gaia_loginform/i);
			if(!form){
				AnyBalance.trace(html);
				throw new AnyBalance.Error('Can`t find find password form, is site changed?');
			}
		}
	    
	    if(/<input[^>]+name="Passwd"/i.test(form)){
	    	AnyBalance.trace('found password form, proceeding');
            params = createFormParams(form, function(params, str, name, value) {
            	if(name == 'Passwd')
            		return prefs.password;
             	return value;
            });
            
			html = AnyBalance.requestPost(baseurlLogin + 'signin/challenge/sl/password', params, addHeaders({Referer: AnyBalance.getLastUrl()}));
		}else{
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Can`t find find password in form, is site changed?');
		}
		
		// Двухэтапная авторизация...
		var challengeList = getElement(html, /<ol[^>]+challengePickerList/i);
	    
		if(!challengeList && prefs.__dbg_test_list){
			AnyBalance.trace('Moving to a list of available challenges');
			let form = getElement(html, /<form[^>]+challenge\/skip/i);
			let params = createFormParams(form);
			html = AnyBalance.requestPost(baseurlLogin + 'signin/challenge/skip', params, addHeaders({Referer: AnyBalance.getLastUrl()}));
			challengeList = getElement(html, /<ol[^>]+challengePickerList/i);
		}
	    
		if(challengeList) {
			AnyBalance.trace('Google presented challenges list...');
			let challenges = getElements(challengeList, /<form[^>]+challenge/ig);
			AnyBalance.trace('Found ' + challenges.length + ' possible challenges');
			let i = 0;
			for(; i<challenges.length; ++i){
				let challenge = challenges[i];
				let name = getElement(challenge, /<button[^>]+submit/i, replaceTagsAndSpaces);
				let type = getParam(challenge, null, null, /accounts\/marc\/(\w+)\.png/i);
	    
			   	if(['idv_sms','idv_call','backup_code','authenticator'].indexOf(type) >= 0){
			   		//Нашли подходящий способ подтверждения
					AnyBalance.trace('Use challenge of type ' + type + ': ' + name );
					let params = createFormParams(challenge);
					let action = getParam(challenge, null, null, /action="([^"]*)/i, replaceHtmlEntities);
					html = AnyBalance.requestPost(joinUrl(baseurlLogin, action), params, addHeaders({Referer: AnyBalance.getLastUrl()}));
					break;
			   	}
	    
				AnyBalance.trace('Challenge of type ' + type + ' is not supported, skipping: ' + name );
			}
	    
			if(i>=challenges.length){
				AnyBalance.trace(html);
				throw new AnyBalance.Error('Could not find supported two-factor authentication challenge. Is the site changed?');
			}
		}
	    
		// Двухэтапная авторизация...
		var form = getElement(html, /<form[^>]+id="challenge"/i);
		if(form) {
			// throw new AnyBalance.Error('Two-factor authorization is enabled. Just now we can`t deal with this. Login attempt has failed.');
			if(!/<input[^>]+name="Pin"/i.test(form)){
				AnyBalance.trace(form);
				throw new AnyBalance.Error('Google requested confirmation code, but you have not setup confirmation parameters yet. Enter your google account via browser and attach your phone to send confirmation to.');
			}

			let promtArea = getParam(form, null, null, /accounts\/marc\/\w+\.png[^>]*>([\s\S]*?)<input[^>]+name="Pin"/i), promt;
			if(promtArea){
				let divs = getElements(promtArea, /<div/ig, replaceTagsAndSpaces);
				promt = divs[1]; //Второй див содержит инструкцию по получению кода.
			}
			let addPromt = getParam(html, null, null, /<input[^>]+name="Pin"[^>]*placeholder="([^"]*)/i, replaceHtmlEntities);
			promt = promt ? promt + '. ' + addPromt : addPromt;
			let type = getParam(form, null, null, /accounts\/marc\/(\w+)\.png/i);
			AnyBalance.trace('Trying to get code for challenge of type ' + type + ': ' + promt, null, {inputType: 'number'});
	    
			let code = AnyBalance.retrieveCode(promt || 'Please, enter confirmation code');
			AnyBalance.trace('Got code: ' + code);           
	    
			if(!isset(code))
				throw new AnyBalance.Error('Two-factor authorization is enabled. Just now we can`t deal with this. Login attempt has failed.');
	    
			let params = createFormParams(form);
			params.Pin = code;
			let action = getParam(form, null, null, /action="([^"]*)/i, replaceHtmlEntities);
			
			html = AnyBalance.requestPost(joinUrl(baseurlLogin, action), params, addHeaders({Referer: AnyBalance.getLastUrl()}));
		}
	    
		// Еще раз проверим правильность входа
		isLoginSuccesful(html);
	    
		//Проверим, не хочет ли гугл проверить данные
		form = getElement(html, /<form[^>]+action="SmsAuthInterstitial"[^>]*>/i);
		if(form){
			AnyBalance.trace('Needs 2-factor parameters review, skipping it to view later');
            let params = createFormParams(html, function(params, str, name, value) {
            	if(/type="submit"/i.test(str) && name != "remind")
            		return; //Только remind - Напомнить позже
             	return value;
            });
			
			html = AnyBalance.requestPost(baseurlLogin + 'SmsAuthInterstitial', params, addHeaders({Referer: AnyBalance.getLastUrl()}));
		}
		
		// Еще раз проверим правильность входа
		isLoginSuccesful(html);
	}

	AnyBalance.saveCookies();
	AnyBalance.saveData();
	return html;
}

function reenterPasswordIfGoogleNeeds(html, prefs){
	var form = getElement(html, /<form[^>]+id="gaia_loginform"[^>]*>/i);
	if(form){
		//Надо ещё разок ввести пароль
		var params = AB.createFormParams(html, function(params, str, name, value) {
			if (name == 'Passwd') 
				return prefs.password;
	    
			return value;
		});

		var action = getParam(form, null, null, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities);
		html = AnyBalance.requestPost(joinUrl(AnyBalance.getLastUrl(), action), params, addHeaders({Referer: AnyBalance.getLastUrl()})); 
	}
	return html;
}