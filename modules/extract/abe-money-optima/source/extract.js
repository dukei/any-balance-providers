/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':			'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language':	'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':		'keep-alive',
	'User-Agent':		'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.112 Safari/537.36'
};

var baseurl = 'https://www.optima24.kg/';

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
        var params = createFormParams(html, function(params, str, name, value) {
            if (name == 'ctl00$cphMain$tbLogin') {
				return prefs.login;
			} else if (name == 'ctl00$cphMain$tbPassword') {
				return prefs.password;
			} else if (name == 'ctl00$cphMain$tbCaptcha'){
				var src = getParam(html, null, null, /<img[^>]+cphMain_imgCaptcha[^>]+src="([^"]*)/i),
					img = AnyBalance.requestGet(baseurl + src, addHeaders({Referer: baseurl}));

				return AnyBalance.retrieveCode('Пожалуйста, введите код с картинки', img, {time: 180000});
            }
            return value;
        });

		html = AnyBalance.requestPost(baseurl + 'Login.aspx', params, addHeaders({
			Referer: baseurl + 'Login.aspx',
			'X-Requested-With': 'XMLHttpRequest'
		}));
	}else{
		AnyBalance.trace('Уже залогинены, используем существующую сессию')
	}

	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, [/<div[^>]+cphMain_plLoginAlert[^>]*>([\s\S]*?)<\/div>/i, /<span[^>]+cphMain_rfvCaptcha[^>]*>([\s\S]*?)<\/span>/i], replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /(Неверный ID код или пароль|Неверно указан код с картинки)/i.test(error));
		
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

    html = AnyBalance.requestGet(baseurl + 'Default.aspx?action=ShowAccounts', g_headers);
	var params = createFormParams(html, function(params, str, name, value) {
		return value;
	});

	var s_part = getParam(html, null, null, /uniqueID(?:[^"]*"){2}([^"]*)/i);
	params['__EVENTTARGET'] = s_part;

	html = AnyBalance.requestPost(baseurl + 'Default.aspx?action=ShowAccounts', params, addHeaders({
		'X-Requested-With': 'XMLHttpRequest',
		'Referer': baseurl + 'Default.aspx?action=ShowAccounts'
	}));

	var table 	 = getElement(html, /<div[^>]+ctl16_ctl02_upCheckList[^>]*>/i),
		accounts = getElements(table, /<div[^>]+"block"[^>]*>/ig);

	if(!accounts.length) {
		AnyBalance.trace(html);
		AnyBalance.trace("Не удалось найти счета.");
		return;
	}

	AnyBalance.trace('Найдено счетов: ' + accounts.length);
	result.accounts = [];
	
	for(var i=0; i < accounts.length; ++i){
		var id    = getParam(accounts[i], null, null, /<a[^>]+accountname(?:[^>]*>){4}([^<]*)/i, replaceTagsAndSpaces),
			num   = getParam(accounts[i], null, null, /<a[^>]+accountname(?:[^>]*>){4}([^<]*)/i, replaceTagsAndSpaces),
			title = getParam(accounts[i], null, null, /<a[^>]+accountname[^>]*>([^<]*)/i, replaceTagsAndSpaces);
		
		var c = {__id: id, __name: title, num: num};
		
		if(__shouldProcess('accounts', c)) {
			processAccount(accounts[i], c);
		}
		
		result.accounts.push(c);
	}
}

function processAccount(account, result){
    AnyBalance.trace('Обработка счета ' + result.__id);

	var href = getParam(account, null, null, /<a[^>]+GetStatement[^>]+href="([^"]*)/i, replaceHtmlEntities);
	if(!href) {
		AnyBalance.trace(account);
		AnyBalance.trace("Не удалось найти ссылку на информацию по счёту. Сайт изменён?");
		return;
	}

	var html = AnyBalance.requestGet(baseurl + href, g_headers);

	getParam(html, result, 'accounts.balance', /<span[^>]+lbBalanceValue[^>]*>([^<]*)/i, null, parseBalance);
	getParam(html, result, ['accounts.currency' , 'accounts.balance'], /<span[^>]+lbBalanceValue[^>]*>([^<]*)/i, null, parseCurrency);

    if(AnyBalance.isAvailable('accounts.transactions')) {
        processAccountTransactions(html, href, result);
    }
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка карт
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(html, result) {
	if(!AnyBalance.isAvailable('cards'))
		return;

	html = AnyBalance.requestGet(baseurl + 'Default.aspx?action=ShowAccounts', g_headers);
	var params = createFormParams(html, function(params, str, name, value) {
		return value;
	});

	var s_part = getParam(html, null, null, /uniqueID(?:[^"]*"){2}([^"]*)/i);
	params['__EVENTTARGET'] = s_part;

	html = AnyBalance.requestPost(baseurl + 'Default.aspx?action=ShowAccounts', params, addHeaders({
		'X-Requested-With': 'XMLHttpRequest',
		'Referer': baseurl + 'Default.aspx?action=ShowAccounts'
	}));

	var table = getElement(html, /container\s*index[\s\S]*?(<div[^>]+"row"[^>]*>)/i),
		cards = getElements(table, /<div[^>]+"block"[^>]*>/ig);

	if(!cards.length){
		AnyBalance.trace(html);
		AnyBalance.trace('Не удалось найти карты.');
		return;
	}

	AnyBalance.trace('Найдено карт: ' + cards.length);
	result.cards = [];
	
	for(var i=0; i < cards.length; ++i){
		var id    = getParam(cards[i], null, null, /<a[^>]+cardname[^>]*>([\s\S]*?)<\/a>/i),
			num   = getParam(cards[i], null, null, /<a[^>]+cardname[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces),
			title = getParam(cards[i], null, null, /<a[^>]+cardname[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces);

		var c = {__id: id, __name: title, num: num};

		if (__shouldProcess('cards', c)) {
			processCard(cards[i], c);
		}

		result.cards.push(c);
	}
}

function processCard(card, result) {
    AnyBalance.trace('Обработка карты ' + result.__name);

	getParam(card, result, 'cards.acc_num', /Карт-счет([^<]*)/i, replaceTagsAndSpaces);
	getParam(card, result, 'cards.type', /<img[^>]+rptAccounts[^>]+card_([^\.]*)/i, replaceTagsAndSpaces);

	var href = getParam(card, null, null, /<a[^>]+cardname[^>]+href="([^"]*)/i, replaceHtmlEntities);
	if(!href) {
		AnyBalance.trace(card);
		AnyBalance.trace("Не удалось найти ссылку на подробную информацию по карте.");
		return;
	}

	var html = AnyBalance.requestGet(baseurl + href, g_headers);

	getParam(html, result, 'cards.till', /действительна до([^<]*)/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'cards.balance', /<button[^>]+btnBalance[^>]*>([\s\S]*?)<\/button>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cards.blocked', /<button[^>]+btnBalance(?:[^>]*>){4}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, ['cards.currency', 'cards.balance', 'cards.blocked'], /<button[^>]+btnBalance[^>]*>([\s\S]*?)<\/button>/i, replaceTagsAndSpaces, parseCurrency);

	if(isAvailable('cards.transactions')) {
		processCardTransactions(html, href, result);
	}
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка депозитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processDeposits(html, result) {
	throw new AnyBalance.Error('Обработка депозитов пока не поддерживается. Пожалуйста, обратитесь к разработчикам');

}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка кредитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCredits(html, result) {
	throw new AnyBalance.Error('Обработка кредитов пока не поддерживается. Пожалуйста, обратитесь к разработчикам.');
}

function processInfo(html, result){
    var info = result.info = {};
    getParam(html, info, 'info.fio', /<span[^>]+lbUserName[^>]*>([^<]*)/i, [replaceTagsAndSpaces, /!/g, '']);
}
