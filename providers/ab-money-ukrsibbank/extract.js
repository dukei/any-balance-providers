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

var g_Xml_Headers = {
	'Accept': 'application/xml, text/xml, */*; q=0.01',
	'X-Requested-With': 'XMLHttpRequest',
	'Wicket-Ajax': 'true',
	'Wicket-Ajax-BaseURL': '.',
	'Referer': g_baseurl + 'ibank/'
}


var g_baseurl = 'https://online.ukrsibbank.com/ibank/';

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
	    var selector = getElements(html, [/<div[^>]+combobox[^>]+formControl/ig, /loginType:select/i])[0];
	    var id=getParam(selector, /<div[^>]+id="([^"]*)/i, replaceHtmlEntities);

	    var form = requestGetWicketActionEx(html, id, {
	    	"fieldset:parameter[loginType]:loginType:select": "SMID"
	    }).replace(/\^/g, ''); //Что тут за мусор встречается???

		var resp = requestGetWicketActionEx(form, /<input[^>]+name="fieldset:parameter\[smid\][^>]*id="([^"]*)/i, {
			"fieldset:parameter[smid]:smid": prefs.login
		});
	    
	    resp = requestGetWicketActionEx(html, /<input[^>]+name="fieldset:parameter\[password\][^>]*id="([^"]*)/i, {
			"fieldset:parameter[password]:password": prefs.password
		});
		
		html = requestGetWicketActionEx(html, /<button[^>]+name="actions:list:1:actionComponent"[^>]*id="([^"]*)/i, {
			idf_hf_0: '',
			'fieldset:parameter[loginType]:loginType:select': 'SMID',
			'fieldset:parameter[smid]:smid': prefs.login,
            'fieldset:parameter[password]:password': prefs.password,
			'actions:list:1:actionComponent':	'1'
		});
		html = checkForRedirect(html);

	}else{
		AnyBalance.trace('Уже залогинены, продолжаем текущую сессию');
	}
	
	if (!/logout/i.test(html)) {
		var error = getElement(html, /<[^>]+feedbackPanelERROR/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /парол/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	__setLoginSuccessful();
	
	return html;
}

function processAccounts(html, result){
	html = AnyBalance.requestGet(g_baseurl + 'accounts', addHeaders({Referer: g_baseurl + 'dashboard'}));

	var accounts = getElement(html, /<li[^>]+myAccountsAndCards/i);
	if(!accounts)
		AnyBalance.trace('Карты и счета не найдены: ' + html);

	var lis = getElements(accounts.substr(1), [/<li/ig, /accountMenuItemPanel/i]);
	AnyBalance.trace('Найдено счетов: ' + lis.length);
	
	result.accounts = [];

    for(var i=0; i<lis.length; ++i){
    	var tr = lis[i];
    	var acc = getElement(tr, /<div[^>]+accountMenuItemPanel/i);

		var id=getParam(acc, /<div[^>]+id="([^"]*)/i, replaceHtmlEntities);
		var info = requestGetWicketAction(html, id); 

    	var num = getElement(getElement(info, /<div[^>]+productSummary/i), /<div[^>]+number/i, replaceTagsAndSpaces);
    	var name = getElement(acc, /<span[^>]+alias/i, replaceTagsAndSpaces);
    	var c = {
    		__id: num, 
    		__name: name + ' (' + num.substr(-6) + ')',
    		num: num
    	};

    	if(__shouldProcess('accounts', c)){
    		processAccount(html, acc, c, info);
    	}

    	result.accounts.push(c);
    }
}

function processAccount(html, acc, result, info) {
	if(!AnyBalance.isAvailable('accounts'))
		return;

    getParam(getElement(acc, /<span[^>]+alias/i, replaceTagsAndSpaces), result, 'accounts.name');
	getParam(info, result, 'accounts.balance', /Баланс:([\s\S]*?)<span[^>]*currency/i, replaceTagsAndSpaces, parseBalance); 
	getParam(info, result, ['accounts.currency', 'accounts.balance', 'accounts.overdraft'], /Баланс:[\s\S]*?<span[^>]*currency[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces); 
	getParam(info, result, 'accounts.overdraft', /овердрафт:([\s\S]*?)<span[^>]*currency/i, replaceTagsAndSpaces, parseBalance); 
	getParam(info, result, 'accounts.pct', /Процентная ставка за пользование овердрафтом[\s\S]*?<div[^>]*formControl[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance); 
	getParam(info, result, 'accounts.overdraft_till', /Дата окончания овердрафта[\s\S]*?<div[^>]*formControl[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseDate); 
	getParam(info, result, 'accounts.overdraft_due_pct', /Процентная ставка за просроченный овердрафт[\s\S]*?<div[^>]*formControl[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance); 
}

function processCards(html, result){
	html = AnyBalance.requestGet(g_baseurl + 'accounts', addHeaders({Referer: g_baseurl + 'dashboard'}));

	var accounts = getElement(html, /<li[^>]+myAccountsAndCards/i);
	if(!accounts)
		AnyBalance.trace('Карты и счета не найдены: ' + html);

	var lis = getElements(accounts.substr(1), [/<li/ig, /accountMenuItemPanel/i]);
	AnyBalance.trace('Найдено счетов: ' + lis.length);
	
	result.cards = [];

    for(var i=0; i<lis.length; ++i){
    	var tr = lis[i];
    	var acc = getElement(tr, /<div[^>]+accountMenuItemPanel/i);
    	var num = getElement(acc, /<span[^>]+number/i, replaceTagsAndSpaces);
    	var name = getElement(acc, /<span[^>]+alias/i, replaceTagsAndSpaces);

    	var cardsul = getElement(tr, /<ul/i);
    	if(!cardsul){
    		AnyBalance.trace('Счет ' + name + ' ' + num + ' не имеет карт');
    		continue;
    	}

    	var cards = getElements(cardsul, /<li/ig);
    	AnyBalance.trace('Счет ' + name + ' ' + num + ' имеет ' + cards.length + ' карт');

    	for(var j=0; j<cards.length; ++j){
    		var card = cards[i];

    		var cardnum = getElement(card, /<span[^>]+number/i, replaceTagsAndSpaces);
    		var name = getElement(card, /<span[^>]+alias/i, replaceTagsAndSpaces);
    		
    		var c = {
    			__id: num + '_' + cardnum.substr(-4), 
    			__name: name + ' (' + cardnum.substr(-4) + ')',
    			__accid: num,
    			accnum: num,
    			num: cardnum
    		};
    	    
    		if(__shouldProcess('cards', c)){
    			processCard(html, acc, card, c);
    		}
    	    
    		result.cards.push(c);
    	}
    }
}

function processCard(html, acc, card, result) {
	if(!AnyBalance.isAvailable('cards'))
		return;

	getParam(acc, result, 'cards.balance', /Баланс:([\s\S]*?)<span[^>]*currency/i, replaceTagsAndSpaces, parseBalance); 
	getParam(acc, result, ['cards.currency', 'cards.balance', 'cards.overdraft'], /Баланс:[\s\S]*?<span[^>]*currency[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces); 
	getParam(acc, result, 'cards.overdraft', /овердрафт:([\s\S]*?)<span[^>]*currency/i, replaceTagsAndSpaces, parseBalance);
	getParam(getElement(acc, /<span[^>]+alias/i, replaceTagsAndSpaces), result, 'cards.accname'); 

	var id=getParam(card, /<div[^>]+id="([^"]*)/i, replaceHtmlEntities);
	var info = requestGetWicketAction(html, id); 

	getParam(info, result, 'cards.type', /Тип карты[\s\S]*?<div[^>]*formControl[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	getParam(getElement(info, /<div[^>]+expirationDate/i), result, 'cards.till', null, replaceTagsAndSpaces, parseDate); 
	getParam(getElement(info, /<div[^>]+number/i), result, 'cards.num', null, replaceTagsAndSpaces); 
	getParam(getElement(info, /<div[^>]+holderName/i), result, 'cards.holder', null, replaceTagsAndSpaces); 
}

function processInfo(html, result){
    if(!AnyBalance.isAvailable('info'))
    	return;

    var info = result.info = {};

	html = AnyBalance.requestGet(g_baseurl + 'profile', g_headers);

	getParam(info, result, 'info.fio', /ФИО[\s\S]*?<div[^>]*formControl[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces); 
	getParam(info, result, 'info.mphone', /Мобильный телефон[\s\S]*?<div[^>]*formControl[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces); 
	getParam(info, result, 'info.email', /<input[^>]+value="([^"]*)"[^>]+email/i, replaceHtmlEntities); 
}



// Wicket-ajax actions search
function findWicketActions(html) {
	var actions = sumParam(html, null, null, /Wicket.Ajax.ajax\((\{[\s\S]*?\})\);/ig) || [];
	AnyBalance.trace('Found ' + actions.length + ' Wicket-ajax actions');
	return actions;
}

function findExactWickeAction(actions, exactId, event) {
	if(!actions)
		return;

	var ids = [];	
	for(var i=0; i< actions.length; i++) {
		var json = getJsonEval(actions[i]);
		
		if(json.c === exactId){
			ids.push(json);
		}
	}

	var url;
	//Может быть несколько викетов на разные ивенты с одинаковым id. Отстой.
	for(var i=0; i<ids.length; ++i){
		var json = ids[i];
		if(!url || (event && json.e == event))
			url = (json.u || '').replace(/^.\/main/, 'main').replace(/;jsessionid[^?]+/i, '');
	}

	return url;

}

function requestGetWicketActionEx(html, regex, params, preferredEvent) {
 	html = requestGetWicketAction(html, regex, params, preferredEvent);
	do{
		if(/<ajax-response><evaluate>/i.test(html)){
			//Нужно переполучить через некоторое время
			var url = getParam(html, /"u":"\.\/([^"]*)/);
			var time = getParam(html, /\}\);\},\s*(\d+)/i, null, parseBalance);
			if(!url || !time){
				AnyBalance.trace('Неизвестный отложенный запрос: ' + html);
				return html;	
			} 

			AnyBalance.trace('Требуется отложить запрос на ' + time + ' мс. Спим...');
			AnyBalance.sleep(time);

			html = AnyBalance.requestGet(baseurl + url + '&_=' + new Date().getTime(), addHeaders(g_Xml_Headers));
		}else{
			return html;
		}
	}while(true);
}

function requestGetWicketAction(html, regex, params, preferredEvent) {
	var wicketId = typeof regex === 'string' ? regex : getParam(html, regex);
	if(!wicketId){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не нашли wicketId ' + regex.source);
	}
	
	var actions = findWicketActions(html);
	var action = findExactWickeAction(actions, wicketId, preferredEvent);
	if(!action)
		throw new AnyBalance.Error('Не удалось найти action: ' + wicketId);

	return params ? 
		AnyBalance.requestPost(joinUrl(g_baseurl, action), params, addHeaders({'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'}, addHeaders(g_Xml_Headers))) :
		AnyBalance.requestGet(joinUrl(g_baseurl, action) + '&_=' + new Date().getTime(), addHeaders(g_Xml_Headers));
}

function checkForRedirect(html) {
	if(/<redirect>/i.test(html)) {
		var href = getParam(html, null, null, /main;[^\]]+/i);
		if(!href) {
			AnyBalance.trace('Запрошен редирект, но ссылка на него не найдена, сайт изменен?');
		}
		html = AnyBalance.requestGet(joinUrl(g_baseurl, href), g_headers);
	}
	
	return html;
}
