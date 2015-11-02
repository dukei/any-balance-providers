/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'Accept': 'application/vnd.qiwi.sso-v1+json',
	'Origin': 'https://w.qiwi.com',
	'Accept-Language': 'ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.0.2357.132 Safari/537.36',
	'Content-Type': 'application/json',
};

function login(prefs) {
    var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите номер телефона!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    AnyBalance.requestGet(baseurl + 'payment/main.action'); //Надо сессию поставить
	
	var login = prefs.login;
	// Только для России
	if(/^\d{10}$/i.test(prefs.login)) {
		login = '+7' + prefs.login;
	} else if(!/^\s*\+/.test(prefs.login)) {
		login = '+' + prefs.login;
	}
	
    var response = requestAPI({
		action: 'cas/tgts',
		isAuth: true
	}, {
        login: login,
        password: prefs.password
    });
	
	response = requestAPI({
		action: 'cas/sts',
		isAuth: true
	}, {
		"ticket": response.entity.ticket,
		"service": baseurl + "j_spring_cas_security_check"
	});
	
	var html = AnyBalance.requestGet(baseurl + 'j_spring_cas_security_check?ticket=' + response.entity.ticket, addHeaders({'Referer': baseurl}));
	
	if(/Внимание! Срок действия вашего пароля истек/i.test(html)) {
		throw new AnyBalance.Error('Внимание! Срок действия вашего пароля истек. Зайдите в кошелек через браузер и следуйте инструкции.', null, true);
	}
	
	AnyBalance.trace ('Успешно вошли...');
	
	return html;
}

function getAccountInfo(response, result) {
	getParam(response.data.person, result, 'user_acc');
	getParam(response.data.messages, result, 'messages');
	getParam(response.data.unpaidOrderCount, result, 'bills');
	
	// Баланс мегафона
	if(AnyBalance.isAvailable('megafon_balance', 'megafon_can_pay')) {
		html = AnyBalance.requestPost (baseurl + 'user/megafon/content/balanceheader.action', {}, addHeaders({Accept: 'text/html, */*; q=0.01', 'X-Requested-With':'XMLHttpRequest'}));
		
		getParam(html, result, 'megafon_balance', /phone-amount[^>]*>([\s\S]*?)<\/div/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'megafon_can_pay', /current_amount[^>]*>([\s\S]*?)<\/div/i, replaceTagsAndSpaces, parseBalance);
	}
	
	// QVC
	if(AnyBalance.isAvailable('qvc_card')) {
        html = AnyBalance.requestGet(baseurl + 'qvc/main.action');
		
		var card = getParam (html, result, 'qvc_card', /Номер карты:([^>]*>){3}/i, replaceTagsAndSpaces, html_entity_decode);
		getParam (html, result, 'qvc_exp', /Срок действия:([^>]*>){3}/i, replaceTagsAndSpaces, parseDate);
    }
}

var baseurlAuth = 'https://auth.qiwi.com/';
var baseurl = 'https://qiwi.com/';

/** 
	actionObj - объект с полями:
	action - url
	isAuth - флаг проверки авторизации
*/
function requestAPI(actionObj, params, addOnHeaders) {
    var info = AnyBalance.requestPost(actionObj.isAuth ? baseurlAuth + actionObj.action : baseurl + actionObj.action, JSON.stringify(params), addOnHeaders ? addHeaders(g_headers, addOnHeaders) : g_headers);
    AnyBalance.trace ('Request result: ' + info);
	
    var response = getJson(info);
	
    // Проверка ошибки входа
	if(actionObj.isAuth) {
		if (!response.entity || !response.entity.ticket) {
			if(response.entity){
				var error = response.entity.error.message;
				if(error)
					throw new AnyBalance.Error(error, null, /Неверный логин или пароль|Неправильный номер телефона или пароль/i.test(error));
			}
			
			AnyBalance.trace(info);
			throw new AnyBalance.Error('Не удалось войти в Qiwi Visa Wallet, сайт изменен?');
		}

	} else {
		if (!response.data) {
			var error = response.message;
			if(error)
				throw new AnyBalance.Error('Сайт qiwi.ru сообщает: ' + error + '. Попробуйте обновить данные позже.');
			
			AnyBalance.trace(info);
			throw new AnyBalance.Error('Ошибка при обработке запроса к API!');
		}		
		
	}
	
	return response;
}

var g_currency = {
    RUB: 'р',
    USD: '$',
	EUR: '€',
    KZT: '〒',
    UAH: '₴',
};

function parseCurrencyMy(text){
    var currency = parseCurrency(text);
    return g_currency[currency] ? ' ' + g_currency[currency] : currency;
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка счетов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processAccounts(result) {
    var response = requestAPI({action: 'person/state.action'}, {}, {Accept: 'application/json, text/javascript', 'X-Requested-With':'XMLHttpRequest'});
	
	result.accounts = [];
	
	var i = 0;
	for (var balance in g_currency) {
		// Пропускаем отсутствующий баланс
		if (!isset(response.data.balances[balance]))
			continue;
		
		var _id = balance;
		
		var c = {__id: _id, __name: _id};
		
		if(__shouldProcess('accounts', c)){
			processAccount(response.data.balances, _id, c);
		}
		
		result.accounts.push(c);
		i++;
	}
	AnyBalance.trace('Найдено счетов: ' + i);
	
	return response;
}

function processAccount(data, _id, result){
    AnyBalance.trace('Обработка счета ' + _id);
	
	getParam(data[_id] + '', result, 'accounts.balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(g_currency[_id] + '', result, ['accounts.currency', 'accounts.balance'], null, replaceTagsAndSpaces);
	
	processAccountTransactions(_id, result);
}

function processAccountTransactions(_id, result) {
	if(!AnyBalance.isAvailable('accounts.transactions'))
		return;
	
	AnyBalance.trace('Получаем последние операции по счету...');
	
	html = AnyBalance.requestGet(baseurl + 'report/list.action?daterange=true&start=' + getFormattedDate(5) + '&finish=' + getFormattedDate(), g_headers);
	
	var table = getElement(html, /<div class="reports">/i);
	
	if(!table) {
	    AnyBalance.trace(html);
	    AnyBalance.trace('Не удалось найти таблицу операций!');
		return;
	}

    result.transactions = [];
	
    var ops = getElements(table, /<div[^>]*class="[^"]*status_SUCCESS"/ig);
	
    AnyBalance.trace('У счета ' + _id + ' найдено транзакций: ' + ops.length);
	
	var currencys = {
		RUB: 'руб',
		USD: 'долл',
		// EUR: '€',
		// KZT: '〒',
		// UAH: '₴',
	};
    for(var i=0; i < ops.length; ++i) {
    	var o = {};
		
		var sum = getParam(ops[i], null, null, /class="cash"[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces);
		
		if(new RegExp(currencys[_id]).test(sum)) {
			getParam(g_currency[_id], o, 'accounts.transactions.currency');
			getParam(sum, o, 'accounts.transactions.sum', null, null, parseBalance);
			getParam(ops[i], o, 'accounts.transactions.time', /DateWithTransaction[^>]*>((?:[\s\S]*?<\/span){2})/i, replaceTagsAndSpaces, parseDate);
			getParam(ops[i], o, 'accounts.transactions.name', /"ProvWithComment"[^>]*>((?:[\s\S]*?<\/div>){2})/i, replaceTagsAndSpaces, html_entity_decode);
			getParam(ops[i], o, 'accounts.transactions.transaction', /Транзакция:[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
			
			result.transactions.push(o);
		}
    }
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Шаблоны
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processTemplates(result) {
	if(!AnyBalance.isAvailable('templates'))
		return;

	result.templates = [];
	
	html = AnyBalance.requestGet(baseurl + 'payment/favorite.action');
	
	var tpls = sumParam(html, null, null, /data-action=['"]open['"][^>]*data-params=['"][^"']+['"][^>]*title=['"][^'"]+['"]/ig);
	AnyBalance.trace('Найдено шаблонов: ' + tpls.length)

	for(var i=0; i<tpls.length; ++i){
		var dataParams = getParam(tpls[i], null, null, /data-params='([^']+)'/i, replaceTagsAndSpaces, getJson);
		
		var id = dataParams.data.payment;
		var name = getParam(tpls[i], null, null, /title="([^'""]+)/i, replaceTagsAndSpaces, html_entity_decode);		
		
		var t = {__id: id, __name: name};

		if(__shouldProcess('templates', t)){
			processTemplate(t, id);
		}
		result.templates.push(t);
	}
}

function processTemplate(result, _id) {
	AnyBalance.trace('Обработка шаблона ' + _id);
	
	html = AnyBalance.requestGet(baseurl + 'payment/favorite/open.action?payment=' + _id);
	
	getParam(html, result, 'templates.sum', /<input\s+type="hidden"\s+name="amount"\s+value="([^"]+)/i, replaceTagsAndSpaces, parseBalance);
	
	var dataParams = getParam(html, null, null, /<div\s+data-widget="payment-form"\s+data-params='([^']+)/i, replaceTagsAndSpaces, getJson);
	
	if(!dataParams)
		throw new AnyBalance.Error('Не удалось получить данные по шаблону ' + _id);
	
	getParam(dataParams.provider.id, result, 'templates.prov_id');
	getParam(dataParams.provider.name, result, 'templates.prov_name');
	
	var fields = sumParam(html, null, null, /<input[^>]*data-title[^>]*class=['"][^"']+dataField[^>]*>/ig);
	
	AnyBalance.trace('Найдено полей: ' + fields.length);
	
	result.fields = [];
	
	for(var i = 0; i < fields.length; i++) {
		var extraJson = getParam(fields[i], null, null, /data-form-field='([^']+)/i,replaceTagsAndSpaces, html_entity_decode);
		var name = getParam(fields[i], null, null, /data-title="([^'"]+)/i, replaceTagsAndSpaces);
		var id = getParam(fields[i], null, null, /name="([^"]+)/i, replaceTagsAndSpaces);
		var value = getParam(fields[i], null, null, /value="([^"]+)/i, replaceTagsAndSpaces);
		
		var f = {
			'name': name,
			'id': id,
			'value': value,
			'extra': extraJson
		};
		
		result.fields.push(f);
	}
}













////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка карт QVC
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(html, result) {
	html = AnyBalance.requestGet(nodeUrl + '/PhizIC/private/cards/list.do');
	var cards = getElements(html, /<div[^>]+class="productCover[^"]*activeProduct[^>]*">/ig);
	AnyBalance.trace('Найдено карт: ' + cards.length);
	result.cards = [];
	
	for(var i=0; i < cards.length; ++i){
		var _id = getParam(cards[i], null, null, /<div[^>]+id="card_(\d+)/i);
		var title = getParam(cards[i], null, null, /<[^>]*class="accountNumber\b[^"]*">([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
		
		var c = {__id: _id, __name: title};
		
		if(__shouldProcess('cards', c)) {
			processCard(cards[i], _id, c);
		}
		
		result.cards.push(c);
	}
}

function processCard(html, _id, result){
    AnyBalance.trace('Обработка карты ' + _id);
	
	getParam(html, result, 'cards.balance', /overallAmount\b[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['cards.currency', 'cards.balance', 'cards.cash', 'cards.electrocash', 'cards.debt', 'cards.maxlimit'], /overallAmount\b[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'cards.cardNumber', /<[^>]*class="accountNumber\b[^"]*">([^<,]+)/i, replaceTagsAndSpaces);
	getParam(html, result, 'cards.till', /<[^>]*class="accountNumber\b[^"]*">[^<]+,\s+действует (?:до|по)([^<]+)/i, replaceTagsAndSpaces, parseDateWord);
	
	if (AnyBalance.isAvailable('cards.userName', 'cards.cash', 'cards.electrocash', 'cards.minpay', 'cards.minpaydate', 'cards.maxlimit')) {
		html = AnyBalance.requestGet(nodeUrl + '/PhizIC/private/cards/detail.do?id=' + _id);
		getParam(html, result, 'cards.userName', /Держатель карты:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/, replaceTagsAndSpaces, capitalFirstLetters);
		getParam(html, result, 'cards.cash', /Для снятия наличных:(?:[^>]*>){5}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'cards.electrocash', /для покупок:(?:[^>]*>){5}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'cards.minpay', /Обязательный платеж(?:[^>]*>){5}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'cards.minpaydate', /Обязательный платеж(?:[^>]*>){7}([\s\S]*?)<\/div>/, replaceTagsAndSpaces, parseDateWord);
		getParam(html, result, 'cards.maxlimit', /Кредитный лимит(?:[^>]*>){5}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	}
	// // Нужно только для старого провайдера
	// if (AnyBalance.isAvailable('cards.lastPurchSum', 'cards.lastPurchPlace', 'cards.lastPurchDate')) {
		// html = AnyBalance.requestGet(nodeUrl + '/PhizIC/private/cards/info.do?id=' + _id);
		// var tr = getParam(html, null, null, /<tr[^>]*class="ListLine0"[^>]*>([\S\s]*?)<\/tr>/i);
		// if (tr) {
			// getParam(tr, result, 'cards.lastPurchDate', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseSmallDate);
			// getParam(tr, result, 'cards.lastPurchSum', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
			// getParam(tr, result, 'cards.lastPurchPlace', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
		// } else {
			// AnyBalance.trace('Не удалось найти последнюю операцию.');
		// }
	// }
	
	processCardLast10Transactions(_id, result);
	processCardTransactions(_id, result);
}

function processCardTransactions(_id, result) {
	if(!AnyBalance.isAvailable('cards.transactions'))
		return;
	
	AnyBalance.trace('Получаем все операции по карте...');
	
	var dt = new Date();
	
	var html = AnyBalance.requestGet(nodeUrl + '/PhizIC/private/accounts/print.do?sel=c:' + _id + '&fromDateString=' + getFormattedDate(5) + '&toDateString=' + getFormattedDate(), g_headers);
	
	if(!/<table(?:[^>]*>){3}\s*Выписка/i.test(html)) {
	    AnyBalance.trace(html);
	    AnyBalance.trace('Не удалось найти таблицу операций!');
		// processCardLast10Transactions(_id, result);
		return;
	}
	
    result.transactions = [];
	
    var ops = sumParam(html, null, null, /<tr class="">(?:[^>]*>){15,25}\s*<\/tr>/ig);
	
	var currency = getParam(html, null, null, /Входящий остаток:[^>]*>\s*[\w\s.,-]+([^.]+)/i, replaceTagsAndSpaces);
	
    AnyBalance.trace('У карты ' + _id + ' найдено транзакций: ' + ops.length);
    for(var i=0; i<ops.length; ++i) {
    	var o = {};
		
		var debit = -1 * (getParam(ops[i], null, null, /debit([^>]*>){3}/i, replaceTagsAndSpaces, parseBalance) || 0);
		var credit = (getParam(ops[i], null, null, /credit([^>]*>){3}/i, replaceTagsAndSpaces, parseBalance) || 0);
		
		getParam(debit + credit, o, 'cards.transactions.sum');
		getParam(currency, o, 'cards.transactions.currency');
		
    	getParam(ops[i], o, 'cards.transactions.time', /operationDate([^>]*>){2}/i, replaceTagsAndSpaces, parseDate);
		getParam(ops[i], o, 'cards.transactions.orderNum', /documentNumber([^>]*>){2}/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(ops[i], o, 'cards.transactions.correspond', /accNumber([^>]*>){2}/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(ops[i], o, 'cards.transactions.name', /operationDate([^>]*>){8}/i, replaceTagsAndSpaces, html_entity_decode);
		
    	result.transactions.push(o);
    }
	// Сортируем в нужном нам порядке, чтобы первой была последняя транзакция
	result.transactions = sortObject(result.transactions, 'time');
}

function processCardLast10Transactions(_id, result) {
	AnyBalance.trace('Получаем последние 10 операций по карте...');
	
	html = AnyBalance.requestGet(nodeUrl + '/PhizIC/private/cards/info.do?id=' + _id);
	
	if(!/<table[^>]*class="tblInf"/i.test(html)) {
	    AnyBalance.trace(html);
	    AnyBalance.trace('Не удалось найти таблицу операций!');
		return;
	}

    result.transactions10 = [];
	
    var ops = sumParam(html, null, null, /<tr[^>]*class="ListLine\d+">(?:[^>]*>){6}\s*<\/tr>/ig);
	
    AnyBalance.trace('У карты ' + _id + ' найдено транзакций: ' + ops.length);
    for(var i=0; i<ops.length; ++i){
    	var o = {};

		getParam(ops[i], o, 'cards.transactions10.sum', /([^>]*>){7}/i, replaceTagsAndSpaces, parseBalance);
		getParam(ops[i], o, 'cards.transactions10.currency', /([^>]*>){7}/i, replaceTagsAndSpaces, parseCurrency);
		getParam(ops[i], o, 'cards.transactions10.name', /([^>]*>){3}/i, replaceTagsAndSpaces, html_entity_decode);
    	getParam(ops[i], o, 'cards.transactions10.time', /([^>]*>){5}/i, replaceTagsAndSpaces, parseSmallDate);

    	result.transactions10.push(o);
    }
	
	result.transactions10 = sortObject(result.transactions10, 'time');
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Всякие вспомогательные функции
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function sortObject(objArray, sortField) {
	return objArray.sort(function sortFunction(a, b) {
		if(a[sortField] > b[sortField])
			return -1;
		
		if(a[sortField] < b[sortField])
			return 1;
		
		return 0
	});
}

function getFormattedDate(yearCorr) {
	var dt = new Date();
	
	var day = (dt.getDate() < 10 ? '0' + dt.getDate() : dt.getDate());
	var month = ((dt.getMonth()+1) < 10 ? '0' + (dt.getMonth()+1) : dt.getMonth()+1);
	var year = isset(yearCorr) ? dt.getFullYear() - yearCorr : dt.getFullYear();
	
	return day + '.' + month + '.' + year;
}

function getParamByName(html, name) {
    return getParam(html, null, null, new RegExp('name=["\']' + name + '["\'][^>]*value=["\']([^"\']+)"', 'i'));
}

function parseSmallDate(str) {
    var dt = parseSmallDateInternal(str);
    AnyBalance.trace('Parsed small date ' + new Date(dt) + ' from ' + str);
    return dt;
}

function parseSmallDateInternal(str) {
	//Дата
    var matches = str.match(/(\d+):(\d+)/) || [,0,0];
	var now = new Date();
	if (/сегодня/i.test(str)) {
		var date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), +matches[1], +matches[2], 0);
		return date.getTime();
	} else if (/вчера/i.test(str)) {
		var date = new Date(now.getFullYear(), now.getMonth(), now.getDate()-1, +matches[1], +matches[2], 0);
		return date.getTime();
	} else {
		var matches = /(\d+)[^\d]+(\d+)/i.exec(str);
		if (!matches) {
			AnyBalance.trace('Не удалось распарсить дату: ' + str);
		} else {
			var year = now.getFullYear();
			if (now.getMonth() + 1 < +matches[2])--year; //Если текущий месяц меньше месяца последней операции, скорее всего, то было за прошлый год
			var date = new Date(year, +matches[2] - 1, +matches[1]);
			return date.getTime();
		}
	}
}