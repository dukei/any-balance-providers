/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    Accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    Connection:'keep-alive',
    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.64 Safari/537.11'
};

var g_baseurl = 'https://i.binbank.ru/';

function callApi(verb, getparams, postparams, method, noexception){
	var html = AnyBalance.requestPost(
		g_baseurl + 'api/' + verb + (getparams ? '?' + createUrlEncodedParams(getparams) : ''),
		postparams ? JSON.stringify(postparams) : '',
		addHeaders({
			Referer: g_baseurl,
			'X-Application-Code': 'INTERNET',
			'Content-Type': postparams ? 'application/json;charset=UTF-8' : undefined
		}),
		{
			HTTP_METHOD: !postparams && !method? 'GET' : method || 'POST'
		}
	);

	var json = getJson(html);
	if(json.code && !noexception){
		var error = json.message;
		if(error)
			throw new AnyBalance.Error(error, null, /invalid_login/i.test(json.code));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Неизвестная ошибка: ' + json.code);
	}

	return json;	
}

function login() {
    var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setOptions({
		SSL_ENABLED_PROTOCOLS: ['TLSv1.1', 'TLSv1.2']
	});

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

    var html = AnyBalance.requestGet(g_baseurl + 'login', addHeaders({Referer: g_baseurl + '/index.asp'}));
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка интернет-банка. Попробуйте обновить данные позже.');
	}

	if(!getClientInfo()){
		callApi('v1/auth/login', null, {
		    "login": prefs.login,
		    "password": prefs.password,
		    "channel": "internet",
		    "gsm": true,
		    "device_id": "test"
		});
	}else{
        AnyBalance.trace('Уже залогинены, отлично.');
	}

    __setLoginSuccessful();

    return html;
}

function getClientInfo(){
	if(!getClientInfo.json){
		var json = callApi('v1/client', null, null, null, true);
		if(json.code){
			AnyBalance.trace(JSON.stringify(json));
			return false;
		}
		getClientInfo.json = json;
	}
	return getClientInfo.json;
}

function getProductsInfo(){
	if(!getProductsInfo.json)
    	getProductsInfo.json = callApi('v1_1/products');
    return getProductsInfo.json;
}


function processCards(result){
    if(!AnyBalance.isAvailable('cards'))
        return;

    var products = getProductsInfo();
    var cards = [];
    for(var i=0; i<products.length; ++i){
    	var p = products[i];
    	if(p.product_type == 'card'){
    		cards.push(p);
    	}
    }

    AnyBalance.trace('Найдено ' + cards.length + ' карт');

    result.cards = [];

    for (var i = 0; i < cards.length; i++) {
        var card = cards[i];

        var id = card.id;
        var name = card.name + ' ' + card.number.substr(-4);

        var c = {
            __id: id,
            __name: name,
            num: card.number,
            visibility: card.visibility
        };

        if(__shouldProcess('cards', c)){
            processCard(card, c);
        }

        result.cards.push(c);
    }

}

function processCard(card, result){
    AnyBalance.trace('Обрабатываем карту ' + result.__name);

    getParam(card.balance.currency, result, ['cards.currency', 'cards.balance', 'cards.limit', 'cards.blocked',
        'cards.available', 'cards.debt_main', 'cards.debt_due', 'cards.debt_pct', 'cards.debt_peni', 'cards.debt_comission',
        'cards.minpay', 'cards.debt', 'cards.transactions.sum_account']);
    getParam(card.balance.amount, result, 'cards.balance');
    getParam(card.blocked_amount.amount, result, 'cards.blocked');
    getParam(card.available_amount.amount, result, 'cards.available');

    getParam(card.expire_date, result, 'cards.till', null, null, parseDateISO);
    getParam(card.open_date, result, 'cards.date_start', null, null, parseDateISO);
    getParam(card.embossed_name, result, 'cards.holder');
    getParam(card.requisites.account_number, result, 'cards.accnum');
    getParam(card.state, result, 'cards.status_code'); //active|closed
    getParam(card.state_details, result, 'cards.status');
    getParam(card.type.type, result, 'cards.type');

    if(card.credit_card_loan){
    	getParam(card.credit_card_loan.credit_limit.amount, result, 'cards.limit');
    	getParam(card.credit_card_loan.interest_rate, result, 'cards.pct');
    	getParam(card.credit_card_loan.due_payment.total.amount, result, 'cards.minpay');
    	getParam(card.credit_card_loan.due_payment.due_date, result, 'cards.minpay_till', null, null, parseDateISO);
    	getParam(card.credit_card_loan.full_payment.total.amount, result, 'cards.debt');
    	getParam(card.credit_card_loan.full_payment.receivables.principal.amount, result, 'cards.debt_main');
    	getParam(card.credit_card_loan.full_payment.receivables.interest.amount, result, 'cards.debt_pct');
    	getParam(card.credit_card_loan.full_payment.receivables.charges.amount, result, 'cards.debt_peni');
    	getParam(card.credit_card_loan.full_payment.receivables.fees.amount, result, 'cards.debt_comission');
    }

    if(AnyBalance.isAvailable('cards.transactions')){
        processCardTransactions(card, result);
    }

    return result;
}

function processBonus(result){
    if(!AnyBalance.isAvailable('bonus'))
        return;

    var products = getProductsInfo();
    var loyalty = [];
    for(var i=0; i<products.length; ++i){
    	var p = products[i];
    	if(p.product_type == 'loyalty'){
    		loyalty.push(p);
    	}
    }

    if(!loyalty.length){
    	AnyBalance.trace('Бонус не найден');
    	return;
    }

    getParam(loyalty[0].balance.amount, result, 'bonus');
}

function processInfo(result){
    if(!AnyBalance.isAvailable('info'))
        return;

    result.info = {};
    var info = getClientInfo();

    var as = create_aggregate_join(' ');

    getParam(info.first_name, result.info, 'info.name');
    getParam(info.middle_name, result.info, 'info.name_patronymic');
    getParam(info.last_name, result.info, 'info.name_last');

    sumParam(info.last_name, result.info, 'info.fio', null, null, null, as);
    sumParam(info.first_name, result.info, 'info.fio', null, null, null, as);
    sumParam(info.middle_name, result.info, 'info.fio', null, null, null, as);

    getParam(info.is_resident, result.info, 'info.resident');

    getParam(info.unc, result.info, 'info.unc');

    for(var i=0; i<info.id_cards.length; ++i){
    	var card = info.id_cards[i];
    	if(/Паспорт гражданина РФ/i.test(card.type)){
    		AnyBalance.trace('Найден паспорт');
    		getParam(card.reg_number, result.info, 'info.passport');
    		getParam(card.reg_details, result.info, 'info.passport_issued_by');
    		getParam(card.reg_date, result.info, 'info.passport_issued', null, null, parseDateISO);
    	}else{
    	    AnyBalance.trace('Неизвестный документ: ' + JSON.stringify(card));
    	}
    }

    getParam(info.birth_date, result.info, 'info.birthday', null, null, parseDateISO);
    getParam(info.birth_place, result.info, 'info.birth_place');
	
    for(var i=0; i<info.addresses.length; ++i){
    	var addr = info.addresses[i];
    	if(addr.type == 'registration'){
    		AnyBalance.trace('Найден адрес регистрации');
    		getParam(addr.full_address, result.info, 'info.address');
    	}else if(addr.type == 'residence'){
    		AnyBalance.trace('Найден адрес проживания');
    		getParam(addr.full_address, result.info, 'info.address_residence');
    	}else{
    	    AnyBalance.trace('Неизвестный адрес: ' + JSON.stringify(addr));
    	}
    }

    if(AnyBalance.isAvailable('info.contacts')){
    	var contacts = callApi('v1/client/contacts');
    	result.info.contacts = [];
    	for(var i=0; i<contacts.length; ++i){
    		var c = {};
    		getParam(contacts[i].type.replace('onmt', 'mobile'), c, 'info.contacts.type');
    		getParam(contacts[i].value, c, 'info.contacts.contact');
    		result.info.contacts.push(c);
    	}
    }
}

function processAccounts(result){
    if(!AnyBalance.isAvailable('accounts'))
        return;

    var products = getProductsInfo();
    var cards = [];
    for(var i=0; i<products.length; ++i){
    	var p = products[i];
    	if(p.product_type == 'account'){
    		cards.push(p);
    	}
    }

    AnyBalance.trace('Найдено ' + cards.length + ' счетов');

    result.accounts = [];

    for (var i = 0; i < cards.length; i++) {
        var card = cards[i];

        var id = card.id;
        var name = card.name + ' ' + card.number.substr(-4);

        var c = {
            __id: id,
            __name: name,
            num: card.number,
            visibility: card.visibility

        };

        if(__shouldProcess('accounts', c)){
            processAccount(card, c);
        }

        result.accounts.push(c);
    }

}

function processAccount(acc, result){
    AnyBalance.trace('Обрабатываем счет ' + result.__name);

    getParam(acc.balance.currency, result, ['accounts.currency', 'accounts.balance']);
    getParam(acc.balance.amount, result, 'accounts.balance');
    getParam(acc.open_date, result, 'accounts.date_start', null, null, parseDateISO);
    getParam(acc.state, result, 'accounts.status_code'); //active|closed
    getParam(acc.state_details, result, 'accounts.status');
    getParam(acc.name, result, 'accounts.name');

    if(AnyBalance.isAvailable('accounts.transactions')){
        processAccountTransactions(acc, result);
    }

    return result;
}

function processDeposits(result){
    if(!AnyBalance.isAvailable('deposits'))
        return;

    var products = getProductsInfo();
    var cards = [];
    for(var i=0; i<products.length; ++i){
    	var p = products[i];
    	if(p.product_type == 'deposit'){
    		cards.push(p);
    	}
    }

    AnyBalance.trace('Найдено ' + cards.length + ' депозитов');

    result.deposits = [];

    for (var i = 0; i < cards.length; i++) {
        var card = cards[i];

        var id = card.id;
        var name = card.name + ' ' + card.number.substr(-4);

        var c = {
            __id: id,
            __name: name,
            num: card.number,
            visibility: card.visibility
        };

        if(__shouldProcess('deposits', c)){
            processDeposit(card, c);
        }

        result.deposits.push(c);
    }

}

function processDeposit(acc, result){
    AnyBalance.trace('Обрабатываем депозит ' + result.__name);

    getParam(acc.name, result, 'deposits.name');
    getParam(acc.balance.currency, result, ['deposits.currency', 'deposits.balance']);
    getParam(acc.balance.amount, result, 'deposits.balance');
    getParam(acc.start_money_amount.amount, result, 'deposits.balance_start');
    getParam(acc.open_date, result, 'deposits.date_start', null, null, parseDateISO);
    getParam(acc.expire_date, result, 'deposits.date_end', null, null, parseDateISO);
    getParam(acc.state, result, 'deposits.status_code'); //active|closed
    getParam(acc.state_details, result, 'deposits.status');
    getParam(acc.rate, result, 'deposits.pct');

    if(AnyBalance.isAvailable('deposits.transactions')){
        processDepositTransactions(acc, result);
    }

    return result;
}

function processCredits(result){
    if(!AnyBalance.isAvailable('credits'))
        return;

    var products = getProductsInfo();
    var cards = [];
    for(var i=0; i<products.length; ++i){
    	var p = products[i];
    	if(p.product_type == 'credit'){
    		cards.push(p);
    	}
    }

    AnyBalance.trace('Найдено ' + cards.length + ' кредитов');

    result.credits = [];

    for (var i = 0; i < cards.length; i++) {
        var card = cards[i];

        var id = card.id;
        var name = card.name + ' ' + card.requisites.account_number.substr(-4);

        var c = {
            __id: id,
            __name: name,
            num: card.requisites.account_number,
            visibility: card.visibility
        };

        if(__shouldProcess('credits', c)){
            processCredit(card, c);
        }

        result.credits.push(c);
    }

}

function processCredit(acc, result){
    AnyBalance.trace('Обрабатываем кредит ' + result.__name);

    getParam(acc.currency, result, ['credits.currency', 'credits.balance']);
    getParam(acc.instalment_loan.loan_amount.amount, result, 'credits.limit');
    getParam(acc.instalment_loan.interest_rate, result, 'credits.pct');
    getParam(acc.instalment_loan.full_payment.total.amount, result, 'credits.balance');
    getParam(acc.name, result, 'credits.name');

    getParam(acc.instalment_loan.due_payment.principal.amount + acc.instalment_loan.due_payment.interest.amount, result, 'credits.minpay');
    getParam(acc.instalment_loan.due_payment.due_date, result, 'credits.minpay_till', null, null, parseDateISO);
    getParam(acc.instalment_loan.repayment_balance.amount, result, 'credits.balance_acc', null, null, parseDateISO);
    getParam(acc.open_date, result, 'credits.date_start', null, null, parseDateISO);
    getParam(acc.expire_date, result, 'credits.date_end', null, null, parseDateISO);
    
    getParam(acc.requisites.account_number, result, 'credits.accnum');
    getParam(acc.state, result, 'credits.status_code'); //active|closed
    getParam(acc.state_details, result, 'credits.status');

    if(AnyBalance.isAvailable('credits.schedule')){
        processCreditSchedule(acc, result);
    }

    return result;
}
