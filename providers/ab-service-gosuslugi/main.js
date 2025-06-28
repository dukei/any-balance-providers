/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
    'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Linux; arm_64; Android 15; SM-G965F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.6943.49 YaBrowser/25.2.0.241 Mobile Safari/537.36'
};

var g_baseurl = 'https://www.gosuslugi.ru/';
var g_savedData;
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d)(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+$1 $2 $3-$4-$5'];

function main() {
	var prefs = AnyBalance.getPreferences();
    
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

    if(!g_savedData)
		g_savedData = new SavedData('gosuslugi', prefs.login);

	g_savedData.restoreCookies();

    AnyBalance.trace ('Пробуем войти в личный кабинет...');
	
	var html = AnyBalance.requestGet('https://esia.gosuslugi.ru/profile/user/', g_headers);
	
	if (!html || AnyBalance.getLastStatusCode() >= 500 || /shadow-block|dot-flashing/i.test(html)){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
    }
	
	if (!isLoggedIn()) {
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		clearAllCookies();
		
		var formattedLogin;
	    var loginType;
	    var login = prefs.login.replace(/[^\d@]+/g, '');
	    if (/@/.test(login)) {
	    	formattedLogin = getParam(prefs.login, /^\s*([a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*)\s*$/);
	    	if(!formattedLogin)
	    		throw new AnyBalance.Error('Некорректный E-mail!');
	    	loginType = 'email';
	    }else if(/^\s*\+7/i.test(prefs.login) || /^\d{10}$/.test(login)){
	    	loginType = 'phone';
	    	formattedLogin = login.replace(/^7?(\d{3})(\d{3})(\d{2})(\d{2})/i, '$1$2$3$4');
	    }else if(/^\d{11}$/.test(login)){
	    	if(!checkSnils(login))
	    		throw new AnyBalance.Error('Некорректный СНИЛС!', null, true);
	    	loginType = 'snils';
	    	formattedLogin = login.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/i, '$1$2$3$4');
	    }else{
	    	throw new AnyBalance.Error('Введите E-mail, СНИЛС (11 цифр без разделителей) или номер телефона (10 цифр без разделителей)', null, true);
	    }

	    if (loginType == 'snils'){
	    	checkEmpty(formattedLogin, 'Введите СНИЛС (11 цифр без разделителей). Вы ввели "' + (prefs.login || 'пустое поле') + '"!');
	    }else{
	    	checkEmpty(formattedLogin, 'Введите E-mail. Вы ввели "' + (prefs.login || 'пустое поле') + '"!');
		}

	    checkEmpty(prefs.password, 'Введите пароль!');
		
		var html = AnyBalance.requestGet('https://esia.gosuslugi.ru/profile/login/', g_headers); // Получаем куки сессии
		
		html = AnyBalance.requestPost('https://esia.gosuslugi.ru/aas/oauth2/api/login', JSON.stringify({
			'login': formattedLogin,
			'password': prefs.password
		}), addHeaders({
            'Content-Type': 'application/json',
			'Referer': 'https://esia.gosuslugi.ru/login/',
		}));
		
		var json = getJson(html);
	    AnyBalance.trace(JSON.stringify(json));
		
		if (json.action && json.action == 'SET_MFA_REQUIRED') {
			AnyBalance.trace('Госуслуги затребовали подключить вход с подтверждением');
			throw new AnyBalance.Error('Подтверждение входа стало обязательным! Пожалуйста, перейдите на страницу https://esia.gosuslugi.ru/login/ через браузер, авторизуйтесь и выберите способ подтверждения', null, true);
        }
		
		if (json.action && json.action == 'FILL_MFA') {
			AnyBalance.trace('Госуслуги предложили подключить вход с подтверждением. Отказываемся...');
			
			html = AnyBalance.requestPost('https://esia.gosuslugi.ru/aas/oauth2/api/login/promo-mfa/fill-mfa?decision=false', null, addHeaders({
                'Content-Type': 'application/json',
		    	'Referer': 'https://esia.gosuslugi.ru/login/',
		    }));
		
		    var json = getJson(html);
	        AnyBalance.trace(JSON.stringify(json));

            if (json.action != 'DONE') {
		        var error = json.error || json.failed;
    	        if (error) {
		            AnyBalance.trace(html);
		    		throw new AnyBalance.Error('Не удалось отказаться от подключения входа с подтверждением', null, true);
    	        }

    	        AnyBalance.trace(html);
    	        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменён?');
            }
        }
		
		if (json.action && json.action == 'SOLVE_ANOMALY_REACTION') {
			if (json.reaction_details && json.reaction_details.type == 'О.ЗД1') {
			    var guid = json.reaction_details.guid;
			    AnyBalance.trace('Госуслуги затребовали капчу');
			    
			    html = AnyBalance.requestGet('https://esia.gosuslugi.ru/captcha/api/public/v2/type', g_headers);
		
		        var json = getJson(html);
	            AnyBalance.trace(JSON.stringify(json));
			
			    var captchaType = json.captchaType;
			    g_headers['Captchasession'] = json.captchaSession;
			
			    if (captchaType == 'recaptcha'){
			    	var sitekey = json.sitekey;
			        var captcha = solveRecaptcha('Пожалуйста, подтвердите, что вы не робот', g_baseurl + '/', sitekey, {USERAGENT: g_headers['User-Agent']});
			    	var params = {'captchaResponse': captcha, 'captchaType': captchaType};
			    }else if (captchaType == 'esiacaptcha'){
					var capchaImg = AnyBalance.requestGet('https://esia.gosuslugi.ru/captcha/api/public/v2/image', g_headers);
					var captcha = AnyBalance.retrieveCode('Пожалуйста, введите код с картинки.\n\nДля запроса другого кода введите 0', capchaImg, {/*inputType: 'number', */time: 180000});
					if(captcha == 0){
						var tries = 0, maxTries = 5;
	                    do{
		    	            AnyBalance.sleep(1000);
                            AnyBalance.trace('Запрос другого кода капчи: ' + (tries + 1) + '/' + maxTries);
	                        var html = AnyBalance.requestGet('https://esia.gosuslugi.ru/captcha/api/public/v2/renew', g_headers);
	                        var json = getJson(html);
                            AnyBalance.trace(JSON.stringify(json));
                            
                            var captchaType = json.captchaType;
                            g_headers['Captchasession'] = json.captchaSession;
                        
                            var capchaImg = AnyBalance.requestGet('https://esia.gosuslugi.ru/captcha/api/public/v2/image', g_headers);
                            var captcha = AnyBalance.retrieveCode('Пожалуйста, введите код с картинки.\n\nДля запроса другого кода введите 0', capchaImg, {/*inputType: 'number', */time: 180000});
	                    }while(captcha == 0 && ++tries < maxTries);
					}   
					var params = {'answer': captcha, 'captchaType': captchaType};
			    }else{
					AnyBalance.trace(html);
			    	throw new AnyBalance.Error('Неизвестный тип капчи: ' + captchaType)
	            }
			
			    html = AnyBalance.requestPost('https://esia.gosuslugi.ru/captcha/api/public/v2/verify', JSON.stringify(params), addHeaders({
                    'Content-Type': 'application/json;charset=UTF-8',
		        	'Referer': 'https://esia.gosuslugi.ru/login/',
					'X-Requested-With': 'XMLHttpRequest'
		        }));
			
		        var json = getJson(html);
	            AnyBalance.trace(JSON.stringify(json));
			
			    var verify_token = json.verify_token;
			
			    delete g_headers['Captchasession'];
				
				html = AnyBalance.requestPost('https://esia.gosuslugi.ru/aas/oauth2/api/anomaly/captcha/verify?guid=' + guid + '&verify_token=' + verify_token, JSON.stringify({
                    'verify_token': verify_token,
                    'guid': guid
                }), addHeaders({
                    'Content-Type': 'application/json;charset=UTF-8',
		        	'Referer': 'https://esia.gosuslugi.ru/login/',
					'X-Requested-With': 'XMLHttpRequest'
		        }));
		
		        var json = getJson(html);
	            AnyBalance.trace(JSON.stringify(json));
			}
			
			if (json.reaction_details && json.reaction_details.type == 'О.ЗИ1'){
			    var guid = json.reaction_details.guid;
			    AnyBalance.trace('Госуслуги затребовали ответ на вопрос');
			
			    html = AnyBalance.requestGet('https://esia.gosuslugi.ru/anomaly-resolver/api/reaction/question?guid=' + guid, g_headers);
		
		        var json = getJson(html);
	            AnyBalance.trace(JSON.stringify(json));
				
				var question = json.question_text;
				
				var captcha = AnyBalance.retrieveCode('В некоторых случаях Госуслуги используют защиту от роботов в виде проверки.\nПожалуйста, введите ответ на вопрос:\n\n' + question, null, {/*inputType: 'number', */time: 180000});
			    var params = {'answer': captcha, 'guid': guid};
			
			    html = AnyBalance.requestPost('https://esia.gosuslugi.ru/anomaly-resolver/api/reaction/question/answer', JSON.stringify(params), addHeaders({
                    'Content-Type': 'application/json;charset=UTF-8',
		        	'Referer': 'https://esia.gosuslugi.ru/login/',
					'X-Requested-With': 'XMLHttpRequest'
		        }));
			
		        var json = getJson(html);
	            AnyBalance.trace(JSON.stringify(json));
			}
			
	        if ((json.is_verified && json.is_verified !== true) || (json.action && json.action == 'SOLVE_ANOMALY_REACTION')) {
				var error = json.error || json.failed || (json.is_verified ? JSON.stringify(json.is_verified) : undefined) || json.action;
    	        if (error) {
		            AnyBalance.trace(html);
			    	throw new AnyBalance.Error('Вы не прошли проверку. Пожалуйста, попробуйте ещё раз', null, /answer|invalid|false/i.test(error));
    	        }

    	        AnyBalance.trace(html);
    	        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменён?');
            }else{
				html = AnyBalance.requestPost('https://esia.gosuslugi.ru/aas/oauth2/api/login', JSON.stringify({
					'login': formattedLogin,
			        'password': prefs.password
		        }), addHeaders({
                    'Content-Type': 'application/json',
		        	'Referer': 'https://esia.gosuslugi.ru/login/',
		        }));
                
				var json = getJson(html);
	            AnyBalance.trace(JSON.stringify(json));
				
    	    }
        }
		
		if (json.action && json.action == 'ENTER_MFA') {
			if (json.mfa_details.type == 'SMS') {
			    AnyBalance.trace('Госуслуги затребовали код подтверждения из SMS');
                
			    var details = json.mfa_details.otp_details;
			
			    var code = AnyBalance.retrieveCode('Пожалуйста, введите код подтверждения, высланный на номер ' + details.phone + '.\n\nОсталось попыток для ввода кода: ' + details.verify_attempts_left, null, {inputType: 'number', minLength: details.code_length, maxLength: details.code_length, time: 180000});
			
			    html = AnyBalance.requestPost('https://esia.gosuslugi.ru/aas/oauth2/api/login/otp/verify?code=' + code, null, addHeaders({
                    'Content-Type': 'application/json',
		        	'Referer': 'https://esia.gosuslugi.ru/login/',
		        }));
		
		        var json = getJson(html);
	            AnyBalance.trace(JSON.stringify(json));
			} else if (json.mfa_details.type == 'TTP') {
			    AnyBalance.trace('Госуслуги затребовали код подтверждения из Яндекс Ключ');
                
			    var details = json.mfa_details.ttp_details;
			
			    var code = AnyBalance.retrieveCode('Пожалуйста, введите код подтверждения, предоставленный системой Яндекс Ключ', null, {inputType: 'number', minLength: details.code_length, maxLength: details.code_length, time: 180000});
			    
			    html = AnyBalance.requestPost('https://esia.gosuslugi.ru/aas/oauth2/api/login/totp/verify?code=' + code, null, addHeaders({
                    'Content-Type': 'application/json',
		        	'Referer': 'https://esia.gosuslugi.ru/login/',
		        }));
		
		        var json = getJson(html);
	            AnyBalance.trace(JSON.stringify(json));
			} else {
				AnyBalance.trace(html);
		    	throw new AnyBalance.Error('Неизвестный способ двухфакторной авторизации: ' + json.mfa_details.type, null, true);
			}

            if (json.action != 'DONE') {
		        var error = json.error || json.failed;
    	        if (error) {
		            AnyBalance.trace(html);
		    		throw new AnyBalance.Error('Неверный код подтверждения!', null, /otp|ttp|invalid/i.test(error));
    	        }

    	        AnyBalance.trace(html);
    	        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменён?');
            }
        }
		
		if (json.action != 'DONE') {
		    var error = json.error || json.failed;
    	    if (error) {
		        AnyBalance.trace(html);
				throw new AnyBalance.Error('Неверные логин или пароль!', null, /login|password|invalid/i.test(error));
    	    }

    	    AnyBalance.trace(html);
    	    throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменён?');
        }
		
		var redirectUrl = json.redirect_url;
		
		if (redirectUrl) {
			if (/^http/i.test(redirectUrl)){
				url = redirectUrl;
			}else{
			    url = joinUrl('https://esia.gosuslugi.ru', redirectUrl);
			}
		
            html = AnyBalance.requestGet(url, addHeaders({Referer: 'https://esia.gosuslugi.ru/'}), g_headers);
	    } else {
		    html = AnyBalance.requestGet('https://lk.gosuslugi.ru/settings/account?_=' + new Date().getTime(), addHeaders({
				Referer: 'https://esia.gosuslugi.ru/'
			}), g_headers);
		}
		
		if (/setCookieAndReloadPage/i.test(html)) {
			AnyBalance.trace('Похоже, мы на промежуточной странице. Пробуем перейти на главную...');
			
			AnyBalance.setCookie('.gosuslugi.ru', 'w-r-ii', 'true', {path: '/'});
			
			html = AnyBalance.requestGet(AnyBalance.getLastUrl(), addHeaders({Referer: 'https://esia.gosuslugi.ru/'}), g_headers);
	    }
	    
	    if (!isLoggedIn()) {
			AnyBalance.trace('Требуется дологиниться');
			
			html = AnyBalance.requestGet('https://lk.gosuslugi.ru/node-api/login?redirectUrl=https://lk.gosuslugi.ru/settings/account', addHeaders({
				Referer: AnyBalance.getLastUrl()
			}), g_headers);
	    }
        	
		if (isLoggedIn()) {
			AnyBalance.trace('Успешно вошли в личный кабинет');
	    } else {
			AnyBalance.trace(html);
    	    throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменён?');
		}
		
		var acc_t = AnyBalance.getCookie('acc_t');
		
		g_savedData.set('acc_t', acc_t); // access token на всякий случай
		g_savedData.setCookies();
	    g_savedData.save();
	} else {
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
	}
	
	var result = {success: true};
		
    var json=callAPI('lk/v1/users/data');
	var profile = json;
	getParam(json.formattedLoginName, result, '__tariff');
	getParam(json.firstName + ' ' + json.lastName, result, 'fio');
	getParam(json.personSNILS, result, 'snils');
	getParam(json.personINN, result, 'inn');
	getParam(json.userId, result, 'user_id');
	getParam(json.personMobilePhone, result, 'phone', null, replaceNumber);
	var role={
	    P:'Физическое лицо',
		E:'Должностное лицо'
		}
	getParam(role[json.globalRole]||json.globalRole, result, 'global_role');
	var level={
	    AL30:'Подтверждённый (КЭП)',
		AL20:'Подтверждённый',
		AL15:'Стандартный',
		AL10:'Упрощённый'
		}
	getParam(level[json.assuranceLevel]||json.assuranceLevel, result, 'account_status');
	
	if(AnyBalance.isAvailable('passport_rf', 'driving_license_rf', 'military_id', 'old_birf_cert', 'passport_frgn', 'policy_mdcl')){
	    if(json.person.docs && json.person.docs.length > 0){
			for(var i=0; i<json.person.docs.length; ++i){
                var doc = json.person.docs[i];
				var doc_res = (doc.series && doc.series !== null) ? doc.series + ' ' + doc.number : doc.number;
				if(doc.type == 'RF_PASSPORT' || /RF_PASSPORT/i.test(doc.type)){ // Паспорт РФ
        		    getParam(doc_res, result, 'passport_rf');
				}else if(doc.type == 'RF_DRIVING_LICENSE' || /RF_DRIVING_LICENSE/i.test(doc.type)){ // Вод. удостоверение РФ
        		    getParam(doc_res, result, 'driving_license_rf');
				}else if(doc.type == 'MLTR_ID' || /MLTR_ID/i.test(doc.type)){ // Военный билет
        		    getParam(doc_res, result, 'military_id');
				}else if(doc.type == 'OLD_BRTH_CERT' || /OLD_BRTH_CERT/i.test(doc.type)){ // Св-во о рождении
        		    getParam(doc_res, result, 'old_birf_cert');
        	    }else if(doc.type == 'FRGN_PASS' || /FRGN_PASS/i.test(doc.type)){ // Загранпаспорт
        		    getParam(doc_res, result, 'passport_frgn');
        	    }else if(doc.type == 'MDCL_PLCY' || /MDCL_PLCY/i.test(doc.type)){ // Мед. полис
        		    getParam(doc_res, result, 'policy_mdcl');
        	    }else{
        		    AnyBalance.trace('Неизвестный тип документа: ' + JSON.stringify(doc));
			    }
			}
		}else{
			AnyBalance.trace('Не удалось получить информацию по документам');
		}
	}
	
	if(AnyBalance.isAvailable('vehicles')){
		result.vehicles='';
	    if (json.person.vehicles){
       	    json.person.vehicles.forEach(function(g) {
			    result.vehicles+='<b>'+g.name+'</b>';
				result.vehicles+='<br> Гос. номер: '+g.numberPlate;
       			result.vehicles+=',<br> СТС: '+g.regCertificate.series + ' ' + g.regCertificate.number;
				if(json.person.vehicles[json.person.vehicles.length - 1] !== g)
					result.vehicles+='.<br><br> ';
       	    })
	    }else{
			AnyBalance.trace('Не удалось получить информацию по транспорту');
			result.vehicles='Нет данных';
		}
	}
	
	var json=callAPI('pay/v1/informer/fetch');
	getParam(json.result.amount, result, 'balance', null, null, parseBalance);
	getParam(json.result.total, result, 'total', null, null, parseBalance);
	getParam(json.result.totalDocs, result, 'total_docs', null, null, parseBalance);
    result.info='';
	if (json.result.amount==0)
    	result.info='Нет начислений';

	if (json.fns){
       	json.fns.groups.forEach(function(g) {
			result.info+='<b>'+g.name+'</b>';
       		g.bills.forEach(function(n) {
				result.info+='<br> '+n.billDate.replace(/(\d{4})-(\d{2})-(\d{2})[\s\S]*?(\d{2}:\d{2}).*/,'$3.$2.$1 $4');
       			result.info+=',<br> '+n.amount+' ₽,<br> '+(n.billName||n.fnsName);
       		})
			if(json.fns.groups[json.fns.groups.length - 1] !== g)
				result.info+='.<br><br> ';
       	})    	
	}
	
    if (json.fine){
    	json.fine.groups.forEach(function(g) {
    		result.info+='<b>'+g.name+'</b>';
    		g.bills.forEach(function(n) {
    			if(n.discountDate)
				    n.discountDate=n.discountDate.replace(/(\d*)-(\d*)-(\d*)/,'$3.$2.$1');
    			if(n.discountDate&&(parseDate(n.discountDate)>new Date())){
    				result.info+='<br> '+n.amount+' ₽<br> (до '+n.discountDate+')';
			    }else{
    				result.info+='<br> '+(n.originalAmount ? n.originalAmount : n.amount)+' ₽';
					if(/^\d{2}.\d{2}.\d{4}/i.test(n.offenseDate))
						n.offenseDate=n.offenseDate.replace(/(\d{2}).(\d{2}).(\d{4})[\s\S]*?(\d{2}:\d{2}).*/,'$3-$2-$1 $4');
					result.info+=',<br> '+n.billName+(n.articleCode ? ' ('+n.articleCode+')' : '')+'<br> '+n.offenseDate.replace(/(\d{4})-(\d{2})-(\d{2})[\s\S]*?(\d{2}:\d{2}).*/,'$3.$2.$1 в $4');
                    if(n.hasPhoto)
						result.info+='.<br> Есть фото нарушения'
					if(n.supplierFullName)
                        result.info+='.<br> '+n.supplierFullName;
			    }
        	})
			if(json.fine.groups[json.fine.groups.length - 1] !== g)
				result.info+='.<br><br> ';
        })
	}
	
    try{
	    var json=callAPI('lk/v1/feeds/');
	    for(var i=0; i<json.items.length; ++i){
	    	var unread = json.items[i].unread;
			var feedType = json.items[i].feedType;
	    	if(unread == true){
				var count = (i+1);
	    	}
			if(feedType == 'ORDER'){
				getParam(json.items[i].date, result, 'lastorderdate', null, null, parseDateISO);
				getParam(json.items[i].subTitle.replace(/([\«,\»]*)/g, ''), result, 'lastordertype', null, null, null);
				getParam(json.items[i].title, result, 'lastorderstatus', null, null, null);
	    		break;
	    	}
	    }
		getParam(count||0, result, 'notifications', null, null, parseBalance);
    }catch(e){
		AnyBalance.trace('Не удалось получить информацию об уведомлениях:' + e.mesage);
	}		
		
	try{	
	    var json=callAPI('lk/v1/feeds/counters');
		getParam(json.unread, result, 'mails', null, null, parseBalance);
	}catch(e){
		AnyBalance.trace('Не удалось получить информацию о непрочитанных письмах:' + e.mesage);
	}
	
    AnyBalance.setResult(result);
}

function callAPI(verb, params){
	AnyBalance.trace('Запрос: ' + verb);
	if (params)
		var html = AnyBalance.requestGet(g_baseurl + 'api/' + verb + '?_=' + Math.random(), addHeaders({Referer: g_headers}))
	else
		var html = AnyBalance.requestGet(g_baseurl + 'api/' + verb + '?_=' + Math.random(), params, addHeaders({Referer: g_headers}))
	if (!/users\/data/i.test(verb)) // Страницу с пользовательскими данными не выводим
	    AnyBalance.trace('Ответ: ' + html);
	var json = getJson(html);
	if(json.error && json.error.code != 0){
		throw new AnyBalance.Error(json.error.message);
	}
	return json;
}

function isLoggedIn(){
    var prefs = AnyBalance.getPreferences();
	var html = AnyBalance.requestPost('https://www.gosuslugi.ru/auth-provider/check-session', null, addHeaders({'Referer': 'https://esia.gosuslugi.ru/',}));	
	
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
    return json.auth;
}