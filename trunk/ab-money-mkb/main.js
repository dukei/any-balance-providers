/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://online.mkb.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	checkEmpty(!prefs.num || /^\d{4}$/.test(prefs.num), 'Укажите 4 последних цифры или не указывайте ничего, чтобы получить информацию по первому продукту.');

	var html = AnyBalance.requestGet(baseurl + 'secure/login.aspx', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'secure/login.aspx', {
		__VIEWSTATE: '',
		__EVENTTARGET: '',
		__EVENTARGUMENT: '',
		txtLogin: prefs.login,
		txtPassword: prefs.password,
		btnLoginStandard: ''
	}, addHeaders({Referer: baseurl + 'secure/login.aspx'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+id="errMessage"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Проверьте правильность указания Логина и Пароля/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};
	getParam(html, result, 'bonuses', /МКБ Бонус\s*<span[^>]*>([\s\d]+)&nbsp;баллов/i, replaceTagsAndSpaces, parseBalance);

	if(prefs.type == 'crd')
		fetchCredit(baseurl, result, prefs);
	else if(prefs.type == 'dep')
		fetchDeposit(baseurl, result, prefs);
	else if(prefs.type == 'acc')
		fetchAccount(baseurl, result, prefs);
	else
		fetchCard(baseurl, result, prefs);

	AnyBalance.setResult(result);
}

function fetchCard(baseurl, result, prefs){
	var html = AnyBalance.requestGet(baseurl + 'secure/dcards.aspx', g_headers);

	var cardList = getParam(html, null, null, /<table[^>]* class="prodlist"[^>]*>[^]*?<\/table>/i);
	if(!cardList){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти таблицу с картами.');
	}

	var cards = sumParam(cardList, null, null, /<tr[^>]*>[^]*?<\/tr>/ig);

	// 1-я строка - заголовочная
	if(!cards || cards.length < 2){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти ни одной карты.');
	}

	var card;
	for(var i = 1, toi = cards.length; i < toi; i++){
		if((prefs.num && new RegExp('\\*\\*\\*' + prefs.num).test(cards[i])) || !prefs.num){
			card = cards[i];
			break;
		}
	}

	if(!card){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти карту с последними цифрами ' + prefs.num);
	}

	getParam(card, result, 'cardnum', /<div[^>]*class="txt"[^>]*>([\d\*]+)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(card, result, 'type', /(?:<td[^>]*>[^]*?<\/td>\s*){2}(<td[^>]*>[^]*?<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(card, result, '__tariff', /<div[^>]*class="txt"[^>]*>([\d\*]+[^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(card, result, 'balance', /(?:<td[^>]*>[^]*?<\/td>\s*){4}(<td[^>]*>[^]*?<\/td>)/i, replaceTagsAndSpaces, parseBalance);
    getParam(card, result, ['currency' , 'balance'], /(?:<td[^>]*>[^]*?<\/td>\s*){4}(<td[^>]*>[^]*?<\/td>)/i, replaceTagsAndSpaces, parseCurrency);
}

function fetchCredit(baseurl, result, prefs) {
	throw new AnyBalance.Error('Получение информации о кредитах пока не реализовано. Сообщите разработчикам.');
}

function fetchAccount(baseurl, result, prefs) {
    var html = AnyBalance.requestGet(baseurl + 'secure/accounts.aspx', g_headers);

	var accounts = getParam(html, null, null, /var accountdata = (\[[^\]]+\])/i, null, getJson);

	if(!accounts || !isArray(accounts) || !accounts.length){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти ни одного счета.');
	}

	var account;
	for(var i = 0, toi = accounts.length; i < toi; i++){
		// Нужен аккаунт, где есть счет с цифрами
		if((prefs.num && new RegExp('\\*\\*\\*' + prefs.num).test(accounts[i].acc)) || !prefs.num){
			account = accounts[i];
			break;
		}
	}

	if(!account){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Обратитесь к разработчикам, поиск счета по последним цифрам не поддерживается.');
	}

	getParam(account.acc, result, 'cardnum');
    getParam(account.acctype, result, 'type');
    getParam(account.acctype, result, '__tariff');
    getParam(account.balance, result, 'balance', null, null, parseBalance);
    getParam(account.balance, result, ['currency' , '__tariff'], null, null, parseCurrency);
}

function fetchDeposit(baseurl, result, prefs) {
	var html = AnyBalance.requestGet(baseurl + 'secure/deps.aspx');
	
	var deposits = getParam(html, null, null, /var depdata = (\[[^\]]+\])/i, null, getJson);

	if(!deposits || !isArray(deposits) || !deposits.length){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти ни одного вклада.');
	}

	var deposit;
	for(var i = 0, toi = deposits.length; i < toi; i++){
		if((prefs.num && new RegExp('\\d+' + prefs.num).test(deposits[i].ac)) || !prefs.num){
			deposit = deposits[i];
			break;
		}
	}

	if(!deposit){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти депозит с последними цифрами номера счета ' + prefs.num);
	}

	getParam(deposit.ac, result, 'accnum', null, replaceTagsAndSpaces, html_entity_decode);
	getParam(deposit.nm, result, 'cardnum', null, replaceTagsAndSpaces, html_entity_decode);
	getParam(deposit.db, result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(deposit.dr, result, 'pctcredit', null, replaceTagsAndSpaces, parseBalance);
	getParam(deposit.de, result, 'deptill', null, replaceTagsAndSpaces, parseDateWord);
}