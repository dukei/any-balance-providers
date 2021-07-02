/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
var g_baseurl = 'https://www.gosuslugi.ru/';
		var g_headers = {
			'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
			'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
			'Connection': 'keep-alive',
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.120 Safari/537.36',
		};

function main() {
	var prefs = AnyBalance.getPreferences();

	var result = {success: true};
	
	var profile = login(prefs);
	getParam(profile.formattedLoginName||profile.formattedName||profile.lastName+' '+profile.firstName+''+profile.middleName,result,'fio')
	var json=callAPI('pay/v1/informer/fetch');
        result.balance=json.result.amount;
        result.info='';
	if (json.fns){
        	//result.nalog_balance=json.fns.result.amount;
        	json.fns.groups.forEach(function(g) {
        		g.bills.forEach(function(n) {
        			result.info+='<b>'+n.amount.toFixed(2)+' р.:</b>'+(n.billName||n.fnsName)+'<br><br>'
        		})
        	})
        	
	}
        if (json.fine){
        	//result.gibdd_info='';
        	//result.gibdd_balance=json.fine.result.amount;
        	//result.gibdd_balance_full=json.fine.result.originalAmount;
        	json.fine.groups.forEach(function(g) {
        		result.info+=g.name+'<br>'
        		g.bills.forEach(function(n) {
        			n.discountDate=n.discountDate.replace(/(\d*)-(\d*)-(\d*)/,'$3.$2.$1');
        			if (parseDate(n.discountDate)>new Date())
        				result.info+='<b>'+n.amount.toFixed(2)+' р. </b><small> (до '+n.discountDate+')</small><br>:';
        			else
        				result.info+='<b>'+n.originalAmount.toFixed(2)+' р.:</b><br>';
                                result.info+=n.billName+' ('+n.articleCode+')<br>'+n.offenseDate.replace(/(\d{4})-(\d{2})-(\d{2})([\s\S]*)/,'$3.$2.$1 в$4');
                                if (n.hasPhoto) result.info+='<br>Есть фото нарушения'
                                result.info+='<br><small>'+n.supplierFullName+'</small><br><br>';
        		})
        	})
        }
	var json=callAPI('lk/v1/feeds/counters/');
	result.mails=json.unread;
	AnyBalance.setResult(result);
}
function login(prefs){
    //AnyBalance.setOptions({cookiePolicy: 'netscape'});
	AnyBalance.setDefaultCharset('utf-8');

	var formattedLogin;
	var loginType;
	var login = prefs.login.replace(/[^\d@]+/g, '');
	if (/@/.test(login)) {
		formattedLogin = getParam(prefs.login, /^\s*([a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*)\s*$/);
		if(!formattedLogin)
			throw new AnyBalance.Error('Некорректный e-mail');
		loginType = 'email';
	}else if(/^\s*\+7/i.test(prefs.login) || /^\d{10}$/.test(login)){
		loginType = 'phone';
		formattedLogin = login.replace(/^7?(\d{3})(\d{3})(\d{2})(\d{2})/i, '+7($1)$2$3$4');
	}else if(/^\d{11}$/.test(login)){
		if(!checkSnils(login))
			throw new AnyBalance.Error('Некорректный СНИЛС, пожалуйста, проверьте и исправьте', null, true);
		loginType = 'snils';
		formattedLogin = login.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/i, '$1-$2-$3 $4');
	}else{
		throw new AnyBalance.Error('В качестве логина введите СНИЛС (11 цифр без разделителей), телефон (10 цифр без разделителей) или e-mail', null, true);
	}

	if (loginType == 'snils')
		checkEmpty(formattedLogin, 'Введите СНИЛС (без пробелов и разделителей, 11 символов подряд). Вы ввели: "' + (prefs.login || 'пустое поле') + '"!');
	else
		checkEmpty(formattedLogin, 'Введите правильный Email. Вы ввели: "' + (prefs.login || 'пустое поле') + '"!');

	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(g_baseurl + 'auth/esia/?redirectPage=/', g_headers);

	// нужно для отладки
	if (!isLoggedIn(html)) {
		var jsessionid = AnyBalance.getCookie('JSESSIONID');
		html = checkForRedirect(html);

		// Госуслуги издеваются. Сначала выкатили новую форму входа, потом спрятали
		// Пока используем старую
		// html = AnyBalance.requestPost('https://esia.gosuslugi.ru/idp/authn/UsernamePasswordLogin', {
		// username: formattedLogin,
		// password: prefs.password,
		// idType:loginType,
		// }, addHeaders({Referer: 'https://esia.gosuslugi.ru/idp/authn/CommonLogin'}));

		// А новую оставим на всякий
		var command = getParam(html, null, null, /new\s+LoginViewModel\((?:[^,]+,){1,2}\s*'([^"']+)'/i);
		if (!command && /ChallengeId/.test(html)){
			//Поскольку куки мы переставили, надо челендж запросить с нужными куками
			html=getChalenge(html);
			command = getParam(html, null, null, /new\s+LoginViewModel\((?:[^,]+,){1,2}\s*'([^"']+)'/i);
		}

		if (!command) {
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось найти идентификатор команды для входа.');
		}
		AnyBalance.setCookie('esia.gosuslugi.ru','login_value',prefs.login);
		AnyBalance.setCookie('esia.gosuslugi.ru','userSelectedLanguage','ru');
		AnyBalance.setCookie('esia.gosuslugi.ru','_idp_authn_id',encodeURIComponent('email:'+prefs.login));

		html = checkForRedirect(AnyBalance.requestPost('https://esia.gosuslugi.ru/idp/login/pwd/do', {
			mobileOrEmail: prefs.login,
			login: formattedLogin,
			snils: '',
			password: prefs.password,
			idType: loginType,
			'command': command
		}, addHeaders({Referer: 'https://esia.gosuslugi.ru/idp/rlogin?cc=bp'})));

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
}

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
function test(var1)
{
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
function callAPI(verb,params){
	AnyBalance.trace('Запрос: '+verb);
	if (params)
		var answer=AnyBalance.requestGet(g_baseurl + 'api/'+verb+'?_=' + Math.random(), addHeaders({Referer: g_headers}))
	else
		var answer=AnyBalance.requestGet(g_baseurl + 'api/'+verb+'?_=' + Math.random(),params, addHeaders({Referer: g_headers}))
	AnyBalance.trace('Ответ: '+answer);
	return getJson(answer);
}