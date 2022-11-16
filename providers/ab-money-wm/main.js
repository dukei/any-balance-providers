/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function getViewState(html){
    return getParam(html, null, null, /name="__VIEWSTATE".*?value="([^"]*)"/);
}

function getEventValidation(html){
    return getParam(html, null, null, /name="__EVENTVALIDATION".*?value="([^"]*)"/);
}

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.99 Safari/537.36',
};
function delCookies(){
	AnyBalance.trace('Удалены данные предыдущей сесии');
	AB.clearAllCookies();
	AnyBalance.clearData();
	AnyBalance.saveData();
};
function isLoged(){
	var info = {};
	var ref = AnyBalance.getLastUrl();
	info = AnyBalance.requestGet('https://login.wmtransfer.com/GateKeeper/SingleSignOn.js?type=cors&_=' + (+new Date()), addHeaders({
		Accept: 'application/json, text/javascript, */*; q=0.01',
		Origin: 'https://mini.webmoney.ru',
		Referer: ref
	}));
	info = getJson(info);
	AnyBalance.trace(info.loggedOn?'Авторизованы для WMID '+info.wmId:'Не авторизованы');
	return info.loggedOn;
}
function handleRedirect(html){
	var form = getElement(html, /<form[^>]+data-role="auto-submit"/i);
	if(form){
		var prefs = AnyBalance.getPreferences();
		AnyBalance.trace('Доп. форма переадресации перед продолжением...');
		var ref = AnyBalance.getLastUrl();
		var action = getParam(form, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities);
		var params = createFormParams(form);
		params.fid = hex_md5(prefs.login);
		var delay = getParam(form, /<form[^>]+data-submit-delay="([^"]*)/i, replaceHtmlEntities, parseBalance) || 0;
		if(delay > 0){
			AnyBalance.trace('Необходимо подождать ' + delay + ' мсек');
			AnyBalance.sleep(delay);
		}
		html = AnyBalance.requestPost(joinUrl(ref, action), params, addHeaders({Referer: ref}));
	}
	if(/Сейчас произойдет автоматический переход на/i.test(html)){
		AnyBalance.trace('Обнаружена промежуточная страница, переходим на стандартный кошелек');
		form = getElement(html, /<form[^>]+gk-form/i);
		action = getParam(form, null, null, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities);
		params = createFormParams(form);
		html = AnyBalance.requestPost(joinUrl(ref, action), params, addHeaders({Referer: ref}));
		ref = AnyBalance.getLastUrl();
	}
	if(/\/authorize/i.test(html)){
		AnyBalance.trace('Требуется дологиниться');
		ref = AnyBalance.getLastUrl();
		form = getElement(html, /<form[^>]+form/i);
		if(form){
		    params = createFormParams(form);
			action = getParam(form, null, null, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities);
			html = AnyBalance.requestPost(joinUrl(ref, action), params, addHeaders({Referer: ref}));
			ref = AnyBalance.getLastUrl();
		}
	}
	return html;
}

function patchRequests(){
	//Иногда попадаются ссылки с пробелом
	var post = AnyBalance.requestPost;
	var fget = AnyBalance.requestGet;

	function req(func, url, args){
		args[0] = url.replace(/\s/g, '%20');
		if(url != args[0]){
			AnyBalance.trace('Неверная ссылка, исправляем: ' + url);
		}
		return func.apply(AnyBalance, args);
	}

	AnyBalance.requestPost = function(url){
		return req(post, url, arguments);
	}

	AnyBalance.requestGet = function(url){
		return req(fget, url, arguments);
	}
}

function main(){
	patchRequests();

    var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');
	
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://wallet.webmoney.ru/';
	var baseurlLogin = 'https://login.wmtransfer.com/';

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');
	var token='';
	AnyBalance.restoreCookies();
	try{
		var html = AnyBalance.requestGet(baseurl+'finances', g_headers);
		token=getParam(html , /__RequestVerificationToken[\s\S]*?value="([\s\S]*?)"/);
	}catch(e){
		delCookies;
		if (e.message.indexOf('ProtocolException: Invalid redirect URI:')>-1) throw new AnyBalance.Error('Необходима повторная авторизация',true);
            if (e.message.indexOf('NetworkError: Failed to execute')>-1) throw new AnyBalance.Error(baseurl+' временно недоступен! Попробуйте обновить данные позже.');
            AnyBalance.Error('Ошибка при обращении к '+baseurl);
		AnyBalance.trace(e.message);

	}
	var ref = AnyBalance.getLastUrl();
	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error(baseurl+' временно недоступен! Попробуйте обновить данные позже.');
	}

	var elements;
        if(isLoged() && token){
		var fns = AnyBalance.requestGet(baseurl + 'api/finance/purses/', addHeaders({
			Accept: 'application/json, text/plain, */*',
			Referer: baseurl + 'finances',
           'X-XSRF-Token': token
		}));
		try{
			elements = getJson(fns);
			if(/denied/i.test(elements.Message)) throw new AnyBalance.Error(elements.Message);
			AnyBalance.trace('Удалось войти в предыдущей сессии');
		}catch(e){
			AnyBalance.trace('Не удалось проверить авторизацию, надо перелогиниваться: ' + e.message);
            elements=false;
			html = AnyBalance.requestGet(baseurl, g_headers);
		}
	}
	
	if(/isLogon/i.test(html)||!/__RequestVerificationToken/i.test(html)){
		AnyBalance.trace('Мгновенно не зашли');
        //AnyBalance.trace(html);
		html = AnyBalance.requestGet('https://www.webmoney.ru/', g_headers);
		ref = getParam(html, null, null, /<a[^>]+class="button sign-in success" target="_self" href="([\s\S]*?)">/i, replaceHtmlEntities);
		AnyBalance.trace('Ссылка на вход: ' + ref);
		html = AnyBalance.requestGet(joinUrl(baseurlLogin, ref), addHeaders({Referer: baseurl + 'welcome.aspx?ReturnUrl=%2f'}));
		//var logOnUrl = getParam(html, /logOnUrl="([\s\S]*?)"/i, replaceSlashes);
		//html=AnyBalance.requestGet(logOnUrl, g_headers);
		html = handleRedirect(html);
		if (isLoged()){
		    token=getParam(html , /__RequestVerificationToken[\s\S]*?value="([\s\S]*?)"/);
            if (token)
				AnyBalance.trace('Авторизация восстановлена');
        }else{
		    AnyBalance.trace('Автовход не удался, пробуем всё заново авторизовывать');
			html = AnyBalance.requestGet('https://www.webmoney.ru/', g_headers);
			ref = getParam(html, null, null, /<a[^>]+class="button sign-in success" target="_self" href="([\s\S]*?)">/i, replaceHtmlEntities);
			AnyBalance.trace('Ссылка на вход: ' + ref);
	        if (ref){
			    html = AnyBalance.requestGet(joinUrl(baseurlLogin, ref), addHeaders({Referer: baseurl + 'welcome.aspx?ReturnUrl=%2f'}));
			    html = handleRedirect(html);
			    ref = AnyBalance.getLastUrl();
	        }
			var form = AB.getElement(html, /<form[^>]+password[^>]*>/i);
			if(!form){
				AnyBalance.trace(html);
				delCookies;
				throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
			}
	        
			var params = AB.createFormParams(form, function(params, str, name, value) {
				if (name == 'Login') {
					return prefs.login;
				} else if (name == 'RememberMe') {
					return true;
				} else if (name == 'Password') {
					return prefs.password;
				} else if (name == 'Captcha') {
					var imgUrl = getParam(form, null, null, /<img[^>]+captcha-image[^>]+src="([^"]*)/i, replaceHtmlEntities);
	        
					if(!imgUrl){
						AnyBalance.trace(html);
                        delCookies;
						throw new AnyBalance.Error('Не удалось найти капчу. Сайт изменен?');
					}
					var img = AnyBalance.requestGet(joinUrl(baseurlLogin, imgUrl), addHeaders({Referer: ref}));
					return AnyBalance.retrieveCode("Пожалуйста, введите число с картинки", img, {
						inputType: 'number',
						minLength: 5,
						maxLength: 5,
						time: 300000
					});
				}
	        
				return value;
			});
			var action = getParam(form, null, null, /<form[\s\S]*?action=\"([\s\S]*?)\"/i, replaceHtmlEntities);
            //params.fid = hex_md5(prefs.login); //Теперь требуется фингерпринт передавать
			html = AnyBalance.requestPost(joinUrl(baseurlLogin, action), params, AB.addHeaders({
				Referer: ref
			}));
	        
			ref = AnyBalance.getLastUrl();
			if(/Factor2/i.test(ref)){
				AnyBalance.trace('Требуется выбор подтверждения на вход');
				action = getParam(html, null, null, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities);
	        
				var auth_options = getElements(html, /<li[^>]+auth-option[\s"]/ig);
				AnyBalance.trace('Найдено вариантов подтверждения: ' + auth_options.length);
				for(var i=0; i<auth_options.length; ++i){
					var o = auth_options[i];
					var name = getElement(o, /<b/i, replaceTagsAndSpaces);
					var available = getParam(o, null, null, /<input[^>]+submit/i);
	        
					AnyBalance.trace('Опция ' + name + (available ? ' доступна' : ' недоступна'));
	        
					//if(name == 'SMS' && available){
					if(name == 'Подтверждение по номеру телефона' && available){
						html = AnyBalance.requestPost(joinUrl(ref, action), {Command: 'Sms'}, addHeaders({Referer: ref}));
						ref = AnyBalance.getLastUrl();
					   	break;
					}

					if(name == 'E-NUM' && available){
						var enumId = getParam(o, null, null, /<input[^>]+name="EnumId"[^>]*value="([^"]*)/i, replaceHtmlEntities);
						html = AnyBalance.requestPost(joinUrl(ref, action), {Command: 'Enum', EnumId: enumId}, addHeaders({Referer: ref}));
						ref = AnyBalance.getLastUrl();
					   	break;
					}
				}
	        
				if(i >= auth_options.length){
					AnyBalance.trace(html);
                    delCookies;
					throw new AnyBalance.Error('Не удалось найти доступной опции для подтверждения входа. Сайт изменен?');
				}
			}

			if(/\bSms\b/i.test(ref)){
				//AnyBalance.trace('Требуется SMS подтверждение на вход');
				AnyBalance.trace('Требуется подтверждение по номеру телефона на вход');

				action = getParam(html, null, null, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities);
				params = AB.createFormParams(html);
	        
				if(!params.Challenge){
					var error = getElement(html, /<[^>]+login-global-error/i, replaceTagsAndSpaces);
					if(error)
						throw new AnyBalance.Error(error);
					AnyBalance.trace(html);
                    delCookies;
					//throw new AnyBalance.Error('Не удалось перейти к подтверждению входа по SMS. Сайт изменен?');
					throw new AnyBalance.Error('Не удалось перейти к подтверждению входа по номеру телефона. Сайт изменен?');
				}
				
				//params.Answer = AnyBalance.retrieveCode('Для входа в кошелек, пожалуйста, введите код из SMS, посланной на номер ' + 
				//params.PhoneNumber + ' (сессия ' + params.Challenge + ')', null, {inputType: 'number', minLength: 5, maxLength: 5, time: 180000});
                params.Answer = AnyBalance.retrieveCode('Пожалуйста, введите последние 4 цифры номера телефона из звонка, поступившего на номер ' + 
				params.PhoneNumber + ' (сессия ' + params.Challenge + ')', null, {inputType: 'number', minLength: 4, maxLength: 4, time: 180000});
	        
				html = AnyBalance.requestPost(joinUrl(ref, action), params, addHeaders({Referer: ref}));
			}else if(/\bEnum\b/i.test(ref)){
				AnyBalance.trace('Требуется E-NUM подтверждение на вход');

				action = getParam(html, null, null, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities);
				params = AB.createFormParams(html);
				params.languages='ru-RU';
	        
				if(!params.Challenge){
					var error = getElement(html, /<[^>]+login-global-error/i, replaceTagsAndSpaces);
					if(error)
						throw new AnyBalance.Error(error);
					AnyBalance.trace(html);
                    delCookies;
					throw new AnyBalance.Error('Не удалось перейти к подтверждению входа по E-NUM. Сайт изменен?');
				}
				
				params.Answer = AnyBalance.retrieveCode('Пожалуйста, введите число-ответ из приложения E-NUM с логином ' + 
				params.EnumId + '. Число-вопрос для ввода в приложение Е-NUM: ' + params.Challenge, null, {inputType: 'number', minLength: 7, maxLength: 7, time: 180000});
	        
				html = AnyBalance.requestPost(joinUrl(ref, action), params, addHeaders({Referer: ref}));
			}else if(/\bCompleted\b/i.test(ref)){
				AnyBalance.trace('Подтверждение на вход не требуется');
			}else{
				AnyBalance.trace('Неподдерживаемый способ подтверждения: ' + ref);
			}
		}
	    
		ref = AnyBalance.getLastUrl();
		if(!/Completed|init=true/i.test(ref)&&!token){
			delCookies;
			var error = getElement(html, /<span[^>]+field-validation-error/i, replaceTagsAndSpaces);
			if (!error)
				error = getElement(html, /<[^>]+login-global-error/i, replaceTagsAndSpaces);
			if (error)
				throw new AnyBalance.Error(error, null, /парол|Пользовател/i.test(error));
			AnyBalance.trace(ref + '\n' + html);
			throw new AnyBalance.Error('Не удалось войти в кошелек. Сайт изменен?');
		}

		AnyBalance.trace('Успешно авторизовались');

		ref = AnyBalance.getLastUrl();
		form = getElement(html, /<form[^>]+password/i);
		if(form){
			params = createFormParams(form);
			action = getParam(form, null, null, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities);
			html = AnyBalance.requestPost(joinUrl(ref, action), params, addHeaders({Referer: ref}));
			ref = AnyBalance.getLastUrl();
		}
		if(/Сейчас произойдет автоматический переход на/i.test(html)){
			AnyBalance.trace('Обнаружена промежуточная страница, переходим на стандартный кошелек');
			form = getElement(html, /<form[^>]+gk-form/i);
			action = getParam(form, null, null, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities);
			params = createFormParams(form);
			html = AnyBalance.requestPost(joinUrl(ref, action), params, addHeaders({Referer: ref}));
			ref = AnyBalance.getLastUrl();
		}
		if(/\/authorize/i.test(html)){
		    AnyBalance.trace('Требуется дологиниться');
		    form = getElement(html, /<form[^>]+form/i);
		    if(form){
		    	params = createFormParams(form);
		    	action = getParam(form, null, null, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities);
		    	html = AnyBalance.requestPost(joinUrl(ref, action), params, addHeaders({Referer: ref}));
		    	ref = AnyBalance.getLastUrl();
		    }
		}
		
		if (/logOnUrl/i.test(html)&&!/__RequestVerificationToken/i.test(html)) {
			AnyBalance.trace(html);
            delCookies;
			throw new AnyBalance.Error('Не удалось войти в кошелек после успешной авторизации. Сайт изменен?');
		}
	    
		AnyBalance.trace('Успешно вошли');
		token=getParam(html , /__RequestVerificationToken[\s\S]*?value="([\s\S]*?)"/);
		if (!token)  {delCookies;throw new AnyBalance.Error('Не удалось получить токен авторизации');}
		__setLoginSuccessful();
	}

	var result = {success: true};

	if(!elements){
		var fns = AnyBalance.requestGet(baseurl + 'api/finance/purses/', addHeaders({
			Accept: 'application/json, text/plain, */*',
			Referer: baseurl + 'finances',
            'X-XSRF-Token': token
		}));
		try{
			elements = getJson(fns);
			if(/denied/i.test(elements.Message)) throw new AnyBalance.Error(elements.Message);
			AnyBalance.trace('Удалось получить данные');
		}catch(e){
			AnyBalance.trace('Вход не удался: ' + e.message);
			delCookies;
            throw new AnyBalance.Error(elements.Message)
		}
	}

		AnyBalance.saveCookies();
		AnyBalance.saveData();

	AnyBalance.trace('Найдено кошельков: ' + elements.length);
	for(var i=0; i<elements.length; ++i){
		var e = elements[i];
		var num = e.number;
		var sum = e.amount;
		var curr = e.currency;
		AnyBalance.trace(num + ': ' + sum + ' ' + curr);

		sumParam('' + sum, result, curr.toLowerCase(), null, null, parseBalance, aggregate_sum);
		sumParam(num, result, curr.toLowerCase() + '_num', null, null, null, aggregate_join);
	}

	html = AnyBalance.requestGet(baseurl + 'api/profile', addHeaders({
		Accept: 'application/json, text/plain, */*',
		Referer: baseurl + 'finances',
        'X-XSRF-Token': token
	}));

	var json = getJson(html);
    getParam(json.wmid, result, '__tariff');
	getParam(json.wmid, result, 'wmid');
	getParam(json.passport.desc, result, 'status');
	getParam(json.nick, result, 'nickname');
	getParam(json.email, result, 'email');
	getParam(json.phoneNumberMasked, result, 'phone');
    getParam(json.fullName, result, 'fio');
	
	if (AnyBalance.isAvailable('chats')) {
	    html = AnyBalance.requestGet(baseurl + 'api/chats/', addHeaders({
	    	Accept: 'application/json, text/plain, */*',
	    	Referer: baseurl + 'finances',
            'X-XSRF-Token': token
	    }));

	    var json = getJson(html);
		if (json.length && json.length>0){
		    for (var i=0; i<json.length; i++) {
            var chat = json[i];
            sumParam(chat.unreadCount, result, 'chats', null, null, null, aggregate_sum);
            }
	    }else{
			AnyBalance.trace('Не удалось найти информацию о сообщениях');
		}
	}

    AnyBalance.setResult(result);
}
