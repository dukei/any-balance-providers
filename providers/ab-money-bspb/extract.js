/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:35.0) Gecko/20100101 Firefox/35.0'
};

var baseurlDemo = 'https://idemo.bspb.ru/',
    baseurlReal = 'https://i.bspb.ru/',
    baseurl;

function login(prefs) {
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

    baseurl = baseurlReal;
    if(prefs.login == 'demo')
        baseurl = baseurlDemo;

	var html = AnyBalance.requestGet(baseurl + 'welcome', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	if (!/logout/i.test(html)) {
        var form = getElement(html, /<form[^>]+id="login-form"[^>]*>/i);

        var params = createFormParams(html, function(params, str, name, value) {
            if (name == 'username')
                return prefs.login;
            if (name == 'password')
                return prefs.password;
            return value;
        });
		html = AnyBalance.requestPost(baseurl + 'login', params, addHeaders({'X-Requested-With': 'XMLHttpRequest', Referer: baseurl}));
	}else{
		AnyBalance.trace('Уже залогинены, используем существующую сессию')
	}

	if (/<input[^>]+name="otpCode"/i.test(html)) {
		AnyBalance.trace("Потребовался ввод кода.");
        var msg = getElement(html, /<span[^>]*otp-code-text[^>]*/i, replaceTagsAndSpaces, html_entity_decode);
        var form = getElement(html, /<form[^>]+name="login-form"[^>]*>/i);

        var params = createFormParams(html, function(params, str, name, value) {
            if (name == 'otpCode')
                return AnyBalance.retrieveCode((msg || 'Пожалуйста, введите код из SMS для входа в интернет-банк.') + (baseurl == baseurlDemo ? ' Для демонстрации введите 0000' : ''), null, {inputType: 'number', time: 180000});
            return value;
        });

        html = AnyBalance.requestPost(baseurl + 'security/authenticateotp', params, addHeaders({Referer: baseurl}));
	}

	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+alert-error[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверные данные пользователя/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в интернет-банк. Сайт изменен?');
	}

    __setLoginSuccessful();
	
	return html;
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка счетов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processAccounts(html, result) {
    if(!AnyBalance.isAvailable('accounts'))
        return;

    html = AnyBalance.requestGet(baseurl + 'accounts', g_headers);

	var accountsTable = getElement(html, /<table[^>]+id="accounts"[^>]*>/i);
	if(!accountsTable){
		AnyBalance.trace('Не удалось найти таблицу счетов: ' + html);
	}

	var accounts = getElements(accountsTable, [/<tr[^>]*>/ig, /<td/i]);
	
	AnyBalance.trace('Найдено счетов: ' + accounts.length);
    if(!result.accounts)
	    result.accounts = [];
	
	for(var i=0; i < accounts.length; ++i){
        var acc = accounts[i];
		var id = getParam(acc, null, null, /<td[^>]+class="account"[^>]*id="account-([^"]*)/i, null, html_entity_decode);
        var name = getParam(acc, null, null, /<a[^>]+class="alias"[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);

        var details = AnyBalance.requestGet(baseurl + 'accounts/details?accountId=' + id, addHeaders({Referer: baseurl}));
        //С номером обычно валюта, вырезаем её
        var num = getParam(details, null, null, /<div[^>]+account-number[^>]*>([\s\S]*?)<\/div>/i, [/\s+\D+\s*$/, '', replaceTagsAndSpaces, /\s+/g, ''], html_entity_decode);

		var c = findAccount(result, id, name);
        c.num = num;
		
		if(__shouldProcess('accounts', c)) {
			processAccount(details, c);
		}
		
		result.accounts.push(c);
	}
}

function processAccount(html, result){
    AnyBalance.trace('Обработка счета ' + result.__name);

    getParam(html, result, 'accounts.balance', /<label[^>]*>\s*Остаток[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, ['accounts.currency' , 'accounts.balance'], /<label[^>]*>\s*Остаток[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseCurrency);
    getParam(html, result, 'accounts.office', /Офис счёта[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'accounts.owner', /Получатель[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);

    if(isAvailable('accounts.transactions')){
        processAccountTransactions(html, result);
    }
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка карт
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(html, result) {
	if(!AnyBalance.isAvailable('cards'))
		return;

	var html = AnyBalance.requestGet(baseurl + 'cards', g_headers);

	var cardTable = getElement(html, /<table[^>]+id="cards"[^>]*>/i);
	if(!cardTable){
		//TODO: проверить, что карт действительно нет
		AnyBalance.trace(html);
		AnyBalance.trace('Не удалось найти таблицу с картами.');
		return;
	}

	var cards = getElements(cardTable, [/<tr[^>]*>/ig, /<td/i]);
	AnyBalance.trace('Найдено карт и карточных счетов: ' + cards.length);

    result.cards = [];
    var accresult;

	for(var i=0; i < cards.length; ++i){
		var card = cards[i];
        if(/class="account-row"/i.test(card)){
            //Это счет, которому принадлежат следующие карты
            var id = getParam(card, null, null, /accountId=([^"&]*)/i, null, html_entity_decode);
            var name = getParam(card, null, null, /<a[^>]+accountId=[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);
            accresult = findAccount(result, id, name);
            getParam(card, accresult, 'accounts.balance', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
            getParam(card, accresult, 'accounts.currency', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
        }else{
            var id = getParam(card, null, null, /cardId=([^"&]*)/i, null, html_entity_decode);
            var name = getParam(card, null, null, /<a[^>]+class="alias"[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);
            var num = getParam(card, null, null, /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)(?:<\/td>|<div)/i, replaceTagsAndSpaces, html_entity_decode);
            var c = {__id: id, __name: name, num: num, account_id: accresult.__id};

            if(__shouldProcess('cards', c)){
                processCard(card, c);
            }
            result.cards.push(c);
        }
	}
}

function findAccount(result, id, name){
    if(!result.accounts)
        result.accounts = [];

    for (var i = 0; i < result.accounts.length; i++) {
        var acc = result.accounts[i];
        if(acc.__id == id)
            return acc;
    }

    acc = {__id: id, __name: name};
    result.accounts.push(acc);

    return acc;
}

function processCard(card, result) {
    var tds = getElements(card, /<td[^>]*>/ig);

	getParam(tds[1], result, 'cards.holder', /<div[^>]+muted[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tds[2], result, 'cards.status', null, replaceTagsAndSpaces, html_entity_decode); //Действует, Закрыта, Ожидает активации
    getParam(tds[3], result, 'cards.till', null, replaceTagsAndSpaces, parseDate);
    getParam(tds[4], result, 'cards.bonus', null, replaceTagsAndSpaces, parseBalance);

    if(AnyBalance.isAvailable('cards.notifications')) {
        if (/card-notification[^>]*btn-success/i.test(card)) {
            processCardNotifications(result);
        }
    }
}

var g_replaceWithSpaces = [replaceTagsAndSpaces, /\s+/g, ''];

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка депозитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processDeposits(html, result) {
    if(!AnyBalance.isAvailable('deposits'))
        return;

    html = AnyBalance.requestGet(baseurl + 'deposits', g_headers);

    var depositsTable = getElement(html, /<table[^>]+id="deposits"[^>]*>/i);
    if(!depositsTable){
        AnyBalance.trace('Не удалось найти таблицу вкладов: ' + html);
    }

    var deposits = getElements(depositsTable, [/<tr[^>]*>/ig, /<td/i]);

    AnyBalance.trace('Найдено вкладов: ' + deposits.length);
    result.deposits = [];

    for(var i=0; i < deposits.length; ++i){
        var acc = deposits[i], details;

        var id = getParam(acc, null, null, /depositId=([^"&]*)/i, null, html_entity_decode);
        var name = getParam(acc, null, null, /<a[^>]+class="alias"[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);
        if(id) {
            details = AnyBalance.requestGet(baseurl + 'deposits/details?depositId=' + id, addHeaders({Referer: baseurl}));
        }else{
            //Или может это заявка на кредит в ожидании
            var id = getParam(acc, null, null, /depositOrderId=([^"&]*)/i, null, html_entity_decode);
            var name = getParam(acc, null, null, /<a[^>]+>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);
            details = AnyBalance.requestGet(baseurl + 'deposits/orderdetails?depositOrderId=' + id, addHeaders({Referer: baseurl}));
        }

        var num = getParam(details, null, null, /<label[^>]*>\s*Счёт вклада[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, g_replaceWithSpaces, html_entity_decode);

        var c = {__id: id, __name: name, num: num};

        if(__shouldProcess('deposits', c)) {
            processDeposit(details, c);
        }

        result.deposits.push(c);
    }
}

function parseBool(str){
    return !/нет|не предусмотрен/i.test(str);
}

function processDeposit(html, result) {
    getParam(html, result, 'deposits.balance', /<label[^>]*>\s*Сумма[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, ['deposits.currency','deposits.balance'], /<label[^>]*>\s*Сумма[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseCurrency);
    getParam(html, result, 'deposits.agreement', /<label[^>]*>\s*Договор №[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'deposits.num_service', /<label[^>]*>\s*Обслуживающий счёт[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, g_replaceWithSpaces, html_entity_decode);
    getParam(html, result, 'deposits.num_return', /<label[^>]*>\s*Счёт для возврата[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, g_replaceWithSpaces, html_entity_decode);
    getParam(html, result, 'deposits.type', /<label[^>]*>\s*Вид[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'deposits.period', /<label[^>]*>\s*Срок[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);//Дней
    getParam(html, result, 'deposits.date_start', /<label[^>]*>\s*Начало[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseDate);
    getParam(html, result, 'deposits.date_end', /<label[^>]*>\s*Окончание[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseDate);
    getParam(html, result, 'deposits.pct', /<label[^>]*>\s*Ставка[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'deposits.prolong', /<label[^>]*>\s*Продление[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'deposits.pct_sum', /<label[^>]*>\s*Расчётный доход[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'deposits.office', /<label[^>]*>\s*Офис вклада[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'deposits.early', /<label[^>]*>\s*Досрочное расторжение[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBool);
    getParam(html, result, 'deposits.status', /<label[^>]*>\s*Статус договора[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode); //Действующий, в ожидании

    //А выписка на соответствующих счетах
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка кредитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCredits(html, result) {
    if(!AnyBalance.isAvailable('credits'))
        return;

    html = AnyBalance.requestGet(baseurl + 'loans', g_headers);

    var creditsTable = getElement(html, /<table[^>]+id="loans"[^>]*>/i);
    if(!creditsTable){
        AnyBalance.trace('Не удалось найти таблицу кредитов: ' + html);
    }

    var credits = getElements(creditsTable, [/<tr[^>]*>/ig, /<td/i]);

    AnyBalance.trace('Найдено кредитов: ' + credits.length);
    result.credits = [];

    for(var i=0; i < credits.length; ++i){
        if(i > 0)
            AnyBalance.sleep(1000); //иначе получаем 429 ошибку - too many requests

        var acc = credits[i];
        var id = getParam(acc, null, null, /loanId=([^"]*)/i, null, html_entity_decode);
        var name = getParam(acc, null, null, /<[^>]+class="alias"[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);

        var details = AnyBalance.requestGet(baseurl + 'loans/details?loanId=' + id, addHeaders({Referer: baseurl}));
        var num = getParam(details, null, null, /<label[^>]*>\s*Обслуживающий счёт[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, g_replaceWithSpaces, html_entity_decode);

        var c = {__id: id, __name: name, num: num};

        if(__shouldProcess('credits', c)) {
            processCredit(details, c);
        }

        result.credits.push(c);
    }
}

function processCredit(html, result) {
    getParam(html, result, 'credits.balance', /<label[^>]*>\s*Осталось погасить[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, ['credits.currency','credits.balance'], /<label[^>]*>\s*Осталось погасить[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseCurrency);
    getParam(html, result, 'credits.agreement', /<label[^>]*>\s*Договор №[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'credits.goal', /<label[^>]*>\s*Цель[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'credits.type', /<label[^>]*>\s*Вид[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'credits.date_start', /<label[^>]*>\s*Начало[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseDate);
    getParam(html, result, 'credits.date_end', /<label[^>]*>\s*Окончание[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseDate);
    getParam(html, result, 'credits.pct', /<label[^>]*>\s*Ставка[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'credits.limit', /<label[^>]*>\s*Сумма[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'credits.debt', /<label[^>]*>\s*Задолженность[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'credits.peni', /<label[^>]*>\s*Пени[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);

    if(AnyBalance.isAvailable('credits.schedule')){
        processCreditSchedule(html, result);
    }

    if(AnyBalance.isAvailable('credits.transactions')){
        processCreditTransactions(html, result);
    }
}

function processCreditSchedule(html, result){
    var table = getElement(html, /<table[^>]+repayments-table[^>]*>/i);
    if(!table){
        AnyBalance.trace('Таблица графика платежей не найдена: ' + html);
        return;
    }

    result.schedule = [];

    var colsDef = {
        date: {
            re: /Дата/i,
            result_func: parseDate
        },
        balance: {
            re: /Осталось погасить/i
        },
        debt: {
            re: /Гашение кредита/i
        },
        pct: {
            re: /Гашение процентов/i
        },
        sum: {
            re: /Общая сумма погашения/i
        }
    };

    processTable(table, result.schedule, 'credits.schedule.', colsDef);

}

function processInfo(html, result){
    html = AnyBalance.requestGet(baseurl + 'settings/phonesform', g_headers);
    var info = result.info = {};
    getParam(html, info, 'info.fio', /<option[^>]+representee[^>]+selected[^>]*>([\s\S]*?)<\/option>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, info, 'info.mphone', /<input[^>]+value="([^"]*)[^>]+name="[^"]*phone-1"[^>]*/i, null, html_entity_decode);
}

function processBonus(html, result){
    getParam(html, result, 'bonus', /<div[^>]+bonus-points[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
}