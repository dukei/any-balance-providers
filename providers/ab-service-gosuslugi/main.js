/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.6,en;q=0.4',
    'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36'
};

var g_baseurl = 'https://www.gosuslugi.ru/';
var g_savedData;
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d)(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+$1 $2 $3-$4-$5'];

function main() {
	var prefs = AnyBalance.getPreferences();

    //AnyBalance.setOptions({cookiePolicy: 'netscape'});
	AnyBalance.setDefaultCharset('utf-8');

    if(!g_savedData)
		g_savedData = new SavedData('gosuslugi', prefs.login);

	g_savedData.restoreCookies();

    AnyBalance.trace ('Пробуем войти в личный кабинет...');

	var html = AnyBalance.requestGet(g_baseurl, g_headers);
	var data = getJsonObject(html, /data:\s/);
	
	if (data && data.user && data.user.person) {
		AnyBalance.trace('Похоже, мы уже залогинены на имя ' + data.user.person.person.firstName + ' ' + data.user.person.person.lastName + ' (' + prefs.login + ')');
	} else {
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
	    	formattedLogin = login.replace(/^7?(\d{3})(\d{3})(\d{2})(\d{2})/i, '+7($1)$2$3$4');
	    }else if(/^\d{11}$/.test(login)){
	    	if(!checkSnils(login))
	    		throw new AnyBalance.Error('Некорректный СНИЛС!', null, true);
	    	loginType = 'snils';
	    	formattedLogin = login.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/i, '$1-$2-$3 $4');
	    }else{
	    	throw new AnyBalance.Error('Введите E-mail, СНИЛС (11 цифр без разделителей) или номер телефона (10 цифр без разделителей)', null, true);
	    }

	    if (loginType == 'snils'){
	    	checkEmpty(formattedLogin, 'Введите СНИЛС (11 цифр без разделителей). Вы ввели "' + (prefs.login || 'пустое поле') + '"!');
	    }else{
	    	checkEmpty(formattedLogin, 'Введите E-mail. Вы ввели "' + (prefs.login || 'пустое поле') + '"!');
		}

	    checkEmpty(prefs.password, 'Введите пароль!');
		
		var html = AnyBalance.requestGet(g_baseurl + 'node-api/login/?redirectPage=/', g_headers);
		
		html = AnyBalance.requestPost('https://esia.gosuslugi.ru/aas/oauth2/api/login', JSON.stringify({
			'idType': loginType,
			'login': formattedLogin,
			'password': prefs.password
		}), addHeaders({
			'Accept': 'application/json, text/plain, */*',
            'Content-Type': 'application/json',
			'Origin': 'https://esia.gosuslugi.ru',
			'Referer': 'https://esia.gosuslugi.ru/login/',
		}));
		
		var json = getJson(html);
	    AnyBalance.trace(JSON.stringify(json));
		
		if (json.additional_action && json.additional_action == 'otp') {
			AnyBalance.trace('Госуслуги затребовали код подтверждения из SMS');
            
			var code = AnyBalance.retrieveCode('Пожалуйста, введите код подтверждения, высланный на номер ' + json.additional_data.phone, null, {inputType: 'number', time: 300000});
			
			html = AnyBalance.requestPost('https://esia.gosuslugi.ru/aas/oauth2/api/login/otp/verify', JSON.stringify({
		    	'code': code
		    }), addHeaders({
		    	'Accept': 'application/json, text/plain, */*',
                'Content-Type': 'application/json',
		    	'Origin': 'https://esia.gosuslugi.ru',
		    	'Referer': 'https://esia.gosuslugi.ru/login/',
		    }));
		
		    var json = getJson(html);
	        AnyBalance.trace(JSON.stringify(json));

            if (json.status != 'successful') {
		        var error = json.error;
    	        if (error) {
		            AnyBalance.trace(html);
		    		throw new AnyBalance.Error('Неверный код подтверждения!', null, /invalid/i.test(error));
    	        }

    	        AnyBalance.trace(html);
    	        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменён?');
            }
        }
		
		if (json.additional_action && json.additional_action == 'anomaly_reaction') {
			if (json.anomaly_reaction == 'О.ЗД1' || json.anomaly_reaction.anomaly_reaction == 'О.ЗД1'){
			    if (json.anomaly_reaction)
			    	var guid = json.guid;
			    if (json.anomaly_reaction.anomaly_reaction)
			    	var guid = json.anomaly_reaction.guid;
			    AnyBalance.trace('Госуслуги затребовали капчу');
			
			    html = AnyBalance.requestGet('https://esia.gosuslugi.ru/captcha/api/public/v2/type', g_headers);
		
		        var json = getJson(html);
	            AnyBalance.trace(JSON.stringify(json));
			
			    var captchaType = json.captchaType;
			    g_headers['captchaSession'] = json.captchaSession;
			
			    if (captchaType == 'recaptcha'){
			    	var sitekey = json.sitekey;
			        var captcha = solveRecaptcha('Пожалуйста, подтвердите, что вы не робот', g_baseurl + '/', sitekey, {USERAGENT: g_headers['User-Agent']});
			    	var params = {'captchaResponse': captcha, 'captchaType': captchaType};
			    }else if (captchaType == 'esiacaptcha'){
			    	var capchaImg = AnyBalance.requestGet('https://esia.gosuslugi.ru/captcha/api/public/v2/image', g_headers);
                    var captcha = AnyBalance.retrieveCode('В некоторых случаях Госуслуги используют защиту от роботов в виде кода проверки.\nПожалуйста, введите код с картинки', capchaImg, {/*inputType: 'number', */time: 180000});
	                var params = {'answer': captcha, 'captchaType': captchaType};
			    }else{
			    	AnyBalance.trace('Неизвестный тип капчи: ' + captchaType);
	            }
			
			    html = AnyBalance.requestPost('https://esia.gosuslugi.ru/captcha/api/public/v2/verify', JSON.stringify(params), addHeaders({
		        	'Accept': 'application/json, text/plain, */*',
                    'Content-Type': 'application/json',
		        	'Origin': 'https://esia.gosuslugi.ru',
		        	'Referer': 'https://esia.gosuslugi.ru/login/',
		        }));
			
		        var json = getJson(html);
	            AnyBalance.trace(JSON.stringify(json));
			
			    var verify_token = json.verify_token;
			
			    html = AnyBalance.requestGet('https://esia.gosuslugi.ru/anomaly-resolver/api/reaction/captcha/result?guid=' + guid + '&verify_token=' + verify_token, g_headers);
		
		        var json = getJson(html);
	            AnyBalance.trace(JSON.stringify(json));
			}
			
			if (json.anomaly_reaction == 'О.ЗИ1' || json.anomaly_reaction.anomaly_reaction == 'О.ЗИ1'){
			    if (json.anomaly_reaction)
			    	var guid = json.guid;
			    if (json.anomaly_reaction.anomaly_reaction)
			    	var guid = json.anomaly_reaction.guid;
			    AnyBalance.trace('Госуслуги затребовали ответ на вопрос');
			
			    html = AnyBalance.requestGet('https://esia.gosuslugi.ru/anomaly-resolver/api/reaction/question?guid=' + guid, g_headers);
		
		        var json = getJson(html);
	            AnyBalance.trace(JSON.stringify(json));
				
				var question = json.question_text;
				
				var captcha = AnyBalance.retrieveCode('В некоторых случаях Госуслуги используют защиту от роботов в виде проверки.\nПожалуйста, введите ответ на вопрос:\n\n' + question, null, {/*inputType: 'number', */time: 180000});
			    var params = {'answer': captcha, 'guid': guid};
			
			    html = AnyBalance.requestPost('https://esia.gosuslugi.ru/anomaly-resolver/api/reaction/question/answer', JSON.stringify(params), addHeaders({
		        	'Accept': 'application/json, text/plain, */*',
                    'Content-Type': 'application/json',
		        	'Origin': 'https://esia.gosuslugi.ru',
		        	'Referer': 'https://esia.gosuslugi.ru/login/',
		        }));
			
		        var json = getJson(html);
	            AnyBalance.trace(JSON.stringify(json));
			}
			
    	    if (json.result == true || json.is_verified == true) {
				html = AnyBalance.requestPost('https://esia.gosuslugi.ru/aas/oauth2/api/login', JSON.stringify({
			        'idType': loginType,
					'login': formattedLogin,
			        'password': prefs.password
		        }), addHeaders({
		        	'Accept': 'application/json, text/plain, */*',
                    'Content-Type': 'application/json',
		        	'Origin': 'https://esia.gosuslugi.ru',
		        	'Referer': 'https://esia.gosuslugi.ru/login/',
		        }));
                
				var json = getJson(html);
	            AnyBalance.trace(JSON.stringify(json));
				
    	    }else{
				AnyBalance.trace(html);
    	        throw new AnyBalance.Error('Вы не прошли проверку. Пожалуйста, попробуйте ещё раз');
			}
        }
		
		if (json.status != 'successful') {
		    var error = json.error;
    	    if (error) {
		        AnyBalance.trace(html);
				throw new AnyBalance.Error('Неверные логин или пароль!', null, /login|password/i.test(error));
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
		
            var html = AnyBalance.requestGet(url, addHeaders({Referer: AnyBalance.getLastUrl()}), g_headers);
	    }
		
		g_savedData.setCookies();
	    g_savedData.save();
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
	var json=callAPI('pay/v1/informer/fetch');
	getParam(json.result.amount, result, 'balance', null, null, parseBalance);
	getParam(json.result.total, result, 'total', null, null, parseBalance);
	getParam(json.result.totalDocs, result, 'total_docs', null, null, parseBalance);
    result.info='';
	if (json.result.amount==0)
    	result.info='Нет начислений'	

	if (json.fns){
       	//result.nalog_balance=json.fns.result.amount;
       	json.fns.groups.forEach(function(g) {
			result.info+=g.name
       		g.bills.forEach(function(n) {
				result.info+='<br>'+n.billDate.replace(/(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2}:\d{2})([\s\S]*)/,'$3.$2.$1 $4');
       			result.info+='<br>'+n.amount+' ₽<br>'+(n.billName||n.fnsName);
       		})
       	})    	
	}
	
    if (json.fine){
    	//result.gibdd_info='';
    	//result.gibdd_balance=json.fine.result.amount;
    	//result.gibdd_balance_full=json.fine.result.originalAmount;
    	json.fine.groups.forEach(function(g) {
    		result.info+=g.name
    		g.bills.forEach(function(n) {
    			n.discountDate=n.discountDate.replace(/(\d*)-(\d*)-(\d*)/,'$3.$2.$1');
    			if (parseDate(n.discountDate)>new Date()) {
    				result.info+='<br>'+n.amount+' ₽<br>(до '+n.discountDate+')';
			    }else{
    				result.info+='<br>'+n.originalAmount+' ₽';
                    result.info+='<br>'+n.billName+' ('+n.articleCode+')<br>'+n.offenseDate.replace(/(\d{4})-(\d{2})-(\d{2})([\s\S]*)/,'$3.$2.$1 в $4');
                    if (n.hasPhoto) {
						result.info+='<br>Есть фото нарушения'
                        result.info+='<br>'+n.supplierFullName;
					}
			    }
        	})
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

/**	
	var form = getElement(html, /<form[^>]+otpForm/i);
		if(form){
			AnyBalance.trace('Требуется смс для входа');
			var sms = getElement(html, /<[^>]*code-is-sent/i, replaceTagsAndSpaces);
			var code = AnyBalance.retrieveCode(sms || 'Введите код подтверждения из SMS', null, {inputType: 'number'});
			var params = createFormParams(form);
			params.otp = code;

			html = AnyBalance.requestPost('https://esia.gosuslugi.ru/idp/login/otp/do', params, addHeaders({Referer: AnyBalance.getLastUrl()}));
		} 
		var form = getElement(html, /<form[^>]+req-form/i);
		if(form){
			AnyBalance.trace('Требуется ответ на вопрос');
			var request = getElementById(html,'request', replaceTagsAndSpaces);
			var db=AnyBalance.getData(login+'answerDB');
			var answer='';
			if (db){
				db=getJson(db);
				answer=db.filter(function(i) {return i.request==request});
				if (answer.length>0) 
					answer=answer[0].answer;
				else
					answer='';
			}else{
				db=[];
			}
			if (!answer)
                        	var answer = AnyBalance.retrieveCode(request);
			var params = createFormParams(form);
			params.answer = answer;
			html = AnyBalance.requestPost('https://esia.gosuslugi.ru/idp/login/pwd/inforeq', params, addHeaders({Referer: AnyBalance.getLastUrl()}));
			if (/Вы ввели неверные данные!/i.test(html)){
				throw new AnyBalance.Error('Вы ввели неверные данные!', null, true);
			}
			db.push({request:request,answer:answer});
                        AnyBalance.setData(login+'answerDB',JSON.stringify(db));
                        AnyBalance.saveData();
                        html = checkForRedirect(html);

		} 


		if (!isLoggedIn(html)) {
			//Попытаемся получить ошибку авторизации на раннем этапе. Тогда она точнее.
			var errorCode = getParam(html, null, null, [/new LoginViewModel\([^,]+,'([^']+)/i, /authn\.error\.([^"']+)/i]);
			if (errorCode) {
				var jsonLocalizationMsg = getJsonObject(html, /var jsonLocalizationMsg/i);
				var message = getParam(jsonLocalizationMsg.d.error[errorCode], null, null, null, replaceTagsAndSpaces);

				throw new AnyBalance.Error(message, null, /account_is_locked|certificate_user_not_found|invalid_credentials|invalid_signature|no_subject_found/i.test(errorCode));
			}

			var error = getElement(html, /<div[^>]+error/i, replaceTagsAndSpaces);
			if(error)
				throw new AnyBalance.Error(error, null, /парол/i.test(html));
		}

		// Возможно мы попадем в кабинет где есть ИП и физ лицо, надо проверить
		if (/<h1[^>]*>\s*Выбор роли\s*<\/h1>|Войти как/i.test(html)) {
			html = AnyBalance.requestGet('https://esia.gosuslugi.ru/idp/globalRoleSelection?orgID=P', g_headers);
		}

		html = checkForRedirect(AnyBalance.requestGet('https://www.gosuslugi.ru/', g_headers));

		// Поскольку Ваш браузер не поддерживает JavaScript, для продолжения Вам необходимо нажать кнопку "Продолжить".
		html = checkForJsOff(html);
	}

	if (!isLoggedIn(html)) {
		var error = getParam(html, [/span\s*>\s*(Ошибка авторизации(?:[^>]*>){4})/i, /<div class="error[^>]*>([\s\S]*?)<\/div>/i], [replaceTagsAndSpaces, /Вернуться назад/i, '']);
		if (error)
			throw new AnyBalance.Error(error, null, /Ошибка авторизации/i.test(error));

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
    
	return callAPI('lk/v1/users/data');
	**/
}

/**
function checkForJsOff(html) {
	if (/Since your browser does not support JavaScript,\s+you must press the Continue button once to proceed/i.test(html)) {
		AnyBalance.trace('Since your browser does not support JavaScript, you must press the Continue button once to proceed...');
		// Поскольку Ваш браузер не поддерживает JavaScript, для продолжения Вам необходимо нажать кнопку "Продолжить".
		var params = createFormParams(html);
		var action = getParam(html, null, null, /<form[^>]+action="([^"]+)/i, replaceTagsAndSpaces);
		if (!action) {
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось найти форму переадресации, сайт изменен?');
		}

		html = checkForRedirect(AnyBalance.requestPost(action, params, addHeaders({Referer: g_baseurl + 'idp/profile/SAML2/Redirect/SSO'})));
	}
	return html;
}

function checkForRedirect(html) {
	// Пытаемся найти ссылку на редирект
	// var href = getParam(html, null, null, /url=([^"]+)/i);
	var referer = AnyBalance.getLastUrl();
	var href = getParam(html, null, null, /<meta[^>]+"refresh"[^>]+url=([^"]+)/);
		// Если нашли ссылку, идем по ней
	if(href){
		AnyBalance.trace('checkForRedirect: Нашли ссылку ' + href);
		return checkForJsOff(AnyBalance.requestGet(href, addHeaders({Referer: referer})));
	}

	var form = /<body[^>]+onload="document\.forms\[0\]\.submit/i.test(html);
	if(form){
		form = getElement(html, /<form/i);
		href = getParam(form, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities);
		AnyBalance.trace('checkForRedirect: Нашли форму на ' + href);

		return checkForJsOff(AnyBalance.requestPost(joinUrl(referer, href), createFormParams(form), addHeaders({Referer: referer})));
	}

	// Если нет ссылки, не надо никуда идти
	AnyBalance.trace('Данная страница не требует переадресации.');
	return html;

}

// function followRedirect(html, allowExceptions) {
// var href = getParam(html, null, null, /<meta[^>]+"refresh"[^>]+url=([^"]+)/i);
// if (!href) {
// AnyBalance.trace(html);
// if(allowExceptions)
// throw new AnyBalance.Error('Не удалось найти ссылку на переадресацию, сайт изменен?');
// }
// //AnyBalance.trace('Нашли ссылку ' + href);
// return AnyBalance.requestGet(href, addHeaders({Referer: g_baseurl}));
// }

function createFormParamsById(html, servicesubId) {
	var form = getParam(html, null, null, new RegExp('<form[^>]*id="s' + servicesubId + '"[\\s\\S]*?</form>'));
	if (!form) {
		var err = getParam(html, null, null, /"popupText"([^>]*>){2}/i, replaceTagsAndSpaces);
		if (err)
			throw new AnyBalance.Error(err);

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму с данными для id: ' + servicesubId + ', такое бывает, если услуга недоступна. Если эта ошибка появляется часто - свяжитесь, пожалуйста, с разработчиками.');
	}
	return createFormParams(form);
}

function isLoggedIn(html) {
	var html = AnyBalance.requestGet(g_baseurl + 'api/lk/v1/users/data?_=' + Math.random(), addHeaders({Referer: g_headers}));
	return /"firstName"/.test(html);
}

function getChalenge(html){
	var ChallengeId=getParam(html,/ChallengeId=(\d*)/);
	var Challenge=getParam(html,/Challenge=(\d*)/);
	y=test(Challenge);
	html=AnyBalance.requestPost(AnyBalance.getLastUrl(),'',addHeaders({
		'X-AA-Challenge-ID': ChallengeId, 
		'X-AA-Challenge-Result':y,
		'X-AA-Challenge':Challenge,
		'X-Requested-With':'ru.rostel',
		'Content-Type':'text/plain'
	}))
	//apacheclient теряет кавычки внутри значений кук. Надо восстановить
	fixCookies();
	html=AnyBalance.requestGet(AnyBalance.getLastUrl());
	return html;
}

function test(var1){
	var var_str=""+var1;
	var var_arr=var_str.split("");
	var LastDig=var_arr.reverse()[0];
	var minDig=var_arr.sort()[0];
	var subvar1 = (2 * (var_arr[2]))+(var_arr[1]*1);
	var subvar2 = (2 * var_arr[2])+var_arr[1];
	var my_pow=Math.pow(((var_arr[0]*1)+2),var_arr[1]);
	var x=(var1*3+subvar1)*1;
	var y=Math.cos(Math.PI*subvar2);
	var answer=x*y;
	answer-=my_pow*1;
	answer+=(minDig*1)-(LastDig*1);
	answer=answer+subvar2;
	return answer;
}

function fixCookies(){
	//Надо исправить работу куки (пропали кавычки)
	var cookies = AnyBalance.getCookies();
	var repaired = false;
	for(var i=0; i<cookies.length; ++i){
		var c = cookies[i];
		if(/BotMitigationCookie/i.test(c.name) && !/^"/.test(c.value)){
			var newval = '"' + c.value + '"';
			AnyBalance.trace('Исправляем куки ' + c.name + ' на ' + newval);
			AnyBalance.setCookie(c.domain, c.name, newval, c);
			repaired = true;
		}
	}
	return repaired;
}
**/

function callAPI(verb, params){
	AnyBalance.trace('Запрос: ' + verb);
	if (params)
		var html = AnyBalance.requestGet(g_baseurl + 'api/' + verb + '?_=' + Math.random(), addHeaders({Referer: g_headers}))
	else
		var html = AnyBalance.requestGet(g_baseurl + 'api/' + verb + '?_=' + Math.random(), params, addHeaders({Referer: g_headers}))
	AnyBalance.trace('Ответ: ' + html);
	var json = getJson(html);
	if(json.error && json.error.code != 0){
		throw new AnyBalance.Error(json.error.message);
	}
	return json;
}