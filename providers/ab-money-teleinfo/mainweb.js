/**
 Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
 */

var g_headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
    'Connection': 'keep-alive',
	'Origin': 'https://online.vtb.ru',
	'Referer': 'https://online.vtb.ru/',
	'Upgrade-Insecure-Requests': '1',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
	'X-Finger-Print': 'eyJvc0NwdSI6eyJkdXJhdGlvbiI6MH0sImxhbmd1YWdlcyI6eyJ2YWx1ZSI6W1sicnUtUlUiXV0sImR1cmF0aW9uIjowfSwiY29sb3JEZXB0aCI6eyJ2YWx1ZSI6MjQsImR1cmF0aW9uIjoxfSwiZGV2aWNlTWVtb3J5Ijp7InZhbHVlIjo4LCJkdXJhdGlvbiI6MH0sInNjcmVlblJlc29sdXRpb24iOnsidmFsdWUiOls5MDAsMTYwMF0sImR1cmF0aW9uIjowfSwiYXZhaWxhYmxlU2NyZWVuUmVzb2x1dGlvbiI6eyJ2YWx1ZSI6Wzg3MCwxNjAwXSwiZHVyYXRpb24iOjB9LCJoYXJkd2FyZUNvbmN1cnJlbmN5Ijp7InZhbHVlIjo4LCJkdXJhdGlvbiI6MH0sInRpbWV6b25lT2Zmc2V0Ijp7InZhbHVlIjotMTgwLCJkdXJhdGlvbiI6MH0sInRpbWV6b25lIjp7InZhbHVlIjoiRXVyb3BlL01vc2NvdyIsImR1cmF0aW9uIjowfSwic2Vzc2lvblN0b3JhZ2UiOnsidmFsdWUiOnRydWUsImR1cmF0aW9uIjowfSwibG9jYWxTdG9yYWdlIjp7InZhbHVlIjp0cnVlLCJkdXJhdGlvbiI6MH0sImluZGV4ZWREQiI6eyJ2YWx1ZSI6dHJ1ZSwiZHVyYXRpb24iOjB9LCJvcGVuRGF0YWJhc2UiOnsidmFsdWUiOmZhbHNlLCJkdXJhdGlvbiI6MH0sImNwdUNsYXNzIjp7ImR1cmF0aW9uIjowfSwicGxhdGZvcm0iOnsidmFsdWUiOiJXaW4zMiIsImR1cmF0aW9uIjowfSwicGx1Z2lucyI6eyJ2YWx1ZSI6W3sibmFtZSI6IlBERiBWaWV3ZXIiLCJkZXNjcmlwdGlvbiI6IlBvcnRhYmxlIERvY3VtZW50IEZvcm1hdCIsIm1pbWVUeXBlcyI6W3sidHlwZSI6ImFwcGxpY2F0aW9uL3BkZiIsInN1ZmZpeGVzIjoicGRmIn0seyJ0eXBlIjoidGV4dC9wZGYiLCJzdWZmaXhlcyI6InBkZiJ9XX0seyJuYW1lIjoiQ2hyb21lIFBERiBWaWV3ZXIiLCJkZXNjcmlwdGlvbiI6IlBvcnRhYmxlIERvY3VtZW50IEZvcm1hdCIsIm1pbWVUeXBlcyI6W3sidHlwZSI6ImFwcGxpY2F0aW9uL3BkZiIsInN1ZmZpeGVzIjoicGRmIn0seyJ0eXBlIjoidGV4dC9wZGYiLCJzdWZmaXhlcyI6InBkZiJ9XX0seyJuYW1lIjoiQ2hyb21pdW0gUERGIFZpZXdlciIsImRlc2NyaXB0aW9uIjoiUG9ydGFibGUgRG9jdW1lbnQgRm9ybWF0IiwibWltZVR5cGVzIjpbeyJ0eXBlIjoiYXBwbGljYXRpb24vcGRmIiwic3VmZml4ZXMiOiJwZGYifSx7InR5cGUiOiJ0ZXh0L3BkZiIsInN1ZmZpeGVzIjoicGRmIn1dfSx7Im5hbWUiOiJNaWNyb3NvZnQgRWRnZSBQREYgVmlld2VyIiwiZGVzY3JpcHRpb24iOiJQb3J0YWJsZSBEb2N1bWVudCBGb3JtYXQiLCJtaW1lVHlwZXMiOlt7InR5cGUiOiJhcHBsaWNhdGlvbi9wZGYiLCJzdWZmaXhlcyI6InBkZiJ9LHsidHlwZSI6InRleHQvcGRmIiwic3VmZml4ZXMiOiJwZGYifV19LHsibmFtZSI6IldlYktpdCBidWlsdC1pbiBQREYiLCJkZXNjcmlwdGlvbiI6IlBvcnRhYmxlIERvY3VtZW50IEZvcm1hdCIsIm1pbWVUeXBlcyI6W3sidHlwZSI6ImFwcGxpY2F0aW9uL3BkZiIsInN1ZmZpeGVzIjoicGRmIn0seyJ0eXBlIjoidGV4dC9wZGYiLCJzdWZmaXhlcyI6InBkZiJ9XX1dLCJkdXJhdGlvbiI6MX0sInRvdWNoU3VwcG9ydCI6eyJ2YWx1ZSI6eyJtYXhUb3VjaFBvaW50cyI6MCwidG91Y2hFdmVudCI6ZmFsc2UsInRvdWNoU3RhcnQiOmZhbHNlfSwiZHVyYXRpb24iOjB9LCJmb250cyI6eyJ2YWx1ZSI6WyJBZ2VuY3kgRkIiLCJDYWxpYnJpIiwiQ2VudHVyeSIsIkNlbnR1cnkgR290aGljIiwiRnJhbmtsaW4gR290aGljIiwiSGFldHRlbnNjaHdlaWxlciIsIkxlZWxhd2FkZWUiLCJMdWNpZGEgQnJpZ2h0IiwiTHVjaWRhIFNhbnMiLCJNUyBPdXRsb29rIiwiTVMgUmVmZXJlbmNlIFNwZWNpYWx0eSIsIk1TIFVJIEdvdGhpYyIsIk1UIEV4dHJhIiwiTWFybGV0dCIsIk1pY3Jvc29mdCBVaWdodXIiLCJNb25vdHlwZSBDb3JzaXZhIiwiUHJpc3RpbmEiLCJTZWdvZSBVSSBMaWdodCJdLCJkdXJhdGlvbiI6MjI0NX0sImF1ZGlvIjp7InZhbHVlIjoxMjQuMDQzNDc1Mjc1MTYwNzQsImR1cmF0aW9uIjozMH0sInBsdWdpbnNTdXBwb3J0Ijp7InZhbHVlIjp0cnVlLCJkdXJhdGlvbiI6MH0sInByb2R1Y3RTdWIiOnsidmFsdWUiOiIyMDAzMDEwNyIsImR1cmF0aW9uIjowfSwiZW1wdHlFdmFsTGVuZ3RoIjp7InZhbHVlIjozMywiZHVyYXRpb24iOjB9LCJlcnJvckZGIjp7InZhbHVlIjpmYWxzZSwiZHVyYXRpb24iOjB9LCJ2ZW5kb3IiOnsidmFsdWUiOiJHb29nbGUgSW5jLiIsImR1cmF0aW9uIjowfSwiY2hyb21lIjp7InZhbHVlIjp0cnVlLCJkdXJhdGlvbiI6MH0sImNvb2tpZXNFbmFibGVkIjp7InZhbHVlIjp0cnVlLCJkdXJhdGlvbiI6MX19'
};

var baseurl = 'https://online.vtb.ru/';

function mainWeb() {
    var prefs = AnyBalance.getPreferences();

    AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(prefs.password, 'Введите пароль!');
	
	var accessToken = AnyBalance.getData(prefs.login + 'accessToken');
	var refreshToken = AnyBalance.getData(prefs.login + 'refreshToken');
	var idToken = AnyBalance.getData(prefs.login + 'idToken');
	
    AnyBalance.trace('Пробуем войти в личный кабинет...');
	
	AnyBalance.restoreCookies();
	
	var html = AnyBalance.requestPost('https://sso-app4.vtb.ru/oauth2/token', {
		'refresh_token': refreshToken,
        'grant_type': 'refresh_token',
        'scope': 'openid',
        'ac20_sms': true
    }, addHeaders({
		'Accept': 'application/json, text/plain, */*',
	    'Authorization': 'Basic QzJWWXYzYjZSSEVpZzJuXzU2YmZubjNHZkk0YTpjdlllaUFwdkZuQVBHbl9vUUNFelVXdmpTajhh',
		'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
	}));

    AnyBalance.trace(html);
	
	var json = getJson(html);
		
	if(json.access_token){
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
		AnyBalance.setData(prefs.login + 'accessToken', json.access_token);
	    AnyBalance.setData(prefs.login + 'refreshToken', json.refresh_token);
	    AnyBalance.setData(prefs.login + 'idToken', json.id_token);
	
	    AnyBalance.saveCookies();
        AnyBalance.saveData();
	}else{
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
        clearAllCookies();
		
		var html = AnyBalance.requestGet(baseurl + 'login', g_headers);
	
        if(AnyBalance.getLastStatusCode() >= 500){
            AnyBalance.trace(html);
            throw new AnyBalance.Error('Сайт ВТБ Онлайн временно недоступен. Попробуйте еще раз позже');
        }
		
		var params = {'scope': 'openid', 'ac20_sms': true};
		
		if(/^\d{16}$/i.test(prefs.login.replace(/\s+/ig, ''))){
    	    AnyBalance.trace('Входить будем по номеру карты');
			params.cardNumber = prefs.login.replace(/\s+/ig, '');
			params.grant_type = 'card_number_new';
        }else if(/^\d{9,10}$/i.test(prefs.login.replace(/[\+\s\-()]+/ig, ''))){
    	    AnyBalance.trace('Входить будем по номеру телефона');
			params.phone_number = prefs.login.replace(/[\+\s\-()]+/ig, '');
			params.grant_type = 'phone';
        }else{
    	    AnyBalance.trace('Входить будем по логину');
			params.login = prefs.login.replace(/\s+/ig, '');
			params.grant_type = 'login_new';
        }
	
	    html = AnyBalance.requestPost('https://sso-app4.vtb.ru/oauth2/token', params, addHeaders({
			'Accept': 'application/json, text/plain, */*',
			'Authorization': 'Basic QzJWWXYzYjZSSEVpZzJuXzU2YmZubjNHZkk0YTpjdlllaUFwdkZuQVBHbl9vUUNFelVXdmpTajhh',
			'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
		}));

        AnyBalance.trace(html);
	
	    var json = getJson(html);
	
	    if(json.type && json.type == 'second_factor_required'){
	    	AnyBalance.trace('ВТБ затребовал код подтверждения из SMS');
	    	var addProperties = json.additional_properties;
			if(!addProperties)
				throw new AnyBalance.Error('Не удалось получить параметры авторизации. Сайт изменен?', null, true);
	    	var mobile = addProperties.mobile;
	    	var sessionDataKey = addProperties.sessionDataKey;
            
			var code = AnyBalance.retrieveCode('Пожалуйста, введите код подтверждения, высланный на номер ' + mobile, null, {inputType: 'number', time: 180000});
		
	    	html = AnyBalance.requestPost('https://sso-app4.vtb.ru/oauth2/token', {
				'login': prefs.login,
                'otp': code,
                'sessionDataKey': sessionDataKey,
                'grant_type': 'login_new',
                'scope': 'openid',
                'ac20_sms': true
            }, addHeaders({
				'Accept': 'application/json, text/plain, */*',
				'Authorization': 'Basic QzJWWXYzYjZSSEVpZzJuXzU2YmZubjNHZkk0YTpjdlllaUFwdkZuQVBHbl9vUUNFelVXdmpTajhh',
				'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
			}));

            AnyBalance.trace(html);
	
	        var json = getJson(html);
			
			if(json.type && json.type == 'authentication_failed'){
	    	    var error = json.message;
                if (error)
                    throw new AnyBalance.Error(error, null, /логин|код/i.test(error));
    
                AnyBalance.trace(html);
			    throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
            }
	    }
		
		if(json.type && json.type == 'password_required'){
	    	AnyBalance.trace('ВТБ затребовал пароль');
	    	var addProperties = json.additional_properties;
			if(!addProperties)
				throw new AnyBalance.Error('Не удалось получить параметры авторизации. Сайт изменен?', null, true);
	    	var sessionDataKey = addProperties.sessionDataKey;
		
	    	html = AnyBalance.requestPost('https://sso-app4.vtb.ru/oauth2/token', {
				'login': prefs.login,
                'password': prefs.password,
                'sessionDataKey': sessionDataKey,
                'grant_type': 'login_new',
                'scope': 'openid',
                'ac20_sms': true
            }, addHeaders({
				'Accept': 'application/json, text/plain, */*',
				'Authorization': 'Basic QzJWWXYzYjZSSEVpZzJuXzU2YmZubjNHZkk0YTpjdlllaUFwdkZuQVBHbl9vUUNFelVXdmpTajhh',
				'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
			}));

            AnyBalance.trace(html);
	
	        var json = getJson(html);
	    }
	
	    if(!json.access_token){
	    	var error = json.message;
            if (error)
                throw new AnyBalance.Error(error, null, /логин|парол|код/i.test(error));
    
            AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
        }

        AnyBalance.setData(prefs.login + 'accessToken', json.access_token);
	    AnyBalance.setData(prefs.login + 'refreshToken', json.refresh_token);
	    AnyBalance.setData(prefs.login + 'idToken', json.id_token);
	
	    AnyBalance.saveCookies();
        AnyBalance.saveData();
	}
	
	var accessToken = AnyBalance.getData(prefs.login + 'accessToken');
	var refreshToken = AnyBalance.getData(prefs.login + 'refreshToken');
	var idToken = AnyBalance.getData(prefs.login + 'idToken');
	
	html = AnyBalance.requestGet(baseurl + 'msa/api-gw/private/portfolio/portfolio-main-page/portfolios/active', addHeaders({
		'Accept': 'application/json, text/plain, */*',
		'Authorization': 'Bearer ' + idToken,
	    'X-Referrer': baseurl
	}));
	
	var json = getJson(html);
	
	if (prefs.type == 'acc') {
        fetchAccountNew(baseurl, html, json);
    } else if (prefs.type == 'card') {
        fetchCardNew(baseurl, html, json);
	} else if (prefs.type == 'dep') {
        fetchDepositNew(baseurl, html, json);
	} else if (prefs.type == 'crd') {
        fetchCreditNew(baseurl, html, json);
	}
}

function doOld(prefs) {
    var baseurl = 'https://old.telebank.ru/WebNew/';
    var html = AnyBalance.requestGet(baseurl + 'Login.aspx');

    if (!prefs.debug) {
        html = AnyBalance.requestPost(baseurl + 'Login.aspx', {
            __EVENTVALIDATION: getEventValidation(html),
            __VIEWSTATE: getViewState(html),
            js: 1,
            m: 1,
            __LASTFOCUS: '',
            __EVENTTARGET: '',
            __EVENTARGUMENT: '',
            Action: '',
            ButtonLogin: '',
            TextBoxName: prefs.login,
            TextBoxPassword: prefs.password
        });
    }
    if (!/location.href\s*=\s*"[^"]*Accounts.aspx/i.test(html)) {
        if (/id="ItemNewPassword"/i.test(html))
            throw new AnyBalance.Error('Телеинфо требует поменять пароль. Пожалуйста, войдите в Телеинфо через браузер, поменяйте пароль, а затем введите новый пароль в настройки провайдера.');
        if (/Проверка переменного кода/i.test(html))
            throw new AnyBalance.Error('Телеинфо требует ввести переменный код. Для использования данного провайдера, проверку кода необходимо отключить.');
        if (/id="LabelError"/i.test(html))
            throw new AnyBalance.Error(getParam(html, null, null, /id="LabelMessage"(?:[^>]*>){3}([^<]*)/i));

        throw new AnyBalance.Error('Не удалось зайти в Телеинфо. Сайт изменен?');
    }
    if (prefs.type == 'abs') {
        fetchAccountABS(baseurl);
    } else { //card
        fetchCardWeb(baseurl);
    }
}

function getInfo(result){
	var prefs = AnyBalance.getPreferences();
		
	var idToken = AnyBalance.getData(prefs.login + 'idToken');

	var html = AnyBalance.requestGet(baseurl + 'msa/api-gw/private/core/core-session-context/user-info', addHeaders({
		'Accept': 'application/json, text/plain, */*',
		'Authorization': 'Bearer ' + idToken,
	    'X-Referrer': baseurl
	}));
	
	var json = getJson(html);
	
	AnyBalance.trace('Профиль: ' + html);
	
	var person = {};
	if(json.firstName)
		sumParam(json.firstName, person, '__n', null, null, null, create_aggregate_join(' '));
	if(json.middleName)
		sumParam(json.middleName, person, '__n', null, null, null, create_aggregate_join(' '));
	if(json.lastName)
		sumParam(json.lastName, person, '__n', null, null, null, create_aggregate_join(' '));
	getParam(person.__n, result, 'fio');
	
	if(json.maskedTrustedPhoneNumber)
	    getParam(json.maskedTrustedPhoneNumber.replace(/.*(\d{3})(\D+)(\d)(\d{2})$/i, '+7 $1 ***-*$3-$4'), result, 'phone');
}

function fetchCashback(result){
	var prefs = AnyBalance.getPreferences();
		
	var idToken = AnyBalance.getData(prefs.login + 'idToken');
	
	var html = AnyBalance.requestGet(baseurl + 'msa/api-gw/private/loya/loya-web/bonus/state', addHeaders({
		'Accept': 'application/json, text/plain, */*',
		'Authorization': 'Bearer ' + idToken,
	    'X-Referrer': baseurl
	}));
	
	AnyBalance.trace('Кешбэк: ' + html);
	
	var json = getJson(html);
	
	if(json.balance){
	    getParam(json.balance.amountMultibonus, result, 'bonuses', null, null, parseBalance);
		getParam(json.balance.currentMonthRub, result, 'cashback', null, null, parseBalance);
	}
	
	var html = AnyBalance.requestGet(baseurl + 'msa/api-gw/private/loya/loya-web/bonus/categories', addHeaders({
		'Accept': 'application/json, text/plain, */*',
		'Authorization': 'Bearer ' + idToken,
	    'X-Referrer': baseurl
	}));
	
	AnyBalance.trace('Категории месяца: ' + html);
	
	var json = getJson(html);
	
	if(json.categories && json.categories.length > 0){
		AnyBalance.trace('Найдено категорий: ' + json.categories.length);
		for(var i=0; i<json.categories.length; ++i){
	        var category = json.categories[i];
			
			sumParam(category.displayName + ': ' + (category.percent / 100) + '%', result, 'cashback_category', null, null, null, create_aggregate_join(',<br> '));
		}
	}else{
		AnyBalance.trace('Не удалось найти информацию по категориям месяца');
		result.cashback_category = 'Не выбраны';
	}
}

function getTransactions(result){
	var prefs = AnyBalance.getPreferences();
		
	var idToken = AnyBalance.getData(prefs.login + 'idToken');
	
	var dt = new Date();
	var dtPrev = new Date(dt.getFullYear(), dt.getMonth()-5, dt.getDate());
	var dateFrom = dtPrev.getFullYear() + '-' + n2(dtPrev.getMonth()+1) + '-' + '01' + 'T00:00:00';
	var dateTo = dt.getFullYear() + '-' + n2(dt.getMonth()+1) + '-' + n2(dt.getDate()) + 'T23:59:59';

    var html = AnyBalance.requestGet(baseurl + 'msa/api-gw/private/history-hub/history-hub-homer/v1/history/byUser?dateFrom=' + dateFrom + '&dateTo=' + dateTo, addHeaders({
		'Accept': 'application/json, text/plain, */*',
		'Authorization': 'Bearer ' + idToken,
	    'X-Referrer': baseurl
	}));
	
	AnyBalance.trace('Операции: ' + html);
	
	var json = getJson(html);
	
	if(json.operations && json.operations.length){
		AnyBalance.trace('Найдено операций: ' + json.operations.length);
		
		for(var i = 0; i < json.operations.length; i++) {
	    	var operation = json.operations[i];

			getParam(operation.operationDate.replace(/(\d{4})-(\d{2})-(\d{2})/, '$3.$2.$1'), result, 'lastoperdate', null, null, parseDate);
	        getParam(operation.operationAmount.sum, result, 'lastopersum', null, null, parseBalance);
	        getParam(operation.fullOperationName, result, 'lastopername');
			break;
	    }
	}else{
		AnyBalance.trace('Не удалось получить информацию о последней операции');
	}
}

function getRates(result) {
    var prefs = AnyBalance.getPreferences();
		
	var idToken = AnyBalance.getData(prefs.login + 'idToken');
	
	var html = AnyBalance.requestGet(baseurl + 'msa/api-gw/private/portfolio/portfolio-rates/currency_rates/vtbonlinemass', addHeaders({
		'Accept': 'application/json, text/plain, */*',
		'Authorization': 'Bearer ' + idToken,
	    'X-Referrer': baseurl
	}));
	
//	AnyBalance.trace('Курсы валют: ' + html);
	
	var json = getJson(html);
	
	if(json.categories && json.categories.length > 0){
		for(var i=0; i<json.categories.length; ++i){
			if(json.categories[i].category == 'vtbonlinemass'){
				var currencyPairs = json.categories[i].currencyPairs;
				break;
			}else{
				continue;
			}
		}
	}
	
	if(currencyPairs && currencyPairs.length > 0){
		AnyBalance.trace('Найдено валютных пар: ' + currencyPairs.length);
		
		for(var i = 0; i < currencyPairs.length; i++) {
	    	var currencyPair = currencyPairs[i];
			
			if(currencyPair.currencyBase.alphaCode == 'USD' && currencyPair.currencyQuote.alphaCode == 'RUB'){
				AnyBalance.trace('Валютная пара ' + currencyPair.currencyBase.alphaCode + '/' + currencyPair.currencyQuote.alphaCode + ': ' + JSON.stringify(currencyPair));
			    
				for(var j = 0; j < currencyPair.amountRanges.length; j++) { // Получаем только первые значения (от 0 до 100 уе)
					getParam(currencyPair.amountRanges[0].bid, result, 'usd_purch', null, null, parseBalance);
				    getParam(currencyPair.amountRanges[0].offer, result, 'usd_sell', null, null, parseBalance);
					
					break;
				}
			}else if(currencyPair.currencyBase.alphaCode === 'EUR' && currencyPair.currencyQuote.alphaCode == 'RUB'){
				AnyBalance.trace('Валютная пара ' + currencyPair.currencyBase.alphaCode + '/' + currencyPair.currencyQuote.alphaCode + ': ' + JSON.stringify(currencyPair));
				
				for(var j = 0; j < currencyPair.amountRanges.length; j++) { // Получаем только первые значения (от 0 до 100 уе)
					getParam(currencyPair.amountRanges[0].bid, result, 'eur_purch', null, null, parseBalance);
				    getParam(currencyPair.amountRanges[0].offer, result, 'eur_sell', null, null, parseBalance);
					
					break;
				}
			}else{
				continue;
			}
	    }
	}else{
		AnyBalance.trace('Не удалось получить информацию о курсах валют');
	}
}

function fetchCardNew(baseurl, html, json) {
    var prefs = AnyBalance.getPreferences();
	
	var result = {success: true};
    
	var json = json.cards;
	if(!json || JSON.stringify(json) === '{}')
		throw new AnyBalance.Error('У вас нет ни одной карты');
	
	var currCard;
	
	for(var key in json){
    	var product = json[key];
	    AnyBalance.trace(key + ': ' + JSON.stringify(product));
		AnyBalance.trace('Найдена карта ' + product.number + ' ("' + product.name + '")');
		if(!currCard && (!prefs.card || endsWith(product.number, prefs.card))){
	       	AnyBalance.trace('Выбрана карта ' + product.number + ' ("' + product.name + '")');
	       	currCard = product;
	    }
    }

	if(!currCard)
		throw new AnyBalance.Error('Не удалось найти карту с последними цифрами ' + prefs.card);
	
	
	getParam(currCard.name, result, 'cardname');
	if(currCard.number){
	    getParam(currCard.number.replace(/.*(\d{4})(\d{2})(\D+)(\d{4})$/i, '$1 $2** **** $4'), result, 'cardnum');
	    getParam(currCard.number.replace(/.*(\d{4})(\d{2})(\D+)(\d{4})$/i, '$1 $2** **** $4'), result, '__tariff');
	}
    getParam(currCard.amount.amount, result, 'balance', null, null, parseBalance);
    getParam(currCard.ownFunds.amount, result, 'own', null, null, parseBalance);
    getParam(g_currency[currCard.amount.currency]||currCard.amount.currency, result, ['currency', 'balance', 'gracepay', 'minpay', 'limit', 'own', 'blocked']);
    getParam(currCard.emosible, result, 'holder');
    if(currCard.expireDate)
	    getParam(currCard.expireDate.replace(/(\d{4})-(\d{2})-(\d{2})/, '$3.$2.$1'), result, 'till', null, null, parseDate);
    if(currCard.openDate)
	    getParam(currCard.openDate.replace(/(\d{4})-(\d{2})-(\d{2})/, '$3.$2.$1'), result, 'date_start', null, null, parseDate);
    getParam(currCard.paySystem, result, 'ps'); // Visa
	getParam(g_type[currCard.type]||currCard.type, result, 'type'); // Дебетовая карта, Кредитная карта
	if(currCard.totalLiability)
	    getParam(-(currCard.totalLiability), result, 'gracepay', null, null, parseBalance);
	if(currCard.creditLimit)
	    getParam(currCard.creditLimit, result, 'limit', null, null, parseBalance);
	if(currCard.minNextPaymentAmount)
	    getParam(-(currCard.minNextPaymentAmount), result, 'minpay', null, null, parseBalance);
	if(currCard.nextPaymentDate)
	    getParam(currCard.nextPaymentDate.replace(/(\d{4})-(\d{2})-(\d{2})/, '$3.$2.$1'), result, 'minpaytill', null, null, parseDate);
	if(currCard.pastDueTotal)
	    getParam(currCard.pastDueTotal, result, 'pastdue', null, null, parseBalance);
    if(currCard.interestRate)
	    getParam(currCard.interestRate, result, 'pct', null, null, parseBalance);
    getParam(g_statusCard[currCard.status]||currCard.status, result, 'status'); //ACTIVE, Изготовлена
	
	if(AnyBalance.isAvailable('bonuses', 'cashback', 'cashback_category'))
		fetchCashback(result);
	
	if(AnyBalance.isAvailable('fio', 'holder', 'phone'))
		getInfo(result);
	
	if(AnyBalance.isAvailable('lastoperdate', 'lastopersum', 'lastoperdesc'))
	    getTransactions(result);
	
	if(AnyBalance.isAvailable('usd_purch', 'usd_sell', 'eur_purch', 'eur_sell'))
		getRates(result);
	
    AnyBalance.setResult(result);
}

function fetchAccountNew(baseurl, html, json) {
    var prefs = AnyBalance.getPreferences();

    var result = {success: true};
    
	var accounts = json.accounts; // Обычные счета
	var agreements = json.investAgreements; // Инвестиционные соглашения
	var json = Object.assign(accounts, agreements); // Относим инвест. счета к обычным, чтобы не создавать отдельную категорию
	
	if(!json || JSON.stringify(json) === '{}')
		throw new AnyBalance.Error('У вас нет ни одного счета');
	
	var currAcc;
	
	for(var key in json){
    	var product = json[key];
	    AnyBalance.trace(key + ': ' + JSON.stringify(product));
		AnyBalance.trace('Найден счет ' + product.number + ' ("' + product.name + '")');
		if(!currAcc && (!prefs.card || endsWith(product.number, prefs.card))){
	       	AnyBalance.trace('Выбран счет ' + product.number + ' ("' + product.name + '")');
	       	currAcc = product;
	    }
    }

	if(!currAcc)
		throw new AnyBalance.Error('Не удалось найти счет с последними цифрами ' + prefs.card);
	
	getParam(currAcc.name, result, 'cardname');
	getParam(currAcc.number, result, 'cardnum');
	getParam(currAcc.number, result, '__tariff');
    getParam(currAcc.balance.amount, result, 'balance', null, null, parseBalance);
    getParam(g_currency[currAcc.balance.currency]||currAcc.balance.currency, result, ['currency', 'balance', 'gracepay', 'minpay', 'limit', 'own', 'blocked']);
    if(currAcc.expireDate)
        getParam(currAcc.expireDate.replace(/(\d{4})-(\d{2})-(\d{2})/, '$3.$2.$1'), result, 'till', null, null, parseDate);
    if(currAcc.openDate)
	    getParam(currAcc.openDate.replace(/(\d{4})-(\d{2})-(\d{2})/, '$3.$2.$1'), result, 'date_start', null, null, parseDate);
	getParam(g_type[currAcc.type]||currAcc.type, result, 'type'); // Мастер-счет, Инвест. соглашение
    getParam(g_statusAcc[currAcc.status]||currAcc.status, result, 'status'); //ACTIVE, Изготовлена
	
	if(AnyBalance.isAvailable('bonuses', 'cashback', 'cashback_category'))
		fetchCashback(result);
	
	if(AnyBalance.isAvailable('fio', 'holder', 'phone'))
		getInfo(result);
	
	if(AnyBalance.isAvailable('lastoperdate', 'lastopersum', 'lastoperdesc'))
	    getTransactions(result);
	
	if(AnyBalance.isAvailable('usd_purch', 'usd_sell', 'eur_purch', 'eur_sell'))
		getRates(result);
    
    AnyBalance.setResult(result);
}

function fetchDepositNew(baseurl, html, json) {
    var prefs = AnyBalance.getPreferences();

    var result = {success: true};
    
	var json = json.deposits;
	if(!json || JSON.stringify(json) === '{}')
		throw new AnyBalance.Error('У вас нет ни одного депозита');
	
	var currDep;
	
	for(var key in json){
    	var product = json[key];
	    AnyBalance.trace(key + ': ' + JSON.stringify(product));
		AnyBalance.trace('Найден депозит ' + product.number + ' ("' + product.name + '")');
		if(!currDep && (!prefs.card || endsWith(product.number, prefs.card))){
	       	AnyBalance.trace('Выбран депозит ' + product.number + ' ("' + product.name + '")');
	       	currDep = product;
	    }
    }

	if(!currDep)
		throw new AnyBalance.Error('Не удалось найти депозит с последними цифрами ' + prefs.card);
	
	
	getParam(currDep.name, result, 'cardname');
	getParam(currDep.number, result, 'cardnum');
	getParam(currDep.number, result, '__tariff');
    getParam(currDep.balance.amount, result, 'balance', null, null, parseBalance);
    getParam(g_currency[currDep.balance.currency]||currDep.balance.currency, result, ['currency', 'balance', 'gracepay', 'minpay', 'limit', 'own', 'blocked']);
    if(currDep.savingGoal){
		getParam(currDep.savingGoal.goalAmount, result, 'saving_sum', null, null, parseBalance);
	    getParam(currDep.savingGoal.endDate.replace(/(\d{4})-(\d{2})-(\d{2})/, '$3.$2.$1'), result, 'deposit_till', null, null, parseDate);
	}
	if(currDep.openDate)
        getParam(currDep.openDate.replace(/(\d{4})-(\d{2})-(\d{2})/, '$3.$2.$1'), result, 'date_start', null, null, parseDate);
	getParam(currDep.monthProfit, result, 'month_profit', null, null, parseBalance);
	getParam(g_type[currDep.type]||currDep.type, result, 'type'); // Накопительный счет
    getParam(currDep.rate, result, 'pct', null, null, parseBalance);
    getParam(g_statusAcc[currDep.status]||currDep.status, result, 'status');
	
	if(AnyBalance.isAvailable('bonuses', 'cashback', 'cashback_category'))
		fetchCashback(result);
	
	if(AnyBalance.isAvailable('fio', 'holder', 'phone'))
		getInfo(result);
	
	if(AnyBalance.isAvailable('lastoperdate', 'lastopersum', 'lastoperdesc'))
	    getTransactions(result);
	
	if(AnyBalance.isAvailable('usd_purch', 'usd_sell', 'eur_purch', 'eur_sell'))
		getRates(result);
    
    AnyBalance.setResult(result);
}

function fetchCreditNew(baseurl, html, json) {
	throw new AnyBalance.Error('Кредиты пока не поддерживаются. Обратитесь к автору провайдера для добавления продукта');
    var prefs = AnyBalance.getPreferences();

    var result = {success: true};
    
	var json = json.loans;
	if(!json || JSON.stringify(json) === '{}')
		throw new AnyBalance.Error('У вас нет ни одного кредита');
	
	var currCrd;
	
	for(var key in json){
    	var product = json[key];
	    AnyBalance.trace(key + ': ' + JSON.stringify(product));
		AnyBalance.trace('Найден кредит ' + product.number + ' ("' + product.name + '")');
		if(!currCrd && (!prefs.card || endsWith(product.number, prefs.card))){
	       	AnyBalance.trace('Выбран кредит ' + product.number + ' ("' + product.name + '")');
	       	currCrd = product;
	    }
    }

	if(!currCrd)
		throw new AnyBalance.Error('Не удалось найти кредит с последними цифрами ' + prefs.card);
	
	
	getParam(currCrd.name, result, 'cardname');
	getParam(currCrd.number, result, 'cardnum');
	getParam(currCrd.number, result, '__tariff');
    getParam(currCrd.balance.amount, result, 'balance', null, null, parseBalance);
	getParam(currCrd.creditLimit, result, 'limit', null, null, parseBalance);
    getParam(g_currency[currCrd.balance.currency]||currCrd.balance.currency, result, ['currency', 'balance', 'gracepay', 'minpay', 'limit']);
    if(currCrd.openDate)
	    getParam(currCrd.openDate.replace(/(\d{4})-(\d{2})-(\d{2})/, '$3.$2.$1'), result, 'date_start', null, null, parseDate);
	getParam(g_type[currCrd.type]||currCrd.type, result, 'type'); // Накопительный счет, Инвест. соглашение
	getParam(-(currCrd.minNextPaymentAmount), result, 'minpay', null, null, parseBalance);
	if(currCrd.nextPaymentDate)
	    getParam(currCrd.nextPaymentDate.replace(/(\d{4})-(\d{2})-(\d{2})/, '$3.$2.$1'), result, 'minpaytill', null, null, parseDate);
    getParam(currCrd.pastDueTotal, result, 'pastdue', null, null, parseBalance);
	getParam(currCrd.rate, result, 'pct', null, null, parseBalance);
    getParam(g_statusAcc[currCrd.status]||currCrd.status, result, 'status');
	
	if(AnyBalance.isAvailable('bonuses', 'cashback', 'cashback_category'))
		fetchCashback(result);
	
	if(AnyBalance.isAvailable('fio', 'holder', 'phone'))
		getInfo(result);
	
	if(AnyBalance.isAvailable('lastoperdate', 'lastopersum', 'lastoperdesc'))
	    getTransactions(result);
	
	if(AnyBalance.isAvailable('usd_purch', 'usd_sell', 'eur_purch', 'eur_sell'))
		getRates(result);
    
    AnyBalance.setResult(result);
}

function fetchAccountABS(baseurl) {
    var prefs = AnyBalance.getPreferences();

    var html = AnyBalance.requestGet(baseurl + 'Accounts/Accounts.aspx?_ra=4');
    if (prefs.card && !/^\d{4,20}$/.test(prefs.card))
        throw new AnyBalance.Error('Пожалуйста, введите не менее 4 последних цифр номера счета, по которому вы хотите получить информацию, или не вводите ничего, чтобы получить информацию по первому счету.');

    var table = getParam(html, null, null, /<table[^>]+class="[^"]*accounts[^>]*>([\s\S]*?)<\/table>/i);
    if (!table)
        throw new AnyBalance.Error('Не найдена таблица счетов. Сайт изменен?');
    //Сколько цифр осталось, чтобы дополнить до 20
    var accnum = prefs.card || '';
    var accprefix = accnum.length;
    accprefix = 20 - accprefix;
    var result = {success: true};

    var re = new RegExp('(<tr[^>]*(?:[\\s\\S](?!</tr))*' + (accprefix > 0 ? '\\d{' + accprefix + '}' : '') + accnum + '\\s*<[\\s\\S]*?</tr>)', 'i');
    var tr = getParam(html, null, null, re);
    if (!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.card ? 'счет с ID ' + prefs.card : 'ни одного счета'));

    getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'cardnum', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, ['currency', 'balance'], /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'cardname', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'fio', /<div[^>]+id="name"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}

function fetchCardWeb(baseurl) {
    var prefs = AnyBalance.getPreferences();
    var html = AnyBalance.requestGet(baseurl + 'Accounts/Accounts.aspx');
    var result = {success: true};

    var accounts = getParam(html, null, null, /<table[^>]+class="accounts[\s\S]*?<\/table>/i);
    if (!accounts) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не найдена таблица счетов и карт. Сайт изменен?');
    }

    // Сводка
    sumParam(accounts, result, 'all', /\d+(?:\s*[\dX]{4}){3}\s*<\/td>[\s\S]*?<\/tr>/ig, [/(\d+(?:\s*[\dX]{4}){3})\s*<\/td>([\s\S]*?)<\/tr>/i, '$1: $2', replaceTagsAndSpaces], html_entity_decode, function aggregate_join(values) {
        if (values.length == 0) return;
        var ret = values.join('\n');
        return ret.replace(/^(?:\s*,\s*)+|(?:\s*,\s*){2,}|(?:\s*,\s*)+$/g, '');
    });

    var card_tr = getParam(accounts, null, null, new RegExp('<tr[^>]*>(?:[\\s\\S](?!</tr))*?(?:XX\\s*){3}' + (prefs.card ? prefs.card : '\\d{4}') + '[\\s\\S]*?</tr>', 'i'));
    if (!card_tr)
        throw new AnyBalance.Error(prefs.card ? 'Не найдена карта с последними цифрами ' + prefs.card : 'Не найдено ни одной карты');

    getParam(html, result, 'fio', /<div[^>]+id="name"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(card_tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(card_tr, result, 'cardname', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(card_tr, result, 'cardnum', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(card_tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(card_tr, result, ['currency', 'balance', 'gracepay', 'minpay', 'limit', 'accbalance', 'own', 'blocked'], /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    if (AnyBalance.isAvailable('own_free', 'pct', 'accnum', 'limit', 'credit_till', 'minpaytill', 'minpay', 'gracetill', 'gracepay', 'accbalance', 'own', 'blocked')) {
        var accid = getParam(card_tr, null, null, /accountid=([\-0-9]+)/i);
        if (accid) {
            html = AnyBalance.requestGet(baseurl + 'Accounts/Account.aspx?accountid=' + accid + '&systemid=ssOpenway');
            getParam(html, result, 'accnum', /<span[^>]+id="[^"]*LabelCardAccountNumber"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
            getParam(html, result, 'pct', /<span[^>]+id="[^"]*LabelCardRate"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
            getParam(html, result, 'limit', /<span[^>]+id="[^"]*LabelCardCreditLimit"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
            getParam(html, result, 'credit_till', /<span[^>]+id="[^"]*LabelCardCreditLimitEndDate"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseDate);
            getParam(html, result, 'minpaytill', /<span[^>]+id="[^"]*LabelCardMonthlyPaymentDate"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseDate);
            getParam(html, result, 'gracetill', /<span[^>]+id="[^"]*LabelCardGracePeriodEndDate"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseDate);
            getParam(html, result, 'minpay', /<span[^>]+id="[^"]*LabelCardMinimumPayment"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
            getParam(html, result, 'gracepay', /<span[^>]+id="[^"]*LabelCardGracePeriodSum"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
            getParam(html, result, 'accbalance', /<span[^>]+id="[^"]*LabelCardRest"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);

            var own = getParam(html, null, null, /<span[^>]+id="[^"]*LabelCardOwnMoney"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
            var blocked = getParam(html, null, null, /<span[^>]+id="[^"]*LabelCardBlocked"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);

            getParam(own, result, 'own');
            getParam(blocked, result, 'blocked');

            if (isset(blocked) && isset(own)) {
                getParam(own - blocked, result, 'own_free');
            }
        } else {
            AnyBalance.trace('Не удалось найти идентификатор счета карты и получить по ней подробную информацию');
        }
    }
    AnyBalance.setResult(result);
}

function getViewState(html) {
    return getParam(html, null, null, /name="__VIEWSTATE".*?value="([^"]*)"/);
}

function getEventValidation(html) {
    return getParam(html, null, null, /name="__EVENTVALIDATION".*?value="([^"]*)"/);
}