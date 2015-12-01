/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'Accept':'*/*',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Connection':'keep-alive',
	'Origin': 'https://www.citibank.ru',
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

var jsonHeaders = {
	'Accept':'application/json, text/javascript, */*; q=0.01',
	'Origin':'https://www.citibank.ru',
	'X-Requested-With':'XMLHttpRequest',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.86 Safari/537.36',
	'Accept-Language':'ru,en;q=0.8',		
};

var baseurl = 'https://www.citibank.ru/RUGCB/';
var JFP_TOKEN;
var SYNC_TOKEN;
// Детальная инфа которая требует смс-код
var detailsEnabled = false;

function login(prefs) {
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	detailsEnabled = prefs.detailsEnabled;
	
    if(!JFP_TOKEN) {
		AnyBalance.trace('Нужно залогинится.');
		
		var html = AnyBalance.requestGet(baseurl, addHeaders({Referer: baseurl}));
		var href = getParam(html, null, null, /window.location.href="\/RUGCB\/([^"]+)/i);

		if(href) {
			html = AnyBalance.requestGet(baseurl + href, addHeaders({Referer: baseurl}));
		}		
		
		getElements(html, /<script[^>]*>/ig, [/^<script[^>]*>|<\/script>$/ig, ''] , function(str) {
			if(/XXX_Extra/.test(str)) {
				AnyBalance.trace('XXX_Extra found, trying to evaluate');
				safeEval(str, 'jQuery', [jQueryLocal]);
			}
			return str;
		});
		
		JFP_TOKEN = getJFPToken(html);
		SYNC_TOKEN = getToken(html);
		
		var XYZ_Extra = getParam(html, null, null, /XYZ_Extra[^>]*value=([^"'>]+)/i);
		var XXX_Extra = getParam(g_append, null, null, /XXX_Extra[^>]*value=([^'">]+)/i);
		
		checkEmpty(JFP_TOKEN && XYZ_Extra && XXX_Extra, 'Не удалось найти один из важных параметров входа, сайт изменен?');		
		
		html = AnyBalance.requestPost(baseurl + 'JSO/signon/ProcessUsernameSignon.do?JFP_TOKEN=' + JFP_TOKEN, {
			'SYNC_TOKEN': SYNC_TOKEN,
			'JFP_TOKEN': JFP_TOKEN,
			'rsaDevicePrint': 'version=2&pm_fpua=mozilla/5.0 (windows nt 10.0; wow64) applewebkit/537.36 (khtml, like gecko) chrome/46.0.2490.86 safari/537.36|5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.86 Safari/537.36|Win32&pm_fpsc=24|1920|1080|1040&pm_fpsw=&pm_fptz=3&pm_fpln=lang=ru|syslang=|userlang=&pm_fpjv=1&pm_fpco=1&pm_fpasw=widevinecdmadapter|mhjfbmdgcfjbbpaeojofohoefgiehjai|pepflashplayer|internal-nacl-plugin|internal-pdf-viewer&pm_fpan=Netscape&pm_fpacn=Mozilla&pm_fpol=true&pm_fposp=&pm_fpup=&pm_fpsaw=1920&pm_fpspd=24&pm_fpsbd=&pm_fpsdx=&pm_fpsdy=&pm_fpslx=&pm_fpsly=&pm_fpsfse=&pm_fpsui=',
			'username': prefs.login,
			'password': prefs.password,
			'x': '39',
			'y': '10',
			'XXX_Extra': XXX_Extra,
			'XYZ_Extra': XYZ_Extra,
		}, g_headers);
		
		// Проверяем, надо ли пропустить вход без смс
		if(/id="nonOtpLogonButton"|Otp-Warning-Skip/i.test(html)) {
			html = AnyBalance.requestGet(baseurl + 'JSO/signon/uname/HomepagePortal.do?SYNC_TOKEN=' + getToken(html), addHeaders({Referer: baseurl + 'JSO/signon/DisplayUsernameSignon.do'}));
		}
		
		if(!/signOffLink/i.test(html)) {
			throw new AnyBalance.Error('Не удалось войти в интернет-банк. Неправильный логин-пароль?');
		}

		// html = AnyBalance.requestGet(baseurl + 'JSO/signon/uname/HomePage.do?SYNC_TOKEN=' + getToken(html) + '&JFP_TOKEN=' + getJFPToken(html), addHeaders({Referer: baseurl + 'JSO/signon/DisplayUsernameSignon.do'}));

		// var select = getParam(html, null, null, /<select[^>]+name="selectedProfile"[\s\S]*?<\/select>/i);
		// if(select){ //Необходимо выбрать профиль
			// var num = prefs.profile ? prefs.profile : '\\d{4}';
			// var re = new RegExp('<option[^>]+value="([^"]*)"[^>]*>([^<]*' + num + ')\\s*</option>', 'i');
			// var value = getParam(select, null, null, re, null, html_entity_decode);
			// if(!value)
				// throw new AnyBalance.Error(prefs.profile ? 'Не найдено ни одного профиля. Сайт изменен?' : 'Не найдено профиля с последними цифрами ' + prefs.profile);
			// AnyBalance.trace("Selecting profile " + select.match(re)[2]);
			// html = AnyBalance.requestPost(baseurl + 'JSO/signon/ProcessUsernameProfileSignon.do', {
				// SYNC_TOKEN:getToken(html),
				// selectedProfile:value
			// }, g_headers);
		   
		// }
		// Теперь надо запросить смс на детализацию
		processSmsAuth(html);
	} else {
        AnyBalance.trace('Уже залогинены, отлично.');
    }	
	
	__setLoginSuccessful();
	
	return html;
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Профиль
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processProfile(html, result) {
	var jsonStr = AnyBalance.requestPost(baseurl + 'REST/welcome/welcomeMsgContent?JFP_TOKEN=' + getJFPToken(html), '', addHeaders(jsonHeaders, {
		Referer: baseurl + 'JSO/signon/uname/HomePage.do?SYNC_TOKEN='+getToken(html)+'&JFP_TOKEN=' + getJFPToken(html)
	}));
	
	var json = getJson(jsonStr);
	
	result.profile = {};
	
	getParam(json.USERNAME, result.profile, 'profile.USERNAME', null, replaceTagsAndSpaces, capitalFirstLetters);
	getParam(json.EMAIL, result.profile, 'profile.EMAIL', null, replaceTagsAndSpaces);
	getParam(json.MOBILENUMBER, result.profile, 'profile.MOBILENUMBER', null, replaceTagsAndSpaces);
	getParam(json.COMPANYNAMEPHRASE, result.profile, 'profile.COMPANYNAMEPHRASE', null, replaceTagsAndSpaces);
	getParam(json.COMPANYNAME, result.profile, 'profile.COMPANYNAME', null, replaceTagsAndSpaces);
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Смс-код
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
var smsAlreadyEntered = false;
var count = 3;

function processSmsAuth(html) {
	// Детальная инфа по счетам требует смс - подтверждения, и только один раз, для пользовательской версии есть возможность выключить детальную инфу, чтобы смс не запрашивались
	if(smsAlreadyEntered || !detailsEnabled)
		return;
	
	var html = AnyBalance.requestPost(baseurl + 'COA/ain/accsumlit/flow.action?JFP_TOKEN=' + getJFPToken(html), '', jsonHeaders);

	var jsonStr = AnyBalance.requestPost(baseurl + 'REST/coa/ain/accsumlit/getAccounts?JFP_TOKEN=' + getJFPToken(html), '', addHeaders(jsonHeaders, {
		Referer: baseurl + 'JSO/signon/uname/HomePage.do?SYNC_TOKEN=' + getToken(html) + '&JFP_TOKEN=' + getJFPToken(html)
	}));
	var json = getJson(jsonStr);

	if(!json.accountDetailList){
		AnyBalance.trace('Нет ни одного счета, не будем ввходить смс-код.');
		return;
	}
	
	for(var i=0; i < json.accountDetailList.length; ++i) {
		var account = json.accountDetailList[i];
		checkSmsAuth(html, account.instanceID);
		return;
	}
}

function checkSmsAuth(html, instanceID) {
	// Детальная инфа по счетам требует смс - подтверждения, и только один раз
	if(smsAlreadyEntered)
		return;
	
	var html = AnyBalance.requestPost(baseurl + 'COA/common/accsel/flow.action?aai=' + instanceID + '&JFP_TOKEN=' + getJFPToken(html), '', addHeaders({
		Referer: baseurl + 'JSO/signon/uname/HomePage.do?SYNC_TOKEN=' + getToken(html) + '&JFP_TOKEN=' + getJFPToken(html),
		'X-Requested-With': 'XMLHttpRequest'
	}));
	
	// Запросили смс, ждем
	AnyBalance.trace('Пытаемся ввести смс-код');
	code = AnyBalance.retrieveCode('Пожалуйста, введите смс-код');
	AnyBalance.trace('Смс-код получен: ' + code);
	
	html = AnyBalance.requestPost(baseurl + 'JPS/apps/otpstc/StcMain.do?JFP_TOKEN=' + getJFPToken(html), {
		'SYNC_TOKEN': getToken(html),
		'JFP_TOKEN': getJFPToken(html),
		'secureTxnFunction': 'CodeEntry',
		'secureTxnCode': code,
	}, addHeaders({
		Referer: baseurl + 'JSO/signon/uname/HomePage.do',
		'X-Requested-With': 'XMLHttpRequest'
	}));
	
	if(/SMS-сообщение с одноразовым паролем было отправлено/i.test(html)) {
		if(count == 0)
			throw new AnyBalance.Error('Смс-код был введен неправильно три раза подряд, вы уверены, что вводите правильный код?');

		count--;
		AnyBalance.trace('Смс-код введен неверно, попробуем еще раз');
		checkSmsAuth(html, instanceID);
	}
	
	smsAlreadyEntered = true;
	
	return;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Счета
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processAccounts(html, result) {
	// try {
		var html = AnyBalance.requestPost(baseurl + 'COA/ain/accsumlit/flow.action?JFP_TOKEN=' + getJFPToken(html), '', jsonHeaders);

		var jsonStr = AnyBalance.requestPost(baseurl + 'REST/coa/ain/accsumlit/getAccounts?JFP_TOKEN=' + getJFPToken(html), '', addHeaders(jsonHeaders, {
			Referer: baseurl + 'JSO/signon/uname/HomePage.do?SYNC_TOKEN=' + getToken(html) + '&JFP_TOKEN=' + getJFPToken(html)
		}));
		var json = getJson(jsonStr);

		if(!json.accountDetailList){
			AnyBalance.trace(jsonStr);
			AnyBalance.trace('Не найдена информация о счетах.');
			return html;
		}
		
		var accounts = json.accountDetailList;
		
		AnyBalance.trace('Найдено счетов: ' + accounts.length);
		result.accounts = [];
		
		for(var i=0; i < accounts.length; ++i) {
			var account = accounts[i];
			
			var _id = account.instanceID;
			var title = account.accountName;
			
			var c = {__id: _id, __name: title};
			
			if(__shouldProcess('accounts', c)) {
				processAccount(html, account, c);
			}
			
			result.accounts.push(c);
		}
	// } finally {
		// Обязательно надо вернуть страничку
		return html;
	// }
}

function processAccount(html, info, result) {
	getParam(info.relatedAccountNumber, result, 'accounts.relatedAccountNumber');
	getParam(info.productName, result, 'accounts.productName');
	getParam(info.inactive, result, 'accounts.inactive');
	getParam(info.accountType, result, 'accounts.accountType');
	
	if(info.elementEntryMap) {
		for(var k in info.elementEntryMap) {
			var array = info.elementEntryMap[k];
			if(array && array.length > 0) {
				for(var i =0; i<array.length; i++) {
					var curr = array[i];
					processPhrases(curr.phrase, curr.value + '', result);
				}
			}
		}
	}
	
	// Детали
	if(detailsEnabled) {
		html = AnyBalance.requestPost(baseurl + 'REST/ain/accdetact/exitMethod?JFP_TOKEN=' + getJFPToken(html), {
			exitMethod: 1,
		}, addHeaders({
			Referer: baseurl + 'JSO/signon/uname/HomePage.do?SYNC_TOKEN=' + getToken(html) + '&JFP_TOKEN=' + getJFPToken(html),
			'X-Requested-With': 'XMLHttpRequest'
		}));
		
		html = AnyBalance.requestPost(baseurl + 'COA/ain/accdetact/flow.action?JFP_TOKEN=' + getJFPToken(html), {
			aai: info.instanceID,
		}, addHeaders({
			Referer: baseurl + 'JSO/signon/uname/HomePage.do?SYNC_TOKEN=' + getToken(html) + '&JFP_TOKEN=' + getJFPToken(html),
			'X-Requested-With': 'XMLHttpRequest'
		}));

		var jsonStr = AnyBalance.requestPost(baseurl + 'REST/ain/accdetact/getAccountDetailsAndActivities?JFP_TOKEN=' + getJFPToken(html), {
			detailReq: true,
		}, addHeaders(jsonHeaders, {
			Referer: baseurl + 'JSO/signon/uname/HomePage.do?SYNC_TOKEN=' + getToken(html) + '&JFP_TOKEN=' + getJFPToken(html)
		}));
		
		info = getJson(jsonStr);
		
		getParam(info.rewardPoints + '', result, 'accounts.rewardPoints', null, null, parseBalance);
		getParam(info.categoryCode, result, 'accounts.categoryCode');
		getParam(info.ibanAccuntNo, result, 'accounts.ibanAccuntNo');
		
		// И еще один цикл 
		for(var i = 1; i < 10; i ++) {
			var table = info['tableList' + i];
			if(!isset(table))
				continue;
			
			for(var z=0;z<table.length;z++) {
				var curr = table[z];
				processPhrases(curr.phrase, curr.value + '', result);
			}
		}
		
		if(typeof processAccountTransactions != 'undefined')
			processAccountTransactions(html, info, result);		
	}
}

function processPhrases(phrase, value, result) {
	if(/Доступно сейчас/i.test(phrase)) {
		getParam(value, result, 'accounts.avail', null, replaceTagsAndSpaces, parseBalance);
		getParam(value, result, ['accounts.currency', 'accounts'], null, replaceTagsAndSpaces, parseCurrency);
	} else if(/Текущий баланс/i.test(phrase)) {
		getParam(value, result, 'accounts.balance', null, replaceTagsAndSpaces, parseBalance);
	} else if(/Баланс по последней выписке/i.test(phrase)) {
		getParam(value, result, 'accounts.balance_lastEx', null, replaceTagsAndSpaces, parseBalance);
	} else if(/Минимальный платеж/i.test(phrase)) {
		getParam(value, result, 'accounts.minpay', null, replaceTagsAndSpaces, parseBalance);
	} else if(/Дата оплаты минимального платежа/i.test(phrase)) {
		getParam(value, result, 'accounts.minpay_date', null, replaceTagsAndSpaces, parseDate);
	} else if(/Использованный кредит/i.test(phrase)) {
		getParam(value, result, 'accounts.loanUsed', null, replaceTagsAndSpaces, parseBalance);
	} else if(/Доступно для выдачи наличными/i.test(phrase)) {
		getParam(value, result, 'accounts.incash', null, replaceTagsAndSpaces, parseBalance);
	} else if(/замороженные суммы/i.test(phrase)) {
		getParam(value, result, 'accounts.onhold', null, replaceTagsAndSpaces, parseBalance);
	} else if(/Кредитный лимит/i.test(phrase)) {
		getParam(value, result, 'accounts.limit', null, replaceTagsAndSpaces, parseBalance);
	}
}

function getFormattedDate(dayCorr) {
	var dt = new Date();
	
	if(isset(dayCorr))
		dt.setDate(dt.getDate() - dayCorr);
	
	var day = (dt.getDate() < 10 ? '0' + dt.getDate() : dt.getDate());
	var month = ((dt.getMonth()+1) < 10 ? '0' + (dt.getMonth()+1) : dt.getMonth()+1);
	var year = dt.getFullYear();
	
	return day + '/' + month + '/' +  year;
}

/**
*  Всякий служебный хлам
*/

var g_append = '';

function jQueryLocal(args) {
	jQueryLocal.fn = {
		jquery: '1.11'
	}
	
	/**stubs*/
	function delegate() {}
	function attr() {}
	
	function ready(f) {
		f();
	}

	function each(f) {
		f();
	}
	
	function append(str) {
		return g_append += str + '\n';
	}

	return {
		each: each,
		append: append,
		ready: ready,
		delegate: delegate,
		attr: attr,
	}
};

function isValidUrl() {
	return true;
}

function getToken(html){
    var token = getParam(html, null, null, /<input[^>]+name="SYNC_TOKEN"[^>]*value="([^"]+)/i);
    // if(!token) {
        // throw new AnyBalance.Error('Не найден токен синхронизации. Сайт изменен или проблемы на сайте.');
	// }
    return token || SYNC_TOKEN;
}

function getJFPToken(html) {
    var token = getParam(html, null, null, /JFP_TOKEN=([\w]+)/i);
    // if(!token) {
        // throw new AnyBalance.Error('Не найден токен авторизации. Сайт изменен или проблемы на сайте.');
	// }
    return token || JFP_TOKEN;
}
