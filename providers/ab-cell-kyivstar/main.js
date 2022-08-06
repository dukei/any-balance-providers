/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main() {
	var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.login,
		'Введите номер вашего телефона для входа в Мой Киевстар (в формате +380ХХХХХХХХХ), например +380971234567');
	prefs.login = prefs.login.replace(/[^+\d]+/g, ''); //Удаляем всё, кроме + и цифр
//	AnyBalance.setOptions({
//		SSL_ENABLED_PROTOCOLS: ['TLSv1.2'], // https://my.kyivstar.ua очень смущается от присутствия TLSv1.1 и TLSv1.2
//		SSL_ENABLED_CIPHER_SUITES: ['TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384'],
//	});
        prefs.source='app';
	if(prefs.source != 'app'){
		if(prefs.source != 'new'){
			AnyBalance.trace('Попробуем получить данные из мобильного приложения');
			try{
				processMobileApi();
				return;
			}catch(e){
                        	AnyBalance.trace('Не получилось получить данные из мобильного приложения.');
                                AnyBalance.trace(e.message);
			}
		}
		AnyBalance.trace('Попробуем получить данные c сайта');
		AnyBalance.restoreCookies();
		var html = goToNewSite();
		checkEmpty(prefs.password, 'Введите пароль!');
		try {
			if(isLoggedInNew(html)) {
				AnyBalance.trace('Уже залогинены. Парсим сайт');
				processNewInner(html);
			}else{	
				AnyBalance.trace('Нужно логинится');
				processSite();
			}
		} catch (e) {
			if (/В числе прикрепленных номеров в кабинете/.test(e.message)){
				AnyBalance.trace('logout и очистка Cookies.');
				AnyBalance.requestGet(baseurlNewCabinet + 'logout', {Referer: baseurlNewCabinet});
				clearAllCookies();
                                AnyBalance.trace('Вторая попытка.');
                                try{
                                	processSite();
                                } catch (e) {
                                	throw new AnyBalance.Error('Не удалось получить данные после повторного логина: ' + e.message);
                                }

			}else{
				throw new AnyBalance.Error('Не удалось получить данные из лк: ' + e.message,e.retry,e.fatal);
			}
		}
	}else{
		processMobileApi();
	}
}

var baseurlLogin = "https://b2b.kyivstar.ua/";

function loginSitePhys(){
	let baseurl = baseurlLogin;
	let html = loginSite(baseurl);

	/**
	if (!/payment\/activity\//i.test(html)) {
		//Не нашли ссылку на платежи. Очень вероятно, что это корпоративный аккаунт
		throw new AnyBalance.Error("Похоже, у вас корпоративный аккаунт. Пожалуйста, воспользуйтесь провайдером Киевстар для корпоративных тарифов");
	}
	*/

	if (/HierarchyOverview/i.test(html)) {
		throw new AnyBalance.Error(
			"Ошибка. Информация о номере не найдена. Если у вас корпоративный аккаунт, воспользуйтесь провайдером Киевстар для корпоративных тарифов."
		);
	}

	return html;
}

function processSite() {
//	var prefs = AnyBalance.getPreferences();

	var html = loginSitePhys();

//	if(prefs.source == 'auto'){
//		if(isLoggedInNew(html) || isNewDemo(html)){
			processNew(html);
//		}else{
//			processOldNew(html);
//		}
//	}else if(prefs.source == 'new'){
//		processNew(html);
//	}else{
//		processOldNew(html);
//	}
}

//function processOldNew(html){
//	try{
//		processOld(html);
//	}catch(e){
//		AnyBalance.trace('Ошибка обработки старого кабинета: ' + e.message + '\n' + e.stack);
//		processNew();
//	}
//}

var baseurlNewCabinet = 'https://new.kyivstar.ua/ecare/';

function processNew(html){
	try{
		processNewInner(html);
	}catch(e){
		if(e._relogin){
			AnyBalance.trace('Ошибка: ' + e.message + '\nПробуем перелогиниться');
			AnyBalance.requestGet(baseurlNewCabinet + 'logout', {Referer: baseurlNewCabinet});

			html = loginSitePhys();
			processNewInner(html);
		}else{
			throw e;
		}
	}
}

function processNewInner(html){
	var baseurl = baseurlNewCabinet;
	AnyBalance.trace('Используем новый кабинет');

	html = goToNewSite(html);
	var prefs = AnyBalance.getPreferences();

	var result = {success: true};

	var pageData = getJsonObject(html, /var\s+pageData\s*=\s*/);
	//AnyBalance.trace ('dataLayer:'+JSON.stringify(pageData.pageData.dataLayer));
	//AnyBalance.trace ('pageData:'+JSON.stringify(pageData));

	var phone = jspath1(pageData, "$.pageData.currentSubscription.subscriptionIdentifier");
	if(!endsWith(prefs.login, phone) && !endsWith(phone, prefs.login)){
		AnyBalance.trace('Залогинены не на тот номер, нужен ' + prefs.login + ', попали на ' + phone + '. Попробуем переключиться');

		var availableSubscriptions = jspath1(pageData, "$.slots.UserInformation[?(@.template='profileAndSubscriptionSelectorComponent')].data.profileAndSubscriptions.availableSubscriptions");
		if(!availableSubscriptions)
			throw new AnyBalance.Error('Вошли в кабинет на номер ' + phone + ' и не удалось переключиться на номер ' + prefs.login, {_relogin: true});
		var subscription = availableSubscriptions.filter(function(s) { return endsWith(prefs.login, s.id) || endsWith(s.id, prefs.login)})[0];
		if(!subscription){
			AnyBalance.trace('В кабинете не нашлось номера ' + prefs.login + ' среди ' + availableSubscriptions.map(function(s) { return s.id }).join(', '));
			throw new AnyBalance.Error('В числе прикрепленных номеров в кабинете ' + phone + ' отсутствует ' + prefs.login, {_relogin: true},true); 
		}

		html = AnyBalance.requestPost(baseurl + 'changeSelectedSubscription', {
			subscriptionId: subscription.id,
			targetUrl: '/',
			CSRFToken: jspath1(pageData, "$.slots.UserInformation[?(@.template='profileAndSubscriptionSelectorComponent')].data.profileAndSubscriptions.availableSubscriptions[?(@.id="+subscription.id+")].form.inputs.CSRFToken.value")
		}, addHeaders({Referer: baseurl}));

		if(AnyBalance.getLastStatusCode() >= 400) {
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось переключиться на нужный номер', {_relogin: true});
		}
		html = goToNewSite(html);

		pageData = getJsonObject(html, /var\s+pageData\s*=\s*/);
	}

	get_param(jspath1(pageData, "$.pageData.currentSubscription.subscriptionIdentifier"), result, 'phone');

	get_param(jspath1(pageData, "$.slots.TopContent[?(@.template='balancePanelComponent')].data.accountData.balance"), result, 'balance', null, null, parseBalance);
	get_param(jspath1(pageData, "$.slots.TopContent[?(@.template='balancePanelComponent')].data.accountData.deactivationLimit"), result, 'limit', null, null, parseBalance);
	if (prefs.disconnectLimit&&result.limit) result.balance+=Math.abs(result.limit);
	get_param(jspath1(pageData, "$.slots.TopContent[?(@.template='balancePanelComponent')].data.currencyName"), result, ['currency', 'balance']);
	get_param(jspath1(pageData, "$.slots.TopContent[?(@.template='balancePanelComponent')].data.accountData.accountNumber"), result, 'personal_account');

	get_param(jspath1(pageData, "$.slots.TopContent[?(@.template='planPanelComponent')].data.servicePlan"), result, '__tariff');
	get_param(jspath1(pageData, "$.slots.TopContent[?(@.template='planPanelComponent')].data.subscriptionStatus"), result, 'status');
	get_param(jspath1(pageData, "$.slots.TopContent[?(@.template='planPanelComponent')].data.validityPeriod"), result, 'till', null, null, parseDate);

	get_param(jspath1(pageData, "$.slots.TopContent[?(@.template='balancePanelComponent')].data.currentSubscription.bonusBalance"), result, 'bonusValue', null, null, parseBalance);

	var bonuses = jspath1(pageData, "$.slots.TopContent[?(@.template='balancePanelComponent')].data.bonusBalance.bonusBalances");
	//AnyBalance.trace ('bonuses:'+JSON.stringify(bonuses));
	processBonusesNew(bonuses, result);

	var rows = jspath1(pageData, "$.slots.MiddleContent[?(@.template='dailyStatusComponent')].data.dailyStatusRows");
	//AnyBalance.trace ('MiddleContent rows:'+JSON.stringify(rows));
	if(rows) processRemaindersNew(rows, result);
	
	rows = jspath1(pageData, "$.slots.TopContent-Right[?(@.template='dailyStatusComponent')].data.dailyStatusRows");
	//AnyBalance.trace ('TopContent-Right rows:'+JSON.stringify(rows));
	if(rows) processRemaindersNew(rows, result);

	if(AnyBalance.isAvailable('phone') && !isset(result.phone)){
			sumParam(jspath1(pageData, "$.pageData.currentSubscription.subscriptionIdentifier"), result, 'phone');
	}
	if(AnyBalance.isAvailable('name') && !isset(result.name)){
			sumParam(jspath1(pageData, "$.pageData.currentSubscription.name"), result, 'name');
	}


//	if(AnyBalance.isAvailable('name') || (AnyBalance.isAvailable('phone') && !isset(result.phone))){
//		html = AnyBalance.requestGet(baseurl + 'profileSettings', g_headers);
//		pageData = getJsonObject(html, /var\s+pageData\s*=\s*/);
	
//	    var joinspace = create_aggregate_join(' ');

//		sumParam(jspath1(pageData, "$.pageData.profileData.currentCustomer.firstName.value"), result, 'name', null, null, null, joinspace);
//		sumParam(jspath1(pageData, "$.pageData.profileData.currentCustomer.middleName.value"), result, 'name', null, null, null, joinspace);
//		sumParam(jspath1(pageData, "$.pageData.profileData.currentCustomer.lastName.value"), result, 'name', null, null, null, joinspace);

	AnyBalance.saveCookies();
        AnyBalance.saveData();
	AnyBalance.setResult(result);
}

function getBonusFromArray(arr, result, name, re, replaces, parseFunc){
	for(var i=0; i<arr.length; ++i){
		var units = arr[i].unit || '';
		if(!units.trim() && /internet|traffic/i.test(name))
			units = 'мб';
		sumParam(arr[i].value + units, result, name, re, replaces, parseFunc, aggregate_sum);
	}
}

function checkName(type, name){
	switch(type){
	case 'fix-min':
		return /на городские|на стационар|на стаціонар|на міські|fix phone|fix minutes/i.test(name)
	case 'off-net':
		return /другие сети.+(?:фикс|городск)|Other network.+fix|інші мережі.+міськ|Хвилини по Україні|Минуты по Украине/i.test(name)
	case 'off-net-mobile':
		return /Other mobile|off-net.+mobile|минут.+на другие сети|minut.+other.+networks|хвилин.+інші мережі|на інші мобільні|на другие мобильные/i.test(name)
			|| /минут.+на другие мобильные|minut.+other.+networks|хвилин.+інші мобільні/i.test(name)
			|| /Минуты на мобильные номера по Украине|Minutes to mobile numbers within Ukraine|Хвилини на мобільні номери по Україні/i.test(name)
	case 'internet':
		return /Остаток МБ|Balance MB|Залишок МБ/i.test(name) 
			|| /Интернет|Internet|Інтернет/i.test(name)
	case 'sms':
		return /сообщен|SMS|СМС|повідомлен/i.test(name)
	case 'mms':
		return /MMS|ММС/i.test(name)
	default:
		throw new AnyBalance.Error('Unknown check type!');
	}
}

function processBonusesNew(bonuses, result){
	if(!bonuses){
		AnyBalance.trace('Бонусов нет');
		return;
	}

	for(var i=0; i<bonuses.length; ++i){
		var bonus = bonuses[i];
		AnyBalance.trace('Найден бонус ' + JSON.stringify(bonus));
		if(/домашний интернет|Home Internet|Домашній Інтернет/i.test(bonus.name)){
			AnyBalance.trace('Это домашний интернет');
			get_param(bonus.balanceAmount[0].value, result, 'home_internet', null, null, parseBalance);
			get_param(bonus.bonusExpirationDate, result, 'home_internet_date', null, null, parseDate);
		}else if(checkName('internet', bonus.name)){
			AnyBalance.trace('Это бонусный интернет');
			getBonusFromArray(bonus.balanceAmount, result, 'bonus_internet', null, null, parseTraffic);
			get_param(bonus.bonusExpirationDate, result, 'bonus_internet_date', null, null, parseDate);
		}else if(checkName('off-net', bonus.name)){
			AnyBalance.trace('Это бонусные минуты по Украине');
			getBonusFromArray(bonus.balanceAmount, result, 'bonus_mins_2', null, null, parseMinutes);
			get_param(bonus.bonusExpirationDate, result, 'bonus_mins_2_till', null, null, parseDate);
		}else if(checkName('off-net-mobile', bonus.name)){
			AnyBalance.trace('Это бонусные минуты на другие сети');
			getBonusFromArray(bonus.balanceAmount, result, 'bonus_mins_other_mobile', null, null, parseMinutes);
			get_param(bonus.bonusExpirationDate, result, 'bonus_mins_other_mobile_till', null, null, parseDate);
		}else if(checkName('fix-min', bonus.name)){
			AnyBalance.trace('Это минуты на фикс. номера');
			getBonusFromArray(bonus.balanceAmount, result, 'mins_fix', null, null, parseMinutes);
			get_param(bonus.bonusExpirationDate, result, 'mins_fix_till', null, null, parseDate);
		}else if(checkName('sms', bonus.name)){
			AnyBalance.trace('Это SMS');
			getBonusFromArray(bonus.balanceAmount, result, 'sms', null, null, parseBalance);
		}else if(checkName('mms', bonus.name)){
			AnyBalance.trace('Это MMS');
			getBonusFromArray(bonus.balanceAmount, result, 'sms', null, null, parseBalance);
		}else if(/Экстра Деньги|Extra money|Екстра гроші/i.test(bonus.name)){
			AnyBalance.trace('Это бонусные деньги');
			get_param(bonus.balanceAmount[0].value, result, 'bonus_money', null, null, parseBalance);
			get_param(bonus.bonusExpirationDate, result, 'bonus_money_date', null, null, parseDate);
		}else{
			AnyBalance.trace('!!! Неизвестный бонус...');
		}
	}

}

function processRemaindersNew(bonuses, result){
	if(!bonuses){
		AnyBalance.trace('Остатков нет');
		return;
	}

	function getBonusLocal(avlbl, check, dn, counter, func){
		if(checkName(check, avlbl.categoryName) || checkName(check, bonus.usageTypeName)){
			if(AnyBalance.isAvailable(counter) && !isset(result[counter])){
				AnyBalance.trace(dn + ', но не учлись в бонусах! Учитываем.');
				func();
			}else{
				AnyBalance.trace(dn + ', должны были учесться в бонусах!');
			}
			return true;
		}
		return false;
	}

	for(var i=0; i<bonuses.length; ++i){
		var bonus = bonuses[i];
		AnyBalance.trace('Найден остаток ' + JSON.stringify(bonus));
		if(!bonus.availableAmountDetails || !bonus.availableAmountDetails.length){
			AnyBalance.trace('Не содержит текущего остатка, пропускаем...');
			continue;
		}
		var avlbl = bonus.availableAmountDetails[0];

		getBonusLocal(avlbl, 'off-net', 'минуты по Украине', 'bonus_mins_2', function(){
			getBonusFromArray(avlbl.balanceAmount, result, 'bonus_mins_2', null, null, parseMinutes);
			if (avlbl.balanceAmount[0]) get_param(avlbl.balanceAmount[0].period, result, 'bonus_mins_2_till', null, null, parseDate);
		}) ||
		getBonusLocal(avlbl, 'off-net-mobile', 'минуты на другие сети', 'bonus_mins_other_mobile', function(){
			getBonusFromArray(avlbl.balanceAmount, result, 'bonus_mins_other_mobile', null, null, parseMinutes);
			if (avlbl.balanceAmount[0]) get_param(avlbl.balanceAmount[0].period, result, 'bonus_mins_other_mobile_till', null, null, parseDate);
		}) ||
		getBonusLocal(avlbl, 'fix-min', 'минуты на фикс. номера', 'mins_fix', function(){
			getBonusFromArray(avlbl.balanceAmount, result, 'mins_fix', null, null, parseMinutes);
			if (avlbl.balanceAmount[0]) get_param(avlbl.balanceAmount[0].period, result, 'mins_fix_till', null, null, parseDate);
		}) ||
		getBonusLocal(avlbl, 'sms', 'SMS', 'sms', function(){
			getBonusFromArray(avlbl.balanceAmount, result, 'sms', null, null, parseBalance);
		}) ||
		getBonusLocal(avlbl, 'mms', 'MMS', 'mms', function(){
			getBonusFromArray(avlbl.balanceAmount, result, 'mms', null, null, parseBalance);
		}) ||
		getBonusLocal(avlbl, 'internet', 'Интернет', 'bonus_internet', function(){
			getBonusFromArray(avlbl.balanceAmount, result, 'bonus_internet', null, null, parseTraffic);
		}) ||
		
		AnyBalance.trace('!!! Неизвестный остаток...');
	}

}

function getMobileApiResult(json) {
	if (json.error)
		throw new AnyBalance.Error(json.error_description, null, /pass|auth|block|login|/i.test(json.error+json.error_description));
	if (json.type=='https://mk3.kyivstar.ua/problem/problem-with-message')
		throw new AnyBalance.Error(((json.title||'')+' '+(json.detail||'')+' '+(json.message||'')).trim(), null, true);
	return json;
}
function callMobileApi(cmd, params, prefs, i=1) {
	try{
	    let value=callMobileApimain(cmd, params, prefs);
	    return value;
	}catch(e){
	    if (i>3) throw new AnyBalance.Error(e.message);
	    i++;
            AnyBalance.trace('Ошибка получения '+cmd);
	    AnyBalance.trace(e.message);
	    AnyBalance.trace('Попытка '+ (i));
	    let value=callMobileApi(cmd, params, prefs, i);
            return value;
	}

}
function callMobileApimain(cmd, params, prefs) {
	var html, baseurl = 'https://mk3.kyivstar.ua/';
	var g_headers = {
	'Accept':'application/json',
	'Content-type':'application/json',
	'User-Agent':'okhttp/3.12.1',
	'Cache-control':'no-cache',
	'Accept-language':'ru',
	'Connection':'Keep-Alive',
//	'Accept-Encoding':'gzip',
	'App-release':'com.kyivstar.mykyivstar-3.71.0',
	'App_widget':'false',
	'Os_version':'8.1.0',
	'Os_name':'Android',
	'Force-refresh':'true',

	};

	if (params) { //Простой запрос
		html = AnyBalance.requestPost(baseurl + cmd, JSON.stringify(params), g_headers);
		var json = getJson(html);
		var value = getMobileApiResult(json);
		if (cmd == 'auth/login') {
			if (value.access_token){
				AnyBalance.setData('access_token'+prefs.login,value.access_token);
				AnyBalance.setData('refresh_token'+prefs.login,value.refresh_token);
				AnyBalance.saveCookies();
				AnyBalance.saveData();
			}else{
				throw new AnyBalance.Error('Не удалось получить токен авторизации в мобильное приложение');
			}
		}
		AnyBalance.trace(html);
		return value;
	} else { 
		html = AnyBalance.requestGet(baseurl + cmd, g_headers);
		AnyBalance.trace(html);
		var json = getJson(html);
		var value = getMobileApiResult(json);
		return value;
	}
}

function loginMobile1(prefs){
	if (!prefs.PUK2){
		var json=callMobileApi('uaa/api/login/init/'+prefs.login)
		var password=AnyBalance.retrieveCode('Пожалуйста, введите код, отправленный вам по SMS на номер ' + json.msisdn, null, {inputType: 'number',minLength:4,maxLength:4, time: 180000});
                var grant_type= 'otp_token';
	}else{
		var password=prefs.PUK2.toString();
                var grant_type= 'puk2_token';
	}
        callMobileApi('auth/login',{
		"username": prefs.login,
		"password": password,
		"rememberMe": "true",
		"grant_type": grant_type
	},prefs)
}
function processMobileApi() {
	AnyBalance.setDefaultCharset('utf-8');
	AnyBalance.setOptions({forceCharset:'utf-8'});
	var prefs = AnyBalance.getPreferences();
	prefs.login = '380'+prefs.login.replace(/[^\d]+/g, '').substr(-9); //Удаляем всё, кроме цифр 
	var phone=prefs.phone||prefs.login;
	phone = '380'+phone.replace(/[^\d]+/g, '').substr(-9); //Удаляем всё, кроме цифр
	var token=AnyBalance.getData('access_token'+prefs.login);
	if (token){
		AnyBalance.trace('Найден старый токен. Проверяем');
		clearAllCookies();
		AnyBalance.setCookie('.kyivstar.ua','access_token',token,{path: '/',secure: true});
		AnyBalance.setCookie('.kyivstar.ua','refresh_token',AnyBalance.getData('refresh_token'+prefs.login),{path: '/',secure: true});
		try{
			var json=callMobileApi('subscriptions/api/subscriptions/',null,3);
                        AnyBalance.trace('Старый токен в порядке. продолжаем.');
		}catch(e){
			token='';
			AnyBalance.trace('токен устарел. Нужно логинится');
		}
	}
	var result = {
		success: true
	};
    if (!token){
    	loginMobile1(prefs);	
            var json=callMobileApi('subscriptions/api/subscriptions/');
            
    }
    if (!getValById(json.subscriptions,phone)) throw new AnyBalance.Error ('В акаунте '+prefs.login+' не найден телефон '+phone,false,true);
	AnyBalance.trace('Получаем данные из мобильного приложения');
	var json=callMobileApi('balance/api/balances/'+phone+'/actual')


	var balance=json.mainBalance;
	if (json.disconnectLimit && prefs.disconnectLimit) balance+=(-json.disconnectLimit);
	result.limit=json.disconnectLimit;
	result.balance=balance;
	result.bonusValue=json.bonusBalance;
	result.phone=json.id.replace(/^([\s\S]*?)(\d{2})(\d{3})(\d{2})(\d{2})$/,'+38 (0$2) $3-$4-$5');

    function valut(v) {
        valuts = {
            UAH: 'грн.',
            USD: '$',
            EUR: '€',
            RUB: 'р.'
        }
        return valuts[v] ? valuts[v] : v;
    }
    if (json.currency) result.currency=valut(json.currency.toUpperCase());
    var json=callMobileApi('subscriptions/api/subscriptions/'+phone+'/info');
	var user_number_info=getValById(json.components,'user_number_info').content;
    getValById(user_number_info,'user_pay_account',result,'personal_account');
    getValById(user_number_info,'user_full_name',result,'name')
    getValById(user_number_info,'user_number_activation_date',result,'connection_date', parseDateISO);
    getValById(user_number_info,'user_number_expiration_date',result,'till', parseDateISO);
    getValById(user_number_info,'user_number_status',result,'status');

	var json=callMobileApi('plan/api/subscriptions/'+phone); // Тарифный план
//	var json=callMobileApi('plan/api/products/price-options?subscriptionId='+phone); // Подробное описание тарифа

	result.__tariff=json.content.name;
	result.nextPaymentDay=json.price.nextPaymentDay?parseDateISO(json.price.nextPaymentDay):new Date()*1;
	result.nextPaymentSum=json.price.nextPaymentSum;
//	var costType={P4W:'4 недели',P1M:'месяц'};
	result.cost=json.price.charge&&(json.price.charge.amount+' грн. в '+json.price.charge.period);
//	if (!result.status) result.status=json.state+ ' - '+ json.regionality; // Видимо, устарело
    
	var json=callMobileApi('plan/api/subscriptions/'+phone+'/usages'); // Остатки
	processBonus(json, result);
	setCountersToNull(result);
	AnyBalance.setResult(result);
}
function getValById(json, find,result,counterName,parseFunc){
	var j=json.filter(item=>item.id === find);
	if (j.length&&!result) return j[0];
	if (j.length&&result) {
		AnyBalance.trace(counterName+' ('+j[0].title+') = '+j[0].value);
		if (parseFunc) result[counterName]=parseFunc(j[0].value); else result[counterName]=j[0].value;
		return;
	}
	
}

function getDateValue(bonus){
	if(/\d\d\D\d\d\D\d{4}/.test(bonus[2]))
		return bonus[2];
}

function getUnitsValue(bonus){
	if(/\d\d\D\d\d\D\d{4}/.test(bonus[2]))
		return bonus[3];
	return bonus[2];
}

function processBonus(bonuses, result) {
	for(var i=0; i<bonuses.length; ++i){
		var bonus = bonuses[i];
		AnyBalance.trace('Найден остаток ' + JSON.stringify(bonus));
		if(/домашний интернет|Home Internet|Домашній Інтернет/i.test(bonus.name)){
			AnyBalance.trace('Это домашний интернет');
			get_param(bonus.volume&&bonus.volume.leftover, result, 'home_internet', null, null, parseBalance);
			get_param(bonus.volume&&bonus.volume.validity, result, 'home_internet_date', null, null, parseDateISO);
		}else if(/Экстра Деньги|Extra money|Екстра гроші/i.test(bonus.name)){
			AnyBalance.trace('Это екстра деньги');
			get_param(bonus.volume&&bonus.volume.leftover, result, 'bonus_money', null, null, parseBalance);
		}else if(bonus.code=='internet'||bonus.code=='data'||bonus.code=='DATA_NATIONAL'){
			AnyBalance.trace('Это интернет');
			get_param(bonus.volume&&(bonus.volume.leftover+' '+bonus.volume.unit), result, 'bonus_internet', null, null, parseTraffic);
			get_param(bonus.volume&&bonus.volume.validity, result, 'bonus_internet_till', null, null, parseDateISO);
		}else if(bonus.code=='off-net'||bonus.code=='off_net_minutes'||bonus.code=='VOICE_OFFNET_FIXED_ISD_OLD'){
			AnyBalance.trace('Это минуты по Украине и заграницу');
			get_param(bonus.volume&&(bonus.volume.leftover+' '+bonus.volume.unit), result, 'bonus_mins_2', null, null, parseMinutes);
			get_param(bonus.volume&&bonus.volume.validity, result, 'bonus_mins_2_till', null, null, parseDateISO);
		}else if(bonus.code=='on-net'||bonus.code=='on_net_minutes'||bonus.code=='VOICE_ONNET'){
			AnyBalance.trace('Это минуты внутри сети Киевстар');
			get_param(bonus.volume&&(bonus.volume.leftover+' '+bonus.volume.unit), result, 'bonus_mins_1', null, null, parseMinutes);
			get_param(bonus.volume&&bonus.volume.validity, result, 'bonus_mins_1_till', null, null, parseDateISO);
		}else if(bonus.code=='off-net-mobile'||bonus.code=='VOICE_OMO'||bonus.code=='VOICE_ONNET_OMO'||(/VOICE/i.test(bonus.code)&&/OFFNET/i.test(bonus.code))){
			AnyBalance.trace('Это минуты на другие сети');
			get_param(bonus.volume&&(bonus.volume.leftover+' '+bonus.volume.unit), result, 'bonus_mins_other_mobile', null, null, parseMinutes);
			get_param(bonus.volume&&bonus.volume.validity, result, 'bonus_mins_other_mobile_till', null, null, parseDateISO);
		}else if(bonus.code=='fix-min'||(/VOICE/i.test(bonus.code)&&/FIXED/i.test(bonus.code))){
			AnyBalance.trace('Это минуты на фикс. номера');
			get_param(bonus.volume&&(bonus.volume.leftover+' '+bonus.volume.unit), result, 'mins_fix', null, null, parseMinutes);
			get_param(bonus.volume&&bonus.volume.validity, result, 'mins_fix_till', null, null, parseDateISO);
		}else if(/min|VOICE/i.test(bonus.code)){
			AnyBalance.trace('!!! Неизвестные минуты. Относим к минутам по Украине' );
			get_param(bonus.volume&&(bonus.volume.leftover+' '+bonus.volume.unit), result, 'bonus_mins_2', null, null, parseMinutes);
			get_param(bonus.volume&&bonus.volume.validity, result, 'bonus_mins_2_till', null, null, parseDateISO);
		}else if(/SMS/i.test(bonus.code)){
			AnyBalance.trace('Это SMS');
			get_param(bonus.volume&&bonus.volume.leftover, result, 'sms', null, null, parseBalance);
			get_param(bonus.volume&&bonus.volume.validity, result, 'sms_till', null, null, parseDateISO);
		}else if(/MMS/i.test(bonus.code)){
			AnyBalance.trace('Это MMS');
			get_param(bonus.volume&&bonus.volume.leftover, result, 'mms', null, null, parseBalance);
			get_param(bonus.volume&&bonus.volume.validity, result, 'mms_till', null, null, parseDateISO);
		}else{
			AnyBalance.trace('!!! Неизвестный остаток...');
		}
	}
}


/*
function getFullBonusText(html, result) {
	if (AnyBalance.isAvailable('mainBonusInfoText')) {
		try {
			var
				table = html.match(/<h2[^>]*>\s*(?:Бонусный\s+баланс|Бонусний\s+баланс|Bonuses)\s*<\/h2>[\s\S]*?(<tr[\s\S]*?)<\/table/i)[1],
				tr = AB.sumParam(table, null, null, /<tr[^>]*>([\s\S]*?)<\/tr>/gi),
				td = [],
				mainBonusInfoText = [];

			for (var i = 0; i < tr.length; i++) {
				td = AB.sumParam(tr[i], null, null, /<td[^>]*>([\s\S]*?)<\/td>/gi, replaceTagsAndSpaces);
				mainBonusInfoText.push(
					'Тип бонуса:«' + td[0] + '» Остаток:' + td[1] + ' Срок действия:' + td[2]
				);

			}

			AB.get_param(mainBonusInfoText.join(', '), result, 'mainBonusInfoText');

		} catch (e) {
			AnyBalance.trace('не удалось получить текстовую информацию по бонусам ' + e);
		}
	}
}
*/

function getYetAnotherInfo(html, baseurl, result) {
	if (AnyBalance.isAvailable('other_costs')) {
		// html = AnyBalance.requestGet(baseurl + 'tbmb/b2c/view/wireless_number_summary.do', g_headers);
		html = AnyBalance.requestGet(baseurl + 'tbmb/view/wireless_number_chrgs.do', g_headers);
		get_param(html, result, 'other_costs',
			/Начисление\s+абонентской\s+платы\s+по\s+услуге\s+&#34;-33%&#34;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i,
			replaceTagsAndSpaces, parseBalance);
	}
}

    function get_param(html, result, param, regexp, replaces, parser) {
    	if (result instanceof RegExp || isArray(result)){
    		//Пропустили два параметра (result и param), остальные надо сдвинуть
    		parser = regexp;
    		replaces = param;
    		regexp = result;
    		result = param = null;
    	}
    		
        if (!isset(html)) {
            AnyBalance.trace('get_param: input ' + (param ? '(' + param + ')' : '') + ' is unset! ' + new Error().stack);
            return;
        }
        if(html === null && regexp){
            AnyBalance.trace('get_param: input ' + (param ? '(' + param + ')' : '') + ' is null! ' + new Error().stack);
            return;
        }
        var regexps = isArray(regexp) ? regexp : [regexp];
        for (var i = 0; i < regexps.length; ++i) { //Если массив регэкспов, то возвращаем первый заматченный
            regexp = regexps[i];
            var matches = regexp ? html.match(regexp) : [, html], value;
            if (matches) {
                //Если нет скобок, то значение - всё заматченное
                value = replaceAll(isset(matches[1]) ? matches[1] : matches[0], replaces);
                if (parser)
                    value = parser(value);
                if (param && isset(value))
                    result[__getParName(param)] = value;
                break;
            }
        }
        return value;
    }
    function __getParName(param) { //Возвращает для параметра имя после последней точки
        var name = isArray(param) ? param[0] : param;
        return name && name.substr(name.lastIndexOf('.') + 1); //Оставляем только хвост до точки
    }
