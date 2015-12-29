/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'Origin': 'https://i.bankuralsib.ru',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36',
};

var domain = 'i.bankuralsib.ru';
var baseurl = 'https://' + domain + '/';
var g_mainpageurl;

function login(prefs) {
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	AnyBalance.setOptions({
		DEFAULT_CHARSET: 'utf-8',
		cookiePolicy: 'netscape'
	});
	
	if(!g_mainpageurl){
		var html = AnyBalance.requestGet(baseurl, g_headers);
		html = handleBobcmn(AnyBalance.getLastUrl(), html);
		
        var authkey = getAuthKey(html);
		var rsa_N = getRsaN(html);
		var rsa_E = getRsaE(html);
		var password = prefs.password;
		var passwordMD5 = '';
		var p_instance = getP_instance(html);
		
        if (typeof(CryptoJS) != 'undefined' && authkey) {
        	passwordMD5 = CryptoJS.MD5(password).toString(CryptoJS.enc.Hex).substr(0, 30);
        	passwordMD5 = ':' + CryptoJS.MD5(authkey + ':' + passwordMD5).toString(CryptoJS.enc.Hex);
        }
        password = CryptoJS.SHA1(password).toString(CryptoJS.enc.Hex);
        password = CryptoJS.SHA1(authkey + ':' + password).toString(CryptoJS.enc.Hex);
		
        if (rsa_N && rsa_E && typeof(RSAKey) != undefined) {
        	var rsa = new RSAKey();
        	rsa.setPublic(rsa_N, rsa_E);
        	authkey = authkey + ':' + rsa.encrypt(password + passwordMD5).toLowerCase();
        	var l = password.length;
        	password = '';
        	for (var i = 0; i < l; i++)
				password += '*';
        }
		html = AnyBalance.requestPost(baseurl + 'wwv_flow.show', {
			p_request: 'APPLICATION_PROCESS=AUTHENTICATE',
			p_flow_id: getFlowID(html),
			p_flow_step_id: getFlowStepID(html),
			p_instance: p_instance,
			x01: 'AUTH#PASSWORD',
			x02: prefs.login,
			x03: password,
			x04: authkey,
			x05: 'N',
			x06: '4' // может понадобится переделать
		}, addHeaders({Referer: baseurl}));
		
        if (!/Авторизация успешна/i.test(html)) {
        	var error = sumParam(html, null, null, /"err"[^"]+"([^"]+)/ig, replaceTagsAndSpaces, null, aggregate_join);
        	if (error) 
				throw new AnyBalance.Error(error, null, /Неверный логин или пароль|неверно указано имя входа/i.test(error));
			
			if(/истёк срок действия пароля/i.test(html)) 
				throw new AnyBalance.Error('Истёк срок действия пароля. Смените пароль через браузер, а затем введите его в настройки провайдера.', null, true);
			
        	AnyBalance.trace(html);
        	throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
        }
		
		var loginVar = getParam(html, null, null, /afterLogin\(([^)]+)/i);
		if(!loginVar)
			throw new AnyBalance.Error('Не удалось найти ссылку на страницу с данными, сайт изменен?');
		
		var url = baseurl + 'f?p=10:MAIN:' + loginVar;
		html = AnyBalance.requestGet(url, g_headers);
		
		if(/Необходимо актуализировать e-mail/i.test(html)) {
			AnyBalance.trace('Необходимо актуализировать e-mail, ок, сделаем...');
	    
			html = AnyBalance.requestPost(baseurl + 'wwv_flow.show', {
				'p_request':'APPLICATION_PROCESS=confirmEmail',
				'x01': getParam(html, null, null, /"profile-email"[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces),
				'x02': 'null',
				'x03': '#email-confirm-button',
				'x04': '#profile-email',
				'p_instance':getP_instance(html) || P_instance,
				p_flow_id:getFlowID(html) || FlowID,
				p_flow_step_id:getFlowStepID(html) || FlowStepID,		
			}, addHeaders({Referer: url, 'X-Requested-With': 'XMLHttpRequest'}));
		}

		renewDB(html);

		g_mainpageurl = url;
		__setLoginSuccessful();
	}else{
		AnyBalance.trace('Должны быть уже залогинены, пытаемся войти');
	}
	//Надо получить ещё раз данные, потому что там теперь заполнятся карты и счета
	html = AnyBalance.requestGet(g_mainpageurl, g_headers);
	/*
	// Проверим, может нас бросили не на главную страницу, а нам надо начать с главной!
	if(!/<title>[^<]*Главная[^<]*<\/title>/i.test(html)) {
		AnyBalance.trace('Мы не на главной. Переходим на неё');
		var href = getParam(html, null, null, /<a[^>]+href="([^"]+)"[\s\S]*?Портфель[^<]+<\/a>/i);
		html = AnyBalance.requestGet(baseurl + href, g_headers);
	}
	*/
	return html;
}

function renewDB(html){
	// Теперь надо пнуть базу, чтобы обновилось все
	var P_instance = getP_instance(html);
	var FlowID = getFlowID(html);
	var FlowStepID = getFlowStepID(html);
	
	var url = AnyBalance.getLastUrl();
	var requests = ['AFTER_AUTH', 'APPLICATION_PROCESS=GET_MAIL_COUNT', 'APPLICATION_PROCESS=GET_CRM', 'APPLICATION_PROCESS=LoadPresale', ''];
	
	// Запросы посылаются в цикле :)
	for(var i = 0; i < requests.length; i++) {
		var currentRequest = requests[i];
		
		html = AnyBalance.requestPost(baseurl + 'wwv_flow.show', {
			'p_request':currentRequest,
			'p_instance':getP_instance(html) || P_instance,
			p_flow_id:getFlowID(html) || FlowID,
			p_flow_step_id:getFlowStepID(html) || FlowStepID,		
		}, addHeaders({Referer: url, 'X-Requested-With': 'XMLHttpRequest'}));
	}
}

function processProfile(html, result) {
	var href = getParam(html, null, null, /href="([^"]*PROFILE[^"]*)/i, replaceTagsAndSpaces);
	if(!href) {
		AnyBalance.trace('Не удалось найти ссылку на профиль пользователя');
		return;
	}
	
	html = AnyBalance.requestGet(baseurl + href, g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'wwv_flow.show', {
		'p_request':'',
		'p_instance':getP_instance(html),
		p_flow_id:getFlowID(html),
		p_flow_step_id:getFlowStepID(html),
		p_arg_names: 'P' + getFlowStepID(html) + '_TAB_NAME',
		p_arg_values:'PERSONAL_INFO',
	}, addHeaders({Referer: baseurl}));
	
	var p = {};
	
	getParam(html, p, 'profile.name', /"profile-name with-icon"[^>]*>([\s\S]*?)<\/div/i, replaceTagsAndSpaces);
	getParam(html, p, 'profile.phone', /"profile-phone-mobile"[^>]*>([^<]+)/i, replaceTagsAndSpaces);
	getParam(html, p, 'profile.mail', /"profile-email"[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(html, p, 'profile.dateOfBirth', /"profile-birthday-date"[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseDate);
	
	result.profile = p;
	// getParam(html, result, 'profile.inn', //i, replaceTagsAndSpaces);
}
////////////////////////////////////////////////////////////////////////////////////////
// Карты
////////////////////////////////////////////////////////////////////////////////////////
function processCards(html, result) {
	var cards = getElements(html, /<div[^>]+class="product-item type-card"/ig);
	
	AnyBalance.trace('Найдено карт: ' + cards.length);
	result.cards = [];
	
	for(var i=0; i < cards.length; ++i) {
		var title = getParam(cards[i], null, null, /\d{4}(?:[-\s][\dx]{4}){2}[-\s]\d{4}/i, replaceTagsAndSpaces);
		var _id = getParam(cards[i], null, null, /acc_id="([^"]+)"/i, replaceTagsAndSpaces);
		
		var c = {__id: _id, __name: title};
		
		if(__shouldProcess('cards', c)){
			processCard(cards[i], c);
		}
		
		result.cards.push(c);
	}
}

function processCard(card, result) {
	getParam(result.__name, result, 'cards.cardNumber');
	getParam(card, result, 'cards.balance', /"(?:sum|quant)"(?:[^>]*>){1}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(card, result, ['cards.currency', 'cards.balance'], /"(?:sum|quant)"(?:[^>]*>){1}([^<]+)/i, replaceTagsAndSpaces, parseCurrencyAndMy);
	getParam(card, result, 'cards.till', /\d{4}[\s-x]{8,}\d{4}[^<]*?(\d{1,2}\/\d{1,2})/i, [replaceTagsAndSpaces, /(.*)/i, '01/$1'], parseDate);

	// Дополнительная инфа.
	var href = getParam(card, null, null, /href="(f\?p=[^"]+)"/i);
	if(href && isAvailable(['cards.limit', 'cards.blocked', 'cards.minpay', 'cards.total_debt', 'cards.minpay', 'cards.minpay', 'cards.gracepay', 'cards.minpay_till', 'cards.gracepay_till'])) {
		var html = AnyBalance.requestGet(baseurl + href, g_headers);
		
		getParam(html, result, 'cards.limit', /Кредитный лимит(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'cards.blocked', /Заблокировано по операциям с картой(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'cards.minpay', /cумма минимального платежа(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'cards.total_debt', /общая сумма задолженности(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'cards.minpay', /cумма минимального платежа(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'cards.gracepay', /для выполнения условий льготного периода кредитования(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		
		var replaceTill = [replaceTagsAndSpaces, /[\s\S]*?(\d+\.\d+\.\d+$)/i, '$1'];
		getParam(html, result, 'cards.minpay_till', /cумма минимального платежа(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTill, parseDate);
		getParam(html, result, 'cards.gracepay_till', /для выполнения условий льготного периода кредитования(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTill, parseDate);
	} else {
		AnyBalance.trace('Не нашли ссылку на дополнительную информацию по счетам, возможно, сайт изменился?');
	}
	
	if(AnyBalance.isAvailable('cards.transactions'))
		processCardTransactions(card, html, baseurl + href, result);
}

////////////////////////////////////////////////////////////////////////////////////////
// Счета 
////////////////////////////////////////////////////////////////////////////////////////
function processAccounts(html, result) {
	var accounts = getElements(html, /<div[^>]+class="product-item type-account"/ig);
	
	AnyBalance.trace('Найдено счетов: ' + accounts.length);
	result.accounts = [];
	
	for(var i=0; i < accounts.length; ++i){
		var _id = getParam(accounts[i], null, null, /acc_id\s*=\s*"([^"]+)/i);
		var title = getParam(accounts[i], null, null, /<div[^>]+class="info"[^>]*>\s*(\d{20})/i, replaceTagsAndSpaces);
		
		var acc = {__id: _id, __name: title};
		
		if(__shouldProcess('accounts', acc)){
			processAccount(accounts[i], acc);
		}
		
		result.accounts.push(acc);
	}
}

function processAccount(account, result) {
	getParam(account, result, 'accounts.total', /class="quant"[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(account, result, ['accounts.currency', 'accounts.balance', 'accounts.total'], /class="quant"[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseCurrency);
	
	getParam(account, result, 'accounts.accnum', /<div[^>]+class="info"[^>]*>\s*(\d{20})/i, replaceTagsAndSpaces);
	getParam(account, result, 'accounts.acctype', /ITEM_ID[^>]*>([^<]+)/i, replaceTagsAndSpaces);
	
	// Дополнительная инфа.
	var href = getParam(account, null, null, /href="(f\?p=[^"]+)"/i);
	if(href) {
		var html = AnyBalance.requestGet(baseurl + href, g_headers);
		
		getParam(html, result, 'accounts.blocked', /Заблокировано по операциям с картой([^>]*>){5}/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'accounts.balance', /Доступно для операций с картами([^>]*>){5}/i, replaceTagsAndSpaces, parseBalance);
		
	} else {
		AnyBalance.trace('Не нашли ссылку на дополнительную информацию по счетам, возможно, сайт изменился?');
	}

	if(AnyBalance.isAvailable('accounts.transactions'))
		processAccountTransactions(account, html, baseurl + href, result);
}

function parseCurrencyAndMy(cur) {
	return parseCurrencyMy(parseCurrency(cur));
}

function parseCurrencyMy(cur) {
	var tbl = {
		'Российский рубль': 'руб',
		'Доллар США': '$',
		'Евро': '€'
	}
	if (tbl[cur]) return tbl[cur];
	return cur;
}

function getAuthKey(html) {
	return nvl(getParam(html, null, null, /value="([^"]+)[^<]*id="authkey"/i), '').substr(0, 32).toLowerCase();
}

function getP_instance(html) {
	return getParam(html, null, null, /p_instance[^>]*value=['"]([^'"]+)/i);
}

function getFlowID(html) {
	return getParam(html, null, null, /value="([^"]+)[^<]*pFlowId/i);
}

function getFlowStepID(html) {
	return getParam(html, null, null, /p_flow_step_id[^>]*value="([^"]+)/i);
}

function nvl(a, v, vl, vr) {
	return a != undefined && a != null ? (vl != undefined && vl != null ? vl : '') + a + (vr != undefined && vr != null ? vr : '') : (v != undefined && v != null ? v : '')
}

function getRsaN(html) {
	return getParam(html, null, null, /rsa_N\s*=\s*['"]([^'"]+)/i);
}

function getRsaE(html) {
	return getParam(html, null, null, /rsa_E\s*=\s*['"]([^'"]+)/i);
}
