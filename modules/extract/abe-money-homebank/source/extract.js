/**
 Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
 */

var g_headers = {
	'Accept':'application/json, text/plain, */*',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'close',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:35.0) Gecko/20100101 Firefox/35.0'
};

var g_baseurl = 'https://api2.homebank.kz/hbapi/api/v1/';
var g_oauth_url = 'https://oauth.homebank.kz/';
var g_token;
var g_fingerprint;
var oauth_default_client_id = 'hb3halyk';
var oauth_default_secret = 'F8aE1wqIUhWazLYs6qVuSwrWhglfET1r';

function callApi(verb, params){
	if(!g_token && verb != 'oauth2/token')
		throw new AnyBalance.Error('Внутренняя ошибка, сайт изменен?');

	var headers, url, formatted_params;
	if(!g_token){
		headers = addHeaders({Authorization: 'Basic aGIzaGFseWs6MjE4QzIzRTItOUQ2NC00NUQ0LUJCQ0YtNUJENkNDMzE2NDg0'});
	}else{
		headers = addHeaders({Authorization: 'Bearer ' + g_token});
	}
	if(params) {
		headers['Content-Type'] = 'application/json';
    }
    url = g_baseurl;
    formatted_params = params && JSON.stringify(params);
    
    if (verb === 'oauth2/token') {
        url = g_oauth_url;
        headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
        if (params.grant_type === 'password') {
            headers['Fingerprint'] = getFingerprint();
            headers['x-recaptcha'] = solveRecaptcha("Пожалуйста, докажите, что вы не робот.", "https://homebank.kz/", JSON.stringify({SITEKEY: '6LeaksYUAAAAAKSdZ3zOupIZj7TGYC67DFlL_MI4', TYPE: 'V3', ACTION: 'login'}));
        }
        formatted_params = params;
    }

	var html = AnyBalance.requestPost(url + verb, formatted_params, headers, {HTTP_METHOD: params ? 'POST' : 'GET'});

	if(AnyBalance.getLastStatusCode() >= 400){
		AnyBalance.trace(html);
		var json = getJson(html);
        if (json && json.UserMessage) {
            throw new AnyBalance.Error(json.UserMessage, null, /(Вы не зарегистрированы|неверный логин)/i.test(json.UserMessage));
        } else {
            throw new AnyBalance.Error('Ошибка вызова API ' + verb + ': ' + AnyBalance.getLastStatusCode());
        }
	}

	var json = getJson(html);
	return json;
}

function login(prefs) {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');

	AnyBalance.setOptions({
		SSL_ENABLED_PROTOCOLS: ['TLSv1.2'] //Очень защищен казкоммерц...
	});
	
	checkEmpty(prefs.login, 'Введите логин1!');
	checkEmpty(prefs.password, 'Введите пароль2!');

	if(!g_token){
		var json = callApi('oauth2/token', {
			"grant_type":"client_credentials",
			"scope":"webapi sms_send verification email_send",
			"client_id":oauth_default_client_id,
			"client_secret":oauth_default_secret,
		});

		g_token = json.access_token;
	}

	var json = callApi('oauth2/token', {
		"grant_type":"password",
		"username":prefs.login,
		"password":prefs.password,
		"scope":"webapi sms_send verification email_send openapi",
		"client_id":oauth_default_client_id,
		"client_secret":oauth_default_secret,
	});

	g_token = json.access_token;
}

function getFingerprint() {
    if (!g_fingerprint) {
        g_fingerprint = AnyBalance.getData('fingerprint');
    }
    
    if (!g_fingerprint) {
        var allowedChars = 'abcdef1234567890';
        var result = "";

        for(var i=0; i<32; ++i) {
            result += allowedChars.charAt(Math.floor(Math.random() * allowedChars.length));
        }
        
        g_fingerprint = result;
        AnyBalance.setData('fingerprint', result);
        AnyBalance.saveData();
    }
	
	return g_fingerprint;
}

function processInfo(result){
	if(!AnyBalance.isAvailable('info'))
        return;
    
    var user = callApi('users');
	result.info = info = {};

	getParam([user.lastName, user.firstName, user.middleName].join(' '), info, 'info.fio');
	getParam(user.phone, info, 'info.mphone');
	getParam(user.iin, info, 'info.iin');
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка счетов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processAccounts(result) {
	if (!isAvailable('accounts'))
		return;

	var cards = callApi('accounts');

	AnyBalance.trace('Найдено счетов: ' + cards.length);
	result.accounts = [];

	for (var i = 0; i < cards.length; ++i) {
		var card = cards[i];
		var _id = card.systemAttributeId;
		var title = card.aliasName ? card.aliasName : (card.accName + ' ' + card.currency + ' ' + card.iban);

		var c = {__id: _id, __name: title, num: card.iban};

		if (__shouldProcess('accounts', c)) {
			processAccount(cards[i], c);
		}

		result.accounts.push(c);
	}
}

function processAccount(info, result){
	getParam(info.balance, result, 'accounts.balance');
	getParam(info.blockedAmount, result, 'accounts.blocked');
	getParam(info.currency, result, ['accounts.currency', 'accounts.blocked', 'accounts.balance']);
	getParam(info.iban, result, 'accounts.num');
	getParam(info.openDate, result, 'accounts.date_start', null, null, parseDateISO);

	if (typeof processAccountTransactions != 'undefined')
		processAccountTransactions(info, result);
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка карт
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(result) {
	if (!isAvailable('cards'))
		return;

	var cards = callApi('cards');

	AnyBalance.trace('Найдено карт: ' + cards.length);
	result.cards = [];

	for (var i = 0; i < cards.length; ++i) {
		var card = cards[i];
        
        if (card.cardInfo.accountType !== 'C') {
            // внутренние счета, закрытые карты и т.п.
            continue;
        }
        
		var _id = card.systemAttributeId;
		var title = resolveCardAlias(card) + ' ' + card.cardInfo.cardMask.substr(-4);

		var c = {__id: _id, __name: title};

		if (__shouldProcess('cards', c)) {
			processCard(cards[i], c);
		}

		result.cards.push(c);
	}
}

function processCard(card, result) {
    var info = card.cardInfo;
    
	for(var i= 0; i < info.balances.length; i++) {
		var current = info.balances[i];
	
		sumParam(current.amount, result, 'cards.balance_' + current.curr.toLowerCase(), null, null, null, aggregate_sum);
	}
    
    getParam(info.currency, result, ['cards.currency']);
	getParam(info.creditLimit, result, 'cards.limit');
	getParam(info.blockedAmount, result, 'cards.blocked');
	getParam(info.cardMask, result, 'cards.num');
	getParam(info.iban, result, 'cards.accnum');
	getParam('01.'+info.expirationDates.expMonth+'.'+info.expirationDates.expYear, result, 'cards.till', null, replaceTagsAndSpaces, parseDate);
}

function resolveCardAlias(json) {
    if (json.aliasName && json.aliasName.length) {
        return json.aliasName;
    }
    if ("444482_729246" === json.cardInfo.contrSubtypeCode || "510145_735174" === json.cardInfo.contrSubtypeCode) {
        return "Homebank Wallet";
    }
    var number = json.cardInfo.cardNum || json.cardInfo.cardMask,
        aliasName;
    switch (getCardType(number)) {
        case "visa":
            aliasName = "VISA";
            break;
        case "mastercard":
            aliasName = "MasterCard";
            break;
        case "unionpay":
            aliasName = "Union Pay";
            break;
        default:
            aliasName = "Карта"
    }
    
    if (json.cardInfo.isMultiCurrency) {
        return aliasName + " Мультивалютная";
    }
    
    return aliasName;
}

function getCardType(number) {
    var cardTypeRegex = {
        electron: /^(4026|417500|440564|4508|4844|4913|4917)\d*$/,
        maestro: /^(5018|5020|5038|5612|5893|6304|6759|6761|6762|6763|0604|6390)\d*$/,
        dankort: /^(5019)\d*$/,
        interpayment: /^(636)\d+$/,
        unionpay: /^(62|88)\d+$/,
        visa: /^4\d+$/,
        mastercard: /^5[1-5]\d+$/,
        diners: /^3(?:0[0-5]|[68][0-9])\d+$/,
        discover: /^6(?:011|5[0-9]{2})\d+$/,
        jcb: /^(?:2131|1800|35\d{3})\d{11}$/,
        amex: /^3[47]\d+$/
    };
    
    number = ("" + number).substr(0, 4);
    for (var s in cardTypeRegex)
        if (cardTypeRegex[s].test(number))
            return s;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка депозитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processDeposits(result) {
	if (!isAvailable('deposits'))
		return;

	var cards = callApi('deposits');

	AnyBalance.trace('Найдено депозитов: ' + cards.length);
	result.deposits = [];

	for (var i = 0; i < cards.length; ++i) {
		var card = cards[i];
		var _id = card.systemAttributeId;
		var title = card.aliasName ? card.aliasName : card.depositAccounts[0].depName;

		var c = {__id: _id, __name: title, num: card.depositAccounts[0].iban};

		if (__shouldProcess('deposits', c)) {
			processDeposit(cards[i], c);
		}

		result.deposits.push(c);
	}
}

function processDeposit(info, result) {
	getParam(info.depositAccounts[0].iban, result, 'deposits.num');
	getParam(info.depositAccounts[0].balance, result, 'deposits.balance');
	getParam(info.depositAccounts[0].currency, result, ['deposits.currency', 'deposits.balance', 'deposits.pcts']);
	getParam(info.depositAccounts[0].rate, result, 'deposits.pct');
	getParam(info.depositAccounts[0].interest, result, 'deposits.pcts');
	getParam(info.closeDate, result, 'deposits.till', null, null, parseDateISO);
	getParam(info.openDate, result, 'deposits.date_start', null, null, parseDateISO);
////	getParam(info.depositAccounts[0]., result, 'deposits.capitalization', /<capitalization>([\s\S]*?)<\/capitalization>/i, replaceTagsAndSpaces, parseBoolean);
	getParam(info.depositAccounts[0].depName, result, 'deposits.name');
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка кредитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCredits(result) {
    if (!AnyBalance.isAvailable('credits'))
        return;

    var cardList = getElement(html, /<li[^>]+data-menu-value="loan_accounts"[^>]*>/i);
    if (!cardList) {
        if (!/<li[^>]+loan_accounts/i.test(html)) {
            AnyBalance.trace('У вас нет кредитов');
            result.credits = [];
        } else {
            AnyBalance.trace(html);
            AnyBalance.trace('Не удалось найти перечень кредитов.');
        }
        return;
    }

    var cards = getElements(cardList, /<div[^>]+class="item"[^>]*>/ig);
    AnyBalance.trace('Найдено кредитов: ' + cards.length);
    result.credits = [];

    var error = getElement(cardList, /<div[^>]+error_box[^>]*>/i, replaceTagsAndSpaces);
    if(error) //Ну ваще же! Актуальные данные по счетам доступны в рабочее время (по времени Астаны)
        AnyBalance.trace('!!!!!! ' + error);

    for (var i = 0; i < cards.length; ++i) {
        var card = cards[i];
        var num = getElementsByClassName(card, 'account_mask', replaceTagsAndSpaces)[0];
        var title = getElement(card, /<div[^>]+account_name[^>]*>/i, replaceTagsAndSpaces);

        var c = {__id: num, __name: title + ' ' + num.substr(-4), num: num, error: error};

        if (__shouldProcess('credits', c) && !error) {
            getParam(title, result, 'credits.name');
            processCredit(card, c);
        }

        result.credits.push(c);
    }
}

function processCredit(html, result){
    AnyBalance.trace('Обработка кредита ' + result.__name);

    getParam(html, result, 'credits.balance', /<span[^>]+class="account_amount_val"[\s\S]*?<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, ['credits.currency', 'credits.balance'], /<span[^>]+class="account_amount_val"[\s\S]*?<\/span>/i, replaceTagsAndSpaces, parseCurrency);
    var id = getParam(html, null, null, /fid=([^&"'\s]+)/i, replaceHtmlEntities);

    if(AnyBalance.isAvailable('credits.limit', 'credits.till', 'credits.date_start', 'credits.pct', 'credits.pct_kok', 'credits.status')){
        var html = AnyBalance.requestGet(baseurl + 'finance/accounts/overview.htm?fid=' + id, g_headers);

        getParam(html, result, 'credits.limit', /Общая сумма кредита[\s\S]*?<div[^>]+class="cell"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
        getParam(html, result, 'credits.till', /Дата завершения договора[\s\S]*?<div[^>]+class="cell"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseDate);
        getParam(html, result, 'credits.date_start', /Дата заключения договора[\s\S]*?<div[^>]+class="cell"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseDate);
        getParam(html, result, 'credits.pct', /Процентная ставка(?:\s|<[^>]*>)*:[\s\S]*?<div[^>]+class="cell"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'credits.pct_kok', /Процентная ставка КОК[\s\S]*?<div[^>]+class="cell"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'credits.status', /Статус счета(?:\s|<[^>]*>)*:[\s\S]*?<div[^>]+class="cell"[^>]*>([\s\S]*?)<\/div>/i, [/<a[^>]*>[\s\S]*?<\/a>/i, '', replaceTagsAndSpaces]);

        if(isAvailable('credits.schedule'))
            processCreditSchedule(html, result);
    }

}

function processBonuses(result){
	if (!AnyBalance.isAvailable('bonus'))
		return;

	var bonuses = callApi('go-bonuses');
    var found = false;

	for (var i = 0; i < bonuses.length; ++i) {
		var bonusItem = bonuses[i];
		
        if (bonusItem.bonusInfo.clients.pool === 12) { // 12 - KKB bonus
            result.bonus = bonusItem.bonusInfo.clients.client.amount;
            found = true;
            break;
        }
	}
    
    if (!found) {
        throw new AnyBalance.Error('Не удаётся получить информацию о бонусах');
    }
}