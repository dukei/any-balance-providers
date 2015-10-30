/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.80 Safari/537.36'
};

var nodeUrl = ''; // Подставляется при авторизации, обычно имеет вид https://node1.online.sberbank.ru/

function getLoggedInHtml(){
    var nurl = (nodeUrl || 'https://node1.online.sberbank.ru');
    var html = AnyBalance.requestGet(nurl + '/PhizIC/private/userprofile/userSettings.do', g_headers);
    if(/accountSecurity.do/i.test(html)){
        nodeUrl = nurl;
        return html;
    }
}

function login(prefs) {
	var baseurl = "https://online.sberbank.ru/CSAFront/login.do";
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, "Пожалуйста, укажите логин для входа в Сбербанк-Онлайн!");
	checkEmpty(prefs.password, "Пожалуйста, укажите пароль для входа в Сбербанк-Онлайн!");

	var html = getLoggedInHtml();
    if(html){
        AnyBalance.trace("Уже залогинены, используем текущую сессию");
        return html;
    }

	//Сбер разрешает русские логины и кодирует их почему-то в 1251, хотя в контент-тайп передаёт utf-8.
	AnyBalance.setDefaultCharset('windows-1251');
	html = AnyBalance.requestPost(baseurl, {
		'field(login)': prefs.login,
		'field(password)': prefs.password,
		operation: 'button.begin'
	}, addHeaders({Referer: baseurl, 'X-Requested-With': 'XMLHttpRequest', Origin: 'https://online.sberbank.ru'}));
	AnyBalance.setDefaultCharset('utf-8');
	
	var error = getParam(html, null, null, /<h1[^>]*>О временной недоступности услуги[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
	if (error)
		throw new AnyBalance.Error(error);
	
	error = getParam(html, null, null, /в связи с ошибкой в работе системы[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	if (error)
		throw new AnyBalance.Error(error);
	
	if (/\$\$errorFlag/i.test(html)) {
		var error = getParam(html, null, null, /([\s\S]*)/, [replaceTagsAndSpaces, /^:/, ''], html_entity_decode);
		throw new AnyBalance.Error(error, null, /Ошибка идентификации/i.test(error));
	}
	
	var page = getParam(html, null, null, /value\s*=\s*["'](https:[^'"]*?AuthToken=[^'"]*)/i);
	if (!page) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error("Не удаётся найти ссылку на информацию. Пожалуйста, обратитесь к разработчикам для исправления ситуации.");
	}
	
	AnyBalance.trace("About to authorize: " + page);	
	
	if (/online.sberbank.ru\/PhizIC/.test(page)) {
		html = doNewAccount(page);
	} else if (/Off_Service/i.test(page))
		throw new AnyBalance.Error("В настоящее время услуга Сбербанк ОнЛ@йн временно недоступна по техническим причинам. Сбербанк приносит свои извинения за доставленные неудобства.");
	else {
        AnyBalance.trace(html);
        throw new AnyBalance.Error("К сожалению, ваш вариант Сбербанка-онлайн пока не поддерживается. Пожалуйста, обратитесь к разработчикам для исправления ситуации.");
    }

    __setLoginSuccessful();
	
	return html;
}

function doNewAccount(page) {
	var html = AnyBalance.requestGet(page, addHeaders({Referer: baseurl}));

	if(!html){
		AnyBalance.trace('Почему-то получили пустую страницу... Попробуем ещё раз');
		html = AnyBalance.requestGet(page, addHeaders({Referer: baseurl}));
	}

	if (/StartMobileBankRegistrationForm/i.test(html)) {
		//Сбербанк хочет, чтобы вы приняли решение о подключении мобильного банка. Откладываем решение.
		var pageToken = getParamByName(html, 'PAGE_TOKEN');
		checkEmpty(pageToken, 'Попытались отказаться от подключения мобильного банка, но не удалось найти PAGE_TOKEN!', true);
		
		html = AnyBalance.requestPost('https://online.sberbank.ru/PhizIC/login/register-mobilebank/start.do', {
			PAGE_TOKEN: pageToken,
			operation: 'skip'
		}, addHeaders({Referer: baseurl}));
	}

	// А ну другой кейс, пользователь сменил идентификатор на логин
	if(/Ранее вы[^<]*уже создали свой собственный логин для входа/i.test(html)) {
		checkEmpty(null, getParam(html, null, null, /Ранее вы[^<]*уже создали свой собственный логин для входа[^<]*/i, replaceTagsAndSpaces, html_entity_decode));
	}
	
	var baseurl = getParam(page, null, null, /^(https?:\/\/.*?)\//i);
	nodeUrl = baseurl;
	if (/PhizIC/.test(html)) {
		AnyBalance.trace('Entering physic account...: ' + baseurl);
		if (/confirmTitle/.test(html)) {
			var origHtml = html;

		    //проверяем сначала тип подтверждения и переключаем его на смс, если это чек
			var active = getElement(html, /<div[^>]+clickConfirm[^>]+buttonGreen[^>]*>/i) || '';
			if(/confirmSMS/i.test(active)){
				AnyBalance.trace('Запрошен смс-пароль...');
			}else if(/confirmCard/i.test(active)){
				AnyBalance.trace('Запрошен пароль с чека. Это неудобно, запрашиваем пароль по смс.');
				html = AnyBalance.requestPost(baseurl + '/PhizIC/async/confirm.do', {
					'PAGE_TOKEN': getParamByName(origHtml, 'PAGE_TOKEN'),
					'operation': 'button.confirmSMS'
				}, addHeaders({Referer: baseurl, 'X-Requested-With': 'XMLHttpRequest'}));
			}else{
				AnyBalance.trace('Неизвестное подтверждение: ' + active + '. Надеемся, это смс.');
			}

			var pass = AnyBalance.retrieveCode('Для входа в интернет банк, пожалуйста, введите одноразовый пароль, который выслан вам по СМС.\n\nЕсли вы не хотите постоянно вводить СМС-пароли при входе, вы можете отменить их в настройках вашего Сбербанк-онлайн. Это безопасно - для совершения денежных операций требование одноразового пароля всё равно останется', null, {time: 300000});
			
			html = AnyBalance.requestPost(baseurl + '/PhizIC/async/confirm.do', {
				'receiptNo': '',
				'passwordsLeft': '',
				'passwordNo': '',
				'SID': '',
				'$$confirmSmsPassword': pass,
				'PAGE_TOKEN': getParamByName(origHtml, 'PAGE_TOKEN'),
				'operation': 'button.confirm'
			}, addHeaders({Referer: baseurl, 'X-Requested-With': 'XMLHttpRequest'}));
			
			
			// throw new AnyBalance.Error("Ваш личный кабинет требует одноразовых паролей для входа. Пожалуйста, отмените в настройках кабинета требование одноразовых паролей при входе. Это безопасно: для совершения денежных операций требование одноразового пароля всё равно останется.");
		}
		if (/internetSecurity/.test(html)) {
			AnyBalance.trace('Требуется принять соглашение о безопасности... Принимаем...');
			
			html = AnyBalance.requestPost(baseurl + '/PhizIC/internetSecurity.do', {
				'field(selectAgreed)': 'on',
				'PAGE_TOKEN': getParamByName(html, 'PAGE_TOKEN'),
				'operation': 'button.confirm'
			}, addHeaders({Referer: baseurl, 'X-Requested-With': 'XMLHttpRequest'}));
		}
		
		if (/Откроется справочник регионов, в котором щелкните по названию выбранного региона/.test(html)) {
			//Тупой сбер предлагает обязательно выбрать регион оплаты. Вот навязчивость...
			//Ну просто выберем все регионы
			html = AnyBalance.requestPost(baseurl + '/PhizIC/region.do', {
				id: -1,
				operation: 'button.save'
			}, addHeaders({Referer: baseurl, 'X-Requested-With': 'XMLHttpRequest'}));
		}

		if(!/accountSecurity.do/i.test(html)){
			var error = getElement(html, /<div[^>]+warningMessages[^>]*>/i, [replaceTagsAndSpaces, /Получите новый пароль, нажав.*/i, ''], html_entity_decode);
			if(error)
				throw new AnyBalance.Error(error);
		}

		if(!/accountSecurity.do/i.test(html))
			html = getLoggedInHtml();

		if(!/accountSecurity.do/i.test(html)){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось зайти в Cбербанк-онлайн. Сайт изменен?');
		}

	} else {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ваш тип личного кабинета не поддерживается. Свяжитесь, пожалуйста, с разработчиками.');
	}
	
	return html;
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка счетов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processAccounts(html, result) {
    if(!AnyBalance.isAvailable('accounts'))
        return;

	html = AnyBalance.requestGet(nodeUrl + '/PhizIC/private/accounts/list.do', g_headers);
	var pageToken = getParamByName(html, 'PAGE_TOKEN');
	
	var accounts = getElements(html, /<div[^>]+class="productCover[^"]*Product[^>]*">/ig, g_headers);
	AnyBalance.trace('Найдено счетов: ' + accounts.length);
	result.accounts = [];
	
	for(var i=0; i < accounts.length; ++i){
		var acc = accounts[i];
		var _id = getParam(acc, null, null, /<div[^>]+id="account_(\d+)/i);
		var name = getElement(acc, /<div[^>]+productName[^>]*>/i, replaceTagsAndSpaces, html_entity_decode);
		var num = getParam(acc, null, null, /<[^>]*class="productNumber\b[^"]*">([^<]+)/i, replaceTagsAndSpaces, html_entity_decode), info;
		if(num){
			//Попытаемся извлечь номер счета
			num = getParam(acc, null, null, /№([^,]*)/i);
		}else{
			AnyBalance.trace('Не удаётся найти номер счета ' + name + '! Пробуем получить его из расширенной информации.');
			info = AnyBalance.requestGet(nodeUrl + '/PhizIC/private/accounts/bankDetails.do?id=' + _id, g_headers);
			num = getParam(info, null, null, /Номер счета:[\s\S]*?<div[^>]+detailsValue[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
			AnyBalance.trace('Получен номер: ' + num);
		}
		
		var c = {__id: _id, __name: name, num: num};
		
		if(__shouldProcess('accounts', c)){
			processAccount(accounts[i], c, pageToken);
		}
		
		result.accounts.push(c);
	}
}

function parseAllow(str){
	return /разрешено/i.test(str);
}

function processAccount(html, result, pageToken){
    AnyBalance.trace('Обработка счета ' + result.__name);

    var isTarget = /thermometertargetTemplate/i.test(html);

    if(!isTarget){
		getParam(html, result, 'accounts.balance', /overallAmount\b[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'accounts.rate', /descriptionRight[^>]*>\s*([\d.,]+%)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, ['accounts.currency', 'accounts.balance'], /overallAmount\b[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseCurrency);
		getParam(html, result, 'accounts.till', /<[^>]*class="(?:product|account)Number\b[^"]*">[^<]+,\s+действует (?:до|по)([^<]+)/i, replaceTagsAndSpaces, parseDateWord);
	}else{
		//Целевой
		getParam(html, result, 'accounts.balance', /dribbleCenter\b[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'accounts.rate', /ставка:\s*([\d.,]+%)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, ['accounts.currency', 'accounts.balance'], /dribbleCenter\b[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseCurrency);
		getParam(html, result, 'accounts.till', /Дата покупки\s*<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseDate);
	}

	if(AnyBalance.isAvailable('accounts.num', 'accounts.period', 'accounts.balance_min', 'accounts.pct_conditions', 'accounts.status', 'accounts.prolong', 'accounts.withdraw', 'accounts.topup')){
		var info = AnyBalance.requestGet(nodeUrl + '/PhizIC/private/accounts/info.do?id=' + result.__id, g_headers);
	    
		getParam(info, result, 'accounts.num', /Номер счета[^<]*:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(info, result, 'accounts.period', /Срок вклада:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(info, result, 'accounts.balance_min', /Сумма неснижаемого остатка:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		getParam(info, result, 'accounts.pct_conditions', /Порядок уплаты процентов:[\s\S]*?<td[^>]*>([\s\S]*?)(?:<\/td>|<script)/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(info, result, 'accounts.status', /Текущее состояние:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
		//Пролонгация:	не осуществляется|осуществляется
		getParam(info, result, 'accounts.prolong', /Пролонгация:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode); 
		getParam(info, result, 'accounts.withdraw', /Списание:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseAllow);
		getParam(info, result, 'accounts.topup', /Зачисление:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseAllow);
	}
	
	processAccountTransactions(pageToken, result);
}

function processAccountTransactions(pageToken, result) {
	if(!AnyBalance.isAvailable('accounts.transactions'))
		return;
	
	AnyBalance.trace('Получаем последние операции по счету...');
	
	var dt = new Date();
	
	html = AnyBalance.requestPost(nodeUrl + '/PhizIC/private/accounts/operations.do?id=' + result.__id, {
		'showInMain': 'on',
		'filter(typePeriod)': 'period',
		'filter(fromPeriod)': getFormattedDate(5),
		'filter(toPeriod)': getFormattedDate(),
		'$$pagination_size0': '50',
		'PAGE_TOKEN': pageToken,
		'operation': 'button.filter',
	});
	
	if(!/<table[^>]*class="tblInf"/i.test(html)) {
	    AnyBalance.trace(html);
	    AnyBalance.trace('Не удалось найти таблицу операций!');
		return;
	}

    result.transactions = [];
	
    var ops = sumParam(html, null, null, /<tr[^>]*class="ListLine\d+">(?:[^>]*>){8}\s*<\/tr>/ig);
	
    AnyBalance.trace('У счета ' + result.__id + ' найдено транзакций: ' + ops.length);
    for(var i=0; i < ops.length; ++i){
    	var o = {};

		var debit = (getParam(ops[i], null, null, /([^>]*>){7}/i, replaceTagsAndSpaces, parseBalance) || 0);
		var credit = -1 * (getParam(ops[i], null, null, /([^>]*>){9}/i, replaceTagsAndSpaces, parseBalance) || 0);
		
		getParam(debit + credit, o, 'accounts.transactions.sum');
		if(isset(result.currency))
			getParam(result.currency, o, 'accounts.transactions.currency');
		
    	getParam(ops[i], o, 'accounts.transactions.time', /([^>]*>){5}/i, replaceTagsAndSpaces, parseSmallDate);
		getParam(ops[i], o, 'accounts.transactions.name', /([^>]*>){3}/i, replaceTagsAndSpaces, html_entity_decode);
		
    	result.transactions.push(o);
    }
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка карт
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(html, result) {
	if(!AnyBalance.isAvailable('cards'))
		return;

	html = AnyBalance.requestGet(nodeUrl + '/PhizIC/private/cards/list.do');
	var cards = getElements(html, /<div[^>]+class="productCover[^"]*(?:activeProduct|errorProduct)[^>]*">/ig);
	AnyBalance.trace('Найдено карт: ' + cards.length);
	result.cards = [];
	
	for(var i=0; i < cards.length; ++i){
		var _id = getParam(cards[i], null, null, /<div[^>]+id="card_(\d+)/i);
		var title = getParam(cards[i], null, null, /<[^>]*class="accountNumber\b[^"]*">([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
		
		var c = {__id: _id, __name: title};
		
		if(__shouldProcess('cards', c)) {
			processCard(cards[i], c);
		}
		
		result.cards.push(c);
	}
}

function processCard(html, result){
	var _id = result.__id;
    AnyBalance.trace('Обработка карты ' + result.__name);
	
	getParam(html, result, 'cards.balance', /overallAmount\b[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['cards.currency', 'cards.balance', 'cards.cash', 'cards.electrocash', 'cards.debt', 'cards.maxlimit'], /overallAmount\b[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'cards.cardNumber', /<[^>]*class="accountNumber\b[^"]*">([^<,]+)/i, replaceTagsAndSpaces);
	getParam(html, result, 'cards.till', /<[^>]*class="accountNumber\b[^"]*">[^<]+,\s+действует (?:до|по)([^<]+)/i, replaceTagsAndSpaces, parseDateWord);
    getParam(html, result, 'cards.accnum', /<[^>]*class="accountNumber\b[^"]*">([^<,]+)/i, replaceTagsAndSpaces);
    getParam(html, result, 'cards.status', /<[^>]*class="detailStatus\b[^"]*">([^<]+)/i, replaceTagsAndSpaces);
    getParam(html, result, 'cards.is_blocked', /Blocked.jpg/i, null, function(str) { return !!str});

	if (AnyBalance.isAvailable('cards.userName', 'cards.own', 'cards.cash', 'cards.electrocash', 'cards.minpay', 'cards.minpaydate', 'cards.maxlimit', 'cards.debt', 'cards.debt_date')) {
		html = AnyBalance.requestGet(nodeUrl + '/PhizIC/private/cards/detail.do?id=' + _id);
		getParam(html, result, 'cards.userName', /Держатель карты:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/, replaceTagsAndSpaces, capitalFirstLetters);
        getParam(html, result, 'cards.accnum', /Номер счета карты:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, 'cards.cash', /Для снятия наличных:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'cards.electrocash', /для покупок:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'cards.minpay', /Обязательный платеж[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'cards.minpaydate', /Дата платежа:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/, replaceTagsAndSpaces, parseDateWord);
		getParam(html, result, 'cards.maxlimit', /Кредитный лимит[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'cards.own', /Собственные средства:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

		getParam(html, result, 'cards.debt', /Общая задолженность[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'cards.debt_date', /Дата формирования(?:\s|<[^>]*>)+отчета:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDateWord);
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
	
	processCardLast10Transactions(result);
	processCardTransactions(result);
}

function processCardTransactions(result) {
	if(!AnyBalance.isAvailable('cards.transactions'))
		return;

	var _id = result.__id;
	AnyBalance.trace('Получаем все операции по карте...');
	
	var dt = new Date();

    //Пытаемся получить выписку на срок побольше
    var periods = [5, 1];
    for (var i = 0; i < periods.length; i++) {
        var period = periods[i];
        AnyBalance.trace('Пробуем получить выписку за ' + period + ' лет');

        var html = AnyBalance.requestGet(nodeUrl + '/PhizIC/private/accounts/print.do?sel=c:' + _id + '&fromDateString=' + getFormattedDate(period) + '&toDateString=' + getFormattedDate(), g_headers);

        if(!/<table(?:[^>]*>){3}\s*Выписка/i.test(html)) {
            var err = sumParam(html, null, null, /<div[^>]+class="messageContainer"[^>]*>([\s\S]*?)<\/div>/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
            if(!err) {
                AnyBalance.trace(html);
                AnyBalance.trace('Не удалось найти таблицу операций!');
            }else{
                AnyBalance.trace('Не удалось найти таблицу операций: ' + err + '!');
            }
            if(i + 1 >= periods.length)
                return; //Всё, шансов больше нет
        }else{
            break;
        }
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

function processCardLast10Transactions(result) {
	if(!AnyBalance.isAvailable('cards.transactions10'))
		return;

	var _id = result.__id;
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
// Обработка кредитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processLoans(html, result) {
	if(!AnyBalance.isAvailable('loans'))
		return;

	html = AnyBalance.requestGet(nodeUrl + '/PhizIC/private/loans/list.do');
	var loans = getElements(html, /<div[^>]+class="productCover[^"]*activeProduct[^>]*">/ig);
	AnyBalance.trace('Найдено кредитов: ' + loans.length);
	result.loans = [];
	
	for(var i=0; i < loans.length; ++i){
		var _id = getParam(loans[i], null, null, /id=(\d+)/i);
		var title = getParam(loans[i], null, null, /<span[^>]*title="([^"]+)/i, replaceTagsAndSpaces, html_entity_decode);
		
		html = AnyBalance.requestGet(nodeUrl + '/PhizIC/private/loans/detail.do?id=' + _id);
		var acc_num = getParam(html, null, null, /Номер ссудного счета:[^]*?<td[^>]*>([^]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

		var c = {__id: _id, num: acc_num, __name: title};
		
		if(__shouldProcess('loans', c)) {
			processLoan(html, c);
		}
		result.loans.push(c);
	}
}

function processLoan(html, result){
	var _id = result.__id;
    AnyBalance.trace('Обработка кредита ' + result.__name);
	
	getParam(html, result, 'loans.balance', /Осталось оплатить:[^]*?<td[^>]*>([^]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['loans.currency', 'loans.balance', 'loans.loan_ammount', 'loans.minpay'], /Осталось оплатить:[^]*?<td[^>]*>([^]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'loans.minpaydate', /Внести до:[^]*?<td[^>]*>([^]*?)<\/td>/i, replaceTagsAndSpaces, parseDateWord);
	getParam(html, result, 'loans.minpay', /<span[^>]*detailAmount[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'loans.loan_ammount', /Сумма кредита:[^]*?<td[^>]*>([^]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'loans.userName', /ФИО заемщика:[^]*?<td[^>]*>([^]*?)<\/td>/i, replaceTagsAndSpaces, capitalFirstLetters);
	getParam(html, result, 'loans.agreement', /Номер договора:[^]*?<td[^>]*>([^]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'loans.return_type', /Способ погашения:[^]*?<td[^>]*>([^]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'loans.date_start', /Кредит открыт:[^]*?<td[^>]*>([^]*?)<\/td>/i, replaceTagsAndSpaces, parseDateWord);
	getParam(html, result, 'loans.till', /Дата закрытия кредита:[^]*?<td[^>]*>([^]*?)<\/td>/i, replaceTagsAndSpaces, parseDateWord);
	getParam(html, result, 'loans.place', /Место оформления:[^]*?<td[^>]*>([^]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка металлических счетов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processMetalAccounts(html, result) {
    if(!AnyBalance.isAvailable('accounts_met'))
        return;

	html = AnyBalance.requestGet(nodeUrl + '/PhizIC/private/ima/list.do');
	var accounts = getElements(html, /<div[^>]+class="productCover[^"]*activeProduct[^>]*">/ig);
	AnyBalance.trace('Найдено мет. счетов: ' + accounts.length);
	result.accounts_met = [];
	
	for(var i=0; i < accounts.length; ++i){
		var _id = getParam(accounts[i], null, null, /id=(\d+)/i);
		var title = getParam(accounts[i], null, null, /<span[^>]*title="([^"]+)/i, replaceTagsAndSpaces, html_entity_decode);
		// Заменим ID на номер счета, чтобы выполнять поиск по счетам
		var acc_num = getParam(html, null, null, /"productNumberBlock"(?:[^>]*>){2}\s*([^<]+)/i, [/\D/g, '']);

		var c = {__id: _id, num: acc_num, __name: title};
		
		if(__shouldProcess('accounts_met', c)) {
			processMetalAccount(html, c);
		}
		result.accounts_met.push(c);
	}
}

function processMetalAccount(html, result){
    var _id = result.__id;
    AnyBalance.trace('Обработка металлического счета ' + result.__name);
	
	getParam(html, result, 'accounts_met.weight', /"overallAmount"([^>]*>){2}/i, replaceTagsAndSpaces, parseBalance);
	getParam('г.', result, ['accounts_met.weight_units', 'accounts_met.weight']);
    getParam(html, result, 'accounts_met.balance', /По курсу покупки Банка:([^]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'accounts_met.currency', /По курсу покупки Банка:([^]*?)<\/div>/i, replaceTagsAndSpaces, parseCurrency);
    getParam(html, result, 'accounts_met.date_start', /Открыт:[^]*?<td[^>]*>([^]*?)<\/td>/i, replaceTagsAndSpaces, parseDateWord);

    if(AnyBalance.isAvailable('accounts_met.transactions')){
        processMetalAccountTransactions(html, result);
    }
}

function processMetalAccountTransactions(html, result){
    html = AnyBalance.requestGet(nodeUrl + '/PhizIC/private/async/extract.do?type=ima&id=' + result.__id);

    var trs = getElements(html, /<tr[^>]+ListLine[^>]*>/ig);
    if(!trs.length){
        AnyBalance.trace('Не удалось найти последние транзакции по мет. счету');
        AnyBalance.trace(html);
        return;
    }

    result.transactions = [];

    for (var i = 0; i < trs.length; i++) {
        var tr = trs[i];
        var t = {};

        getParam(tr, t, 'accounts_met.transactions.time', /([^]*?<\/td>){1}/i, replaceTagsAndSpaces, parseDate);
        getParam(tr, t, 'accounts_met.transactions.descr', /([^]*?<\/td>){2}/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(tr, t, 'accounts_met.transactions.weight', /([^]*?<\/td>){3}/i, replaceTagsAndSpaces, parseBalance);
        getParam(tr, t, 'accounts_met.transactions.sum', /([^]*?<\/td>){4}/i, [/<span[^>]+minus-amount[^>]*>/i, '-', replaceTagsAndSpaces], parseBalance);

        result.transactions.push(t);
    }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Профиль пользователя
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processProfile(html, result) {
	if(!AnyBalance.isAvailable('info'))
		return;

	AnyBalance.trace('Разбираем профиль...');

	var info = result.info = {};
	
	html = AnyBalance.requestGet(nodeUrl + '/PhizIC/private/userprofile/userSettings.do');
	
	getParam(html, info, 'info.fio', /<span[^>]+"userFIO"[^>]*>([^]*?)<\/span>/i, replaceTagsAndSpaces, capitalFirstLetters);
	getParam(html, info, 'info.hphone', /Домашний телефон:[^]*?<span[^>]+"phoneNumber"[^>]*>([^]*?)<\/span>/i, replaceTagsAndSpaces);
    getParam(html, info, 'info.phone', /Мобильный телефон:[^]*?<span[^>]+"phoneNumber"[^>]*>([^]*?)<\/span>/i, replaceTagsAndSpaces);
	getParam(html, info, 'info.email', /<span[^>]+userEmail[^>]*>([^]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, info, 'info.passport', /Паспорт гражданина РФ[^]*?<td[^>]+class="docNumber"[^>]*>([^]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, info, 'info.snils', /Страховое свидетельство[^]*?<div[^>]+class="documentNumber"[^>]*>([^]*?)<\/div>/i, replaceTagsAndSpaces);
    getParam(html, info, 'info.inn', /<div[^>]*documentTitle[^>]*>\s*ИНН[^]*?<div[^>]+class="documentNumber"[^>]*>([^]*?)<\/div>/i, replaceTagsAndSpaces);
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
	
	return day + '/' + month + '/' + year;
}

function getParamByName(html, name) {
    return getParam(html, null, null, new RegExp('name=["\']' + name + '["\'][^>]*value=["\']([^"\']+)"', 'i'));
}

function processRates(html, result) {
	AnyBalance.trace('Fetching rates...');
	
	getParam(html, result, 'eurPurch', /"currencyRateName"[^>]*>EUR(?:[^>]*>){2}([^<]*)/i, null, parseBalance);
	getParam(html, result, 'eurSell', /"currencyRateName"[^>]*>EUR(?:[^>]*>){5}([^<]*)/i, null, parseBalance);
	getParam(html, result, 'usdPurch', /"currencyRateName"[^>]*>USD(?:[^>]*>){2}([^<]*)/i, null, parseBalance);
	getParam(html, result, 'usdSell', /"currencyRateName"[^>]*>USD(?:[^>]*>){5}([^<]*)/i, null, parseBalance);
}

function fetchNewThanks(baseurl, result) {
	AnyBalance.trace('Попробуем получить Спасибо от сбербанка...');
	if (AnyBalance.isAvailable('spasibo')) {
		html = AnyBalance.requestGet(baseurl + '/PhizIC/private/async/loyalty.do');
		
		var href = getParam(html, null, null, /^\s*(https?:\/\/\S*)/i, replaceTagsAndSpaces, html_entity_decode);
		if (!href) {
			AnyBalance.trace('Не удаётся получить ссылку на спасибо от сбербанка: ' + html);
		} else {
			html = AnyBalance.requestGet(href);
			getParam(html, result, 'spasibo', /Баланс:\s*<strong[^>]*>\s*([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		}
	}
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

