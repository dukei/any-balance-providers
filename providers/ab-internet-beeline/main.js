/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	switch (prefs.type) {
		case 'cab': 
			try{
				proceedCab(prefs);
				break;
			}catch(e){
				if(!/ни одного активного счета/i.test(e.message)){
					throw e;
				}
				AnyBalance.trace('Логин пароль подошел, а счет не найден. Наверное, это офис...');
				//breakthrough;
			}
		case 'office':
			proceedOffice(prefs);
			break;
		default:
		    var ret = proceedLk(prefs);
		    if(ret === 'restart'){
		    	clearAllCookies();
		    	proceedLk(prefs);
		    }
			break;
	}
}

function requestJson(url, data, headers) {
	var json = getJson(removeBOM(AnyBalance.requestPost(url, data, headers)));
	
	if(!json.success) {
		AnyBalance.trace(JSON.stringify(json));
		throw new AnyBalance.Error('Возникла ошибка при выполнении запроса: ' + json.error, null, /парол/i.test(json.error));
	}
	
	return json;
}

function proceedOffice(prefs) {

	var baseurl = 'https://cabinet.beeline.ru/';
	AnyBalance.setDefaultCharset('windows-1251');

	var html = AnyBalance.requestGet(baseurl + 'myoffice/', g_headers);

	if (!/logout/i.test(html)) {
		var enter = getParam(html, null, null, /<input[^>]+__SAVE[^>]+value=['"]([^'"]*)/i, replaceTagsAndSpaces);
	    
		html = AnyBalance.requestPost(baseurl + 'myoffice/', {
			login: prefs.login,
			passwd: prefs.password,
			__SAVE: enter
		}, { Referer: baseurl + 'myoffice/' });
	}

	if (!/logout/i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти на сайт. Проверьте логин пароль и правильность выбора личного кабинета.');
	}

	var result = { success: true };

	getParam(html, result, '__tariff', /Тариф(?:[^<]*<[^>]+>){3}([^<]+)/i, replaceTagsAndSpaces);
	getParam(html, result, 'bill', /<b>Лицевой счет(?:[^<]*<[^>]+>){3}([^<]+)/i, replaceTagsAndSpaces);
	getParam(html, result, 'balance', /Текущее состояние лицевого счёта(?:[^<]*<[^>]+>){3}([^<]+)/i, replaceTagsAndSpaces, parseBalance);

	if (AnyBalance.isAvailable('status')) {
		html = AnyBalance.requestGet(baseurl + 'myoffice/?section=num_info', g_headers);
		getParam(html, result, 'status', /Статус(?:[^<]*<[^>]+>){2}([^<]+)/i, replaceTagsAndSpaces);
	}

	AnyBalance.setResult(result);
}

function proceedCab(prefs) {
	var baseurl = 'https://cabinet.beeline.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	var html = AnyBalance.requestGet(baseurl + 'lk/', g_headers);
	
	var json = requestJson(baseurl + 'lk/ajax.php', {
		module:'bee_lk.auth',
		action:'login',
		v_login: prefs.login,
		v_password: prefs.password,
	}, addHeaders({ Referer: baseurl + 'lk/', 'X-Requested-With': 'XMLHttpRequest'}));
	
	var result = {success: true};

	var current;
	for(var i = 0; i < json.client.net.nums.length; i++) {
		current = json.client.net.nums[i];
		
		var state = current['v_nmstatus'];
		if(/Активeн/i.test(state)) {
			AnyBalance.trace('Нашли активный счет: ' + current['v_nmbillgroup']);
			break;
		} else {
			AnyBalance.trace('Cчет: ' + current['v_nmbillgroup'] + ' не активен');
		}
	}
	// Телефон
	var current_phone;
	for(var i = 0; i < json.client.phone.nums.length; i++) {
		var current_phone = json.client.phone.nums[i];
		
		var state = current_phone['v_nmstatus'];
		if(/Активeн/i.test(state)) {
			AnyBalance.trace('Нашли активный счет: ' + current_phone['v_nmbillgroup']);
			break;
		} else {
			AnyBalance.trace('Cчет: ' + current_phone['v_nmbillgroup'] + ' не активен');
		}
	}
	
	if(!current && !current_phone)
		throw new AnyBalance.Error('Не удалось найти ни одного активного счета, сайт изменен?');
	
	if(current) {
		getParam(current['v_saldo'], result, 'balance', null, replaceTagsAndSpaces, parseBalance);
		getParam(current['v_nmbplan'], result, '__tariff', null, replaceTagsAndSpaces);
		sumParam(current['v_nmbillgroup'], result, 'bill', null, replaceTagsAndSpaces, null, aggregate_join);
	}
	
	if(current_phone) {
		getParam(current_phone['v_saldo'], result, 'balance_phone', null, replaceTagsAndSpaces, parseBalance);
		sumParam('ТФ:' + current_phone['v_nmbillgroup'], result, 'bill', null, replaceTagsAndSpaces, null, aggregate_join);
	}
	
	AnyBalance.setResult(result);
}

function removeBOM(res){
	if (res.charCodeAt(0) === 0xFEFF) {
		res = res.substr(1);
	}
	return res;
}

function getStatus(status){
	switch(status){
		case 0: 
			return 'Активен';
		default:
			return status;
	}
}

function proceedLk(prefs) {
	AnyBalance.setDefaultCharset('utf-8');
	var baseurl = "https://www.beeline.ru/login/";

	var html = AnyBalance.requestGet(baseurl, g_headers); //Чтобы кука установилась
	baseurl = getParam(AnyBalance.getLastUrl(), /^https?:\/\/[^\/]+/i) + '/';
	AnyBalance.trace('Main page redirected to ' + AnyBalance.getLastUrl());
	AnyBalance.setCookie('.beeline.ru', 'SITE_VERSION', 'is_full_selected');
//	AnyBalance.setCookie('moskva.beeline.ru', 'tmr_detect', '0%7C1525419789821');

	var loginfo = AnyBalance.requestGet(baseurl + 'menu/loginmodel/?CTN=' + encodeURIComponent(prefs.login), addHeaders({
		Referer: baseurl
	}));
	loginfo = getJson(removeBOM(loginfo));

	html = AnyBalance.requestPost('https://identity.beeline.ru/identity/fpcc', createUrlEncodedParams({
		login:	prefs.login,
		password:	prefs.password,
		client_id:	'quantumartapp',
		redirect_uri:	'https://www.beeline.ru/logincallback',
		response_type:	'id_token',
		response_mode:	'form_post',
		state:	loginfo.state,
		scope:	'openid selfservice_identity usss_token profile',
		nonce:	loginfo.nonce,
		remember_me:	true
	}).replace(/%20/g, '+'), addHeaders({Referer: baseurl + 'login/', 'Content-Type': 'application/x-www-form-urlencoded'}));

	var referer = AnyBalance.getLastUrl();

	var htmlfa = AnyBalance.requestGet('https://identity.beeline.ru/identity/FinishAuth?state=' + encodeURIComponent(loginfo.state), addHeaders({
		Referer: referer
	}));
	
	do{
		var form = getElement(html, /<form[^>]*(?:logincallback|oferta)[^>]*>/i);
	    
		if (!form) {
			var json = getParam(html, null, null, /<script[^>]*modelJson[^>]*>([\s\S]*?)<\/script>/i, replaceHtmlEntities, getJson);
			if (json && json.errorMessage)
				throw new AnyBalance.Error(json.errorMessage, null, /парол/i.test(json.errorMessage));
	    
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
		}
	    
		var params = AB.createFormParams(form);
		delete params.need_set_sso_cookie;

		var action = getParam(form, /\baction="([^"]*)/i, replaceHtmlEntities);
		var url = joinUrl(referer, action);

		var region = AnyBalance.getData('region');
		if(!region || region.login != prefs.login)
			region = null;

		if(region){
			AnyBalance.trace('Надо отправить форму на ' + url + ', но из-за проблем с 307 отправляем на https://' + region.domain + "/regionlogincallback/");
			url = "https://" + region.domain + "/regionlogincallback/";
		}else{
			AnyBalance.trace("Регион неизвестен, отправляем форму на " + url);
		}
        
		html = AnyBalance.requestPost(url, createUrlEncodedParams(params).replace(/%20/g, '+'), addHeaders({
			Referer: 'https://identity.beeline.ru/',
			'Content-Type': 'application/x-www-form-urlencoded',
			Origin: 'https://identity.beeline.ru',
			'Cache-Control': 'max-age=0',
			'Upgrade-Insecure-Requests': '1'
		}));
		referer = AnyBalance.getLastUrl();

		if(!region && /login/i.test(referer)){
			region = getParam(referer, /https?:\/\/([^\/]+)/i);
			AnyBalance.trace("Регион определен: " + region + ". Перезапускаем...");
			AnyBalance.setData('region', { domain: region, login: prefs.login });
			AnyBalance.saveData();
			return "restart";  
		}
	}while(/<form[^>]*logincallback/i.test(html));
	
//	var token = getParam(html, null, null, /QA.Identity.setToken\('([^']*)/);
//	if(!token){
//		AnyBalance.trace(AnyBalance.getLastUrl() + ':\n' + html);
//		throw new AnyBalance.Error('Не удалось получить токен авторизации. Сайт изменен?');
//	}

//	html = AnyBalance.requestGet('https://widgets.beeline.ru/api/Profile/Index', addHeaders({
//		 OamAuthToken: token,
//		 Referer: AnyBalance.getLastUrl()
//	}));

    if(!/"fttbNumber"/i.test(html)){
		AnyBalance.trace(AnyBalance.getLastUrl() + ':\n' + html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(prefs.login, result, 'bill', /(\d{10})/g, [/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3']);

    html = AnyBalance.requestGet('https://' + region.domain + '/api/uni-profile-balances/', addHeaders({ // Балансы
		Referer: AnyBalance.getLastUrl()
	}));
	var json = getJson(removeBOM(html));
	AnyBalance.trace('Балансы: ' + JSON.stringify(json));
	
	if(json && json.length>0){
	    for(var i=0; i<json.length; ++i){
	    	var bal = json[i];
	    	AnyBalance.trace('Найден баланс ' + bal.balanceType);
	    	if(bal.balanceType === 'Personal'){
	    		var balance = getParam(round(bal.sum), result, 'balance');
	    	}
	    }
	}else{
		AnyBalance.trace('Не удалось получить балансы');
	}
	
	html = AnyBalance.requestGet('https://' + region.domain + '/api/profile/home/preset/', addHeaders({ // Тариф
		Referer: AnyBalance.getLastUrl(),
		'X-Requested-With': 'XMLHttpRequest'
	}));
	
	var tarif = AnyBalance.getData('tarif');
	if(!tarif || tarif.login != prefs.login)
		tarif = null;
	
	if(AnyBalance.getLastStatusCode() >= 500){
		if(tarif){
		    AnyBalance.trace('Нет ответа (' + AnyBalance.getLastStatusCode() + '). Восстанавливаем значения тарифа');
		    result.__tariff = tarif.name;
			result.internet_speed = tarif.speed;
			result.internet_devices = tarif.intDevices;
			result.tv_channels = tarif.channels;
			result.tv_devices = tarif.tvDevices;
		}else{
			AnyBalance.trace('Нет ответа (' + AnyBalance.getLastStatusCode() + '). Пропускаем получение тарифа');
		}
	}else{
	    var json = getJson(removeBOM(html));
	    AnyBalance.trace('Тариф: ' + JSON.stringify(json));

	    var tariff = getParam(json.view.internet.name, result, '__tariff');
		var intSpeed = getParam(json.view.internet.speed, result, 'internet_speed');
		var intDevCount = getParam(json.view.routers.length, result, 'internet_devices');
	
	    if(json.view.tv.name){
	        var tvt = json.view.tv.name;
	        if(tvt)
	    		tariff += ' | ' + tvt;
			var tvChCount = getParam(json.view.tv.channelsCount, result, 'tv_channels');
			var tvDevCount = getParam(json.view.tv.deviceCount, result, 'tv_devices');
	    }else{
	    	AnyBalance.trace('Не удалось получить данные по ТВ. Похоже, услуга не подключена');
			var tvChCount = 0;
			var tvDevCount = 0;
	    }
	
	    tarif = getParam(tariff, result, '__tariff');
        AnyBalance.trace("Тарифные опции получены. Сохраняем...");
		AnyBalance.setData('tarif', { name: tarif, speed: intSpeed, intDevices: intDevCount, channels: tvChCount, tvDevices: tvDevCount, login: prefs.login });
		AnyBalance.saveData();
	}
	
	html = AnyBalance.requestGet('https://' + region.domain + '/api/texts/elk-mobile-connection/', addHeaders({ // Статус
		 Referer: AnyBalance.getLastUrl()
	}));
	var json = getJson(removeBOM(html));
	AnyBalance.trace('Статус: ' + JSON.stringify(json));
	
	getParam(json.isActive, result, 'status', null, null, capitalFirstLetters);
	
	html = AnyBalance.requestGet('https://' + region.domain + '/api/uni-profile-fttb/fee/', addHeaders({ // Абонплата
		 Referer: AnyBalance.getLastUrl()
	}));
	var json = getJson(removeBOM(html));
	
	if(!json.value){
		html = AnyBalance.requestGet('https://' + region.domain + '/api/uni-profile-mobile/tariff-fee/', addHeaders({ // Абонплата в рамках мобильной связи
		    Referer: AnyBalance.getLastUrl()
	    }));
	    var json = getJson(removeBOM(html));
		AnyBalance.trace('Абонплата списывается в рамках мобильной связи: \n' + JSON.stringify(json));
		
		var abon = getParam(round(json.rcRate), result, 'abon');
		if(json.billingDate)
		    getParam(json.billingDate.replace(/(\d{4})-(\d{2})-(\d{2})/, '$3.$2.$1'), result, 'till', null, null, parseDate);
	}else{
		AnyBalance.trace('Абонплата списывается в рамках тарифного плана: \n' + JSON.stringify(json));
		var abon = getParam(round(json.value), result, 'abon');
		var date = getParam(json.nextPayment, null, null, /Списание|Оплата\s?([^<]*)/i, replaceTagsAndSpaces);
	    var dt = new Date();
	    if (!/\d\d\d\d/i.test(date)) {
	    	var ndate = date + ' '  + dt.getFullYear();
	    	if (/янв/i.test(date) && dt.getMonth() != 0) {
	    		var ndate = date + ' '  + (dt.getFullYear() + 1);
	    	}
	    }else{
	    	var ndate = date;
	    }
	    getParam(ndate, result, 'till', null, null, parseDateWord);
	}
	
	var topay = round(abon - balance);
	getParam(topay > 0 ? topay : 0, result, 'topay');

//	var offset = -new Date().getTimezoneOffset()/60;
//	offset = (offset > 0 ? '+' : '-') + n2(Math.abs(offset)) + ':00';

//	if(!json.BalanceWidget){
//		AnyBalance.trace(html);
//		throw new AnyBalance.Error('Пожалуйста, введите в качестве логина номер лицевого счета домашнего интернета Билайн, а не номер телефона!', null, true);
//	}

//	function round(val){
//		if(val)
//			return Math.round(val*100)/100;
//		return val;
//	}

//	var topay = round(json.BalanceWidget.SubscriptionFee - json.BalanceWidget.Balance);
//	getParam(round(json.BalanceWidget.Balance), result, 'balance');
//	getParam(json.BalanceWidget.DueDate + offset, result, 'till', null, null, parseDateISO); //Без временной зоны, заразы, показывают
//	getParam(topay > 0 ? topay : 0, result, 'topay');
//	getParam(html, result, 'bonus', /Бонусы:[\s\S]*?<span[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
//	getParam(json.BalanceWidget.SubscriptionFee, result, 'abon');
//	getParam(json.ContractStatusWidget.Ctn, result, 'bill', /(\d{10})/g, [/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3']);
//	getParam(getStatus(json.ContractStatusWidget.Status), result, 'status');
//	getParam(json.ContactDataWidget.AddressBlock, result, 'address'); //Теперь этот счётчик отображает адрес подключения, а не ФИО

//	sumParam(jspath1(json, '$.BundlePanel.BundleServiceWidget.Name'), result, '__tariff', null, null, null, aggregate_join);
//	sumParam(jspath1(json, '$.FttbPanel.FttbPricePlanWidget.Name'), result, '__tariff', null, null, null, aggregate_join);

//	var tvs = jspath(json, '$.TvPanel.IpTvPricePlanWidgets[*].Name');
//	sumParam(tvs && tvs.join(', '), result, '__tariff', null, null, null, aggregate_join);
	
	AnyBalance.setResult(result);
}

function round(val){
	if(val)
		return Math.round(val*100)/100;
	return val;
}

function parseTrafficGb(str) {
	var val = getParam(str.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceTagsAndSpaces, parseBalance);
	return parseFloat((val / 1000).toFixed(2));
}
