/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var baseurl = 'https://online.jugra.ru';

var g_html_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:35.0) Gecko/20100101 Firefox/35.0'
};

var g_headers = addHeaders({
	'Content-Type': 'application/json;charset=utf-8',
	'Accept': 'application/json, text/plain, */*',
 	'X-Requested-With': 'XMLHttpRequest',
	Referer: baseurl + '/',
	'Origin': baseurl
 }, g_html_headers);


function login(prefs) {
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + '/', g_html_headers);
	var token = AnyBalance.getCookie('XSRF-TOKEN');

	html = AnyBalance.requestPost(baseurl + '/client/controller/?action=1', '', addHeaders({'X-XSRF-TOKEN': token}));

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту интернет-банка! Попробуйте обновить данные позже.');
	}

	var json = getJson(html);
	if (!json.ok) {
		token = AnyBalance.getCookie('XSRF-TOKEN');
		html = AnyBalance.requestPost(baseurl + '/main/controller/?action=2', JSON.stringify({
				pkn: prefs.login,
				password: prefs.password
			}),addHeaders({'X-XSRF-TOKEN': token, Referer: baseurl + '/auth'})
		);
		json = getJson(html);

		//Проверим, не нужен ли код
		if(json.ok && json.data.sms_confirm_login){
			AnyBalance.trace('Требуется подтверждение по SMS. Запрашиваем...');
			var maxTries = 3;
			for(var i=0; i<maxTries; ++i){
				var err = '';
				var code = AnyBalance.retrieveCode(err + "Пожалуйста, введите код подтверждения входа в интернет-банк, посланный вам по SMS" + (i>0 ? ' (осталось ' + (maxTries-i) + ' попытки)' : ''), null, {inputType: 'number', time: 180000});

				html = AnyBalance.requestPost(baseurl + '/main/controller/?action=6', JSON.stringify({
						pkn: prefs.login,
						code: code
					}), addHeaders({'X-XSRF-TOKEN': token, Referer: baseurl + '/auth'})
				);

				json = getJson(html);
				if(!json.ok && /SMS-код должен содержать|INVALID_CONFIRM_CODE/i.test(json.error + json.msg)){
					AnyBalance.trace('Попытка ' + (i+1) + ', код ' + code + ': ' + json.msg);
					msg = json.msg + '\n';
					continue;
				}

				break;
			}
		}
	}else{
		AnyBalance.trace('Уже залогинены, используем существующую сессию')
	}

	if (!json.ok) {
		var error = isArray(json.msg) ? json.msg.join(', ') : json.msg;
		if (error)
			throw new AnyBalance.Error(error, null, /PKN_NOT_FOUND|INVALID_PASSWORD|ПКН должен содержать/i.test(json.error + error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в интернет-банк. Сайт изменен?');
	}

    __setLoginSuccessful();
	
	return json;
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка счетов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processAccounts(json, result) {
    if(!AnyBalance.isAvailable('accounts'))
        return;

	AnyBalance.trace('Обработка счетов');

	result.accounts = [];
	for (var i = 0; i < json.data.tools.length; i++) {
		var tool = json.data.tools[i];

		if(!tool.account)
			continue; //Это не счет

		var t = {__id: tool.id, __name: tool.client_tool_name, num: tool.account.number};
		if(__shouldProcess('accounts', t)){
			processAccount(tool, t);
		}

		result.accounts.push(t);
	}
}

/**
 * Проверяет значение на null, и если null, возвращает undefined
 * Нужно для getParam
 * @param val
 * @returns {*}
 */
function n(val){
	if(val !== null)
		return val;
}

function getToolById(tools, id){
	for (var i = 0; i < tools.length; i++) {
		var tool = tools[i];
		if(tool.id == id)
			return tool;
	}
}

function processAccount(tool, result){
    AnyBalance.trace('Обработка счета ' + result.__name);

	var account = tool.account;
	
	getParam(account.currency, result, 'accounts.currency_iso'); //810
	getParam(CurrencyISO.getCurrencySymbol(account.currency), result, 'accounts.currency');
    getParam(account.type, result, 'accounts.type'); //CARD
	getParam(account.status, result, 'accounts.status_code'); //0
    getParam(account.saldo, result, 'accounts.balance');
	getParam(account.free_limit, result, 'accounts.available');
	getParam(n(account.min_balance), result, 'accounts.balance_min');
    getParam(n(account.date_open), result, 'accounts.date_start', null, null, parseDateISO);
	getParam(n(account.date_close), result, 'accounts.date_end', null, null, parseDateISO);
	getParam(n(account.replenish), result, 'accounts.replenish'); //bool
	getParam(n(account.partial_withdrawal), result, 'accounts.withdrawal'); //bool
	getParam(n(account.rate), result, 'accounts.rate');

    if(AnyBalance.isAvailable('accounts.transactions')) {
        processAccountTransactions(tool, result);
    }
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка карт
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(json, result) {
	if(!AnyBalance.isAvailable('cards'))
		return;

	AnyBalance.trace('Обработка карт');

	result.cards = [];
	for (var i = 0; i < json.data.tools.length; i++) {
		var tool = json.data.tools[i];

		if(!tool.card)
			continue; //Это не карта

		var t = {__id: tool.id, __name: tool.client_tool_name, num: tool.card.number};
		if(__shouldProcess('cards', t)){
			if(tool.parent_id){
				//Есть родительский счет
				var acctool = getToolById(json.data.tools, tool.parent_id);
				getParam(acctool && acctool.account && acctool.account.number, t, 'cards.accnum');
			}
			processCard(tool, t);
		}

		result.cards.push(t);
	}
}

function processCard(tool, result) {
	AnyBalance.trace('Обработка карты ' + result.__name);

	var card = tool.card;

	getParam(card.currency, result, 'cards.currency_iso');
	getParam(CurrencyISO.getCurrencySymbol(card.currency), result, 'cards.currency');
	getParam(card.card_type, result, 'cards.type'); //EC/MC Mass
	getParam(card.status, result, 'cards.status_code'); //0
	getParam(card.saldo, result, 'cards.balance');
	getParam(card.free_limit, result, 'cards.available');
	getParam(n(card.summ_blocked), result, 'cards.blocked');
	getParam(n(card.date_expired), result, 'cards.till', null, null, parseDate);
	getParam(n(card.owner), result, 'cards.holder');
	getParam(n(card.sms_notice), result, 'cards.sms_notice'); //bool
	getParam(n(card.cashback_sum), result, 'cards.cashback');

	if(isAvailable('cards.transactions'))
		processCardTransactions(tool, result);

	if(card.summ_blocked && isAvailable('cards.transactions_blocked'))
		processBlockedCardTransactions(tool, result);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка депозитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка кредитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка персональных данных
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function processInfo(json, result){
	if(AnyBalance.isAvailable('info')) {
		var info = result.info = {};
		getParam(n(json.data.person.name), info, 'info.name');
		getParam(n(json.data.person.surname), info, 'info.surname');
		getParam(n(json.data.person.patronymic), info, 'info.patronymic');
		getParam(n(json.data.person.date_birth), info, 'info.birthday', null, null, parseDateISO);
		getParam(n(json.data.person.pass_seria), info, 'info.pass_seria');
		getParam(n(json.data.person.pass_number), info, 'info.pass_number');
		getParam(n(json.data.person.pass_description), info, 'info.pass_descr');
		getParam(n(json.data.person.address), info, 'info.address');
		getParam(n(json.data.person.email), info, 'info.email');
	}
}
