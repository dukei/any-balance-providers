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

var baseurl = 'https://mybank.fortebank.com/';

function login() {
	var prefs = AnyBalance.getPreferences();

	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'retail/Folder/', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту интернет-банка! Попробуйте обновить данные позже.');
	}
	
	if (!/retail\/exit\.aspx/i.test(html)) {
		if(/SessionClose/i.test(html))
			html = AnyBalance.requestGet(baseurl + 'retail/', g_headers);
		
        var params = createFormParams(html, function(params, str, name, value) {
            if (name == 'tbLogin')
                return prefs.login;
            if (name == 'tbPassword')
                return prefs.password;
            if (name == 'tbLoginImg'){
				var src = getParam(html, null, null, /Captcha\/JpegImage\.aspx[^"]+/i, replaceTagsAndSpaces);
				if(src) {
					var img = AnyBalance.requestGet(baseurl + 'retail/' + src, addHeaders({Referer: baseurl}));
					return AnyBalance.retrieveCode('Пожалуйста, введите код с картинки', img, {time: 180000});
				}
            	return '';
            }
            return value;
        });
		
		params.loginType = 'textLogin';
		
		html = AnyBalance.requestPost(baseurl + 'retail/', params, addHeaders({Referer: baseurl + 'retail/'}));
	} else {
		AnyBalance.trace('Уже залогинены, используем существующую сессию')
	}
	
	if (!/retail\/exit\.aspx/i.test(html)) {
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
// Обработка карт
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(html, result) {
	if(!AnyBalance.isAvailable('cards'))
		return;
	
	var html = AnyBalance.requestGet(baseurl + 'retail/Folder/Default.aspx?fld=CardAccount', g_headers);

	var cardList = getParam(html, null, null, /<table[^>]* class="prodlist"[^>]*>[^]*?<\/table>/i);
	cardList = html;
	if(!cardList) {
        if(/У вас нет карт/i.test(html)) {
            AnyBalance.trace('У вас нет карт');
            result.cards = [];
        } else {
            AnyBalance.trace(html);
            AnyBalance.trace('Не удалось найти таблицу с картами.');
        }
		return;
	}
	
	var cards = sumParam(cardList, null, null, /<a\s+href="\?fld=CardInfo&id=[^"]+">[\s\S]*?<\/a>/ig);
	AnyBalance.trace('Найдено карт: ' + cards.length);
	result.cards = [];
	
	for(var i=0; i < cards.length; ++i){
		var card = cards[i];
		var id = getParam(card, null, null, /CardInfo&id=([^"]+)/i, replaceTagsAndSpaces);
		var title = getParam(card, null, null, />([\s\S]*?)<\/a>/i, replaceTagsAndSpaces);
		
		var c = {__id: id, __name: title};

		if (__shouldProcess('cards', c)) {
			processCard(card, c);
		}

		result.cards.push(c);
	}
}

function processCard(card, result) {
    AnyBalance.trace('Обработка карты ' + result.__name);
	
	var html = AnyBalance.requestGet(baseurl + 'retail/Folder/Default.aspx?fld=CardInfo&id=' + result.__id, g_headers);
	
    getParam(html, result, 'cards.balance', /Доступный баланс:(?:[^>]*>){4}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'cards.limit', /Кредитный лимит:(?:[^>]*>){4}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, ['cards.currency', 'cards'], /Валюта карточного счета:(?:[^>]*>){4}([^<]+)/i, replaceTagsAndSpaces);
	
    getParam(html, result, 'cards.num', /Номер карточного счета:(?:[^>]*>){5}([^<]+)/i, replaceTagsAndSpaces);
    getParam(html, result, 'cards.status', /Состояние карты:(?:[^>]*>){4}([^<]+)/i, replaceTagsAndSpaces);
    getParam(html, result, 'cards.till', /Срок действия:(?:[^>]*>){4}([^<]+)/i, replaceTagsAndSpaces, parseDateWord);
    getParam(html, result, 'cards.owner', /\d+[*]+\d{4}\s*,([^<]+)/i, replaceTagsAndSpaces);
	
	if(isAvailable('cards.transactions'))
		processCardTransactions(html, result);
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
