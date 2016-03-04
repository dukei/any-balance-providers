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

var baseurl = 'https://www.atf24.kz/';

function login() {
	var prefs = AnyBalance.getPreferences();

	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'Default.aspx', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту интернет-банка! Попробуйте обновить данные позже.');
	}

	if (!/logout/i.test(html)) {
        var form = getElement(html, /<form[^>]+name="login"[^>]*>/i);

        var params = createFormParams(html, function(params, str, name, value) {
            if (name == 'ctl00$cphMain$tbLogin')
                return prefs.login;
            if (name == 'ctl00$cphMain$tbPassword')
                return prefs.password;
            if (name == 'ctl00$cphMain$tbCaptcha') {
            	var img = AnyBalance.requestGet(baseurl + 'images/captcha.aspx?635924463144343750', addHeaders({Referer: baseurl}));
				
            	return AnyBalance.retrieveCode('Пожалуйста, введите код с картинки', img, {time: 180000});
            }
            return value;
        });

		html = AnyBalance.requestPost(baseurl + 'Login.aspx?ReturnUrl=%2fDefault.aspx', params, addHeaders({Referer: baseurl + 'Login.aspx?ReturnUrl=%2fDefault.aspx'}));
	}else{
		AnyBalance.trace('Уже залогинены, используем существующую сессию')
	}

	// if (/<input[^>]+name="txtCode"/i.test(html)) {
		// AnyBalance.trace("Потребовался ввод кода.");
        // var msg = getElement(html, /<p[^>]*msgSMSCode[^>]*/i, replaceTagsAndSpaces);
        // var form = getElement(html, /<form[^>]+name="login"[^>]*>/i);

        // var params = createFormParams(html, function(params, str, name, value) {
            // if (name == 'txtCode')
                // return AnyBalance.retrieveCode((msg || 'Пожалуйста, введите код из SMS для входа в интернет-банк.' ) + '\n\nЧтобы каждый раз не вводить код, вы можете отключить его в своём интернет банке: меню "Настройки системы"/"Настройки информирования"/"Информирование об операциях в системе", затем снять галочку "Запрашивать SMS-код подтверждения при входе". Это безопасно, код подтверждения всё равно будет требоваться для всех операций.', null, {inputType: 'number', time: 180000});
            // return value;
        // });

        // html = AnyBalance.requestPost(baseurl + 'secure/login.aspx', params, addHeaders({Referer: baseurl + 'secure/login.aspx'}));
	// }

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

    html = AnyBalance.requestGet(baseurl + 'secure/accounts.aspx', g_headers);

	var accounts = getParam(html, null, null, /var\s+accountdata\s*=\s*(\[[^\]]+\])/i, null, getJson);
	if(!accounts.length){
        if(/У вас нет счетов/i.test(html)){
            AnyBalance.trace('У вас нет счетов');
            result.accounts = [];
        }else {
            AnyBalance.trace(html);
            AnyBalance.trace('Не удалось найти таблицу со счетами.');
        }
		return;
	}
	
	AnyBalance.trace('Найдено счетов: ' + accounts.length);
	result.accounts = [];
	
	for(var i=0; i < accounts.length; ++i){
        var acc = accounts[i];
		var id = acc.benefacc;
		var num = acc.acc;
		var title = acc.acctype + ' ' + id + ' ' + acc.curr;
		
		var c = {__id: id, __name: title, num: num};
		
		if(__shouldProcess('accounts', c)) {
			processAccount(acc, c);
		}
		
		result.accounts.push(c);
	}
}

function processAccount(account, result){
    AnyBalance.trace('Обработка счета ' + result.__name);
	
    getParam(account.acctype, result, 'accounts.type');
    getParam(account.balance, result, 'accounts.balance', null, null, parseBalance);
    getParam(account.currency, result, ['accounts.currency' , 'accounts.balance'], null, null, parseCurrency);
    getParam(account.date, result, 'accounts.date_start', null, null, parseDateWord);

    if(AnyBalance.isAvailable('accounts.transactions')) {
        processAccountTransactions(html, result);
    }
}

function getParamByName(html, name) {
    return getParam(html, null, null, new RegExp('name=["\']' + name + '["\'][^>]*value=["\']([^"\']+)"', 'i'));
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка карт
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(html, result) {
	if(!AnyBalance.isAvailable('cards'))
		return;
	
	html = AnyBalance.requestPost(baseurl + 'Default.aspx', {
		'smMain': 'ctl12$UpdatePanel2|ctl12$tmLoadAccounts',
		'__EVENTTARGET': 'ctl12$tmLoadAccounts',
		'__EVENTARGUMENT': '',
		'__VIEWSTATE': getParamByName(html, '__VIEWSTATE'),
		'__EVENTVALIDATION': getParamByName(html, '__EVENTVALIDATION'),
		'SessionAlerter1$sys_alert_delayperiod': '220000',
		'SessionAlerter1$sys_alert_waitperiod': '60',
		'hfSessionLocale': 'ru-RU',
		'__ASYNCPOST': 'true'
	}, g_headers);
	
	var cardList = getElements(html, /<div[^>]+class="block-content"[^>]*>/ig);
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
	
	var cards = [];
	for(var i=0; i< cardList.length; i++) {
		var current = cardList[i];
		
		if(/Карт-счет/i.test(current)) {
			cards.push(current);
		}
	}
	
	AnyBalance.trace('Найдено карт: ' + cards.length);
	result.cards = [];
	
	// Для детальной инфы есть json но в нем нет баланса... мда...

	for(var i=0; i < cards.length; ++i){
		var card = cards[i];
		var id = getParam(card, null, null, /id=(\d+)/i, replaceTagsAndSpaces);
		var num = getParam(card, null, null, /action=ShowCardDetails[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces);
		
		if(!isset(num))
			continue;
		
		var c = {__id: id, __name: num, num: num};
		
		if (__shouldProcess('cards', c)) {
			processCard(card, c);
		}
		
		result.cards.push(c);
	}
}

function processCard(card, result) {
    AnyBalance.trace('Обработка карты ' + result.__name);
	
    getParam(card, result, 'cards.balance', /<button[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
    getParam(card, result, 'cards.blocked', /"text-muted">([^<]+)блокировано/i, replaceTagsAndSpaces, parseBalance);
    getParam(card, result, ['cards.currency', 'cards.balance', 'cards.blocked'], /<button[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, parseCurrency);
	getParam(card, result, 'cards.till', /действительна до([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDate);
    getParam(card, result, 'cards.accnum', /Карт-счет([^<]+)/i, replaceTagsAndSpaces);


    getParam(card, result, 'cards.status', /(?:<td[^>]*>[^]*?<\/td>\s*){3}(<td[^>]*>[^]*?<\/td>)/i, replaceTagsAndSpaces);

	if(isAvailable('cards.transactions'))
		processCardTransactions(card, result);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка депозитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processDeposits(html, result) {
	if(!AnyBalance.isAvailable('deposits'))
		return;

	var html = AnyBalance.requestGet(baseurl + 'secure/deps.aspx', g_headers);
	
	var list = getParam(html, null, null, /<table[^>]*class="prodlist"[^>]*>[^]*?<\/table>/i);
	if(!list){
        if(/У вас нет депозитов/i.test(html)){
            AnyBalance.trace('У вас нет депозитов');
            result.deposits = [];
        }else {
            AnyBalance.trace(html);
            AnyBalance.trace('Не удалось найти таблицу с депозитами.');
        }
		return;
	}

	var deposits = sumParam(list, null, null, /<tr[^>]*>\s*<td[^>]*>[^]*?<\/tr>/ig);
	AnyBalance.trace('Найдено депозитов: ' + deposits.length);
	result.deposits = [];
	
	var detailsJson = getParam(html, null, null, /var\s+depdata\s*=\s*(\[{[\s\S]*?}\])\s*;/i);
	if(detailsJson)
		detailsJson = getJson(detailsJson);
	
	for(var i=0; i < deposits.length; ++i){
        var dep = deposits[i];
		var id = getParam(dep, null, null, /class="txt"[^>]*>\s*([^<]+)/i, replaceTagsAndSpaces);
		var num = detailsJson[i].ac;
		var title = getParam(dep, null, null, /class="txt"(?:[^>]*>){5}\s*([^<]+)/i, replaceTagsAndSpaces);
		
		var c = {__id: id, __name: title, num: num};
		
		if(__shouldProcess('deposits', c)) {
			processDeposit(dep, c, detailsJson[i]);
		}
		
		result.deposits.push(c);
	}
}

function processDeposit(html, result, detailsJson) {
    AnyBalance.trace('Обработка депозита ' + result.__name);

    getParam(html, result, 'deposits.status', /<td[^>]*CurrentStatus[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(detailsJson.db, result, 'deposits.balance', null, replaceTagsAndSpaces, parseBalance);
    getParam(detailsJson.db, result, ['deposits.currency', 'deposits.balance'], null, replaceTagsAndSpaces, parseCurrency);
	getParam(detailsJson.dr, result, 'deposits.pct', null, replaceTagsAndSpaces, parseBalance);
    getParam(detailsJson.ddd, result, 'deposits.period', null, replaceTagsAndSpaces);
    getParam(detailsJson.od, result, 'deposits.date_start', null, replaceTagsAndSpaces, parseDateWord);
    getParam(detailsJson.de, result, 'deposits.date_end', null, replaceTagsAndSpaces, parseDateWord);
    getParam(detailsJson.cap, result, 'deposits.pct_condition');
    getParam(detailsJson.unitcode, result, 'deposits.pct_period');
    getParam(detailsJson.dmil, result, 'deposits.balance_min', null, [replaceTagsAndSpaces, /-|любая/i, 0], parseBalance);
    getParam(detailsJson.dmsi, result, 'deposits.topup_min', null, [replaceTagsAndSpaces, /-|любая/i, 0], parseBalance);
    getParam(detailsJson.dmal, result, 'deposits.balance_max', null, replaceTagsAndSpaces, parseBalance);

    if(isAvailable('deposits.transactions'))
        processDepositTransactions(html, result);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка кредитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCredits(html, result) {
	if(!AnyBalance.isAvailable('credits'))
		return;

	var html = AnyBalance.requestGet(baseurl + 'secure/credits.aspx', g_headers);
	
	var list = getParam(html, null, null, /<table[^>]*class="prodlist"[^>]*>[^]*?<\/table>/i);
	if(!list){
		if(/У Вас нет кредитов/i.test(html)){
			AnyBalance.trace('Нет ни одного кредита.');
			result.credits=[];
		}else {
			AnyBalance.trace(html);
			AnyBalance.trace('Не удалось найти таблицу с кредитами.');
			return;
		}
	}

	var credits = sumParam(list, null, null, /<tr[^>]*>\s*<td[^>]*>[^]*?<\/tr>/ig);
	AnyBalance.trace('Найдено кредитов: ' + credits.length);
	result.credits = [];
	
	var detailsJson = getParam(html, null, null, /var\s+creditDetailsData\s*=\s*(\[{[\s\S]*?}\])/i, null, getJson);
    var historyJson = getParam(html, null, null, /var\s+creditHistoryData\s*=\s*(\[{[\s\S]*?}\])/i, null, getJson);
    var scheduleJson = getParam(html, null, null, /var\s+creditFuturePaymentsData\s*=\s*(\[{[\s\S]*?}\])/i, null, getJson);

	for(var i=0; i < credits.length; ++i){
		var _id = getParam(credits[i], null, null, /class="txt"[^>]*>\s*([^<]+)/i, replaceTagsAndSpaces);
		var title = getParam(credits[i], null, null, /class="txt"(?:[^>]*>){6}\s*([^<]+)/i, replaceTagsAndSpaces);
		var num = getParam(detailsJson[i].dt, null, null, /Лицевой счет №:([^]*?)<\/li>/i, replaceTagsAndSpaces);
		
		var c = {__id: _id, __name: title, num: num};
		
		if(__shouldProcess('credits', c)) {
			processCredit(credits[i], c, detailsJson[i]);

            if(AnyBalance.isAvailable('credits.transactions')){
                processCreditTransactions(historyJson[i], c);
            }

            if(AnyBalance.isAvailable('credits.schedule')){
                processCreditSchedule(scheduleJson[i], c);
            }
		}
		
		result.credits.push(c);
	}
}

function parseBool(str){
    return !/нет/i.test(str);
}

function processCredit(html, result, detailsJson){
    AnyBalance.trace('Обработка кредита ' + result.__name);

	getParam(detailsJson.dt, result, 'credits.limit', /Общая сумма кредита:([^]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance);
    getParam(detailsJson.dt, result, ['credits.currency', 'credits.balance', 'credits.minpay', 'credits.limit'], /Общая сумма кредита:([^]*?)<\/li>/i, replaceTagsAndSpaces, parseCurrency);
	getParam(detailsJson.dt, result, 'credits.minpay', /Сумма ближайшего платежа:([^]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance);
    getParam(detailsJson.dt, result, 'credits.minpaydate', /Дата ближайшего платежа:([^]*?)<\/li>/i, replaceTagsAndSpaces, parseDateWord);
	getParam(detailsJson.dt, result, 'credits.penalty', /Просроченная задолженность по кредиту:([^]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance);
	getParam(detailsJson.dt, result, 'credits.pct', /Текущая процентная ставка по кредиту:([^]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance);
    getParam(detailsJson.dt, result, 'credits.date_start', /Дата выдачи:([^]*?)<\/li>/i, replaceTagsAndSpaces, parseDateWord);
    getParam(detailsJson.dt, result, 'credits.date_end', /Дата финального погашения:([^]*?)<\/li>/i, replaceTagsAndSpaces, parseDateWord);
    getParam(detailsJson.dt, result, 'credits.period', /Срок кредита:([^]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance); //мес
    getParam(detailsJson.dt, result, 'credits.balance', /Текущая сумма долга по кредиту:([^]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance);
    getParam(detailsJson.dt, result, 'credits.sum_close', /Сумма[^<]*под закрытие договора[^<]*:([^]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance);
    getParam(detailsJson.dt, result, 'credits.noclose', /Мораторий на погашение по кредиту:([^]*?)<\/li>/i, replaceTagsAndSpaces, parseBool);

    if(AnyBalance.isAvailable('credits.transactions')) {
        processCreditTransactions(html, result);
    }

    if(AnyBalance.isAvailable('credits.schedule')) {
        processCreditSchedule(html, result);
    }
}

function processInfo(html, result){
    html = AnyBalance.requestGet(baseurl + 'secure/InformingSettings/OperationsInSystem.aspx', g_headers);
    var info = result.info = {};
    getParam(html, info, 'info.fio', /<div[^>]+id="statfio"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
    getParam(html, info, 'info.mphone', /<input[^>]+name="[^"]*txtMobileNumber"[^>]*value="([^"]*)/i, replaceHtmlEntities);
    getParam(html, info, 'info.email', /<input[^>]+name="[^"]*txtNotificationEmail"[^>]*value="([^"]*)/i, replaceHtmlEntities);
}
