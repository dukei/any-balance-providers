/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html, */*; q=0.01',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Linux; Android 5.1.1; D6503 Build/23.4.A.1.232; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/46.0.2490.76 Mobile Safari/537.36',
    'X-Requested-With': 'XMLHttpRequest',
    'mobile': 'app'
};

var baseurl = 'https://i.ubrr.ru', g_lastoverview = '';

function login(prefs) {
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

    var html = g_lastoverview;
    if(!/overview-menu/i.test(html)) {
        var token = AnyBalance.requestGet(baseurl + '/ubrrmobile/loginsecuritytoken?username=' + encodeURIComponent(prefs.login), g_headers);
        var hash = AnyBalance.getData('simplehash', 'u9Mo8FUrzf+0qCH1ibzD/s44lZ0nPaqeOalE4x0t3OI=');

        if (!token || AnyBalance.getLastStatusCode() > 400) {
            AnyBalance.trace(token);
            throw new AnyBalance.Error('Ошибка при подключении к сайту интернет-банка! Попробуйте обновить данные позже.');
        }

        html = AnyBalance.requestPost(baseurl + '/login', {
            securityToken: token,
            username: prefs.login,
            password: prefs.password,
            simplehash: hash,
            authType: hash ? undefined : 'EXTERNAL'
        }, addHeaders({Origin: 'file://'}));

        if (/<input[^>]+name="otpCode"/i.test(html)) {
            AnyBalance.trace('Необходимо ввести одноразовый код');
            var msg = getElement(html, /<span[^>]+otp-code-text[^>]*>/i, replaceTagsAndSpaces, html_entity_decode);
            var code = AnyBalance.retrieveCode(msg || 'Введите одноразовый код, отправленный вам на телефон', null, {
                time: 180000,
                inputType: 'number'
            });
            html = AnyBalance.requestPost(baseurl + '/security/authenticateotp', {
                otpCode: code,
                simpleLogin: 'on'
            }, g_headers);
        }

        if (/overview-menu/i.test(html)) { //Зашли
            g_lastoverview = html;
            hash = getParam(html, null, null, /setSimplehash\s*\(\s*'([^']*)/, replaceSlashes);

            if (hash) {
                AnyBalance.trace('Записываем hash: ' + hash);
                AnyBalance.setData('simplehash', hash);
                AnyBalance.saveData();
            }

            __setLoginSuccessful();
        }
    }

    if(!/overview-menu/i.test(html)){
        //Не зашли
		var error = getParam(html, null, null, /<div[^>]+id="alert-error"[^>]*>([\s\S]*?)(?:<\/div>|<script)/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Проверьте правильность указания Логина и Пароля/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в интернет-банк. Сайт изменен?');
	}

	return html;
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка счетов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processAccounts(html, result) {
    if(!AnyBalance.isAvailable('accounts'))
        return;

    html = AnyBalance.requestGet(baseurl + '/mobile/accounts', g_headers);

    var accounts = getElement(html, /<ul[^>]+id="accounts"[^>]*>/ig);
    if(!accounts){
        if(/У вас нет счетов/i.test(html)){
            AnyBalance.trace('У вас нет счетов');
            result.accounts = [];
        }else{
            AnyBalance.trace('Счета не найдены: ' + html);
        }
        return;
    }

	accounts = getElements(accounts, /<li[^>]*>/ig);
	
	AnyBalance.trace('Найдено счетов: ' + accounts.length);
	result.accounts = [];
	
	for(var i=0; i < accounts.length; ++i){
        var acc = accounts[i];
        var id = getParam(acc, null, null, /accountId=([^"&]*)/i, null, html_entity_decode);
		var name = getElement(acc, /<h3[^>]*>/i, replaceTagsAndSpaces, html_entity_decode);

		var c = {__id: id, __name: name, num: name};
		
		if(__shouldProcess('accounts', c)) {
			processAccount(acc, c);
		}
		
		result.accounts.push(c);
	}
}

function processAccount(account, result){
    AnyBalance.trace('Обработка счета ' + result.__name);

    getParam(account, result, 'accounts.balance', /<\/h3>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(account, result, ['accounts.currency', 'accounts.balance'], /<\/h3>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseCurrency);

    var html = AnyBalance.requestGet(baseurl + '/mobile/statement?accountId=' + encodeURIComponent(result.__id), g_headers);

    getParam(html, result, 'accounts.available', /Доступно([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'accounts.blocked', /Зарезервировано([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance);

    if(AnyBalance.isAvailable('accounts.transactions')) {
        processAccountTransactions(html, result);
    }
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка карт
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(html, result) {
	if(!AnyBalance.isAvailable('cards'))
		return;

    html = AnyBalance.requestGet(baseurl + '/mobile/cards', g_headers);

	var cardList = getElement(html, /<ul[^>]+data-role="listview"[^>]*>/i);
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

	var cards = getElements(cardList, /<li[^>]*>/ig);
	AnyBalance.trace('Найдено карт: ' + cards.length);
    result.cards = [];

	for(var i=0; i < cards.length; ++i){
		var card = cards[i];
        var id = getParam(card, null, null, /cardId=([^"&]*)/i, null, html_entity_decode);
        var name = getElement(card, /<h3[^>]*>/i, replaceTagsAndSpaces, html_entity_decode);
        var num = getParam(name, null, null, /\*?\d+$/, replaceTagsAndSpaces, html_entity_decode);

        var c = {__id: id, __name: name, num: num};

        if (__shouldProcess('cards', c)) {
            processCard(card, c);
        }

        result.cards.push(c);
	}
}

function processCard(card, result) {
    getParam(card, result, 'cards.accnum', /<div[^>]+list-item-content[^>]*>\s*((?:[\d\s]|&nbsp;?){20,})/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(card, result, 'cards.balance', /\d{20}\s*<br[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(card, result, ['cards.currency', 'cards.balance'], /\d{20}\s*<br[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseCurrency);

    getParam(card, result, 'cards.type', /(?:<td[^>]*>[^]*?<\/td>\s*){2}(<td[^>]*>[^]*?<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(card, result, 'cards.status', /(?:<td[^>]*>[^]*?<\/td>\s*){3}(<td[^>]*>[^]*?<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);

	if(AnyBalance.isAvailable('cards.type', 'cards.num', 'cards.till', 'cards.status')) {
		var html = AnyBalance.requestGet(baseurl + '/mobile/cardwithdetails?cardId=' + encodeURIComponent(result.__id), g_headers);

		getParam(html, result, 'cards.type', /Тип([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, 'cards.num', /Номер([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, 'cards.till', /Номер([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseDate);
		getParam(html, result, 'cards.status', /<li[^>]+id="card-state"[^>]*>([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, html_entity_decode); //Действует

		if(isAvailable('cards.contacts'))
            processCardContacts(html, result);
	}
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка депозитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function processDeposits(html, result) {
    if(!AnyBalance.isAvailable('deposits'))
        return;

    html = AnyBalance.requestGet(baseurl + '/deposits', g_headers);

    var depositList = getElement(html, /<ul[^>]+data-role="listview"[^>]*>/i);
    if(!depositList){
        if(/У вас нет (?:депозитов|вкладов)/i.test(html)){
            AnyBalance.trace('У вас нет депозитов');
            result.deposits = [];
        }else {
            AnyBalance.trace(html);
            AnyBalance.trace('Не удалось найти таблицу с депозитами.');
        }
        return;
    }

    var deposits = getElements(depositList, /<li[^>]*>/ig);
    AnyBalance.trace('Найдено депозитов: ' + deposits.length);
    result.deposits = [];

    for(var i=0; i < deposits.length; ++i){
        var deposit = deposits[i];
        var id = getParam(deposit, null, null, /depositId=([^"&]*)/i, replaceHtmlEntities);
        var name = getParam(deposit, null, null, /<\/h3[^>]*>([\s\S]*?)<br[^>]*>/i, replaceTagsAndSpaces);
        var num = getElement(deposit, /<h3[^>]*>/i, [replaceTagsAndSpaces, /\s+/g, '']);

        var c = {__id: id, __name: name + ' *' + num.substr(-4), num: num};

        if (__shouldProcess('deposits', c)) {
            processDeposit(deposit, c);
        }

        result.deposits.push(c);
    }
}

function processDeposit(deposit, result) {
    getParam(deposit, result, 'deposits.name', /<\/h3[^>]*>([\s\S]*?)<br[^>]*>/i, replaceTagsAndSpaces);
    getParam(deposit, result, 'deposits.balance', /<\/h3>[^<]*<br[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(deposit, result, ['deposits.currency', 'deposits.balance'], /<\/h3>[^<]*<br[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseCurrency);

    if(AnyBalance.isAvailable('deposits.type', 'deposits.num', 'deposits.till', 'deposits.status')) {
        var detailsurl = getParam(deposit, null, null, /<a[^>]+href="([^"]*depositId[^"]*)/i, replaceHtmlEntities);
        var html = AnyBalance.requestGet(joinUrl(baseurl, detailsurl), g_headers);

        var dtStart = getParam(html, null, null, /<span[^>]+id="deposit-start"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseDate);
        getParam(html, result, 'deposits.agreement', /<span[^>]+id="agreement-number"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
        getParam(html, result, 'deposits.period', /<span[^>]+id="deposit-period"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance); //дн
        getParam(dtStart, result, 'deposits.date_start');
        getParam(html, result, 'deposits.till', /<span[^>]+id="deposit-until"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseDate);
        getParam(html, result, 'deposits.pct', /<span[^>]+id="deposit-rate"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, function(str){return parsePcts(str, new Date(dtStart))});
        getParam(html, result, 'deposits.pct_name', /<span[^>]+id="deposit-rate"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
        getParam(html, result, 'deposits.prolong', /<span[^>]+id="prolongation"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces); //возврат средств на счёт клиента после окончания вклада
        getParam(html, result, 'deposits.pct_conditions', /Выплата процентов([\s\S]*?)<\/li>/i, replaceTagsAndSpaces); //На счёт вклада
        getParam(html, result, 'deposits.pct_period', /Период выплаты процентов([\s\S]*?)<\/li>/i, replaceTagsAndSpaces); //25 дн.
        getParam(html, result, 'deposits.topup', /Возможность пополнения вклада([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseBool);
        getParam(html, result, 'deposits.withdraw', /Возможность частичного изъятия([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseBool);
        getParam(html, result, 'deposits.pct_withdraw', /Возможность снятия начисленных процентов([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseBool);
    }
}

//Определяет процент из строки вида c 1 по 150 день - 9.5%; с 151 по 200 день - 11%;
function parsePcts(str, dtStart){
    var dates = sumParam(str, null, null, /с\s*\d+[^;\-]*-\s*[\d.,]+%/ig), pct;
    if(dates){
        var dt = new Date();
        for (var i = dates.length-1; i >= 0; i--) {
            var day = getParam(dates[i], null, null, /с\s*(\d+)/, null, parseBalance);
            var dtEdge = new Date(dtStart.getFullYear(), dtStart.getMonth(), dtStart.getDate() + (day || 0));
            if (dt.getTime() >= dtEdge.getTime()) {
                pct = getParam(dates[i], null, null, /[\d.,]+%/i, null, parseBalance);
                return pct;
            }
        }
    }else{
        pct = getParam(str, null, null, /[\d.,]+%/i, null, parseBalance);
        if(isset(pct))
            return pct;
        return parseBalance(str);
    }
}

function parseBool(str){
    return /\bДа\b/i.test(str);
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка кредитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function processInfo(html, result){
    if(AnyBalance.isAvailable('info')) {
        html = AnyBalance.requestGet(baseurl + '/ubrrloans/loanapplicationform', g_headers);
        var info = result.info = {};
        getParam(html, info, 'fam', /<input[^>]+application.lastName[^>]*value="([^"]*)/i, null, html_entity_decode);
        getParam(html, info, 'name', /<input[^>]+application.firstName[^>]*value="([^"]*)/i, null, html_entity_decode);
        getParam(html, info, 'patronym', /<input[^>]+application.patronym[^>]*value="([^"]*)/i, null, html_entity_decode);
        getParam(html, info, 'birthday', /<input[^>]+application.birthDate[^>]*value="([^"]*)/i, null, parseDate);
        getParam(html, info, 'phone', /<input[^>]+application.mobilePhone[^>]*value="([^"]*)/i, null, html_entity_decode);
        getParam(html, info, 'email', /<input[^>]+application.email[^>]*value="([^"]*)/i, null, html_entity_decode);
    }
}
