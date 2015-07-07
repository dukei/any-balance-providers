/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

//Заменяем системную строку замен
var myReplaceTagsAndSpaces = [replaceTagsAndSpaces, /(\d)\-(\d)/g, '$1.$2'];
var g_baseurl = "https://www.faktura.ru/lite/app";

function login(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset("utf-8");
	
    var html = AnyBalance.requestGet(g_baseurl + "/pub/Login");
    
    var matches = /Wicket.Ajax.ajax\(\{"f":"id([^"]+)","\w":".\/([^"]+)/i.exec(html);
    if(!matches){
        var prof = getParam(html, null, null, /<title>(Профилактические работы)<\/title>/i);
        if(prof)
            throw new AnyBalance.Error("В настоящее время в системе Интернет-банк проводятся профилактические работы. Пожалуйста, попробуйте ещё раз позже.");
        throw new AnyBalance.Error("Не удаётся найти форму входа в интернет-банк! Сайт недоступен или изменения на сайте.");
    }
	
    var id = matches[1], href = matches[2];
    var params = {};
    params[id + "_hf_0"] = '';
    params.hasData = 'X';
    params.login = prefs.login;
    params.password = prefs.password;
	
    html = AnyBalance.requestPost(g_baseurl + '/pub/' + href, params);
	
    var error = getParam(html, null, null, /<span[^>]*class="feedbackPanelERROR"[^>]*>([\s\S]*?)(<script|<\/span>)/i, replaceTagsAndSpaces);
    if(error)
        throw new AnyBalance.Error(error);
	
    var needsms = getParam(html, null, null, /(sms-message-panel|Введите SMS-код)/i);
    if(needsms)
        throw new AnyBalance.Error("Для работы этого провайдера требуется отключить в настройках интернет-банка подтверждение входа по СМС. Это безопасно, для совершения операций все равно будет требоваться подтверждение по СМС.");
	
    AnyBalance.trace("We seem to enter the bank...");
    return html;
}

function getCards(html, result){
	var cards = getElements(html, /<div[^>]+class="card"[^>]*>/ig);
	if(cards.length)
		result.cards = [];

	for(var i=0; i<cards.length; ++i){
		var c = {};
		var card = cards[i];

		getParam(card, c, 'accounts.cards.__id', /<div[^>]+class="card-info"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(card, c, 'accounts.cards.num', /<div[^>]+class="card-info"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(card, c, 'accounts.cards.name', /<div[^>]+class="card-info"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(card, c, 'accounts.cards.balance', /<span[^>]+class="amount"[^>]*>([\s\S]*?)<\/span>/i, myReplaceTagsAndSpaces, parseBalance);
		getParam(card, c, ['accounts.cards.currency', 'accounts.cards.balance'], /<span[^>]+class="currency"[^>]*>([\s\S]*?)<\/span>/i, myReplaceTagsAndSpaces, html_entity_decode);

		result.cards.push(c);
	}
}
	
function processAccounts(html, result){
    var html = AnyBalance.requestGet(g_baseurl + "/priv/accounts");

    if(!AnyBalance.isAvailable('accounts'))
    	return;
	
	var accs = getElements(html, /<div[^>]+class="account-(?:block|history)"[^>]*>/ig);
	if(accs.length)
		result.accounts = [];

	for(var i=0; i<accs.length; i+=2){
	    var history = accs[i];
	    var acc = accs[i+1];

	    var num = getParam(acc, null, null, /Счет №([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	    var name = getParam(acc, null, null, /<span[^>]+class="editable-name-block"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
	    var a = {__id: num, __name: name + ' (' + num + ')'};
	    var cards = getCards(acc, a);
	    
	    if(__shouldProcess('accounts', a)){
	    	processAccount(acc, a, html);
	    	
	    	if(AnyBalance.isAvailable('accounts.transactions')){
	    		try{
	    			processAccountTransactions(history, a);
	    		}catch(e){
	    			AnyBalance.trace('Выписка не получена: ' + e.message);
	    		}
	    	}
	    }

	    result.accounts.push(a);
	}
}

function num2(n){
	return n < 10 ? '0' + n : '' + n;
}

function processAccountTransactions(html, result){
	var href = getParam(html, null, null, /div[^>]+class="more-operations[\s\S]*?href="\.\/([^"]*)/i, null, html_entity_decode);
	if(!href){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти ссылку на выписку, сайт изменен?');
	}

	html = AnyBalance.requestGet(g_baseurl + "/priv/" + href);
	var form = getElements(html, [/<form[^>]*>/ig, /Период выписки/i])[0];
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму выписки, сайт изменен?');
	}

	var href = getParam(form, null, null, /<form[^>]+action="\.\/([^"]*)/i, null, html_entity_decode);
	var dt = new Date();
	html = AnyBalance.requestPost(g_baseurl + "/priv/" + href, {
		"periodType:submit": "x",
		"periodType": "radio53",
		"periodType:periodStartField":	num2(dt.getDate()) + '.' + num2(dt.getMonth()+1) + '.' + (dt.getFullYear()-3),
		"periodType:periodEndField": num2(dt.getDate()) + '.' + num2(dt.getMonth()+1) + '.' + dt.getFullYear()
	});

	var href = getParam(html, null, null, /<a[^>]+href="\.\/([^"]*)"[^>]*class="[^"]*print/i, null, html_entity_decode);
	if(!href){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти ссылку на печать выписки, сайт изменен?');
	}

	html = AnyBalance.requestGet(g_baseurl + "/priv/" + href);
	var href = getParam(html, null, null, /<iframe[^>]+src="\.\/([^"]*)"[^>]*id="iframeId"/i, null, html_entity_decode);
	if(!href){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти ссылку на iframe выписки, сайт изменен?');
	}

	html = AnyBalance.requestGet(g_baseurl + "/priv/" + href);
	
	var table = getElements(html, [/<table[^>]*>/ig, /Дата операции/i])[0];
	if(!table){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти ссылку таблицу выписки, сайт изменен?');
	}

	getParam(html, result, 'accounts.address', /<td[^>]*>Адрес регистрации[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

	result.transactions = [];

	var head = getParam(table, null, null, /<thead[^>]*>([\s\S]*?)<\/thead>/i);
	var colsa = getElements(head, /<th[^>]*>/ig, replaceTagsAndSpaces, html_entity_decode);
	var cols = {};
	for(var i=0; i<colsa.length; ++i){
		if(/Документ/i.test(colsa[i]))
			cols.doc = i;
		else if(/Дата операции/i.test(colsa[i]))
			cols.date = i;
		else if(/Списание/i.test(colsa[i]))
			cols.off = i;
		else if(/Зачисление/i.test(colsa[i]))
			cols.on = i;
		else if(/Контрагент/i.test(colsa[i]))
			cols.contra = i;
		else if(/Назначение/i.test(colsa[i]))
			cols.descr = i;
	}

	html = getParam(table, null, null, /<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
	var trs = getElements(html, /<tr[^>]*>/ig);
	for(var i=0; i<trs.length; ++i){
		var tds = getElements(trs[i], /<td[^>]*>/ig);
		if(tds.length < colsa.length)
			continue; //Вероятно, Итого

		var t = {};
		getParam(tds[cols.doc], t, 'accounts.transactions.doc', null, replaceTagsAndSpaces, html_entity_decode);
		getParam(tds[cols.date], t, 'accounts.transactions.date', null, replaceTagsAndSpaces, parseDate);
		getParam(tds[cols.off], t, 'accounts.transactions.sum', null, replaceTagsAndSpaces, function(str){return -parseBalance(str)});
		getParam(tds[cols.on], t, 'accounts.transactions.sum', null, replaceTagsAndSpaces, parseBalance);
		getParam(tds[cols.contra], t, 'accounts.transactions.contra', null, replaceTagsAndSpaces, html_entity_decode);
		getParam(tds[cols.descr], t, 'accounts.transactions.descr', null, replaceTagsAndSpaces, html_entity_decode);

		result.transactions.push(t);
	}
}

function processAccount(acc, result, html){
	var extra = getElements(acc, [/<div[^>]+class="closed"[^>]*>/ig, /Дополнительно/i])[0];
	if(extra){
		var extraId = getParam(extra, null, null, /<div[^>]+id="([^"]*)/i, null, html_entity_decode);
		var ajax = getParam(html, null, null, new RegExp('Wicket.Ajax.ajax\\(([^)]*"c":"' + extraId + '"[^)]*)'), null, getJson);
		extra = AnyBalance.requestGet(g_baseurl + "/priv/" + ajax.u, {
			'Wicket-Ajax': 'true',
			'Wicket-Ajax-BaseURL': 'priv/accounts?wicket-crypt=f6I5BkYr3fk',
			'X-Requested-With': 'XMLHttpRequest'
		});

		acc += extra;
	}

    getParam(acc, result, 'accounts.balance', [
    		/Средств на счете[\s\S]*?<span[^>]+class="amount"[^>]*>([\s\S]*?)<\/span>/i, 
    		/<div[^>]+class="card-amounts"[^>]*>([\s\S]*?)<\/div>/i
    	], myReplaceTagsAndSpaces, parseBalance);
    getParam(acc, result, ['accounts.currency', 'accounts.own', 'accounts.credit_used', 'accounts.debt', 'accounts.limit'], /<span[^>]+class="currency"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);

    getParam(acc, result, 'accounts.own', /Остаток собственных средств[\s\S]*?<span[^>]+class="amount"[^>]*>([\s\S]*?)<\/span>/i, myReplaceTagsAndSpaces, parseBalance);
    getParam(acc, result, 'accounts.credit_used', /Использованный кредит[\s\S]*?<span[^>]+class="amount"[^>]*>([\s\S]*?)<\/span>/i, myReplaceTagsAndSpaces, parseBalance);
    getParam(acc, result, 'accounts.debt', /Начисленная задолженность[\s\S]*?<span[^>]+class="amount"[^>]*>([\s\S]*?)<\/span>/i, myReplaceTagsAndSpaces, parseBalance);
    getParam(acc, result, 'accounts.limit', /Кредитный лимит[\s\S]*?<span[^>]+class="amount"[^>]*>([\s\S]*?)<\/span>/i, myReplaceTagsAndSpaces, parseBalance);

	getParam(acc, result, 'accounts.num', /Счет №([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(acc, result, 'accounts.name', /<span[^>]+class="editable-name-block"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);

	getParam(acc, result, 'accounts.credit_pay_to', /Оплатить до([^<]*)/i, myReplaceTagsAndSpaces, parseDate);
	getParam(acc, result, 'accounts.credit_pay_sum', /Оплатить до(?:[^>]*>){4}([^<]*)/i, myReplaceTagsAndSpaces, parseBalance);

	getParam(acc, result, 'accounts.currencyISO', /<td>Валюта:[\s\S]*?<td[^>]*>([\s\S]*?)(?:\(|<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(acc, result, 'accounts.fio', /<td>Владелец:[\s\S]*?<td[^>]*>([\s\S]*?)(?:\(|<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);
}

function processInfo(html, result){
	if(AnyBalance.isAvailable('fio'))
		result.fio = getElement(html, /<span[^>]+class="name"[^>]*>/i, replaceTagsAndSpaces, html_entity_decode);
}