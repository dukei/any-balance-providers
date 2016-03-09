/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'Origin':'https://iclick.imoneybank.ru',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.0.2357.134 Safari/537.36'
};

var g_baseurl = 'https://iclick.imoneybank.ru/';

function login(){
    AnyBalance.setOptions({cookiePolicy: 'netscape'});
    var prefs = AnyBalance.getPreferences();

	checkEmpty(prefs.login, 'Введите логин! Логин должен быть в формате 9001234567!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    AnyBalance.setDefaultCharset('utf-8'); 

    try{
	    var html = AnyBalance.requestGet(g_baseurl, addHeaders({Referer: g_baseurl}));
    }catch(e){
    	if(!prefs.__debug)
    		throw e;
    	html = '';
    }

    if(!/logout/i.test(html)){
        html = AnyBalance.requestGet(g_baseurl + 'login', addHeaders({Referer: g_baseurl}));
        //AnyBalance.trace(html);

		if(/Личный кабинет временно недоступен/i.test(html)){
			error = getParam(html, null, null, /<\/h1>[^]*?<table[^>]*>/i, replaceTagsAndSpaces);
			throw new AnyBalance.Error(error || 'Личный кабинет временно недоступен');
		}
        
        try{
			html = AnyBalance.requestPost(g_baseurl + 'login_check', {
				'_cellphone':prefs.login,
				'_password':prefs.password,
				'submit':'',
            }, addHeaders({Referer: AnyBalance.getLastUrl()}));
        }catch(e){
        	if(!prefs.__debug)
        		throw e;
        	html = AnyBalance.requestGet(g_baseurl, addHeaders({Referer: AnyBalance.getLastUrl()}));
        }
    }else{
    	AnyBalance.trace('Уже внутри. Пользуемся предыдущей сессией');
    }
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /window.msg\(["']([^"']+)["'],\s*["']error/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Номер не зарегистрирован в системе|Неверная пара логин\/пароль|Поля формы заполнены некорректно/i.test(error));

		if(/Личный кабинет временно недоступен/i.test(html)){
			error = getParam(html, null, null, /<\/h1>[^]*?<table[^>]*>/i, replaceTagsAndSpaces);
			throw new AnyBalance.Error(error || 'Личный кабинет временно недоступен');
		}
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	__setLoginSuccessful();

	return html;
}

function parseCurrencyEx(str){
	if(/rouble/i.test(str))
		return 'RUB';
	str = replaceAll(str, [replaceTagsAndSpaces, replaceHtmlEntities]);
	return parseCurrency(str);
}

function fetchAccounts(result){
	var html = AnyBalance.requestGet(g_baseurl + 'account/list?_=' + new Date().getTime(), addHeaders({Referer: g_baseurl, 'X-Requested-With':'XMLHttpRequest'}));
	var json = getJson(html);

	result.accounts = [];
	for(var i=0; i<json.length; ++i){	
		var acc = json[i];
		var a = {};
		a.__id = acc.id;
		a.__name = acc.name;
		if(__shouldProcess('accounts', a)){
			fetchAccount(a, acc);
		}
		result.accounts.push(a);
	}
}

function n2(n){
	return n<10 ? '0' + n : '' + n;
}

function fetchInfo(result, html){
    if(!AnyBalance.isAvailable('info'))
    	return;

    var info = result.info = {};

	getParam(html, result, 'info.fio', /<a[^>]+href="[^"]*\/profile[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces);
	getParam(prefs.login, result, 'info.mphone');
	
	if(AnyBalance.isAvailable('info.email')){
		var html = AnyBalance.requestGet(g_baseurl + 'profile/alerts/email', addHeaders({Referer: g_baseurl}));
		getParam(html, result, 'info.email', /<input[^>]+id="change_alert_data_email"[^>]*value="([^"]*)/i, replaceHtmlEntities);
	}
}

function fetchAccount(result, acc){
	getParam(acc.rest, result, 'accounts.balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(acc.rest, result, ['accounts.currency', 'accounts.balance'], null, null, parseCurrencyEx);
	getParam(acc.doc, result, 'accounts.type');
	getParam(acc.is_active, result, 'accounts.active');

	if(AnyBalance.isAvailable('accounts.pct', 'accounts.agreement', 'accounts.date_start', 'accounts.owner')){
		var html = AnyBalance.requestGet(g_baseurl + 'account/' + acc.id + '/info', addHeaders({Referer: g_baseurl, 'X-Requested-With':'XMLHttpRequest'}));
		getParam(html, result, 'accounts.pct', /<dt[^>]*>\s*Текущая процентная ставка в год[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'accounts.agreement', /<dt[^>]*>\s*Номер договора[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces);
		getParam(html, result, 'accounts.date_start', /<dt[^>]*>\s*Дата открытия счета[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, parseDate);
		getParam(html, result, 'accounts.owner', /<dt[^>]*>\s*Владелец[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces);
		getParam(html, result, 'accounts.status', /<dt[^>]*>\s*Статус счета[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces);
	}

	getParam(acc.name, result, 'accounts.num');
	/*if(AnyBalance.isAvailable('accounts.num')){
		var html = AnyBalance.requestGet(g_baseurl + 'account/' + acc.id + '/details', addHeaders({Referer: g_baseurl, 'X-Requested-With':'XMLHttpRequest'}));
		if(/<input[^>]+id="form_userCode"/i.test(html)){ //Реквизиты спрятаны под кодом
			getParam(acc.name, result, 'accounts.num');
		}else{
			getParam(html, result, 'accounts.num', /<dt[^>]*>\s*Номер счета[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces);
		}
	}*/

	if(AnyBalance.isAvailable('accounts.transactions')){
		var dt = new Date();
		var dtFrom = new Date(dt.getFullYear()-3, dt.getMonth(), dt.getDate());

		html = AnyBalance.requestGet(g_baseurl + 'account/' + acc.id + '/statement?from=' + (n2(dtFrom.getDate()) + '.' + n2(dtFrom.getMonth()+1) + '.' + dtFrom.getFullYear()) + '&to=' + (n2(dt.getDate()) + '.' + n2(dt.getMonth()+1) + '.' + dt.getFullYear()), addHeaders({Referer: g_baseurl, 'X-Requested-With':'XMLHttpRequest'}));
		if(/<div[^>]+class="items"[^>]*>/i.test(html))
			result.transactions = [];

		var trns = getElements(html, /<div[^>]+class="item"[^>]*>/ig);
		for(var i=0; i<trns.length; ++i){
			var trn = trns[i];
			var t = {};

			var spans = getElements(trn, /<span[^>]*>/ig);
			getParam(spans[0], t, 'accounts.transactions.date', null, replaceTagsAndSpaces, parseDateSilent);
			getParam(spans[1], t, 'accounts.transactions.sum', null, replaceTagsAndSpaces, parseBalanceSilent);
			getParam(spans[2], t, 'accounts.transactions.descr', null, replaceTagsAndSpaces);

			result.transactions.push(t);
		}
		
	}
}

function fetchCards(result){
	var html = AnyBalance.requestGet(g_baseurl + 'card/list?_=' + new Date().getTime(), addHeaders({Referer: g_baseurl, 'X-Requested-With':'XMLHttpRequest'}));
	var json = getJson(html);

	result.cards = [];
	for(var i=0; i<json.length; ++i){	
		var card = json[i];
		var c = {};
		c.__id = card.id;
		c.__name = card.name;
		if(__shouldProcess('cards', c)){
			fetchCard(c, card);
		}
		result.cards.push(c);
	}
}

function fetchCard(result, card){
	getParam(card.rest, result, 'cards.balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(card.rest, result, ['cards.currency', 'cards.balance'], null, null, parseCurrencyEx);
	getParam(card.doc, result, 'cards.type');
	getParam(card.is_active, result, 'cards.active');

	if(AnyBalance.isAvailable('cards.till', 'cards.accnum', 'cards.agreement', 'cards.date_start', 'cards.date_start_vip', 'cards.date_end_vip', 'cards.holder', 'cards.cardnum', 'cards.status')) {
		html = AnyBalance.requestGet(g_baseurl + 'card/' + card.id, addHeaders({Referer: g_baseurl, 'X-Requested-With':'XMLHttpRequest'}));
		
		getParam(html, result, 'cards.till', /<dt[^>]*>\s*Действительна по[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, parseDate);
		getParam(html, result, 'cards.accnum', /<dt[^>]*>\s*Счет карты[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces);
		getParam(html, result, 'cards.agreement', /<dt[^>]*>\s*Номер договора[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces);
		getParam(html, result, 'cards.date_start', /<dt[^>]*>\s*Дата активации карты[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, parseDate);
		getParam(html, result, 'cards.date_start_vip', /<dt[^>]*>\s*Дата подключения VIP-пакета услуг[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, parseDate);
		getParam(html, result, 'cards.date_end_vip', /<dt[^>]*>\s*Дата окончания действия VIP-пакета услуг[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, parseDate);
		getParam(html, result, 'cards.holder', /<dt[^>]*>\s*Держатель карты[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces);
		getParam(html, result, 'cards.cardnum', /<dt[^>]*>\s*Номер карты[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces);
		getParam(html, result, 'cards.status', /<dt[^>]*>\s*Статус карты[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces);
	}

	if(AnyBalance.isAvailable('cards.own', 'cards.pct_sum', 'cards.pct', 'cards.pct_period', 'cards.pct_credit', 'cards.pct_credit_period', 'cards.limit', 'cards.min_pay', 'cards.min_pay_till')) {
		html = AnyBalance.requestGet(g_baseurl + 'card/' + card.id + '/info', addHeaders({Referer: g_baseurl, 'X-Requested-With':'XMLHttpRequest'}));
		
		getParam(html, result, 'cards.own', /<dt[^>]*>\s*Собственные средства[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'cards.pct_sum', /<dt[^>]*>\s*Сумма процентов начисленных[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'cards.pct', /<dt[^>]*>\s*Накопительная ставка в год[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'cards.pct_period', /<dt[^>]*>\s*Выплата процентов по карте[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces);
		getParam(html, result, 'cards.pct_credit', /<dt[^>]*>\s*Кредитная процентная ставка[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'cards.pct_credit_period', /<dt[^>]*>\s*Условия начисления процентов по карте[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces);
		getParam(html, result, 'cards.credit_period', /<dt[^>]*>\s*Срок кредита[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces);
		getParam(html, result, 'cards.limit', /<dt[^>]*>\s*Максимально разрешенный овердрафт[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'cards.min_pay', /<dt[^>]*>\s*Минимальный ежемесячный платеж по кредиту[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'cards.min_pay_till', /<dt[^>]*>\s*Срок ближайшего платежа по кредиту[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, parseBalance);
	}

	if(AnyBalance.isAvailable('cards.transactions')){
		var dt = new Date();
		var dtFrom = new Date(dt.getFullYear()-3, dt.getMonth(), dt.getDate());

		html = AnyBalance.requestGet(g_baseurl + 'card/' + card.id + '/statement?from=' + (n2(dtFrom.getDate()) + '.' + n2(dtFrom.getMonth()+1) + '.' + dtFrom.getFullYear()) + '&to=' + (n2(dt.getDate()) + '.' + n2(dt.getMonth()+1) + '.' + dt.getFullYear()), addHeaders({Referer: g_baseurl, 'X-Requested-With':'XMLHttpRequest'}));
		if(/<div[^>]+class="items"[^>]*>/i.test(html))
			result.transactions = [];

		var trns = getElements(html, /<div[^>]+class="item"[^>]*>/ig);
		for(var i=0; i<trns.length; ++i){
			var trn = trns[i];
			var t = {};

			var spans = getElements(trn, /<span[^>]*>/ig);
			getParam(spans[0], t, 'cards.transactions.date', null, replaceTagsAndSpaces, parseDateSilent);
			getParam(spans[1], t, 'cards.transactions.sum', null, replaceTagsAndSpaces, parseBalanceSilent);
			getParam(spans[2], t, 'cards.transactions.descr', null, replaceTagsAndSpaces);

			result.transactions.push(t);
		}
		
	}
}

function fetchDeposits(result){
	var html = AnyBalance.requestGet(g_baseurl + 'deposit/list?_=' + new Date().getTime(), addHeaders({Referer: g_baseurl, 'X-Requested-With':'XMLHttpRequest'}));
	var json = getJson(html);

	result.deposits = [];
	for(var i=0; i<json.length; ++i){	
		var deposit = json[i];
		var d = {};
		d.__id = deposit.id;
		d.__name = deposit.name;
		if(__shouldProcess('deposits', d)){
			fetchDeposit(d, deposit);
		}
		result.deposits.push(d);
	}
}

function fetchDeposit(result, dep){
	getParam(dep.rest, result, 'deposits.balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(dep.rest, result, ['deposits.currency', 'deposits.balance'], null, null, parseCurrencyEx);
	getParam(dep.doc, result, 'deposits.type');
	getParam(dep.is_active, result, 'deposits.active');

	if(AnyBalance.isAvailable('deposits.owner', 'deposits.period_days', 'deposits.pct', 'deposits.agreement', 'deposits.status', 'deposits.date_start', 'deposits.date_end', 'deposits.accnum', 'deposits.accnum_pct')) {
		html = AnyBalance.requestGet(g_baseurl + 'deposit/' + dep.id, addHeaders({Referer: g_baseurl, 'X-Requested-With':'XMLHttpRequest'}));
		
		getParam(html, result, 'deposits.period_days', /<dt[^>]*>\s*Срок вклада[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'deposits.pct', /<dt[^>]*>\s*Текущая процентная ставка в год[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'deposits.agreement', /<dt[^>]*>\s*Номер договора[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces);
		getParam(html, result, 'deposits.status', /<dt[^>]*>\s*Статус вклада[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces);
		getParam(html, result, 'deposits.date_start', /<dt[^>]*>\s*Дата открытия вклада[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, parseDate);
		getParam(html, result, 'deposits.date_end', /<dt[^>]*>\s*Дата окончания вклада[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, parseDate);
		getParam(html, result, 'deposits.accnum', /<dt[^>]*>\s*Счет вклада[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces);
		getParam(html, result, 'deposits.accnum_pct', /<dt[^>]*>\s*Счет выплаты процентов по вкладу[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces);
	}

	if(AnyBalance.isAvailable('deposits.owner', 'deposits.topup', 'deposits.pct_period', 'deposits.min_topup', 'deposits.max_topup_period_days')) {
		html = AnyBalance.requestGet(g_baseurl + 'deposit/' + dep.id + '/info', addHeaders({Referer: g_baseurl, 'X-Requested-With':'XMLHttpRequest'}));
		
		getParam(html, result, 'deposits.owner', /<dt[^>]*>\s*Вкладчик[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces);
		getParam(html, result, 'deposits.topup', /<dt[^>]*>\s*Условия пополнения вклада[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces);
		getParam(html, result, 'deposits.pct_period', /<dt[^>]*>\s*Условия выплаты процентов по вкладу[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces);
		getParam(html, result, 'deposits.min_topup', /<dt[^>]*>\s*Минимальная сумма пополнения[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'deposits.max_topup_period_days', /<dt[^>]*>\s*Максимальный срок пополнения[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, parseBalance);
	}
}