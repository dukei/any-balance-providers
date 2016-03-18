/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'User-Agent: Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.116 Safari/537.36'
};

var baseurl = 'https://direkt.otpbank.ru';

function login() {
	var prefs = AnyBalance.getPreferences();

	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + '/homebank/do/bankszamla/bankszamlaMuvelet?muveletStatusz=vegrehajtas', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту интернет-банка! Попробуйте обновить данные позже.');
	}

	if (!/exit/i.test(html)) {
		try {
			html = AnyBalance.requestPost(baseurl + '/homebank/do/bejelentkezesJelszoalapu', {
				azonosito:prefs.login,
				jelszo:prefs.password,
				tranzakcionkentiAzonositas:'off',
				muvelet:'login',
				cacheHasznalat:'off',
				x:86,
				y:11,
				lang:'ru'
			}, addHeaders({
				Referer: baseurl + '?error=2919_'
			}));
		} catch (e) {
			AnyBalance.trace(e);
			html = AnyBalance.requestGet(baseurl+'/homebank/do/bankszamla/bankszamlaMuvelet?muveletStatusz=vegrehajtas', g_headers);
		}

	}else{
		AnyBalance.trace('Уже залогинены, используем существующую сессию')
	}

	if (!/exit/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+paddings[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /неверно ввели логин или пароль/i.test(error));

		if(/Ваш доступ в ОТПдирект заблокирован/i.test(html))
			throw new AnyBalance.Error("Ваш доступ в ОТПдирект заблокирован, Пожалуйста, обратитесь в Контакт-Центр или в ближайшее для Вас Отделение Банка для разблокировки доступа.", null, true);

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в интернет-банк. Сайт изменен?');
	}

	html = waitForTransactionEx(html);

    __setLoginSuccessful();
	
	return html;
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка счетов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processAccounts(html, result) {
    throw new AnyBalance.Error("Обработка счетов пока не поддерживается, пожалуйста обратитесь к разработчику.");
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка карт
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(html, result) {
	if(!AnyBalance.isAvailable('cards'))
		return;

	var cards = getParam(html, null, null, /<table[^>]+id="kartyaT"[^>]*>((?:[\s\S](?!<table)|[\s\S]<table[\s\S]*?<\/table>)*?)<\/table>/i);

	//В строках таблицы продуктов могут быть вложенные таблицы. Извращенцы...
	var rows = sumParam(cards, null, null, /<tr[^>]+class="(?:paratlan|paros)[^>]*>((?:[\s\S](?!<table)|[\s\S]<table[\s\S]*?<\/table>)*?)<\/tr>/ig) || [];
	if(!rows.length) {
		AnyBalance.trace(html);
		AnyBalance.trace("Карты не найдены.");
		return;
	}

	AnyBalance.trace('Найдено карт: ' + rows.length);
	result.cards = [];
	
	for(var i=0; i < rows.length; ++i){
		var id = getParam(rows[i], null, null, /<div[^>]+nagyharmadikoszlop_1[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		var num = getParam(rows[i], null, null, /<div[^>]+nagyharmadikoszlop_1[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		var title = getParam(rows[i], null, null, /<input[^>]+nameinput[^>]+value\s*=\s*"([^"]*)/i, replaceTagsAndSpaces);

		var c = {__id: id, __name: title, num: num};

		if (__shouldProcess('cards', c)) {
			processCard(rows[i], c);
		}

		result.cards.push(c);
	}
}

function processCard(card, result) {
    AnyBalance.trace('Обработка карты ' + result.__name);

	var href = getParam(card, null, null, /<a[^>]+href="([^"]*)[^>]+id="reszleteslink/i);
	if(!href) {
		AnyBalance.trace("Не удалось найти ссылку на детальную информацию по карте " + result.__name);
		return;
	}

	getParam(card, result, 'cards.balance', /<span[^>]+nonbold[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);

	var html = AnyBalance.requestGet(baseurl + href, g_headers);
	html = waitForTransactionEx(html);

	getParam(html, result, 'cards.tDebt', /сумма общей задолженности(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cards.mDebt', /основной долг(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cards.cPct', /текущие проценты(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cards.own', /остаток собственных средств(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cards.oDebt', /просроченный долг(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cards.oPct', /Проценты на просрочку(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cards.minpay', /Минимальный платеж(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cards.limit', /кредитный лимит(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cards.gracepay', /платеж льготного периода(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['cards.currency', 'cards.tDebt', 'cards.mDebt', 'cards.cPct', 'cards.own', 'cards.oDebt', 'cards.oPct', 'cards.minpay', 'cards.limit', 'cards.gracepay'], /сумма общей задолженности(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);

	getParam(html, result, 'cards.minpay_till', /Дата очередного платежа(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'cards.gracepay_till', /Дата окончания льготного периода(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'cards.type', /Основная\s*\/\s*дополнительная(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'cards.status', /статус карты(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'cards.agreement', /номер договора(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'cards.aDate_start', /дата открытия договора(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'cards.date_start', /дата выпуска карты(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'cards.till', /Дата окончания действия карты(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);

	getParam(html, result, 'cards.pPct', /при оплате товаров(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'cards.wPct', /при снятии наличных(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'cards.aCard', /дополнительная карта(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);


	if(isAvailable('cards.transactions'))
		processCardTransactions(html, card, result);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка депозитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processDeposits(html, result) {
	if(!AnyBalance.isAvailable('deposits'))
		return;

	var table = getParam(html, null, null, /<table[^>]+id="betetT"[^>]*>((?:[\s\S](?!<table)|[\s\S]<table[\s\S]*?<\/table>)*?)<\/table>/i);
	var deposits = sumParam(table, null, null, /<tr[^>]+class="(?:paratlan|paros)[^>]*>((?:[\s\S](?!<table)|[\s\S]<table[\s\S]*?<\/table>)*?)<\/tr>/ig) || [];
	if(!deposits.length) {
		AnyBalance.trace(html);
		AnyBalance.trace("Не удалось найти депозиты.");
		return;
	}

	AnyBalance.trace('Найдено депозитов: ' + deposits.length);
	result.deposits = [];
	
	for(var i=0; i < deposits.length; ++i){
		var id = getParam(deposits[i], null, null, /<div[^>]+class="harmadikmegnagyoszlop_1[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		var num = getParam(deposits[i], null, null, /<div[^>]+class="harmadikmegnagyoszlop_1[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		var title = getParam(deposits[i], null, null, /<div[^>]+class="nagyelsooszlop_1"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		
		var c = {__id: id, __name: title, num: num};
		
		if(__shouldProcess('deposits', c)) {
			processDeposit(deposits[i], c);
		}
		
		result.deposits.push(c);
	}
}

function processDeposit(deposit, result) {
    AnyBalance.trace('Обработка депозита ' + result.__name);

	getParam(deposit, result, 'deposits.balance', /<div[^>]+class="hatodikoszlop"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	var href = getParam(deposit, null, null, /<a[^>]+href="([^"]*)[^>]+id="reszleteslink/i, null, html_entity_decode);
	if(!href)
		throw new AnyBalance.Error('Не удалось найти ссылку на детальную информацию по депозиту.');

	var html = AnyBalance.requestGet(baseurl + href, g_headers);

	html = waitForTransactionEx(html);

	getParam(html, result, 'deposits.till', /Дата закрытия вклада[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'deposits.available', /Доступная сумма для расхода[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'deposits.aBalance', /Доступный остаток[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'deposits.topup', /Возможность пополнения[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'deposits.withdraw', /Возможность расходных операций[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'deposits.minsaldo', /Неснижаемый остаток при расходе[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'deposits.mindep', /Минимальная сумма вклада[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'deposits.lasttopup', /Последняя дата пополнения[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'deposits.lastwithdraw', /Последняя дата расхода[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'deposits.blocked', /Заблокированная сумма[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'deposits.pct', /Процентная ставка по вкладу[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'deposits.pct_type', /Тип начисления процентов[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'deposits.contract', /Номер договора[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

   if(isAvailable('deposits.transactions'))
        processDepositTransactions(html, deposit, result);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка кредитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCredits(html, result) {
	throw new AnyBalance.Error("Обработка кредитов пока не поддерживается. Пожалуйста, обратитесь к разработчику.");
}

function processInfo(html, result){
    var info = result.info = {};
    getParam(html, info, 'info.fio', /<span[^>]+name[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
    getParam(html, info, 'info.nick', /<span[^>]+login[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces);
}

function waitForTransactionEx(html){
	var form = getElement(html, /<form[^>]+id="varakozasForm"[^>]*>/i);
	if(!form)
		throw new AnyBalance.Error("Не удалось найти форму ожидания.");
	var action = getParam(form, null, null, /action="([^"]*)/i, null, html_entity_decode);

	var hrefCheck = getParam(html, null, null, /actionURL\s*:\s*['"]([^'"]*)/);
	waitForTransaction(hrefCheck);

	var params = createFormParams(form);
	html = AnyBalance.requestPost(baseurl + action, params, g_headers);
	return html;
}

function waitForTransaction(url){
	do{
		html = AnyBalance.requestGet(baseurl + url, g_headers);
		if(html == 'FINISHED' || html == 'TIMEOUT')
			break;
		if(html != 'WAITING')
			throw new AnyBalance.Error('Неизвестный ответ от проверки транзакции: ' + html);
		AnyBalance.trace('Waiting for transaction to finish...');
		AnyBalance.sleep(3000);
	}while(true);
}