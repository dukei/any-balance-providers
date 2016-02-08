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

var baseurl = 'https://www.homebank.kz/new/';

function login(prefs) {
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl, g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту интернет-банка! Попробуйте обновить данные позже.');
	}

	if (!/logout/i.test(html)) {
        var csrf = getParam(html, null, null, /\btoken_\s*=\s*'([^']*)/, replaceSlashes);
        html = AnyBalance.requestPost(baseurl + 'login/login_ajax.htm', {
            hbid: prefs.login,
            password: prefs.password
        }, addHeaders({'X-Csrf-Token': csrf}));

        var json = getJson(html);

        if(json.rc != 200){
            if(json.message)
                throw new AnyBalance.Error(json.message, null, /неверный идентификатор или пароль/i.test(json.message));

            AnyBalance.trace(html);
            throw new AnyBalance.Error('Не удалось войти в интернет-банк. Сайт изменен?');
        }

		html = AnyBalance.requestGet(baseurl + 'main.htm', g_headers);
	}else{
		AnyBalance.trace('Уже залогинены, используем существующую сессию')
	}

	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+id="errMessage"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Проверьте правильность указания Логина и Пароля/i.test(error));
		
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

    var cardList = getElement(html, /<li[^>]+data-menu-value="current_accounts"[^>]*>/i);
    if (!cardList) {
        if (!/<li[^>]+date_current_accounts/i.test(html)) {
            AnyBalance.trace('У вас нет текущих счетов');
            result.accounts = [];
        } else {
            AnyBalance.trace(html);
            AnyBalance.trace('Не удалось найти перечень счетов.');
        }
        return;
    }

    var cards = getElements(cardList, /<div[^>]+class="item"[^>]*>/ig);
    AnyBalance.trace('Найдено счетов: ' + cards.length);
    result.accounts = [];

    var error = getElement(cardList, /<div[^>]+error_box[^>]*>/i, replaceTagsAndSpaces);
    if(error) //Ну ваще же! Актуальные данные по кредитам доступны в рабочее время (по времени Астаны)
        AnyBalance.trace('!!!!!! ' + error);

    for (var i = 0; i < cards.length; ++i) {
        var card = cards[i];
        var num = getElementsByClassName(card, 'account_mask', replaceTagsAndSpaces)[0];
        var title = getElementsByClassName(card, 'account_name_long', replaceTagsAndSpaces)[0];

        var c = {__id: num, __name: title + ' ' + num.substr(-4), num: num, error: error};

        if (__shouldProcess('accounts', c) && !error) {
            getParam(title, result, 'accounts.name');
            processAccount(card, c);
        }

        result.accounts.push(c);
    }
}

function processAccount(html, result){
    AnyBalance.trace('Обработка счета ' + result.__name);

    getParam(html, result, 'accounts.balance', /<span[^>]+class="account_amount_val"[\s\S]*?<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, ['accounts.currency', 'accounts.balance'], /<span[^>]+class="account_amount_val"[\s\S]*?<\/span>/i, replaceTagsAndSpaces, parseCurrency);
    var id = getParam(html, null, null, /fid=([^&"'\s]+)/i, replaceHtmlEntities);

    if(AnyBalance.isAvailable('accounts.date_start', 'accounts.status', 'accounts.transactions')){
        var html = AnyBalance.requestGet(baseurl + 'finance/accounts/overview.htm?fid=' + id, g_headers);

        getParam(html, result, 'accounts.date_start', /Счет открыт[\s\S]*?<div[^>]+class="cell"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseDate);
        getParam(html, result, 'accounts.status', /Статус счета[\s\S]*?<div[^>]+class="cell"[^>]*>([\s\S]*?)<\/div>/i, [/[^\-]*-/, '', replaceTagsAndSpaces]); //активный

        if(AnyBalance.isAvailable('accounts.transactions')) {
            processAccountTransactions(html, result);
        }
    }
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка карт
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(html, result) {
	if(!AnyBalance.isAvailable('cards'))
		return;

    var cardList = getElement(html, /<li[^>]+data-menu-value="payment_card_accounts"[^>]*>/i);
	if(!cardList){
        if(/У вас нет карт/i.test(html)){
            AnyBalance.trace('У вас нет карт');
            result.cards = [];
        }else {
            AnyBalance.trace(html);
            AnyBalance.trace('Не удалось найти перечень карт.');
        }
		return;
	}

	var cards = getElements(cardList, /<div[^>]+class="item"[^>]*>/ig);
	AnyBalance.trace('Найдено карт: ' + cards.length);
	result.cards = [];
	
	for(var i=0; i < cards.length; ++i){
		var card = cards[i];
		var num = getElementsByClassName(card, 'account_mask', replaceTagsAndSpaces)[0];
        var title = getElementsByClassName(card, 'account_name', replaceTagsAndSpaces)[0];

		var c = {__id: num, __name: title + ' ' + num.substr(-4), num: num};

		if (__shouldProcess('cards', c)) {
			processCard(card, c);
		}

		result.cards.push(c);
	}
}

function processCard(card, result) {
    AnyBalance.trace('Обработка карты ' + result.__name);

    getParam(card, result, 'cards.balance', /<span[^>]+class="account_amount_val"[\s\S]*?<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(card, result, ['cards.currency', 'cards.balance'], /<span[^>]+class="account_amount_val"[\s\S]*?<\/span>/i, replaceTagsAndSpaces, parseCurrency);
    var id = getParam(card, null, null, /fid=([^&"'\s]+)/i, replaceHtmlEntities);

    if(AnyBalance.isAvailable('cards.accnum', 'cards.till', 'cards.status', 'cards.balance_kzt', 'cards.balance_usd', 'cards.balance_eur', 'cards.transactions')){
        var html = AnyBalance.requestGet(baseurl + 'finance/accounts/overview.htm?fid=' + id, g_headers);

        getParam(html, result, 'cards.accnum', /ИИК[\s\S]*?<div[^>]+class="cell"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
        getParam(html, result, 'cards.till', /Срок действия[\s\S]*?<div[^>]+class="cell"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseDate);
        getParam(html, result, 'cards.status', /Срок действия[\s\S]*?<div[^>]+class="cell"[^>]*>([\s\S]*?)<\/div>/i, [/[^\-]*-/, '', replaceTagsAndSpaces]); //заблокирована

        getParam(html, result, 'cards.balance_kzt', /KZT:[\s\S]*?<div[^>]+class="cell"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'cards.balance_usd', /USD:[\s\S]*?<div[^>]+class="cell"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'cards.balance_eur', /EUR:[\s\S]*?<div[^>]+class="cell"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);

        if(isAvailable('cards.transactions'))
            processCardTransactions(html, result);
    }

}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка депозитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processDeposits(html, result) {
    if(!AnyBalance.isAvailable('deposits'))
        return;

    return;
}

function processDeposit(html, result) {
    AnyBalance.trace('Обработка депозита ' + result.__name);

    if(isAvailable('deposits.transactions'))
        processDepositTransactions(html, result);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка кредитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCredits(html, result) {
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

function processInfo(html, result){
    if(!AnyBalance.isAvailable('info'))
        return;

    html = AnyBalance.requestGet(baseurl + 'settings/index.htm', g_headers);

    var info = result.info = {};
    getParam(html, info, 'info.fio', /ФИО:[\s\S]*?<div[^>]+class="cell"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
    getParam(html, info, 'info.login', /Идентификатор:[\s\S]*?<div[^>]+class="cell"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
    getParam(html, info, 'info.birthday', /Дата рождения:[\s\S]*?<div[^>]+class="cell"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseDate);
    getParam(html, info, 'info.passport', /Номер документа[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces); //удостоверение личности, 035093814
    getParam(html, info, 'info.inn', /ИИН:[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
    getParam(html, info, 'info.mphone', /Доверенный контакт:[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces); //+7(777)110-95-24
}

function processBonuses(html, result){
    getParam(html, result, 'bonus', /<li[^>]+bonuses_accounts[^>]*>([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance);
}