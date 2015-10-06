/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'Origin': 'https://i.bankuralsib.ru',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.101 Safari/537.36',
};

var baseurl = 'https://i.bankuralsib.ru/';

function login(prefs) {
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	AnyBalance.setDefaultCharset('utf-8');
	
	var html = AnyBalance.requestGet(baseurl + '', g_headers);
	
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
    	var error = sumParam(html, null, null, /"err"[^"]+"([^"]+)/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
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
	
	// Теперь надо пнуть базу, чтобы обновилось все
	var P_instance = getP_instance(html);
	var FlowID = getFlowID(html);
	var FlowStepID = getFlowStepID(html);
	
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
	
	return html;
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
	
	getParam(html, result, 'profile.name', /"profile-name with-icon"[^>]*>([\s\S]*?)<\/div/i, replaceTagsAndSpaces);
	getParam(html, result, 'profile.phone', /"profile-phone-mobile"[^>]*>([^<]+)/i, replaceTagsAndSpaces);
	getParam(html, result, 'profile.mail', /"profile-email"[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(html, result, 'profile.dateOfBirth', /"profile-birthday-date"[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseDate);
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
		var _id = title;
		
		var c = {__id: _id, __name: title};
		
		if(__shouldProcess('cards', c)){
			processCard(cards[i], c);
		}
		
		result.cards.push(c);
	}
}

function processCard(card, result) {
	getParam(result.__name, result, 'cards.cardNumber');
	getParam(card, result, 'cards.balance', /"sum"(?:[^>]*>){1}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(card, result, ['cards.currency', 'cards.balance'], /"sum"(?:[^>]*>){1}([^<]+)/i, replaceTagsAndSpaces, parseCurrencyAndMy);
	getParam(card, result, 'cards.till', /\d{4}[-x]{8,}\d{4}[^<]*?(\d{1,2}\/\d{1,2})/i, [replaceTagsAndSpaces, /(.*)/i, '01/$1'], parseDate);

	// Дополнительная инфа.
	var href = getParam(card, null, null, /href="(f\?p=[^"]+)"/i);
	if(href) {
		var html = AnyBalance.requestGet(baseurl + href, g_headers);
		
		getParam(html, result, 'cards.blocked', /Заблокировано по операциям с картой([^>]*>){5}/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'cards.balance', /Доступно для операций с картами([^>]*>){5}/i, replaceTagsAndSpaces, parseBalance);
		
	} else {
		AnyBalance.trace('Не нашли ссылку на дополнительную информацию по счетам, возможно, сайт изменился?');
	}
	
	processCardTransactions(card, html, baseurl + href, result);
}

function processCardTransactions(card, html, url, result) {
	if(!AnyBalance.isAvailable('cards.transactions'))
		return;	
	
	// Похоже, что он всегда такой, т.к. со страницы никогда не приходит такое значение
	var step = '99';
	
	html = AnyBalance.requestPost(baseurl + 'wwv_flow.show', [
		['p_request', 'STATEMENT'],
		['p_instance', getP_instance(html)],
		['p_flow_id', getFlowID(html)],
		['p_flow_step_id', step],
		['p_arg_names', 'P' + step + '_ID'],
		['p_arg_values', result.__id],
		['p_arg_names', 'P' + step + '_DATE_FROM'],
		['p_arg_values', getFormattedDate(5)],
		['p_arg_names', 'P' + step + '_DATE_TO'],
		['p_arg_values', getFormattedDate()],
		// ['p_arg_names', 'P' + step + '_CURRENCY'],
		// ['p_arg_values', 'RUB'],
		['p_arg_names', 'P' + step + '_OPER_TYPE'],
		['p_arg_values', ''],		
	], addHeaders({Referer: url, Accept: '*/*'}));
	
	result.transactions = [];
	
	var printHref = getParam(html, null, null, /print[^>]*html_PopUp\(\\'([^\\']+)/i);
	if(!printHref)
		return;
	
	html = AnyBalance.requestGet(baseurl + printHref, g_headers);
	
    var colsTransactions = {
        descr: {
            re: /Сведения об операции/i,
            result_func: html_entity_decode
        },
        date: {
            re: /Дата операции/i,
            result_func: parseDate
        },
        sum: {
            re: /Сумма операции/i
        },
        currency: {
            re: /Сумма операции/i,
			result_func: parseCurrency
        }
    };

    var table = getParam(html, null, null, /<table[^>]*class="[^>]*log[\s\S]*?<\/table>/i, [/&ndash;/g, '-']);
    if(!table){
        AnyBalance.trace(html);
        AnyBalance.trace('Не найдена выписка по карте');
        return;
    }

    processTable(table, result.transactions, 'cards.transactions.', colsTransactions);
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

	processAccountTransactions(account, html, baseurl + href, result);
}

function processAccountTransactions(account, html, url, result) {
	if(!AnyBalance.isAvailable('accounts.transactions'))
		return;
	// Похоже, что он всегда такой, т.к. со страницы никогда не приходит такое значение
	var step = '99';
	
	html = AnyBalance.requestPost(baseurl + 'wwv_flow.show', [
		['p_request', 'STATEMENT'],
		['p_instance', getP_instance(html)],
		['p_flow_id', getFlowID(html)],
		['p_flow_step_id', step],
		['p_arg_names', 'P' + step + '_ID'],
		['p_arg_values', result.__id],
		['p_arg_names', 'P' + step + '_DATE_FROM'],
		['p_arg_values', getFormattedDate(5)],
		['p_arg_names', 'P' + step + '_DATE_TO'],
		['p_arg_values', getFormattedDate()],
		// ['p_arg_names', 'P' + step + '_CURRENCY'],
		// ['p_arg_values', 'RUB'],
		['p_arg_names', 'P' + step + '_OPER_TYPE'],
		['p_arg_values', ''],		
	], addHeaders({Referer: url, Accept: '*/*'}));
	
	result.transactions = [];
	
	var printHref = getParam(html, null, null, /print[^>]*html_PopUp\(\\'([^\\']+)/i);
	if(!printHref)
		return;
	
	html = AnyBalance.requestGet(baseurl + printHref, g_headers);
	
    var colsTransactions = {
        descr: {
            re: /Сведения об операции/i,
            result_func: html_entity_decode
        },		
        date: {
            re: /Дата операции/i,
            result_func: parseDate
        },		
        sum: {
            re: /Сумма операции/i
        },
        currency: {
            re: /Сумма операции/i,
			result_func: parseCurrency
        }		
    };

    var table = getParam(html, null, null, /<table[^>]*class="[^>]*log[\s\S]*?<\/table>/i, [/&ndash;/g, '-']);
    if(!table){
        AnyBalance.trace(html);
        AnyBalance.trace('Не найдена выписка по счету');
        return;
    }

    processTable(table, result.transactions, 'accounts.transactions.', colsTransactions);
}













function getFormattedDate(yearCorr) {
	var dt = new Date();
	
	var day = (dt.getDate() < 10 ? '0' + dt.getDate() : dt.getDate());
	var month = ((dt.getMonth()+1) < 10 ? '0' + (dt.getMonth()+1) : dt.getMonth()+1);
	var year = isset(yearCorr) ? dt.getFullYear() - yearCorr : dt.getFullYear();
	
	return day + '.' + month + '.' + year;
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
