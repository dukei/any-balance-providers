/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':      'keep-alive',
	'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.110 Safari/537.36'
};

var baseurl = 'https://online.baitushum.kg/WWWCOR/';

function login() {
	var prefs = AnyBalance.getPreferences();

	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'Start.aspx', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту интернет-банка! Попробуйте обновить данные позже.');
	}

	if (!/act=login/i.test(html)) {
    html = AnyBalance.requestGet(baseurl + 'StartPwdFiz.aspx?LNG=RU', g_headers);
    var params = getParamByName(html, [
      '__VIEWSTATE',
      '__EVENTARGUMENT'
    ]);
    params['__EVENTTARGET'] = 'Button1';

    html = AnyBalance.requestPost(baseurl + 'StartPwdFiz.aspx?LNG=RU', params, g_headers);

    var form   = getElement(html, /<form[^>]+name="mainForm"[^>]*>/i);
    var params = createFormParams(form, function(params, str, name, value) {
        if (name == 'edUserLogin') {
          return prefs.login;
        }
        if (name == 'edPassword') {
          return prefs.password;
        }

        return value;
    });

		html = AnyBalance.requestPost(baseurl + 'LoginNewFiz.aspx', params, addHeaders({Referer: baseurl + 'LoginNewFiz.aspx'}));
	}else{
		AnyBalance.trace('Уже залогинены, используем существующую сессию')
	}

	if (!/act=login/i.test(html)) {
		var error = getParam(html, null, null, /<td[^>]+clserror[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Неправильно введено имя пользователя или пароль/i.test(error));
		
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


	var accounts = getElements(html, /<tr[^>]+accr[^>]*>/g);
	if(!accounts.length){
    AnyBalance.trace(html);
    AnyBalance.trace('Не удалось найти счета.');
		return;
	}
	
	AnyBalance.trace('Найдено счетов: ' + accounts.length);
	result.accounts = [];
	
	for(var i=0; i < accounts.length; ++i){
		var id    = getParam(accounts[i], null, null, /<a[^>]*>([^<]*)/i);
		var num   = getParam(accounts[i], null, null, /<a[^>]*>([^<]*)/i);
		var title = getParam(accounts[i], null, null, /<td[^>]+accname[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
		
		var c = {__id: id, __name: title, num: num};
		
		if(__shouldProcess('accounts', c)) {
			processAccount(accounts[i], c);
		}
		
		result.accounts.push(c);
	}
}

function processAccount(account, result){
    AnyBalance.trace('Обработка счета ' + result.__id);
	
    getParam(account, result, 'accounts.balance',   /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, null, parseBalance); //остаток
    getParam(account, result, 'accounts.available', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, null, parseBalance); //доступно
    getParam(account, result, 'accounts.last_movement', /(?:[\s\S]*?<td[^>]*>){9}([\s\S]*?)<\/td>/i, null, parseDate); //дата последнего движения
    getParam(account, result, 'accounts.currency',  /<td[^>]+AccBalance[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(account, result, 'accounts.status',    /(?:[\s\S]*?<td[^>]*>){10}([\s\S]*?)<\/td>/i, null);

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

  //Начинаем шаманство
  html = findParams(html, ['Задачи', 'Пластиковые карты']);

	var table = getElement(html, /<table[^>]+tblValuesList[^>]*>/i);
  var cards = getElements(table, /<tr[^>]*>/ig);
  if(!cards.length){
    AnyBalance.trace(html);
    AnyBalance.trace('Не удалось найти карты.');
		return;
	}

	AnyBalance.trace('Найдено карт: ' + (cards.length - 1));
	result.cards = [];
	
	for(var i = 1; i < cards.length; ++i){
		var id    = getParam(cards[i], null, null, /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces),
        num   = getParam(cards[i], null, null, /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces),
        title = getParam(cards[i], null, null, /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

		var c = {__id: id, __name: title, num: num};

		if (__shouldProcess('cards', c)) {
			processCard(cards[i], c, html);
		}

		result.cards.push(c);
	}
}

function processCard(card, result, html_cards) {
    AnyBalance.trace('Обработка карты ' + result.__name);

    getParam(card, result, 'cards.status',       /(?:[\s\S]*?<td[^>]*>){8}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(card, result, 'cards.currency',     /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(card, result, 'cards.accnum',       /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(card, result, 'cards.name_on_card', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
  	getParam(card, result, 'cards.till',         /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);

    var html = AnyBalance.requestGet(baseurl + 'Reports/cardinfo.aspx?P1=' + result.__id, addHeaders({
      Referer: baseurl + 'Common/Reference/BaseListRefer.aspx'
    }));

    getParam(html, result, 'cards.acc_owner',    /Владелец счета(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, 'cards.card_holder',  /Держатель карты(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, 'cards.card_product', /Карточный продукт(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, 'cards.date_start',   /Дата выдачи(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    getParam(html, result, 'cards.balance',      /Доступная сумма с учетом кредитного лимита(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

	  if(isAvailable('cards.transactions')) {
		  processCardTransactions(html_cards, card, result);
    }
}

function processDeposits(html, result) {
  throw new AnyBalance.Error("Обработка депозитов пока не поддерживается. Пожалуйста, обратитесь к разработчикам.");
}

function processCredits(html, result) {
  throw new AnyBalance.Error("Обработка кредитов пока не поддерживается. Пожалуйста, обратитесь к разработчикам.");
}

function processInfo(html, result){
    var info = result.info = {};
    getParam(html, info, 'info.fio', /<span[^>]+HLVC_lblUser[^>]*>([^<]*)/i, replaceTagsAndSpaces);
}

function getParamByName(html, names) {
  names = isArray(names) ? names : [names];
  var params = {};
  for(var i = 0; i < names.length; i++) {
    params[names[i]] = getParam(html, null, null, new RegExp('name=["\']' + names[i] + '["\'][^>]*value=["\']([^"\']+)"', 'i')) || '';
  }
  return params;
}

function findParams(html, names) {
  names = isArray(names) ? names : [names];

  for(var i = 0; i < names.length; i++) {
    var re     = new RegExp('<a[^>]+id="([^"]*)"[^>]*>' + names[i], 'i'),
      params = getParamByName(html, [
        '__VIEWSTATE',
        'HVC:lP',
        'HVC:srvurl'
      ]);

    params['__EVENTTARGET']   =  getParam(html, null, null, re);
    params['__EVENTARGUMENT'] = '';
    params['edMessage']       = '';


    html = AnyBalance.requestPost(baseurl + 'Start.aspx', params, addHeaders({
      Referer: baseurl + 'Start.aspx'
    }));
  }

  return html;
}