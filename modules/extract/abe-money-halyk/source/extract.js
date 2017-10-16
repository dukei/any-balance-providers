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

var baseurl = 'https://www.myhalyk.kz/wb/';

function login() {
	var prefs = AnyBalance.getPreferences();

	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + '', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту интернет-банка! Попробуйте обновить данные позже.');
	}

	if (!/logout/i.test(html)) {
        var form = getElement(html, /<form[^>]+id="FORM_FAST_LOGIN"[^>]*>/i);
		if(!form){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
		}

        var params = createFormParams(form, function(params, str, name, value) {
            if (name == 'Login')
                return prefs.login;
            if (name == 'password')
                return prefs.password;
            return value;
        });
		html = AnyBalance.requestPost(baseurl + 'auth/userlogin?execution=e1s1', params, addHeaders({Referer: AnyBalance.getLastUrl()}));

	}else{
		AnyBalance.trace('Уже залогинены, используем существующую сессию')
	}

	if (!/logout/i.test(html)) {
		var error = getElement(html, /<div[^>]+cs-form-error[^>]*>/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /пользователь не найден|Неверный пароль/i.test(error));
		
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

    AnyBalance.trace('Получаем счета');

    if(!/cards-list-title/i.test(html))
        html = AnyBalance.requestGet(baseurl + 'services/CARDS_ACCOUNTS_WB', g_headers);

	var accounts = getElements(html, /<li[^>]+slide-list-account-item[^>]*>/i);
	if(!accounts.length){
        if(/У вас нет счетов/i.test(html)){
            AnyBalance.trace('У вас нет счетов');
            result.accounts = [];
        }else {
            AnyBalance.trace(html);
            AnyBalance.trace('Не удалось найти список счетов.');
        }
		return;
	}
	
	AnyBalance.trace('Найдено счетов: ' + accounts.length);
	result.accounts = [];
	
	for(var i=0; i < accounts.length; ++i){
        var acc = accounts[i];
        var cards = getElement(acc, /<ul[^>]+cards-accounts-list[^>]*>/i);
        acc = acc.replace(cards, ''); //Карты выключаем для счетов

		var id = getElement(acc, /<span[^>]+contract-number[^>]*>/i, replaceTagsAndSpaces);
		var num = id;
		var title = id;
		
		var c = {__id: id, __name: title, num: num};
		
		if(__shouldProcess('accounts', c)) {
			processAccount(acc, c);
		}
		
		result.accounts.push(c);
	}
}

function processAccount(account, result){
    AnyBalance.trace('Обработка счета ' + result.__name);
	
    getParam(account, result, 'accounts.status', /Статус[\s\S]*?<div[^>]+property-value[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
    getParam(account, result, 'accounts.balance', /<span[^>]+list-amount-value[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(account, result, ['accounts.currency' , 'accounts.balance'], /<span[^>]+list-amount-currency[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
    getParam(account, result, 'accounts.available', /Доступные средства[\s\S]*?<div[^>]+property-value[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(account, result, 'accounts.blocked', /Сумма в блоке[\s\S]*?<div[^>]+property-value[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(account, result, 'accounts.bonus', /Остаток бонусов[\s\S]*?<div[^>]+property-value[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(account, result, 'accounts.limit', /Кредитный лимит[\s\S]*?<div[^>]+property-value[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);

    if(AnyBalance.isAvailable('accounts.transactions')) {
        processAccountTransactions(account, result);
    }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка карт
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(html, result) {
    if(!AnyBalance.isAvailable('cards'))
        return;

    AnyBalance.trace('Получаем карты');

    if(!/cards-list-title/i.test(html))
        html = AnyBalance.requestGet(baseurl + 'services/CARDS_ACCOUNTS_WB', g_headers);

    var accounts = getElements(html, /<li[^>]+slide-list-account-item[^>]*>/i);
    if(!accounts.length){
        if(/У вас нет счетов/i.test(html)){
            AnyBalance.trace('У вас нет карточных счетов');
            result.accounts = [];
        }else {
            AnyBalance.trace(html);
            AnyBalance.trace('Не удалось найти список карточных счетов.');
        }
        return;
    }

    AnyBalance.trace('Найдено карточных счетов: ' + accounts.length);
    result.cards = [];

    for(var i=0; i < accounts.length; ++i){
        var acc = accounts[i];
        var accnum = getElement(acc, /<span[^>]+contract-number[^>]*>/i, replaceTagsAndSpaces);

        var cards = getElement(acc, /<ul[^>]+cards-accounts-list[^>]*>/i);
        if(!cards){
            AnyBalance.trace('У счета ' + accnum + ' нет карт');
            continue;
        }

        cards = getElements(cards, /<li[^>]+slide-list-item[^>]*>/i);
        for(var j=0; j<cards.length; ++j){
            var card = cards[i];

            var id = getElement(card, /<span[^>]+contract-number[^>]*>/i, replaceTagsAndSpaces);
            var type = getParam(card, null, null, /icon_PaymentSystem_([^"\s]*)/i, replaceHtmlEntities);

            var num = id;
            var title = capitalFirstLetters(type) + ' ' + num;

            var c = {__id: id, __name: title, num: num, accnum: accnum};

            if(__shouldProcess('cards', c)) {
                processCard(card, c);
            }

            result.cards.push(c);
        }



    }
}

function processCard(card, result){
    AnyBalance.trace('Обработка карты ' + result.__name);

    getParam(card, result, 'cards.status', /Статус[\s\S]*?<div[^>]+property-value[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
    getParam(card, result, 'cards.balance', /<span[^>]+list-amount-value[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(card, result, ['cards.currency' , 'cards.balance'], /<span[^>]+list-amount-currency[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
    getParam(card, result, 'cards.available', /Доступные средства[\s\S]*?<div[^>]+property-value[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(card, result, 'cards.blocked', /Сумма в блоке[\s\S]*?<div[^>]+property-value[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(card, result, 'cards.bonus', /Остаток бонусов[\s\S]*?<div[^>]+property-value[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(card, result, 'cards.holder', /Имя и Фамилия на карте[\s\S]*?<div[^>]+property-value[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
    getParam(card, result, 'cards.till', /Срок действия[\s\S]*?<div[^>]+property-value[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseDateWord);
    getParam(card, result, 'cards.ps', /icon_PaymentSystem_([^"\s]*)/i, replaceHtmlEntities); //visa

    if(AnyBalance.isAvailable('cards.transactions')) {
        processCardTransactions(card, result);
    }
}



function processInfo(html, result){
    if(!AnyBalance.isAvailable('info'))
        return;

    result.info = {};

    if(!/cards-list-title/i.test(html))
        html = AnyBalance.requestGet(baseurl + 'services/CARDS_ACCOUNTS_WB', g_headers);

    getParam(html, result.info, 'info.fio', /<span[^>]+header-user-name[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);

    if(AnyBalance.isAvailable('info.passport', 'info.passport_where', 'info.address', 'info.inn')){
        //получаем информацию из выписки
        processInfoExtended(html, result);
    }
}
