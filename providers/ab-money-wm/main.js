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
			AnyBalance.trace('Необходимо подождать ' + delay + ' милисек');
			AnyBalance.sleep(delay);
		}
		var newurl = joinUrl(ref, action).replace(/\s/g, '%20');

		html = AnyBalance.requestPost(joinUrl(ref, action), params, addHeaders({Referer: ref}));
	}
	return html;
}

function main(){
    var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');
	
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://wallet.webmoney.ru/';
	var baseurlLogin = 'https://login.wmtransfer.com/';

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	AnyBalance.restoreCookies();

	var html = AnyBalance.requestGet(baseurl, g_headers);
	var ref = AnyBalance.getLastUrl();

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже.');
	}

	var elements;
	if(/signoff/i.test(html)){
		var fns = AnyBalance.requestGet(baseurl + 'srv/finance/entities', addHeaders({
			Accept: 'application/json, text/plain, */*',
			Referer: baseurl + 'finances'
		}));
		try{
			elements = getJson(fns);
			if(/denied/i.test(elements.Message))
				throw new AnyBalance.Error(elements.Message);
			AnyBalance.trace('Удалось войти в предыдущей сессии');
		}catch(e){
			AnyBalance.trace('test of login failed, should relogin: ' + e.message);
			AB.clearAllCookies();
			html = AnyBalance.requestGet(baseurl, g_headers);
		}
	}
	
	if(!/signoff/i.test(html)){
		AnyBalance.trace('Мгновенно не зашли');

		var signonUrl = getParam(html, /singleSignOnUrl:\s*'([^']*)/, replaceSlashes);
		var logonUrl = getParam(html, /logOnUrl\s*=\s*new\s+Uri\s*\(\s*'([^']*)/, replaceSlashes);
		var info = {};
		if(signonUrl){
			AnyBalance.trace('Но есть возможность проверить автовход');
			info = AnyBalance.requestGet(signonUrl + '?type=cors&_=' + (+new Date()), addHeaders({
				Accept: 'application/json, text/javascript, */*; q=0.01',
				Origin: 'https://mini.webmoney.ru',
				Referer: ref
			}));
			AnyBalance.trace(info);
			info = getJson(info);
		}

		if(!info.loggedOn){
			AnyBalance.trace('Автовход не удался, пробуем всё заново авторизовывать');

			ref = getParam(html, null, null, /<a[^>]+top-panel__button--enter[^>]+href="([^"]*)/i, replaceHtmlEntities);
			AnyBalance.trace('Ссылка на вход: ' + ref);
			ref = ref.replace(/\s/g, '%20'); //Иногда попадаются ссылки с пробелом
	        
			html = AnyBalance.requestGet(joinUrl(baseurl, ref), addHeaders({Referer: baseurl + 'welcome.aspx?ReturnUrl=%2f'}));
			html = handleRedirect(html);
			ref = AnyBalance.getLastUrl();
	        
			var form = AB.getElement(html, /<form[^>]+password[^>]*>/i);
			if(!form){
				AnyBalance.trace(html);
				throw new AnyBalance.Error('Не удаётся найти форму входа! Сайт изменен?');
			}
	        
			var params = AB.createFormParams(form, function(params, str, name, value) {
				if (name == 'Login') {
					return prefs.login;
				} else if (name == 'Password') {
					return prefs.password;
				} else if (name == 'Captcha') {
					var imgUrl = getParam(form, null, null, /<img[^>]+captcha-image[^>]+src="([^"]*)/i, replaceHtmlEntities);
	        
					if(!imgUrl){
						AnyBalance.trace(html);
						throw new AnyBalance.Error('Не удаётся найти капчу. Сайт изменен?');
					}
						
					var img = AnyBalance.requestGet(joinUrl(ref, imgUrl), addHeaders({Referer: ref}));
					return AnyBalance.retrieveCode("Пожалуйста, введите число с картинки", img, {
						inputType: 'number',
						minLength: 5,
						maxLength: 5,
						time: 300000
					});
				}
	        
				return value;
			});
	        
			var action = getParam(form, null, null, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities);
	        
	        params.fid = hex_md5(prefs.login); //Теперь требуется фингерпринт передавать
			html = AnyBalance.requestPost(joinUrl(ref, action), params, AB.addHeaders({
				Referer: ref
			}));
	        
			ref = AnyBalance.getLastUrl();
			if(/Factor2/i.test(ref)){
				AnyBalance.trace('Требуется выбор подтверждения на вход');
				action = getParam(html, null, null, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities);
	        
				var auth_options = getElements(html, /<li[^>]+auth-option[\s"]/ig);
				AnyBalance.trace('Найдено ' + auth_options.length + ' вариантов подтверждения');
				for(var i=0; i<auth_options.length; ++i){
					var o = auth_options[i];
					var name = getElement(o, /<b/i, replaceTagsAndSpaces);
					var available = getParam(o, null, null, /<input[^>]+submit/i);
	        
					AnyBalance.trace('Опция ' + name + (available ? ' доступна' : ' недоступна'));
	        
					if(name == 'SMS' && available){
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
					throw new AnyBalance.Error('Не удалось найти поддерживаемой опции для подтверждения входа. Сайт изменен?');
				}
			}

			if(/\bSms\b/i.test(ref)){
				AnyBalance.trace('Требуется SMS подтверждение на вход');

				action = getParam(html, null, null, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities);
				params = AB.createFormParams(html);
	        
				if(!params.Challenge){
					var error = getElement(html, /<[^>]+login-global-error/i, replaceTagsAndSpaces);
					if(error)
						 throw new AnyBalance.Error(error);
					AnyBalance.trace(html);
					throw new AnyBalance.Error('Не удалось перейти к подтверждению входа по SMS. Сайт изменен?');
				}
				
				params.Answer = AnyBalance.retrieveCode('Для входа в кошелек, пожалуйста, введите код из SMS, посланной на номер ' + 
					params.PhoneNumber + ' (сессия ' + params.Challenge + ')', null, {inputType: 'number', minLength: 5, maxLength: 5, time: 180000});
	        
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
					throw new AnyBalance.Error('Не удалось перейти к подтверждению входа по ENUM. Сайт изменен?');
				}
				
				params.Answer = AnyBalance.retrieveCode('Для входа в кошелек, пожалуйста, введите число-ответ из приложения E-NUM с логином ' + 
					params.EnumId + '. Число-вопрос для ввода в приложение Е-NUM: ' + params.Challenge, null, {inputType: 'number', minLength: 7, maxLength: 7, time: 180000});
	        
				html = AnyBalance.requestPost(joinUrl(ref, action), params, addHeaders({Referer: ref}));
			}else{
				AnyBalance.trace('Не поддерживаемый способ подтверждения: ' + ref);
			}
		}else{
			AnyBalance.trace('Пробуем быстрый логин');
			html = AnyBalance.requestGet(logonUrl, addHeaders({Referer: ref}));
			html = handleRedirect(html);
		}
	    
		ref = AnyBalance.getLastUrl();
		if(!/Completed|init=true/i.test(ref)){
			var error = getElement(html, /<span[^>]+field-validation-error/i, replaceTagsAndSpaces);
			if(error)
				throw new AnyBalance.Error(error, null, /парол|Пользовател/i.test(error));
			AnyBalance.trace(ref + '\n' + html);
			throw new AnyBalance.Error('Не удалось войти в кошелек. Сайт изменен?');
		}

		AnyBalance.trace('Успешно авторизовались');

		html = handleRedirect(html);
		ref = AnyBalance.getLastUrl();
	    
		form = getElement(html, /<form[^>]+gk-form/i);
		if(form){
			params = createFormParams(form);
			action = getParam(form, null, null, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities);
			html = AnyBalance.requestPost(joinUrl(ref, action), params, addHeaders({Referer: ref}));
			ref = AnyBalance.getLastUrl();
		}

		if(/ctl00\$cph\$btnStd/i.test(html)){
			AnyBalance.trace('Обнаружена промежуточная страница, переходим на стандартный кошелек');
			form = getElement(html, /<form[^>]+aspnetForm/i);
			params = createFormParams(form);
			html = AnyBalance.requestPost(ref, joinObjects({
				__EVENTTARGET: 'ctl00$cph$btnStd'
			}, params), addHeaders({Referer: ref}));
		}
	    
		if (!/logout/i.test(html)) {
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось зайти в кошелек после успешной авторизации. Сайт изменен?');
		}
	    
		AnyBalance.trace('Успешно вошли');
		AnyBalance.saveCookies();
		AnyBalance.saveData();
		__setLoginSuccessful();
	}

	var result = {
		success: true
	};

	if(!elements){
		html = AnyBalance.requestGet(baseurl + 'srv/finance/entities', addHeaders({
			Accept: 'application/json, text/plain, */*',
			Referer: baseurl + 'finances'
		}));
	    
		elements = getJson(html);
	}

	AnyBalance.trace('Найдено ' + elements.length + ' кошельков');

	for(var i=0; i<elements.length; ++i){
		var e = elements[i];
		var num = e.number;
		var sum = e.summ;
		var curr = e.currency;
		AnyBalance.trace(num + ': ' + sum + ' ' + curr);

		sumParam('' + sum, result, curr.toLowerCase(), null, null, parseBalance, aggregate_sum);
		sumParam(num, result, curr.toLowerCase() + '_num', null, null, null, aggregate_join);
	}

	html = AnyBalance.requestGet(baseurl + 'srv/profile/info', addHeaders({
		Accept: 'application/json, text/plain, */*',
		Referer: baseurl + 'finances'
	}));

	var json = getJson(html);
    getParam(json.wmid, result, '__tariff');
    getParam(json.fullName, result, 'fio');

    AnyBalance.setResult(result);
}
