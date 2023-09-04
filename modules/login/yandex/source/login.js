/**
Процедура входа в Яндекс. Унифицирована и выделена в отдельный файл для удобства встраивания
*/

function apiPost(url, params, message, reFatal){
	const html = AnyBalance.requestPost(url, {
		csrf_token: csrf,
		track_id: track_id,
	}, addHeaders({
		'X-Requested-With': 'XMLHttpRequest',
		Origin: baseurl,
		Referer: referer
	}));
	json = getJson(html);
	if(json.status !== 'ok'){
		AnyBalance.trace(html);
		const error = (json.errors || json.error).join('; ');
		throw new AnyBalance.Error('Пароль не принят: ' + error, null, /not_matched/.test(error));
	}
}

function loginYandex(login, password, html, retpath, origin) {
	var baseurl = "https://passport.yandex.ru";
	
	const params = {};
	if (origin) 
		params.origin = origin;
	if (retpath) 
		params.retpath = retpath;
	let referer = baseurl + '/auth/?' + createUrlEncodedParams(params);
	if (!html)
		html = AnyBalance.requestGet(referer, g_headers);
	
	function apiPost(verb, params, message, reFatal){
		const html = AnyBalance.requestPost(baseurl + '/' + verb, params, addHeaders({
			'X-Requested-With': 'XMLHttpRequest',
			Origin: baseurl,
			Referer: referer
		}));
		const json = getJson(html);
		if(json.status !== 'ok' && (json.error || (json.errors && json.errors[0] !== 'captcha.required'))){
			AnyBalance.trace(html);
			const error = (json.errors || json.error).join('; ');
			throw new AnyBalance.Error(message + ': ' + error, null, reFatal && reFatal.test(error));
		}
		return json;
	}

	const csrf = getParam(html, /<input[^>]+name="csrf_token"[^>]*value="([^"]*)/i, replaceHtmlEntities);
	const process_uuid = getParam(html, /process_uuid=([^&"]*)/i, replaceHtmlEntities, decodeURIComponent);

	json = apiPost('registration-validations/auth/multi_step/start', {
		csrf_token: csrf,
		login: login,
		process_uuid: process_uuid,
		retpath: retpath,
		origin: origin		
	}, 'Вход не может быть выполнен. Сайт изменен?', /userNotFound|prohibitedsymbols/);
	
	if(!json.can_authorize){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Этот логин не может быть авторизован (неверный логин)', null, true);
	}
	
	const track_id = json.track_id;
	
	function checkCaptcha(){
		AnyBalance.trace('Потребовался ввод текстовой капчи');

		json = apiPost('registration-validations/textcaptcha', {
			csrf_token: csrf,
			track_id: track_id,
			language: 'ru',
			scale_factor: 3,
		}, 'Запрос на отправку капчи не принят');

		var captchaImg = AnyBalance.requestGet(json.image_url, g_headers);
		var key = json.key;		
		var captcha = AnyBalance.retrieveCode('В некоторых случаях Яндекс использует защиту от роботов в виде текстовой капчи.\nПожалуйста, введите символы с картинки', captchaImg, {/*inputType: 'number', */time: 180000});
        
		json = apiPost('registration-validations/checkHuman', {
			csrf_token: csrf,
			track_id: track_id,
			answer: captcha,
	    	key: key,
	    }, 'Запрос на проверку ответа не принят');
		
	}

	json = apiPost('registration-validations/auth/multi_step/commit_password', {
		csrf_token: csrf,
		track_id: track_id,
		password: password,
		retpath: retpath
	}, 'Пароль не принят', /not_matched/);
	
	if(json.errors && json.errors[0] == 'captcha.required'){
	    checkCaptcha();
		
		json = apiPost('registration-validations/auth/multi_step/commit_password', {
	    	csrf_token: csrf,
	    	track_id: track_id,
	    	password: password,
	    	retpath: retpath
	    }, 'Пароль не принят', /not_matched/);
		
	}
	
	if(json.state == 'change_password'){
		AnyBalance.trace('Потребовалась смена пароля');
		throw new AnyBalance.Error('Яндекс требует сменить пароль. Пожалуйста, перейдите на страницу авторизации https://passport.yandex.ru/auth/welcome через браузер, смените пароль и введите новый пароль в настройки провайдера', null, true);
	}

	if(json.state == 'auth_challenge'){
		AnyBalance.trace('Потребовалась дополнительная проверка входа');

		json = apiPost('registration-validations/auth/challenge/submit', {
			csrf_token: csrf,
			track_id: track_id,
		}, 'Запрос на проверку входа не принят');
		
		AnyBalance.trace(JSON.stringify(json));

		var challengeType = json.challenge.challengeType;
		var phoneId = json.challenge.phoneId;
	    var hint = json.challenge.hint;
		
		if(challengeType == 'mobile_id'){
			if(!json.challenge.alternative.challengeType){
                AnyBalance.trace('Альтернативных способов подтверждения входа не найдено. Устанавливаем подтверждение по телефону');
			    challengeType = 'phone_confirmation';
			}else{
				AnyBalance.trace('Альтернативный способ подтверждения входа найден. Устанавливаем подтверждение ' + json.challenge.alternative.challengeType);
				challengeType = json.challenge.alternative.challengeType;
			}
		}

		if(!/auth\/challenge\/commit/i.test(AnyBalance.getLastUrl())){ // На случай, если Яндекс сразу выкатил подтверждение по телефону или контрольный вопрос
		    if(challengeType == 'phone_confirmation'){
			    AnyBalance.trace('Требуется подтверждение по телефону');
                
			    json = apiPost('registration-validations/auth/validate_phone_by_id', {
				    csrf_token: csrf,
				    track_id: track_id,
				    phoneId: phoneId
			    }, 'Запрос на валидацию не принят');
                
			    if(json.valid_for_flash_call == false && json.valid_for_call == false){
				    AnyBalance.trace('Требуется подтверждение с помощью кода из SMS');
				    var confirm_method = 'by_sms';
			    }else if(json.valid_for_flash_call == true && json.valid_for_call == true){
				    AnyBalance.trace('Требуется подтверждение с помощью входящего звонка');
				    var confirm_method = 'by_flash_call';
			    }else if(!json.valid_for_flash_call && !json.valid_for_call){
				    AnyBalance.trace(html);
				    throw new AnyBalance.Error('Требуемое подтверждение не поддерживается');
			    }
                
			    json = apiPost('registration-validations/phone-confirm-code-submit', {
				    csrf_token: csrf,
				    track_id: track_id,
				    phone_id: phoneId,
				    confirm_method: confirm_method,
				    isCodeWithFormat: true
			    }, 'Запрос на отправку кода не принят');
                
			    if (json.global_sms_id){
			        var code = AnyBalance.retrieveCode('Пожалуйста, введите код из ' + json.code_length + ' цифр из SMS, отправленного на ваш номер ' + json.number.masked_international, null, {inputType: 'number', time: 180000});
			    }else{
				    var code = AnyBalance.retrieveCode('Пожалуйста, введите последние ' + json.code_length + ' цифры номера телефона из звонка, поступившего на ваш номер ' + json.number.masked_international, null, {inputType: 'number', time: 180000});
			    }
                
			    json = apiPost('registration-validations/phone-confirm-code', {
				    csrf_token: csrf,
				    track_id: track_id,
				    code: code
			    }, 'Запрос на подтверждение кода не принят');
			    
			    json = apiPost('registration-validations/auth/challenge/commit', {
		    	    csrf_token: csrf,
		    	    track_id: track_id,
		    	    challenge: challengeType,
		        }, 'Ошибка подтверждения входа');
			    
		    }else if(challengeType == 'push_2fa'){
			    AnyBalance.trace('Требуется подтверждение через мобильный Яндекс');
			    
                json = apiPost('registration-validations/auth/challenge/send_push', {
				    csrf_token: csrf,
				    track_id: track_id
			    }, 'Запрос на отправку уведомления не принят');
                
			    var answer = AnyBalance.retrieveCode('Пожалуйста, введите код из уведомления, отправленного в мобильное приложение Яндекс на вашем устройстве', null, {inputType: 'number', time: 180000});
			    
			    json = apiPost('registration-validations/auth/challenge/commit', {
			        csrf_token: csrf,
			        track_id: track_id,
			        challenge: challengeType,
				    answer: answer
		        }, 'Ошибка подтверждения входа');
			    
		    }else if(challengeType == 'question'){
			    AnyBalance.trace('Требуется ответ на контрольный вопрос');
			    
			    var answer = AnyBalance.retrieveCode('Пожалуйста, введите ответ на контрольный вопрос:\n\n' + hint, null, {/*inputType: 'number', */time: 180000});
			    
			    json = apiPost('registration-validations/auth/challenge/commit', {
			        csrf_token: csrf,
			        track_id: track_id,
			        challenge: challengeType,
				    answer: answer
		        }, 'Ошибка подтверждения входа');
			    
		    }else{
			    AnyBalance.trace(html);
			    throw new AnyBalance.Error('Затребованный тип проверки не поддерживется: ' + challengeType);
		    }
        }
	}

	html = AnyBalance.requestGet(baseurl + '/auth/finish/?' + createUrlEncodedParams({
		track_id: track_id,
		retpath: retpath
	}), addHeaders({Referer: referer}));
	
	if(/host/i.test(html)&&/goal/i.test(html)){	
        var varIt = getJsonObject(html, /var\s*it\s*=\s*/);
		varIt = JSON.stringify(varIt);
			
		var host = getParam(varIt, /"host":"([^"]*)/i, replaceHtmlEntities, decodeURIComponent);
	    var goal = getParam(varIt, /"goal":"([^"]*)/i, replaceHtmlEntities, decodeURIComponent);
    	var container = getParam(html, /element2\.value\s?=\s?'([^']*)/i, replaceHtmlEntities, decodeURIComponent);
    		
    	html = AnyBalance.requestPost(host, {'goal': goal, 'container': container}, addHeaders({
	        'Content-Type': 'application/x-www-form-urlencoded',
    		'Origin': 'https://sso.passport.yandex.ru',
            'Referer': 'https://sso.passport.yandex.ru/'
	    }));
    }else{
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
    }

	return html;
}