/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'Origin': 'https://rsonline.sberbank.kz',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://rsonline.sberbank.kz/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'frontend/frontend', g_headers);

	var execKey = getParam(html, null, null, /execution=([\s\S]{4})/i);
	var href = getParam(html, null, null, /id="FORM_FAST_LOGIN"[^>]*action="\/([^"]*)/i);

	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'Login')
			return prefs.login;
		else if (name == 'password')
			return prefs.password;
		else if (name == '_flowExecutionKey')
			return execKey;
		return value;
	});
	html = AnyBalance.requestPost(baseurl + href, params, addHeaders({Referer: baseurl + 'frontend/auth/userlogin?execution=' + execKey}));

	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /Смена Пароля(?:[\s\S]*?<[^>]*>){2}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error);
		error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	if (prefs.type == 'acc')
		fetchAcc(html, baseurl);
	else
		fetchCard(html, baseurl);
}

function getSID(html) {
	var sid = getParam(html, null, null, /'SID'[^>]*value='([^']*)/i, replaceTagsAndSpaces, html_entity_decode);
	return sid;
}

function fetchCard(html, baseurl) {
	var prefs = AnyBalance.getPreferences();
	if (prefs.lastdigits && !/^\d{3}$/.test(prefs.lastdigits))
		throw new AnyBalance.Error("Надо указывать 3 последних символа карты или не указывать ничего");

	var result = {success: true};
	// Иногда мы не переходим на нужную страницу, из-за каких-то глюков.
	html = AnyBalance.requestPost(baseurl + 'frontend/frontend', {
		'RQ_TYPE':'WORK',
		'SCREEN_ID':'MAIN',
		'MENU_ID':'MENU',
		'ITEM_ID':'MENU_CLICK',
		SID:getSID(html),
		'Step_ID':'0',
		'CP_MENU_ITEM_ID':'SFMAIN_MENU.WB_PRODUCTS_ALL',
	}, addHeaders({Referer: baseurl + 'frontend/frontend'}));

	html = AnyBalance.requestPost(baseurl + 'frontend/frontend', {
		'RQ_TYPE':'WORK',
		'SCREEN_ID':'MAIN',
		'MENU_ID':'MENU',
		'ITEM_ID':'MENU_CLICK',
		SID:getSID(html),
		'Step_ID':'1',
		'CP_MENU_ITEM_ID':'CARDS.CARD_LIST',
	}, addHeaders({Referer: baseurl + 'frontend/frontend'}));

	getParam(html, result, 'userName', /ibec_header_right">\s*<b>([\s\S]*?)<\//i, replaceTagsAndSpaces);

	// Пока мы не знаем как выглядит счет с несколькими картами, поэтому сделал как было, вроде должно сработать если что.
	var cardnum = prefs.lastdigits || '\\d{3}';
	var regExp = new RegExp('<root>(?:[\\s\\S]*?<name[^>]*>){12}\\d{3}\\*+' + cardnum + '[\\s\\S]*?</root>','i');

	var root = getParam(html, null, null, regExp);
	if(!root){
		throw new AnyBalance.Error('Не удалось найти ' + (prefs.lastdigits ? 'карту с последними символами ' + prefs.lastdigits : 'ни одной карты!'));
	}

	getParam(root, result, 'balance', /\d{3}\*+\d{3}[\s\S]*?class='ibec_balance'(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(root, result, ['currency', 'balance'], /\d{3}\*+\d{3}[\s\S]*?class='ibec_balance'(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, parseCurrency);
	getParam(root, result, '__tariff', /(\d{3}\*+\d{3})/i);
	result.cardNumber = result.__tariff;

	AnyBalance.setResult(result);
}

function fetchAcc(html, baseurl) {
	var prefs = AnyBalance.getPreferences();
	if (prefs.lastdigits && !/^\S{3}$/.test(prefs.lastdigits))
		throw new AnyBalance.Error("Надо указывать 3 последних символа счёта или не указывать ничего");

	var result = {success: true};
	// Иногда мы не переходим на нужную страницу, из-за каких-то глюков.
	
	var items = ['SFMAIN_MENU.WB_PRODUCTS_ALL', 'WB_PRODUCTS_ALL.ACCOUNTS', 'ACCOUNTS.ACC_LIST'];
	for(var stepId = 0; stepId < 3; stepId++) {
		html = AnyBalance.requestPost(baseurl + 'frontend/frontend', {
			'RQ_TYPE':'WORK',
			'SCREEN_ID':'MAIN',
			'MENU_ID':'MENU',
			'ITEM_ID':'MENU_CLICK',
			SID:getSID(html),
			'Step_ID':stepId + '',
			'CP_MENU_ITEM_ID':items[stepId],
		}, addHeaders({Referer: baseurl + 'frontend/frontend'}));
	}
	
	// html = AnyBalance.requestPost(baseurl + 'frontend/frontend', {
		// 'RQ_TYPE':'WORK',
		// 'SCREEN_ID':'MAIN',
		// 'MENU_ID':'MENU',
		// 'ITEM_ID':'MENU_CLICK',
		// SID:getSID(html),
		// 'Step_ID':'0',
		// 'CP_MENU_ITEM_ID':'SFMAIN_MENU.WB_PRODUCTS_ALL',
	// }, addHeaders({Referer: baseurl + 'frontend/frontend'}));

	// html = AnyBalance.requestPost(baseurl + 'frontend/frontend', {
		// 'RQ_TYPE':'WORK',
		// 'SCREEN_ID':'MAIN',
		// 'MENU_ID':'MENU',
		// 'ITEM_ID':'MENU_CLICK',
		// SID:getSID(html),
		// 'Step_ID':'1',
		// 'CP_MENU_ITEM_ID':'WB_PRODUCTS_ALL.ACCOUNTS',
	// }, addHeaders({Referer: baseurl + 'frontend/frontend'}));

	// html = AnyBalance.requestPost(baseurl + 'frontend/frontend', {
		// 'RQ_TYPE':'WORK',
		// 'SCREEN_ID':'MAIN',
		// 'MENU_ID':'MENU',
		// 'ITEM_ID':'MENU_CLICK',
		// SID:getSID(html),
		// 'Step_ID':'2',
		// 'CP_MENU_ITEM_ID':'ACCOUNTS.ACC_LIST',
	// }, addHeaders({Referer: baseurl + 'frontend/frontend'}));

	getParam(html, result, 'userName', /ibec_header_right">\s*<b>([\s\S]*?)<\//i, replaceTagsAndSpaces);
	var accnum = prefs.lastdigits || '\\S{3}';

	/*#####
	## Fetch all trs by groups and loop throught them to find needed account
	######*/
	/////////////////////////////////////////////////////////////////////////////////////////////////////////
	var regexHtml = new RegExp('(<tr class=\"\\s*owwb-cs-slide-list[\\s\\S]*?</tr>)','gi');
	var regexTr = new RegExp('KZ\\S{15}'+ accnum,'i');

	var matchHtml;
	var matchTr;
	var index = 1;

	while (matchHtml = regexHtml.exec(html)) {
        matchTr = regexTr.exec(matchHtml[index]);
        if (matchTr!=null) {
        	var root = matchHtml[index];
        	break;
        }
    }
	/////////////////////////////////////////////////////////////////////////////////////////////////////////
	/**
	Все что выше можно было написать одной строкой.
	var matchTr = getParam(html, null, null, new RegExp('...' + ( prefs.lastdigits || '') + '...', 'i'), replaceTagsAndSpaces);
	*/
	
	if(!root){
		throw new AnyBalance.Error('Не удалось найти ' + (prefs.lastdigits ? 'карту с последними цифрами ' + prefs.lastdigits : 'ни одной карты!'));
	}

	getParam(root, result, '__tariff', /KZ\S{18}/i);
	getParam(root, result, 'balance', /class="owwb-cs-slide-list-amount-value"(?:[^>]*>){1}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(root, result, 'currency', /class="owwb-cs-slide-list-amount-currency"(?:[^>]*>){1}([^<]*)/i, replaceTagsAndSpaces);
	result.cardNumber = result.__tariff;

	AnyBalance.setResult(result);
}