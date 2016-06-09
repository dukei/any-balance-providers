/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
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
			proceedLk(prefs);
			break;
	}
}

function requestJson(url, data, headers) {
	var json = getJson(AnyBalance.requestPost(url, data, headers));
	
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

	var form = AB.getElement(html, /<form[^>]+MobileLoginForm[^>]*>/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удаётся найти форму входа! Сайт изменен?');
	}

	var action = getParam(form, null, null, /\baction="([^"]*)/i, replaceHtmlEntities);

	var params = AB.createFormParams(form, function(params, str, name, value) {
		if (name == 'login') {
			return prefs.login;
		} else if (name == 'password') {
			return prefs.password;
		}

		return value;
	});

	do{
		html = AnyBalance.requestPost(action, params, addHeaders({Referer: AnyBalance.getLastUrl()}));
		var form = getElement(html, /<form[^>]*(?:logincallback|oferta)[^>]*>/i);
	    
		if (!form) {
			var json = getParam(html, null, null, /<script[^>]*modelJson[^>]*>([\s\S]*?)<\/script>/i, replaceHtmlEntities, getJson);
			if (json && json.errorMessage)
				throw new AnyBalance.Error(json.errorMessage, null, /парол/i.test(json.errorMessage));
	    
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
		}
	    
		params = AB.createFormParams(form);
		action = getParam(form, null, null, /\baction="([^"]*)/i, replaceHtmlEntities);
		var url = joinUrl(AnyBalance.getLastUrl(), action);
		AnyBalance.trace('Posting form to ' + url);
		html = AnyBalance.requestPost(url, params, addHeaders({Referer: AnyBalance.getLastUrl()}));
	}while(/<form[^>]*logincallback/i.test(html));

	var token = getParam(html, null, null, /QA.Identity.setToken\('([^']*)/);
	if(!token){
		AnyBalance.trace(AnyBalance.getLastUrl() + ':\n' + html);
		throw new AnyBalance.Error('Не удалось получить токен авторизации. Сайт изменен?');
	}

	html = AnyBalance.requestGet('https://widgets.beeline.ru/api/Profile/Index', addHeaders({
		 OamAuthToken: token,
		 Referer: AnyBalance.getLastUrl()
	}));
	var json = getJson(html);
	
	var result = {success: true};

	var topay = json.BalanceWidget.SubscriptionFee - json.BalanceWidget.Balance;
	getParam(json.BalanceWidget.Balance, result, 'balance');
	getParam(json.BalanceWidget.DueDate, result, 'till', null, null, parseDateISO);
	getParam(topay > 0 ? topay : 0, result, 'topay');
	getParam(html, result, 'bonus', /Бонусы:[\s\S]*?<span[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(json.BalanceWidget.SubscriptionFee, result, 'abon');
	getParam(json.ContractStatusWidget.Ctn, result, 'bill');
	getParam(getStatus(json.ContractStatusWidget.Status), result, 'status');
	getParam(json.ContactDataWidget.AddressBlock, result, 'userName');

	sumParam(jspath1(json, '$.BundlePanel.BundleServiceWidget.Name'), result, '__tariff', null, null, null, aggregate_join);
	sumParam(jspath1(json, '$.FttbPanel.FttbPricePlanWidget.Name'), result, '__tariff', null, null, null, aggregate_join);

	var tvs = jspath(json, '$.TvPanel.IpTvPricePlanWidgets[*].Name');
	sumParam(tvs && tvs.join(', '), result, '__tariff', null, null, null, aggregate_join);
	
	AnyBalance.setResult(result);
}

function parseTrafficGb(str) {
	var val = getParam(str.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceTagsAndSpaces, parseBalance);
	return parseFloat((val / 1000).toFixed(2));
}