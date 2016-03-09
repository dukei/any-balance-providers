/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'*/*',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
	'X-MicrosoftAjax':'Delta=true',
	'X-Requested-With':'XMLHttpRequest'
};

var g_baseurl = "https://retail.payment.ru";

function getViewState(html){
	return getParam(html, null, null, [/name="__VIEWSTATE"[^>]*value="([^"]*)"/i, /__VIEWSTATE\|([^|]*)/i], replaceHtmlEntities);
}

function getEventValidation(html){
	return getParam(html, null, null, [/name="__EVENTVALIDATION"[^>]*value="([^"]*)"/i, /__EVENTVALIDATION\|([^|]*)/i], replaceHtmlEntities);
}

function getViewStateGenerator(html){
	return getParam(html, null, null, [/name="__VIEWSTATEGENERATOR[^>]*value="([^"]*)"/i, /__VIEWSTATEGENERATOR\|([^|]*)/i], replaceHtmlEntities);
}

function requestAndCheckForErrors(method, url, params, headers, folowRedirect) {

	if(/POST/.test(method)) {
		var html = AnyBalance.requestPost(url, params, headers);
	} else {
		var html = AnyBalance.requestGet(url, headers);
	}

	if(folowRedirect && !/pageRedirect/i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error("Не удаётся войти в интернет банк (внутренняя ошибка сайта)");
	}

	if(/KeyAuth/i.test(html))
		throw new AnyBalance.Error("Для входа в интернет-банк требуются одноразовые пароли. Зайдите в интернет-банк с компьютера и отключите в Настройках требование одноразовых паролей при входе. Это безопасно, для операций по переводу денег пароли всё равно будут требоваться.");
	if(/UpdateContactInfo.aspx/i.test(html))
		throw new AnyBalance.Error("Для входа в интернет-банк требуются обновить контактную информацию. Зайдите в интернет-банк с компьютера и следуйте инструкциям.");

	if(folowRedirect) {
		var authHref = getParam(html, null, null, /pageRedirect\|\|([^\|]*)/i, replaceTagsAndSpaces, decodeURIComponent);

		AnyBalance.trace('Нашли ссылку ' + authHref);
		// Они добавили еще один шаг авторизации, эта ссылка ставит кучу кук и возвращает 302, без нее не работает
		html = AnyBalance.requestGet(g_baseurl + authHref, g_headers);
	}

	var error = getParam(html, null, null, /<div[^>]*class="errorMessage"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	if(error)
		throw new AnyBalance.Error(error, null, /Неверные учетные данные/i.test(error));

	return html;
}

function login(){
	var prefs = AnyBalance.getPreferences();

	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, "Пожалуйста, укажите логин для входа в интернет-банк Промсвязбанка!");
	checkEmpty(prefs.password, "Пожалуйста, укажите пароль для входа в интернет-банк Промсвязбанка!");

	var html = AnyBalance.requestGet(g_baseurl + '/n/Main/Home.aspx', g_headers);
	if(!/logout/i.test(html)){
		var eventvalidation = getEventValidation(html);
		var viewstate = getViewState(html);
		var viewStateGenerator = getViewStateGenerator(html);

		AnyBalance.setCookie('retail.payment.ru', '__dp_rsa', 'version%3D3%2E4%2E1%2E0%5F1%26pm%5Ffpua%3Dmozilla%2F5%2E0%20%28windows%20nt%206%2E1%3B%20wow64%29%20applewebkit%2F537%2E36%20%28khtml%2C%20like%20gecko%29%20chrome%2F42%2E0%2E2311%2E90%20safari%2F537%2E36%7C5%2E0%20%28Windows%20NT%206%2E1%3B%20WOW64%29%20AppleWebKit%2F537%2E36%20%28KHTML%2C%20like%20Gecko%29%20Chrome%2F42%2E0%2E2311%2E90%20Safari%2F537%2E36%7CWin32%26pm%5Ffpsc%3D24%7C1440%7C900%7C900%26pm%5Ffpsw%3D%26pm%5Ffptz%3D3%26pm%5Ffpln%3Dlang%3Dru%7Csyslang%3D%7Cuserlang%3D%26pm%5Ffpjv%3D1%26pm%5Ffpco%3D1%26pm%5Ffpasw%3Dwidevinecdmadapter%7Cmhjfbmdgcfjbbpaeojofohoefgiehjai%7Cpepflashplayer%7Cinternal%2Dremoting%2Dviewer%7Cinternal%2Dnacl%2Dplugin%7Cinternal%2Dpdf%2Dviewer%26pm%5Ffpan%3DNetscape%26pm%5Ffpacn%3DMozilla%26pm%5Ffpol%3Dtrue%26pm%5Ffposp%3D%26pm%5Ffpup%3D%26pm%5Ffpsaw%3D1440%26pm%5Ffpspd%3D24%26pm%5Ffpsbd%3D%26pm%5Ffpsdx%3D%26pm%5Ffpsdy%3D%26pm%5Ffpslx%3D%26pm%5Ffpsly%3D%26pm%5Ffpsfse%3D%26pm%5Ffpsui%3D%26pm%5Fos%3DWindows%26pm%5Fbrmjv%3D42%26pm%5Fbr%3DChrome%26pm%5Finpt%3D%26pm%5Fexpt%3D')

		html = requestAndCheckForErrors("POST", g_baseurl + '/n/Default.aspx', {
			'ctl00$ScriptManager':'ctl00$mainArea$upLogin|ctl00$mainArea$btnLogin',
			'__EVENTTARGET': '',
			'__EVENTARGUMENT': '',
			'__VIEWSTATE':viewstate,
			'__VIEWSTATEENCRYPTED': '',
			'__EVENTVALIDATION':eventvalidation,
			'__VIEWSTATEGENERATOR': viewStateGenerator,
			'ctl00$mainArea$LoginInput$vtcLogin':prefs.login,
			'ctl00$mainArea$vtcPassword':prefs.password,
			'__ASYNCPOST':true,
			'ctl00$mainArea$btnLogin':'Войти'
		}, addHeaders({Referer: 'https://retail.payment.ru/n/Default.aspx'}), true);

		html = requestAndCheckForErrors("GET", g_baseurl + '/n/Main/Home.aspx', '', g_headers);

		if (!/logout/i.test(html)) {
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось войти в интернет-банк. Сайт изменен?');
		}

		__setLoginSuccessful();
	}else{
		AnyBalance.trace('Уже внутри. Используем существующую сессию.')
	}

	return html;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка счетов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processAccounts(html, result) {
    if(!AnyBalance.isAvailable('accounts'))
        return;

	var eventvalidation = getEventValidation(html);
	var viewstate = getViewState(html);

	//Инфа о счетах схлопнута, а надо её раскрыть
	if(/<div[^>]*isDetExpandBtn[^>]*accountList[^>]*>\s*подробно/i.test(html)){
		html = AnyBalance.requestPost(g_baseurl + '/n/Main/Home.aspx', {
			'ctl00$ctl00$ScriptManager':'ctl00$ctl00$mainArea$main$upAccounts|ctl00$ctl00$mainArea$main$accountList',
			'__EVENTTARGET':'ctl00$ctl00$mainArea$main$accountList',
			'__EVENTARGUMENT':'_det_exp',
			'__VIEWSTATE':viewstate,
			'__VIEWSTATEENCRYPTED':'',
			'__EVENTVALIDATION':eventvalidation,
			'ctl00$ctl00$mainArea$right$OperationSearchRightColumn$OperationSearch$tbSearch':'',
			'ctl00_ctl00_mainArea_right_OperationSearchRightColumn_OperationSearch_tbSearch_InitialTextMode':'True',
			'__ASYNCPOST':'true',
			'':''
		}, addHeaders({Referer:g_baseurl + '/n/Main/Home.aspx'}));
	}

	var accs = getElements(html, /<div[^>]+class="infoUnit"[^>]*>/ig);
	AnyBalance.trace('Найдено счетов: ' + accs.length);
	if(!result.accounts)
		result.accounts = [];

	for(var i=0; i<accs.length; ++i){
		var acc = accs[i];

		var name = getElement(acc, /<div[^>]+"infoUnitCaption[^>]*>/i, replaceTagsAndSpaces);
		var id = getElement(acc, /<a[^>]+"infoUnitObject[^>]*>/i, [replaceTagsAndSpaces, /\s+/g, '']);
		var a = {__id: id, __name: name + ' *' + id.substr(-4), num: id};

		if(__shouldProcess('accounts', a)){
			processAccount(acc, a);
		}

		result.accounts.push(a);
	}
}

function processAccount(acc, result){
    AnyBalance.trace('Обработка счета ' + result.__name);

	getParam(acc, result, 'accounts.balance', /"balanceAmountM"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(acc, result, ['accounts.currency', 'accounts.balance', 'accounts.blocked', 'accounts.balance_own'], /"balanceAmountCurrencyM"[^>]*>([^<]*)/i, replaceTagsAndSpaces);

	if(AnyBalance.isAvailable('accounts.blocked', 'accounts.balance_own','accounts.unused_credit', 'accounts.minpay', 'accounts.minpaytill', 'accounts.gracepay', 'accounts.gracepaytill', 'accounts.contract', 'accounts.limit', 'accounts.pct', 'accounts.transactions')){
		processAccountDetails(acc, result);
	}
}

function processAccountDetails(acc, result){
	AnyBalance.trace('Получаем детальную информацию по счету ' + result.__name);

	var href = getParam(acc, null, null, /"infoUnitObject"[^>]*href="([^"]*)/i);
	var html = AnyBalance.requestGet(g_baseurl + href, g_headers);

	getParam(html, result, 'accounts.balance_own', /"ctl00_ctl00_mainArea_main_lblAccountBalance"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'accounts.blocked', /"ctl00_ctl00_mainArea_main_lblReserved"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'accounts.unused_credit', /"ctl00_ctl00_mainArea_main_lblUnusedCredit"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'accounts.minpay', /"ctl00_ctl00_mainArea_main_CreditNextRepayment_lblNextRepaymentSum"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'accounts.minpaytill', /"ctl00_ctl00_mainArea_main_CreditNextRepayment_lblConditionDate"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseDateWord);
	getParam(html, result, 'accounts.gracepay', /"ctl00_ctl00_mainArea_main_lblGraceRepaymentSum"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'accounts.gracepaytill', /"ctl00_ctl00_mainArea_main_lblGraceRepaymentDate"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseDateWord);

	getParam(html, result, 'accounts.contract', /"ctl00_ctl00_mainArea_right_lblContract"[^>]*>([^<]*)/i, replaceTagsAndSpaces);
	getParam(html, result, 'accounts.limit', /"ctl00_ctl00_mainArea_right_lblCreditLimit"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'accounts.pct', /"ctl00_ctl00_mainArea_right_lblInterest"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);

	if(AnyBalance.isAvailable('accounts.transactions')) {
		processAccountTransactions(html, result);
	}
}

function processAccountsPreliminaryDetails(html, result, path){
	var divText = getElement(html, /<div[^>]+accountDetailTextBlock[^>]*>/i);
	if(divText){
		var divValue = getElement(html, /<div[^>]+accountDetailValueBlock[^>]*>/i);
		var divTexts = getElements(divText.substr(1), /<div[^>]*>/ig);
		var divValues = getElements(divValue.substr(1), /<div[^>]*>/ig);
		for (var i = 0; i < divTexts.length; i++) {
			var d = divTexts[i], v = divValues[i];
			if(/ИТОГО/i.test(d)) {
				getParam(v, result, [path + 'currency', path + 'balance', path + 'blocked', path + 'balance_own'], /<div[^>]+curNameISO[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
				getParam(v, result, path + 'balance', null, replaceTagsAndSpaces, parseBalance);
			}else if(/собственные средства/i.test(d))
				getParam(v, result, path + 'balance_own', null, replaceTagsAndSpaces, parseBalance);
			else if(/кредитные средства/i.test(d))
				getParam(v, result, path + 'unused_credit', null, replaceTagsAndSpaces, parseBalance);
		}
	}

	//А если не нашли блок, то надо попытаться баланс взять из обычного места.
	getParam(html, result, path + 'balance', /"balanceAmountM"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, [path + 'currency', path + 'balance', path + 'blocked', path + 'balance_own'], /"balanceAmountCurrencyM"[^>]*>([^<]*)/i, replaceTagsAndSpaces);

	if(path == 'cards.') {
		getParam(html, result, path + 'accnum', /<a[^>]+class="infoUnitObject[^>]*>([\s\S]*?)<\/a>/i, [replaceTagsAndSpaces, /\D/g, '']);
		getParam(html, result, path + 'accname', /<div[^>]+class="infoUnitCaption[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	}else{
		getParam(html, result, path + 'name', /<div[^>]+class="infoUnitCaption[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	}

	getParam(html, result, path + 'minpaytill', /ближайший платеж:([^>,]*)/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, path + 'minpay', /ближайший платеж:[^>]*сумма:([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка карт
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(html, result) {
	if(!AnyBalance.isAvailable('cards', 'accounts'))
		return;

	result.cards = [];
	if(!result.accounts)
		result.accounts = [];

	html = AnyBalance.requestGet(g_baseurl + '/n/Main/CardsAndAccounts.aspx', addHeaders({Referer: g_baseurl + '/n/Main/Home.aspx'}));

	var cards = getElements(html, /<div[^>]+class="(?:cardAccountBlock|card)"/ig);
	AnyBalance.trace('Найдено карт и карточных счетов: ' + cards.length);
	var cardAccount = null;

	for(var i=0; i<cards.length; ++i){
		var card = cards[i];

		if(/cardAccountBlock/i.test(card)) {

			function delayedProcessAccount(cardAccount) {
				if(!AnyBalance.isAvailable('accounts'))
					return;
				if(!cardAccount)
					return;

				var name = getElement(cardAccount, /<div[^>]+"infoUnitCaption[^>]*>/i, replaceTagsAndSpaces);
				var id = getElement(cardAccount, /<a[^>]+"infoUnitObject[^>]*>/i, [replaceTagsAndSpaces, /\s+/g, '']);
				var a = {__id: id, __name: name + ' *' + id.substr(-4), num: id};

				if (__shouldProcess('accounts', a)) {
					processAccountsPreliminaryDetails(cardAccount, a, 'accounts.');
					processAccount(cardAccount, a);
				}

				result.accounts.push(a);
			}

			//Чтобы обработка счета всегда была после обработки всех карт счета
			delayedProcessAccount(cardAccount);
			cardAccount = card;
		}else{
			if(!AnyBalance.isAvailable('cards'))
				continue;

			if(/emptyAccount/i.test(card)){
				AnyBalance.trace('Пустая карта, пропускаем');
				continue;
			}

			var id = getParam(card, null, null, /<span[^>]+class="cardnumber[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
			var name = getParam(card, null, null, /<a[^>]+class="cardStandAloneCaption[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces);
			var c = {__id: id, num: id, __name: name + ' *' + id.substr(-4)};

			if(__shouldProcess('cards', c)){
				processAccountsPreliminaryDetails(cardAccount, c, 'cards.');
				processCard(card, c);
			}

			result.cards.push(c);
		}
	}

	delayedProcessAccount(cardAccount);

}

function processCard(card, c) {
	getParam(card, c, 'cards.status', /<span[^>]+class="cardStatus[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	getParam(card, c, 'cards.name', /<a[^>]+class="cardStandAloneCaption[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces);
	getParam(card, c, 'cards.ps', /<div[^>]+class="cardIconBlock[^>]*>[\s\S]*?<img[^>]+title="([^"]*)/i, replaceHtmlEntities);

	if(AnyBalance.isAvailable('cards.limit_cash_day', 'cards.limit_cash_month', 'cards.limit_pay_day', 'cards.limit_pay_month', 'cards.blocked', 'cards.till', 'cards.transactions')){
		var href = getParam(card, null, null, /<a[^>]+class="cardStandAloneCaption"[^>]*href="([^"]*)/i, replaceHtmlEntities);
		AnyBalance.trace('Запрашиваем детали по карте');
		var html = AnyBalance.requestGet(g_baseurl + href, g_headers);

		getParam(html, c, 'cards.limit_cash_day', /Снятие наличных в день:[\s\S]*?<span[^>]+class="limit"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, c, 'cards.limit_cash_month', /Снятие наличных в месяц:[\s\S]*?<span[^>]+class="limit"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, c, 'cards.limit_pay_day', /Другие расходные операции в день:[\s\S]*?<span[^>]+class="limit"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, c, 'cards.limit_pay_month', /Другие расходные операции в месяц:[\s\S]*?<span[^>]+class="limit"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);

		getParam(html, c, 'cards.blocked', /"ctl00_ctl00_mainArea_main_lblReserved"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, c, 'cards.till', /"ctl00_ctl00_mainArea_main_lblExpireDate"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseDate);

		if(AnyBalance.isAvailable('cards.transactions')){
			processCardsTransactions(html, c);
		}
	}
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка депозитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка кредитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка общей информации
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function processInfo(html, result){
	var info = result.info = {};
	getParam(html, info, 'info.fio', /<div[^>]+id="[^"]*divUserName"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);

	if(AnyBalance.isAvailable('info.mphone', 'info.smsphone', 'info.email', 'info.alias')) {
		html = AnyBalance.requestGet(g_baseurl + '/n/Settings/Settings.aspx', g_headers);

		getParam(html, info, 'info.mphone', /Номер телефона:[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
		getParam(html, info, 'info.smsphone', /E-mail:[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
		getParam(html, info, 'info.email', /<span[^>]+id="[^"]*lblSmsPhone"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
		getParam(html, info, 'info.alias', /<input[^>]+vtcUserAlias[^>]*value="([^"]*)/i, replaceHtmlEntities);
	}
}

function processBonuses(html, result){
	if(isAvailable(['bonuses', 'bonuses_grade'])) {
		html = AnyBalance.requestGet(g_baseurl + '/n/Services/BonusProgram.aspx');

		getParam(html, result, 'bonuses', [/class="bonusAmount"[^>]*>([^<]*)/i, /"ctl00_ctl00_mainArea_main_lblBonusAmount"[^>]*>([^<]*)/i], replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'bonuses_grade', [/Уровень\s*"([^"]*)/i, /"ctl00_ctl00_mainArea_main_lblStatus"[^>]*>([^<]*)/i], replaceTagsAndSpaces);
	}
}

