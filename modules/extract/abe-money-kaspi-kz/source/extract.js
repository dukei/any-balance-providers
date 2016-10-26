/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':			'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language':	'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':		'keep-alive',
	'User-Agent':		'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.116 Safari/537.36'
};

var baseurl = 'https://kaspi.kz';

function login() {
	var prefs = AnyBalance.getPreferences();

	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + '/entrance', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту интернет-банка! Попробуйте обновить данные позже.');
	}

	if (!/logout/i.test(html)) {
		var login = getParam(prefs.login || '', null, null, /^\d{10}$/, [/^(\d{3})(\d{3})(\d{2})(\d{2})$/, '+7 ($1) $2-$3-$4']);
		if(!login) {
			throw new AnyBalance.Error('Не верный формат логина, необходимо вводить логин без +7 в начале и без пробелов.');
		}

		var auth_token = AB.getParam(html, null, null, /<input[^>]+name="authToken"[^>]+value="([^"]*)/i);
		if(!auth_token) {
			AnyBalance.trace(html);
			throw new AnyBalance.Error("Не удалось найти токен авторизации. Сайт изменён?");
		}

       	var params = {
			'submitId': 'SignIn',
			'webFormValues': [
				{'name': 'FormId', 	    'value': 'SignInForm'},
				{'name': 'AuthToken',   'value': auth_token},
				{'name': 'SignInLogin', 'value': login},
				{'name': 'Password',    'value': prefs.password}
			],
			'requesTimestamp':'/Date('+new Date().getTime()+'-14400000)/'
		};

		html = AnyBalance.requestPost(baseurl + '/api/auth/sign-in', JSON.stringify(params), addHeaders({
			Referer: baseurl + '/entrance',
			'X-Requested-With': 'XMLHttpRequest',
			'Accept': 'application/json, text/javascript, */*; q=0.01',
			'Content-Type': 'application/json; charset=UTF-8'
		}));
	} else {
		AnyBalance.trace('Уже залогинены, используем существующую сессию')
	}

	var json = getJson(html);
	if (!json.location) {
		var error = isArray(json.error) ? json.error : [json.error];
		if (error[0]) {
			throw new AnyBalance.Error(error, null, /Мы не нашли такой пароль/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в интернет-банк. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + json.location, g_headers);
    __setLoginSuccessful();
	
	return html;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка карт
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(html, result) {
	if(!AnyBalance.isAvailable('cards'))
		return;

	html = AnyBalance.requestGet(baseurl + '/index.aspx?action=bank', g_headers);

	var cardList = AB.getElement(html, /<div[^>]+id="item_creditcards"[^>]*>/i);
	if(!cardList){
        if(/У вас нет карт/i.test(html)){
            AnyBalance.trace('У вас нет карт');
            result.cards = [];
        }else {
            AnyBalance.trace(html);
            AnyBalance.trace('Не удалось найти таблицу с картами.');
        }
		return;
	}

	var cards = AB.getElements(cardList, /<div[^>]+credicardInfoWrapper[^>]*>/ig);
	if(!cards) {
		AnyBalance.trace(cardList);
		AnyBalance.trace("Не удалось найти карты. Сайт изменён?");
	}

	AnyBalance.trace('Найдено карт: ' + cards.length);
	result.cards = [];
	
	for(var i=0; i < cards.length; ++i){
		var card = cards[i];

		var id 	  = AB.getParam(card, null, null, /<div[^>]+title--creditcard(?:[^>]*>){3}([\s\S]*?)<span/i, AB.replaceTagsAndSpaces),
			num   = AB.getParam(card, null, null, /<div[^>]+title--creditcard(?:[^>]*>){3}([\s\S]*?)<span/i, AB.replaceTagsAndSpaces),
			title = AB.getParam(card, null, null, /<div[^>]+title--creditcard(?:[^>]*>){3}([\s\S]*?)<span/i, AB.replaceTagsAndSpaces);

		var c = {__id: id, __name: title, num: num};

		if (__shouldProcess('cards', c)) {
			processCard(card, c);
		}

		result.cards.push(c);
	}
}

function processCard(card, result) {
    AnyBalance.trace('Обработка карты ' + result.__name);

    AB.getParam(card, result, 'cards.balance', /<span[^>]+"e-limit__info__amount"[^>]*>[\s\S]*?<div/i, 					     AB.replaceTagsAndSpaces, AB.parseBalanceSilent);
    AB.getParam(card, result, ['cards.currency', 'cards.balance'], /<span[^>]+"e-limit__info__amount"[^>]*>([\s\S]*?)<div/i, AB.replaceTagsAndSpaces, AB.parseCurrency);

    AB.getParam(card, result, 'cards.debt',     /<span[^>]+"e-limit__subtitle e-debt__title"[^>]*>[\s\S]*?<div/i, AB.replaceTagsAndSpaces, AB.parseBalanceSilent);
    AB.getParam(card, result, 'cards.pay_till', /<span[^>]+"e-transfer__day"[^>]*>[\s\S]*?<div/i,                 AB.replaceTagsAndSpaces, AB.parseDateWord);
	
	var href_info = AB.getParam(card, null, null, /<a[^>]+href="([^"]*)"[^>]*>[\s\S]*?Информация о карте/i, [/#\d*/, '']);
	if(!href_info) {
		AnyBalance.trace(card);
		AnyBalance.trace("Не удалось найты ссылку на страницу с информацией о карте. Сайт изменён?");
	} else {
		var html = AnyBalance.requestGet(baseurl + href_info, g_headers);

		AB.getParam(html, result, 'cards.agreement', /Номер договора:(?:[^>]*>){2}([^<]*)/i,  	   		AB.replaceTagsAndSpaces);
		AB.getParam(html, result, 'cards.limit',     /Кредитный лимит:(?:[^>]*>){2}([^<]*)/i, 	   		AB.replaceTagsAndSpaces, AB.parseBalance);
		AB.getParam(html, result, 'cards.status',    /Статус:(?:[^>]*>){2}([^<]*)/i, 		  	   		AB.replaceTagsAndSpaces);
		AB.getParam(html, result, 'cards.num',    	 /<div[^>]+class="card_number"[^>]*>([^<]*)/i, 		AB.replaceTagsAndSpaces);
		AB.getParam(html, result, 'cards.type',    	 /<div[^>]+class="card_holder"[^>]*>([^<]*)/i, 		AB.replaceTagsAndSpaces);
		AB.getParam(html, result, 'cards.till',    	 /<div[^>]+class="card_valid_thru"[^>]*>([^<]*)/i, 	AB.replaceTagsAndSpaces, AB.parseDateWord);

	}
	if(isAvailable('cards.transactions')) {
		processCardTransactions(card, result);
	}
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка депозитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processDeposits(html, result) {
	if(!AnyBalance.isAvailable('deposits'))
		return;

	//Пока нет возможности посмотреть как будет выглядеть страница с двумя и т.д. депозитами. Может после исправления придёт какая-нибудь заявка
	html = AnyBalance.requestGet(baseurl + '/index.aspx?action=bank', g_headers);

	var depositsList = getElement(html, /<div[^>]+id="item_deposits"[^>]*>/i);
	if(!depositsList){
		AnyBalance.trace(html);
		AnyBalance.trace('Не удалось найти таблицу с депозитами.');
		return;
	}

	var deposits = AB.getElements(depositsList, /<div[^>]+depositInfoWrapper[^>]*>/ig);
	if(!deposits) {
		AnyBalance.trace(depositsList);
		AnyBalance.trace("Не удалось найти депозиты. Сайт изменён?");
	}

	AnyBalance.trace("Найдено депозитов: " + deposits.length);
	result.deposits = [];
	
	for(var i = 0; i < deposits.length; i++) {
		var href_info = AB.getParam(deposits[i], null, null, /<div[^>]+class="e-deposit__upper_info"[^>]*>[\s\S]*?<a[^>]+href="([^"]*)"[^>]*>[\s\S]*?Информация о депозите<\/a>/i, [/#\d*/, '']);
		if(!href_info) {
			AnyBalance.trace("Не удалось найти ссылку на страницу с информацией о депозите. Сайт изменён?");
			continue;
		}
		html = AnyBalance.requestGet(baseurl + href_info, g_headers);

		var id    = AB.getParam(html,		 null, null, /Номер счета Депозита:(?:[^>]*>){2}([^<]*)/i, AB.replaceTagsAndSpaces),
			num   = AB.getParam(html, 		 null, null, /Номер счета Депозита:(?:[^>]*>){2}([^<]*)/i, AB.replaceTagsAndSpaces),
			title = AB.getParam(deposits[i], null, null, /<div[^>]+depositinfo(?:[^>]*>){4}([^<]*)/i,  AB.replaceTagsAndSpaces);


		var c = {__id: id, __name: title, num: num};

		if (__shouldProcess('deposits', c)) {
			processDeposit(deposits[i], c, html);
		}

		result.deposits.push(c);
	}
}

function processDeposit(deposit, result, html) {
		AB.getParam(deposit, result, 'deposits.balance', /Накоплено(?:[^>]*>){2}([\s\S]*?)<\/div>/i,  AB.replaceTagsAndSpaces, AB.parseBalance);

		AB.getParam(html, result, 'deposits.agreement',  /номер договора:(?:[^>]*>){2}([^<]*)/i,     							 AB.replaceTagsAndSpaces);
		AB.getParam(html, result, 'deposits.date_start', /Вы открыли вклад:(?:[^>]*>){3}([^<]*)/i,   							 AB.replaceTagsAndSpaces, AB.parseDate);
		AB.getParam(html, result, 'deposits.pct',        /Эффективная ставка:(?:[^>]*>){3}([^<]*)/i, 							 AB.replaceTagsAndSpaces, AB.parseBalance);
		AB.getParam(html, result, 'deposits.withdraw',   /Доступно для снятия без комиссии:(?:[\s\S]*?<span[^>]*>){2}([^<]*)/i,  AB.replaceTagsAndSpaces, AB.parseBalance);
		AB.getParam(html, result, 'deposits.currency',   /Валюта депозита:(?:[^>]*>){2}([^<]*)/i,  							     [AB.replaceTagsAndSpaces, /(.*?)/i, '0$1'], AB.parseCurrency);

		AB.getParam(html, result, 'deposits.dvk_status', /<div[^>]+class="text dvk_status"(?:[^>]*>){4}([^<]*)/i,  AB.replaceTagsAndSpaces);
		AB.getParam(html, result, 'deposits.dvk_num',    /<div[^>]+class="dvkcard_number"[^>]*>([^<]*)/i,          AB.replaceTagsAndSpaces);
		AB.getParam(html, result, 'deposits.dvk_till',   /<div[^>]+class="card_valid_thru"[^>]*>([^<]*)/i,    	   AB.replaceTagsAndSpaces, AB.parseDate);

		if(isAvailable('deposits.transactions')) {
			processDepositTransactions(html, result);
		}
		
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка кредитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCredits(html, result) {
	if(!AnyBalance.isAvailable('credits'))
		return;

	html = AnyBalance.requestGet(baseurl + '/index.aspx?action=bank', g_headers);

	var creditList = AB.getElement(html, /<div[^>]+id="item_credits"[^>]*>/i);
	if(!creditList){
		if(/У вас нет кредитов/i.test(html)){
			AnyBalance.trace('У вас нет кредитов');
			result.cards = [];
		}else {
			AnyBalance.trace(html);
			AnyBalance.trace('Не удалось найти таблицу с картами.');
		}
		return;
	}

	var credits = AB.getElements(creditList, /<div[^>]+creditInfoWrapper[^>]*>/ig);
	if(!credits) {
		AnyBalance.trace(creditList);
		AnyBalance.trace("Не удалось найти кредиты. Сайт изменён?");
	}

	AnyBalance.trace('Найдено кредитов: ' + credits.length);
	result.credits = [];
	
	for(var i=0; i < credits.length; ++i){
		var _id   = AB.getParam(credits[i], null, null, /<span[^>]+"e-card__title__text"[^>]*>([^<]*)/i, AB.replaceTagsAndSpaces),
			title = AB.getParam(credits[i], null, null, /<span[^>]+"e-card__title__text"[^>]*>([^<]*)/i, AB.replaceTagsAndSpaces),
			num   = AB.getParam(credits[i], null, null, /<span[^>]+"e-card__title__text"[^>]*>([^<]*)/i, AB.replaceTagsAndSpaces);
		
		var c = {__id: _id, __name: title, num: num};
		
		if(__shouldProcess('credits', c)) {
			processCredit(credits[i], c);
		}
		
		result.credits.push(c);
	}
}

function processCredit(html, result){
    AnyBalance.trace('Обработка кредита ' + result.__name);

	AB.getParam(html, result, 'credits.balance', 	 /<span[^>]+"e-limit__info__amount"[^>]*>([\s\S]*?)<div/i, 			  	 AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, ['credits.currency', 'credits.balance'], 	 /<span[^>]+"e-limit__info__amount"[^>]*>([\s\S]*?)<div/i, 			  	 AB.replaceTagsAndSpaces, AB.parseCurrency);
	AB.getParam(html, result, 'credits.paid', 	  	 /<span[^>]+"e-limit__subtext e-funds__amount"[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'credits.next_pay', 	 /<span[^>]+"e-plan__info__amount"[^>]*>([\s\S]*?)<\/div>/i, 			 AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'credits.pay_till', 	 /<span[^>]+"e-transfer__day"[^>]*>([\s\S]*?)<\/div>/i, 				 AB.replaceTagsAndSpaces, AB.parseDateWord);
	AB.getParam(html, result, 'credits.date_start',  /Вы взяли кредит([\s\S]*?)<\/div>/i, 									 AB.replaceTagsAndSpaces, AB.parseDate);
	AB.getParam(html, result, 'credits.period',      /На срок([\s\S]*?)<\/div>/i, 											 AB.replaceTagsAndSpaces, AB.parseBalance); //мес
	AB.getParam(html, result, 'credits.period_left', /Осталось выплачивать([\s\S]*?)<\/div>/i, 							     AB.replaceTagsAndSpaces, AB.parseBalance); //мес

    if(AnyBalance.isAvailable('credits.schedule')) {
        processCreditSchedule(html, result);
    }
}

function processInfo(html, result){
    html = AnyBalance.requestGet(baseurl + '/index.aspx?action=bank', g_headers);

    var info = result.info = {};

    getParam(html, info, 'info.wallet', /Можно потратить[\s\S]*?<span[^>]+limit__info__amount[^>]*>([\s\S]*?)<div/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    getParam(html, info, ['info.currency', 'info.wallet'], /Можно потратить[\s\S]*?<span[^>]+limit__info__amount[^>]*>([\s\S]*?)<div/i, AB.replaceTagsAndSpaces, AB.parseCurrency);
    getParam(html, info, 'info.bonus',  /<div[^>]+bonusMenuContainer[^>]*>([^<]*)/i, 								 AB.replaceTagsAndSpaces, AB.parseBalance);
    getParam(html, info, 'info.mphone', /<div[^>]+headerSettings__phone(?:[^>]*>){3}([^<]*)/i,  					 AB.replaceTagsAndSpaces);
    getParam(html, info, 'info.fio',    /<span[^>]+headerAuth__user[^>]*>([^<]*)/i, 								 AB.replaceTagsAndSpaces);
	
}
