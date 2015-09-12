/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36'
};

var g_baseurl = 'https://secure.my.ukrsibbank.com/web_banking/';

function login() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(g_baseurl, g_headers);
	
	if(AnyBalance.getLastStatusCode() > 400 || !html) {
		throw new AnyBalance.Error('Ошибка! Сервер не отвечает! Попробуйте обновить баланс позже.');
	}
	
	if(!/logout/i.test(html)){
		var ar = getParam(html, null, null, /var digitsArray = new Array\(([^)]+)\);/i);
		var digitsArray = sumParam(ar, null, null, /'(\d+)'/ig);
		
		if(!ar || digitsArray.length < 1) {
			throw new AnyBalance.Error('Не удалось найти ключи шифрования пароля. Сайт изменен?');
		}
		
		var fake_password = '', j_password =  '';
		
		for(var i = 0; i < prefs.password.length; i++) {
			fake_password +=  '*';
			var curr = prefs.password[i]*1;
			j_password += digitsArray[curr == 0 ? 9 : curr-1] + '_';
		}
		
		html = AnyBalance.requestPost(g_baseurl + 'j_security_check', {
			j_username: prefs.login,
			j_password: j_password,
			fake_password: fake_password
		}, addHeaders({Referer: g_baseurl + 'protected/welcome.jsf'}));
	}else{
		AnyBalance.trace('Уже залогинены, продолжаем текущую сессию');
	}
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<h2 class="message">([\s\S]*?)<\/h2>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	return html;
}

function processCards(html, result){
	html = AnyBalance.requestGet(g_baseurl + '/protected/payment_cards/payment_cards.jsf');

	var form = getElement(html, /<form[^>]+id="paymentCardsForm"[^>]*>/i);
	if(!form)
		AnyBalance.trace('Карты не найдены: ' + html);

	var trs = getElements(form, [/<tr[^>]*>/ig, /<td[^>]*>/i]);
	AnyBalance.trace('Найдено карт: ' + trs.length);
	
	result.cards = [];

    for(var i=0; i<trs.length; ++i){
    	var tr = trs[i];
    	var id = getParam(tr, null, null, /<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    	var name = getParam(tr, null, null, /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    	var c = {
    		__id: id, 
    		__name: name + ' (' + id.substr(-4) + ')'
    	};

    	if(__shouldProcess('cards', c)){
    		processCard(tr, c);
    	}

    	result.cards.push(c);
    }
}

function processCard(html, result) {
	getParam(result.__id, result, 'cards.num'); 
	getParam(html, result, 'cards.type', /(<td[^>]*>[\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, ['cards.currency', 'cards.balance'], /(<td[^>]*>[\s\S]*?){7}<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'cards.balance', /(<td[^>]*>[\s\S]*?){8}<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cards.till', /(<td[^>]*>[\s\S]*?){2}<\/td>/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'cards.type', /(<td[^>]*>[\s\S]*?){3}<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'cards.status', /(<td[^>]*>[\s\S]*?){4}<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'cards.holder', /(<td[^>]*>[\s\S]*?){5}<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

	var accinfo = getParam(html, null, null, /(<td[^>]*>[\s\S]*?){6}<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	if(accinfo){
		getParam(html, result, 'cards.accname', /([\s\S]*?)(?:\/|<br|$)/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, 'cards.accnum', /(?:<br[^>]*>)([\s\S]*)/i, replaceTagsAndSpaces, html_entity_decode);
	}
}

function processAccounts(html, result){
	if(!AnyBalance.isAvailable('accounts'))
		return;

	if(!/<table[^>]+class="current-accounts"[^>]*>/i.test(html))
		html = AnyBalance.requestGet(g_baseurl + '/protected/welcome.jsf');

	var form = getElement(html, /<table[^>]+class="current-accounts"[^>]*>/i);
	if(!form)
		AnyBalance.trace('Счета не найдены: ' + html);

	var trs = getElements(form, [/<tr[^>]*>/ig, /<td[^>]*>/i]);
	AnyBalance.trace('Найдено счетов: ' + trs.length);
	
	result.accounts = [];

    for(var i=0; i<trs.length; ++i){
    	var tr = trs[i];
    	var id = getParam(tr, null, null, /<td[^>]+class="accountColumn"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    	var name = getParam(tr, null, null, /<td[^>]+class="aliasColumn"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    	var c = {
    		__id: id, 
    		__name: name + ' (' + id.substr(-4) + ')'
    	};

    	if(__shouldProcess('accounts', c)){
    		processAccount(html, tr, c);
    	}

    	result.accounts.push(c);
    }
}

function n2(n){
	return n<10 ? '0' + n : '' + n;
}

function processAccount(page, html, result) {
	AnyBalance.trace('Обработка счета ' + result.__name);
	getParam(result.__id, result, 'accounts.num'); 
	getParam(html, result, 'accounts.type', /<td[^>]+class="aliasColumn"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, ['accounts.currency', 'accounts.balance'], /<td[^>]+class="currencyColumn"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'accounts.balance', /<td[^>]+class="amountColumn"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

	// Дополнительная инфа по счетам.
	if (AnyBalance.isAvailable('own', 'avail', 'debt', 'fill', 'expense', 'overdraft', 'blocked')) {
		var wForm = getParam(html, null, null, /(welcomeForm:j_id_jsp_[^'"]+)/i, null, html_entity_decode);
		var accountId = getParam(html, null, null, /accountId'\s*,\s*'(\d+)/i);
		
		if(wForm && accountId) {
			html = AnyBalance.requestPost(g_baseurl + 'protected/welcome.jsf', {
				'welcomeForm_SUBMIT':'1',
				'javax.faces.ViewState':getViewState(page),
				'accountId':accountId,
				'welcomeForm:_idcl': wForm
			}, addHeaders({Referer: g_baseurl + 'protected/welcome.jsf'}));
			
			//Собственные средства
			getParam(html, result, ['own', 'blocked'], /&#1057;&#1086;&#1073;&#1089;&#1090;&#1074;&#1077;&#1085;&#1085;&#1099;&#1077; &#1089;&#1088;&#1077;&#1076;&#1089;&#1090;&#1074;&#1072;:([^<]+)/i, replaceTagsAndSpaces, parseBalance);
			//Власні кошти
			getParam(html, result, ['own', 'blocked'], /&#1042;&#1083;&#1072;&#1089;&#1085;&#1110; &#1082;&#1086;&#1096;&#1090;&#1080;:([^<]+)/i, replaceTagsAndSpaces, parseBalance);
			getParam(html, result, ['own', 'blocked'], /Own amount:([^<]+)/i, replaceTagsAndSpaces, parseBalance);
			
			//Доступная сумма
			getParam(html, result, ['avail', 'blocked'], /&#1044;&#1086;&#1089;&#1090;&#1091;&#1087;&#1085;&#1072;&#1103; &#1089;&#1091;&#1084;&#1084;&#1072;:([^<]+)/i, replaceTagsAndSpaces, parseBalance);
			//Доступна сума
			getParam(html, result, ['avail', 'blocked'], /&#1044;&#1086;&#1089;&#1090;&#1091;&#1087;&#1085;&#1072; &#1089;&#1091;&#1084;&#1072;:([^<]+)/i, replaceTagsAndSpaces, parseBalance);
			getParam(html, result, ['avail', 'blocked'], /Available amount:([^<]+)/i, replaceTagsAndSpaces, parseBalance);

			getParam(html, result, 'debt', /&#1047;&#1072;&#1075;&#1072;&#1083;&#1100;&#1085;&#1072; &#1079;&#1072;&#1073;&#1086;&#1088;&#1075;&#1086;&#1074;&#1072;&#1085;&#1110;&#1089;&#1090;&#1100; &#1079;&#1072; &#1088;&#1072;&#1093;&#1091;&#1085;&#1082;&#1086;&#1084; &#1089;&#1082;&#1083;&#1072;&#1076;&#1072;&#1108;([\d\s.,]+)/i, replaceTagsAndSpaces, parseBalance);
			
			//Неснижаемый остаток
			getParam(html, result, 'balance_min', /&#1053;&#1077;&#1089;&#1085;&#1080;&#1078;&#1072;&#1077;&#1084;&#1099;&#1081; &#1086;&#1089;&#1090;&#1072;&#1090;&#1086;&#1082;:([^<]+)/i, replaceTagsAndSpaces, parseBalance);
			//Незнижувальний залишок
			getParam(html, result, 'balance_min', /&#1053;&#1077;&#1079;&#1085;&#1080;&#1078;&#1091;&#1074;&#1072;&#1083;&#1100;&#1085;&#1080;&#1081; &#1079;&#1072;&#1083;&#1080;&#1096;&#1086;&#1082;:([^<]+)/i, replaceTagsAndSpaces, parseBalance);
			getParam(html, result, 'balance_min', /Minimum balance:([^<]+)/i, replaceTagsAndSpaces, parseBalance);

			//Дата открытия
			getParam(html, result, 'date_start', /&#1044;&#1072;&#1090;&#1072; &#1086;&#1090;&#1082;&#1088;&#1099;&#1090;&#1080;&#1103;:([^<]+)/i, replaceTagsAndSpaces, parseDate);
			//Дата вiдкриття
			getParam(html, result, 'date_start', /&#1044;&#1072;&#1090;&#1072; &#1074;i&#1076;&#1082;&#1088;&#1080;&#1090;&#1090;&#1103;:([^<]+)/i, replaceTagsAndSpaces, parseDate);
			getParam(html, result, 'date_start', /Open date:([^<]+)/i, replaceTagsAndSpaces, parseDate);

			//Ставка на остаток по счету:
			getParam(html, result, 'pct', /&#1057;&#1090;&#1072;&#1074;&#1082;&#1072; &#1085;&#1072; &#1086;&#1089;&#1090;&#1072;&#1090;&#1086;&#1082; &#1087;&#1086; &#1089;&#1095;&#1077;&#1090;&#1091;:([^<]+)/i, replaceTagsAndSpaces, parseBalance);
			//Ставка на залишок за рахунком
			getParam(html, result, 'pct', /&#1057;&#1090;&#1072;&#1074;&#1082;&#1072; &#1085;&#1072; &#1079;&#1072;&#1083;&#1080;&#1096;&#1086;&#1082; &#1079;&#1072; &#1088;&#1072;&#1093;&#1091;&#1085;&#1082;&#1086;&#1084;:([^<]+)/i, replaceTagsAndSpaces, parseBalance);
			//Rate on the account balance
			getParam(html, result, 'pct', /Rate on the account balance:([^<]+)/i, replaceTagsAndSpaces, parseBalance);

			//Доступный овердрафт:
			getParam(html, result, 'overdraft', /&#1044;&#1086;&#1089;&#1090;&#1091;&#1087;&#1085;&#1099;&#1081; &#1086;&#1074;&#1077;&#1088;&#1076;&#1088;&#1072;&#1092;&#1090;:([^<]+)<\/td>\s*<\/tr>/i, replaceTagsAndSpaces, parseBalance);
			//Доступний овердрафт:
			getParam(html, result, 'overdraft', /&#1044;&#1086;&#1089;&#1090;&#1091;&#1087;&#1085;&#1080;&#1081; &#1086;&#1074;&#1077;&#1088;&#1076;&#1088;&#1072;&#1092;&#1090;:([^<]+)<\/td>\s*<\/tr>/i, replaceTagsAndSpaces, parseBalance);
			//Available overdraft:
			getParam(html, result, 'overdraft', /Available overdraft:([^<]+)<\/td>\s*<\/tr>/i, replaceTagsAndSpaces, parseBalance);
			
			if(isAvailable(['blocked'])) {
				getParam(result.own - result.avail, result, 'blocked');
			}
			
			if(isAvailable('accounts.transactions')) {
				processAccountTransactions(html, accountId, result);
			}
		} else {
			AnyBalance.trace('Не нашли ссылку на дополнительную информацию по счету ' + a.__name + ', возможно, сайт изменился?');
		}
	}
}

function processAccountTransactions(html, accountId, result){
	var form = getElement(html, /<form[^>]+id="(?:cardAccountInfoForm|accountInfoForm)"[^>]*>/i);
	
	var dt = new Date();
	var month = n2(dt.getMonth()+1);
	var year = dt.getFullYear()-1;
	
	var periodParams = createFormParams(form, function(params, str, name, value) {
//		if (name == 'accountInfoForm:reportPeriod') 
//			return '0';
		if (/class="calendar"/i.test(str))
			return n2(dt.getDate()) + '.' + month + '.' + (year++);

		return value;
	});
	var action = getParam(form, null, null, /<form[^>]+action="\/web_banking\/([^"]*)/i, null, html_entity_decode);
	
	html = AnyBalance.requestPost(g_baseurl + action, periodParams, addHeaders({Referer: g_baseurl + 'protected/welcome.jsf'}));

	var tables = getElements(html, /<table[^>]+class="opersTable"[^>]*>/ig);
	for(var i=0; i<tables.length; ++i){
		var table = tables[i];
		var caption = getParam(table, null, null, /<caption>([\s\S]*?)<\/table>/i, replaceTagsAndSpaces, html_entity_decode);
		var cardid = caption && getParam(caption, null, null, /\d{6}\*{4}\d{4}/);
		var comission = caption && caption.indexOf(result.__id) >= 0;
		var transactions;
		var path = '';

		if(cardid){
			//Это карточные транзакции
			if(!result.transactions_card)
				result.transactions_card = [];

			var c = {
				num: cardid,
				transactions: []
			}

			result.transactions_card.push(c);
			transactions = c.transactions_card;
			path = 'accounts.transactions_card.transactions';
		}else if(comission){
			//Это списания комиссий
			if(!result.transaction_comissions)
				result.transaction_comissions = [];

			transactions = result.transactions_comission;
			path = 'accounts.transactions_comission';
		}else{
			if(!result.transactions)
				result.transactions = [];
			transactions = result.transactions;
			path = 'accounts.transactions';
		}

		var rows = getElements(table, [/<tr[^>]*>/ig, /<td[^>]*>/i]);
		for(var j=0; j<rows.length; ++j){
			var row = rows[j];
			var t = {};
			getParam(row, t, path + '.date', /(<td[^>]+class="dateColumn"[^>]*>[\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
			getParam(row, t, path + '.date_done', /(<td[^>]+class="dateColumn"[^>]*>[\s\S]*?){2}<\/td>/i, replaceTagsAndSpaces, parseDate);
			getParam(row, t, path + '.auth', /(<td[^>]+class="dateColumn"[^>]*>[\s\S]*?){3}<\/td>/i, replaceTagsAndSpaces, parseDate);
			getParam(row, t, path + '.descr', /(<td\s*>[\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
			getParam(row, t, path + '.currency', /(<td[^>]+class="currencyColumn"[^>]*>[\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
			getParam(row, t, path + '.sum', /(<td[^>]+class="amountColumn"[^>]*>[\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
			getParam(row, t, path + '.sum_account', /(<td[^>]+class="amountColumn"[^>]*>[\s\S]*?){2}<\/td>/i, replaceTagsAndSpaces, parseBalance);

			transactions.push(t);
		}
	}
}

function getViewState(html) {
	return getParam(html, null, null, /javax.faces.ViewState[^>]*value="([^"]+)/i, null, html_entity_decode);
}