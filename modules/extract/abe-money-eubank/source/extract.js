/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/


var g_domain = 'my.smartbank.kz';
var g_baseurl = 'https://' + g_domain + '/';
var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:35.0) Gecko/20100101 Firefox/35.0'
};

function login() {
	var prefs = AnyBalance.getPreferences();

	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

    if(!AnyBalance.getCookie('JSESSIONID')) {
        var sessionId = AnyBalance.getData('JSESSIONID');
        if (sessionId) {
            AnyBalance.setCookie('my.smartbank.kz', 'JSESSIONID', sessionId);
        }
    }
	var html = AnyBalance.requestGet(g_baseurl, g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту интернет-банка! Попробуйте обновить данные позже.');
	}
	
	if (!/logout/i.test(html)) {
        html = AnyBalance.requestPost(g_baseurl + 'j_spring_security_check', {
            'j_username': prefs.login,
            'j_password': prefs.password
        }, addHeaders({Referer: g_baseurl}));
	} else {
		AnyBalance.trace('Уже залогинены, используем существующую сессию')
	}

    if (/Изменить пароль/i.test(html)) {
        throw new AnyBalance.Error('Вам требуется сменить пароль! Зайдите в кабинет через браузер и поменяйте ваш пароль.', null, true);
    }

	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+error[^>]*>([\s\S]*?)(?:<\/div>)/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			if (error) throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в интернет-банк. Сайт изменен?');
	}

    AnyBalance.setData('JSESSIONID', AnyBalance.getCookie('JSESSIONID'));
	AnyBalance.saveData();
    
    __setLoginSuccessful();
	
	return html;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Карты
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(html, result) {
	if(!AnyBalance.isAvailable('cards'))
		return;
	
    // После авторизации мы будем переадресованы на страницу, где предоставлена вся информация о картах.
    // Если это не так тогда запросим страницу с картами
    var cardList = getParam(html, null, null, /<div[^>]+accounts-cards[^>]*>[^]*?<\/script>\s*<\/div>\s*<\/div>/i);
	if(!cardList) {
        var html = AnyBalance.requestGet(g_baseurl + 'accounts/cards', g_headers);
        var cardList = getParam(html, null, null, /<div[^>]+accounts-cards[^>]*>[^]*?<\/script>\s*<\/div>\s*<\/div>/i);
	}

	if(!cardList) {
        if(/У вас нет карт/i.test(html)) { // не протестировано
            AnyBalance.trace('У вас нет карт');
            result.cards = [];
        } else {
            AnyBalance.trace(html);
            AnyBalance.trace('Не удалось найти таблицу с картами.');
        }
		return;
	}
	
	var cards = sumParam(cardList, null, null, /<li\s+accountId=[^>]+">[\s\S]*?<\/li>/ig);
	AnyBalance.trace('Найдено карт: ' + cards.length);
	result.cards = [];
	
	for(var i=0; i < cards.length; ++i){
		var card = cards[i];
		var _id = getParam(card, null, null, /<li\s+accountId="([^"]+)"/i, replaceTagsAndSpaces);
		var title = getParam(card, null, null, /<a\s+id="title-[^>]+">([\s\S]*?)<\/a>/i, replaceTagsAndSpaces);
        var num = getParam(card, null, null, /<div\s+class="card\s+[\S\s]*<div\s+class="number[^>]+>(.+)<\/div/i, replaceTagsAndSpaces);
        var type = getParam(card, null, null, /<div\s+class="card\s+[\S\s]*<div\s+class="title[^>]+>(.+)<\/div/i, replaceTagsAndSpaces);
		title = title + ' ' + type + ' ' + num.substr(-4);
        
		var c = {__id: _id, num: num, type: type, __name: title};

		if (__shouldProcess('cards', c)) {
			processCard(card, c);
		}

		result.cards.push(c);
	}
}

function processCard(card, result) {
    AnyBalance.trace('Обработка карты ' + result.__name);
	
	var json = AnyBalance.requestPost(g_baseurl + 'accounts/card_details_ajax', {
        'md5': result.__id,
        'details': true
    }, addHeaders({Referer: g_baseurl+'accounts?locale=ru'}));
    
    try {
        json = json.replace(/[\x00-\x1F\x7F-\x9F]/g, "");
        json = JSON.parse(json);
        json = json[result.__id];
    } catch(e) {
        throw new AnyBalance.Error('Не удалось получить информацию о карте. Сайт изменён?');
    }

    getParam(json.availBalance, result, 'cards.balance', null, replaceTagsAndSpaces, parseBalance);
    getParam(json.blockedSum, result, 'cards.blocked', null, replaceTagsAndSpaces, parseBalance);
    getParam(json.overdraft, result, 'cards.limit', /Кредитный лимит:(?:[^>]*>){4}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
    getParam(json.currency, result, ['cards.currency', 'cards.balance'], null, [AB.replaceTagsAndSpaces, /(.*?)/i, '0$1'], AB.parseCurrency);
    getParam(json.number, result, 'cards.accnum', null, replaceTagsAndSpaces);
    getParam(json.status, result, 'cards.status', null, replaceTagsAndSpaces);
    getParam(card, result, 'cards.till', /<div\s+class="card\s+[\S\s]*<span\s+class="carddate[^>]+>([\s\S]+)<\/span>\s*<\/div/i, replaceTagsAndSpaces, parseDateWord);
    getParam(card, result, 'cards.holder', /<div\s+class="card\s+[\S\s]*<div\s+class="name[^>]+>(.+)<\/div/i, replaceTagsAndSpaces);
	
	if(isAvailable('cards.transactions'))
		processCardTransactions(card, result);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Счета
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processAccounts(html, result) {
	if(!isAvailable('accounts'))
		return;

	throw new AnyBalance.Error('Текущие счета пока не поддерживаются. Обращайтесь к разработчикам.');
/*	var json = callApi('getMyFinancesPage', {bankId: g_bankId, type: 'ACCOUNTS'});

	var accounts = (json.object.accounts && json.object.accounts.accounts) || [];
	
	AnyBalance.trace('Найдено счетов: ' + accounts.length);
	result.accounts = [];
	
	for(var i=0; i < accounts.length; ++i) {
		var acc = accounts[i];

		var id = acc.number;
		var name = acc.name;
		var title = name + ' ' + id.substr(-4);
		
		var c = {
			__id: id,
			__name: title,
			num: id,
			name: name
		};
		
		if(__shouldProcess('accounts', c)){
			processAccount(acc, c);
		}
		
		result.accounts.push(c);
	}*/
}
/*
function processAccount(acc, result) {
    getParam(acc.availableWhenPay, result, 'accounts.balance');
    getParam(acc.currencyCode, result, ['accounts.currency', 'accounts']);
    getParam(acc.availableWhenPay, result, 'accounts.date_start');

    if(typeof processAccountTransactions != 'undefined') {
      processAccountTransactions(acc, result);
    }
}*/
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Кредиты
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCredits(html, result) {
	if(!isAvailable('credits'))
		return;

	throw new AnyBalance.Error('Кредиты пока не поддерживаются. Обращайтесь к разработчикам.');
/*	
	var html = AnyBalance.requestGet(baseurl + 'main?main=priv', g_headers);
  	html = requestGetWicketActionEx(html, /wicket.event.add\([^"]*?"load"[\s\S]*?"c":"([^"]*)/i);

  var credits = [];
  	try{
		html = requestGetWicketAction(html, /<div[^>]+class="inner\b[^>]+id="(id[^"]+)"(?:[^>]*>){3,7}\s*Кредиты/i);

		credits = getElements(html, /<div[^>]+class=['"]account inner[^>]*>/ig);
	
		AnyBalance.trace('Найдено кредитов: ' + credits.length);
	}catch(e){
		if(/Заявка на кредит/i.test(html)){
			AnyBalance.trace('Кредитов нет: ' + e.message);
		}else{
			AnyBalance.trace('Не удалось найти ссылку на кредиты.' + e.message);
		}
	}
	result.credits = [];
	
	for(var i=0; i < credits.length; ++i) {
		var title = getParam(credits[i], null, null, /<span[^>]*class=['"]index['"](?:[^>]*>){2}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		// Ну нет тут возможности определить id 
		var _id = title;
		
		var c = {__id: _id, __name: title};
		
		if(__shouldProcess('credits', c)) {
			processCredit(credits[i], c, html);
		}
		
		result.credits.push(c);
	} */
}
/*
function processCredit(credit, result, html) {
	getParam(credit, result, 'credits.limit', /class="sum"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(credit, result, ['credits.currency', 'credits.limit', 'credits.balance'], /class="sum"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseCurrency);
	
	getParam(credit, result, 'credits.minpay_till', /К оплате([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDate);
	getParam(credit, result, 'credits.minpay', /К оплате[\s\S]*?class="sum"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	
    html = requestGetWicketAction(credit + html, /<div[^>]+class="account inner[^>]+id="(id[^"]+)"/i);

    getParam(html, result, 'credits.balance', /Общая задолженность(?:[^>]*>){3}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'credits.principal_debt', /Сумма основного долга(?:[^>]*>){3}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'credits.pct_sum', /Cумма начисленных процентов(?:[^>]*>){3}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'credits.debt_expired', /Сумма просроченного основного долга(?:[^>]*>){3}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'credits.pct_expired', /Сумма просроченных процентов(?:[^>]*>){3}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'credits.penalty', /Штрафы(?:[^>]*>){3}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'credits.minpay_till', /К оплате([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseDate);
    getParam(html, result, 'credits.minpay', /К оплате[\s\S]*?<div[^>]+total-amounts[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'credits.minpay_main_debt', /К оплате[\s\S]*?Сумма основного долга([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'credits.minpay_pct', /К оплате[\s\S]*?Сумма процентов([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'credits.minpay_others', /К оплате[\s\S]*?Другие комиссии([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'credits.minpay_penalty', /К оплате[\s\S]*?Пеня за([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'credits.minpay_pct_expired', /К оплате[\s\S]*?Сумма просроченных процентов([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'credits.minpay_debt_expried', /К оплате[\s\S]*?Сумма просроченного основного долга([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);

    var _html = requestGetWicketAction(html, /<small[^>]+id="([^"]*)[^>]*>\s*Условия договора/i);
    getParam(_html, result, 'credits.contract', /Договор №\s*<span[^>]*>([^<]*)<\/span>/i, replaceTagsAndSpaces);
    getParam(_html, result, 'credits.date_start', /Договор №[\s\S]*?от\s*<span[^>]*>([^<]*)<\/span>/i, replaceTagsAndSpaces, parseDate);
    getParam(_html, result, 'credits.till', /Дата планового закрытия[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseDate);
    getParam(_html, result, 'credits.payment', /Размер ежемесячного платежа[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(_html, result, 'credits.pct', /Процентная ставка[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(_html, result, 'credits.accnum', /Счет для погашения[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
    getParam(_html, result, 'credits.pct_effective', /Полная стоимость кредита[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);

	if(typeof processCreditSchedule != 'undefined') {
    	processCreditSchedule(html, result);
    }
}
*/
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Депозиты
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processDeposits(html, result) {
	
	if(!isAvailable('deposits'))
		return;
	
    // После авторизации мы будем переадресованы на страницу, где предоставлена вся информация о депозитах.
    // Если это не так тогда запросим страницу с картами
    var depositList = getParam(html, null, null, /<div[^>]+accounts-deposit[^>]*>[^]*?<\/script>\s*<\/div>\s*<\/div>/i);
	if(!depositList) {
        var html = AnyBalance.requestGet(g_baseurl + 'accounts/deposit', g_headers);
        var depositList = getParam(html, null, null, /<div[^>]+accounts-deposit[^>]*>[^]*?<\/script>\s*<\/div>\s*<\/div>/i);
	}

	if(!depositList) {
        if(/У вас нет депозитов/i.test(html)) {
            AnyBalance.trace('У вас нет депозитов');
            result.deposits = [];
        } else {
            AnyBalance.trace(html);
            AnyBalance.trace('Не удалось найти таблицу с депозитами.');
        }
		return;
	}
	
	var deposits = sumParam(depositList, null, null, /<li\s+accountId=[^>]+">[\s\S]*?<\/li>/ig);
	AnyBalance.trace('Найдено депозитов: ' + deposits.length);

	result.deposits = [];
    
	for(var i=0; i < deposits.length; ++i) {
		var dep = deposits[i];

        var _id = getParam(dep, null, null, /<li\s+accountId="([^"]+)"/i, replaceTagsAndSpaces);
        var title = getParam(dep, null, null, /<a\s+id="title-[^>]+">([\s\S]*?)<\/a>/i, replaceTagsAndSpaces);
		
		var c = {__id: _id, __name: title};
		
		if(__shouldProcess('deposits', c)) {
			processDeposit(dep, c);
		}
		
		result.deposits.push(c);
	}
}

function processDeposit(dep, result) {
    AnyBalance.trace('Обработка депозита ' + result.__name);
	
	var totalsJson = AnyBalance.requestPost(g_baseurl + 'accounts/updateTotals', {
        'deposit': 'KZT'
    }, addHeaders({Referer: g_baseurl+'accounts?locale=ru'}));
    
    try {
        totalsJson = JSON.parse(totalsJson);
        totalsJson = totalsJson.body.accountTypes[0];
        var totals;
        for(var i=0; i < totalsJson.accounts.length; ++i) {
            var depAccount = totalsJson.accounts[i];
            if (depAccount.md5 === result.__id) {
                totals = depAccount;
            }
        }
        
        if (!totals.amount) {
            AnyBalance.trace(totalsJson);
            AnyBalance.trace('Не удалось получить баланс депозита.');
        }
    } catch(e) {
        AnyBalance.trace(totalsJson);
        AnyBalance.trace('Не удалось получить баланс депозита.');
    }
    
    var json = AnyBalance.requestPost(g_baseurl + 'accounts/deposit_details_ajax', {
        'md5': result.__id,
        'details': true
    }, addHeaders({Referer: g_baseurl+'accounts?locale=ru'}));
    
    try {
        json = json.replace(/[\x00-\x1F\x7F-\x9F]/g, "");
        json = JSON.parse(json);
        json = json[result.__id];
    } catch(e) {
        throw new AnyBalance.Error('Не удалось получить информацию о депозите. Сайт изменён?');
    }


	if(totals.amount) {
		getParam(totals.amount.amount, result, 'deposits.balance', null, null, parseBalance);
		getParam(totals.amount.currency, result, ['deposits.currency', 'deposits.balance'], null, [AB.replaceTagsAndSpaces, /(.*?)/i, '0$1'], AB.parseCurrency);
    }
    getParam(json.number, result, 'deposits.accnum', replaceTagsAndSpaces);
    getParam(json.dateOpened, result, 'deposits.date_start', null, replaceTagsAndSpaces, parseDateWord);
    getParam(json.type, result, 'deposits.type', null, replaceTagsAndSpaces);
    getParam(json.arrestedSum, result, 'deposits.blocked', null, replaceTagsAndSpaces, parseBalance);
    getParam(dep, result, 'deposits.pct', /<div[^>]+class="percent"(?:[^>]*>){1}([^<]*)/i, replaceTagsAndSpaces, AB.parseBalance);
    getParam(dep, result, 'deposits.deptill', /<div[^>]+class="date"(?:[^>]*>){1}([^<]*)/i, ['До ', ''].concat(replaceTagsAndSpaces), parseDateWord);

    if(isAvailable('deposits.transactions') && typeof processDepositsTransactions != 'undefined') {
        processDepositsTransactions(deposit, result);
    }
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Бонусы
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processBonuses(html, result) {
	
	if(!isAvailable('info.bonuses'))
		return;
	
    // После авторизации мы будем переадресованы на страницу, где предоставлена вся информация о депозитах.
    // Если это не так тогда запросим страницу с картами
    var bonusList = getParam(html, null, null, /<div[^>]+accounts-bonus[^>]*>[^]*?<\/script>\s*<\/div>\s*<\/div>/i);
	if(!bonusList) {
        var html = AnyBalance.requestGet(g_baseurl + 'accounts/bonus', g_headers);
        var bonusList = getParam(html, null, null, /<div[^>]+accounts-bonus[^>]*>[^]*?<\/script>\s*<\/div>\s*<\/div>/i);
	}

	if(!bonusList) {
        if(/У вас нет бонусов/i.test(html)) { // не протестировано
            AnyBalance.trace('У вас нет бонусов');
        } else {
            AnyBalance.trace(html);
            AnyBalance.trace('Не удалось найти таблицу с бонусами.');
        }
		return;
	}
	
	var bonuses = sumParam(bonusList, null, null, /<li\s+accountId=[^>]+">[\s\S]*?<\/li>/ig);
	AnyBalance.trace('Найдено бонусов: ' + bonuses.length);

	for(var i=0; i < bonuses.length; ++i) {
		var bonus = bonuses[i];

        var _id = getParam(bonus, null, null, /<li\s+accountId="([^"]+)"/i, replaceTagsAndSpaces);
		
		var totalsJson = AnyBalance.requestPost(g_baseurl + 'accounts/updateTotals', {
            'bonus': 'BNS'
        }, addHeaders({Referer: g_baseurl+'accounts?locale=ru'}));
        
        try {
            totalsJson = JSON.parse(totalsJson);
            totalsJson = totalsJson.body.accountTypes[0];
            var totals;
            for(var i=0; i < totalsJson.accounts.length; ++i) {
                var acc = totalsJson.accounts[i];
                if (acc.md5 === _id) {
                    totals = acc;
                    break;
                }
            }
            
            if (!totals.amount) {
                AnyBalance.trace(totalsJson);
                AnyBalance.trace('Не удалось получить баланс бонусов.');
            }
        } catch(e) {
            AnyBalance.trace(totalsJson);
            AnyBalance.trace('Не удалось получить баланс бонусов.');
        }
        
        getParam(totals.amount.amount, result.info, 'info.bonuses', null, null, parseBalance);
	}
}
function processInfo(html, result){
    var info = result.info = {};

    getParam(html, info, 'info.fio', /<div[^>]+class="account"(?:[^>]*>){2}([^<]*)/i, AB.replaceTagsAndSpaces);
}