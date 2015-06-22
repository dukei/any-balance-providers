/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
Альфа-банк Украина
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:35.0) Gecko/20100101 Firefox/35.0'
};

var g_baseurl = 'https://my.alfabank.com.ua/';

function login(){
    var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(g_baseurl + 'login', g_headers);

	html = AnyBalance.requestPost(g_baseurl + 'login', {
        'forbiddenUrl':'',
        'login_':prefs.login,
        password:prefs.password,
        nonce:'',
		ok:''
    }, addHeaders({Referer: g_baseurl + 'login'}));

	var otpa = getParam(html, null, null, /код смс-подтверждения/i);
	if(otpa) {
		if(AnyBalance.getLevel() >= 7){
			AnyBalance.trace('Пытаемся ввести код смс-подтверждения');
			code = AnyBalance.retrieveCode("Пожалуйста, введите код смс-подтверждения", 'R0lGODlhBAAEAJEAAAAAAP///////wAAACH5BAEAAAIALAAAAAAEAAQAAAIElI8pBQA7', {time: 240000, inputType: 'number'});
			AnyBalance.trace('Код получен: ' + code);
			html = AnyBalance.requestPost(g_baseurl + 'loginConfirm', {
			action:'next',
		        otp:code
	                }, addHeaders({Referer: g_baseurl + 'loginConfirm'}));
		}else{
			throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
		}
	}
	
	if (!/class="logout"/i.test(html)) {
		var error = getParam(html, null, null, /icon exclamation[\s\S]*?"text"[\s\S]*?>\s*([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Проверьте, пожалуйста, правильность ввода логина и пароля/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	return html;
}

function processContracts(result){
	var html = AnyBalance.requestGet(g_baseurl + 'get_home_page_block?block=groupCardAccount&_=' + new Date().getTime(), g_headers);

	var cardblocks = getElements(html, /<div[^>]+class="contractblock"[^>]*>/i);
	AnyBalance.trace('Найдено контрактов на карты: ' + cardblocks.length);
	result.contracts = [];
	for(var i=0; i<cardblocks.length; ++i){
		var cardid = getParam(cardblocks[i], null, null, /CardContractAction.view\?contract=(\d+)/i);
		var title = getParam(cardblocks[i], null, null, /<a[^>]+class="title[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);

		var c = {__id: cardid, __name: title};
		fetchCards(cardblocks[i], c);

		if(__shouldProcess('contracts', c)){
			processContract(cardid, c);
			result.contracts.push(c);
		}

	}

}

function fetchCards(html, result){
	result.cards = [];
	var cardsText = getParam(html, null, null, /<div[^>]+class="card"[^>]*>([\s\S]*?)<\/div>/i);
	if(cardsText){
		var cardnums = sumParam(cardsText, null, null, /<(?:a|span)[\s\S]*?<\/(?:a|span)>/ig);
		for(var i=0; i<cardnums.length; ++i){
			var c = {
				num: html_entity_decode(replaceAll(cardnums[i], replaceTagsAndSpaces)),
				primary: /card-primary/i.test(cardnums[i]),
				blocked: /card-inactive/i.test(cardnums[i]),
				"no-sms": /card-no-sms/i.test(cardnums[i])
			}
	
			result.cards.push(c);
		}
	}else{
		AnyBalance.trace('Не удалось найти номеров карт: ' + html);
	}
}

function processContract(contractid, result){
    AnyBalance.trace('Обработка контракта ' + contractid);
	var html = AnyBalance.requestGet(g_baseurl + 'CardContractAction.view?contract=' + contractid, g_headers);

	getParam(html, result, 'contracts.balance', /Общий баланс[\s\S]*?<div[^>]*class="column[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'contracts.limit', /лимит:([^>]*>){2}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['contracts.currency', 'contracts.balance', 'contracts.limit', 'contracts.safebalance'], /Общий баланс[\s\S]*?<div[^>]*class="column[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'contracts.accnum', /Карточный счет[\s\S]*?<div[^>]*class="column[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);

	var safe = getParam(html, null, null, /счет Доходный сейф[\s\S]*?(<div[^>]*class="column[^>]*>[\s\S]*?<\/div>)/i);
	if(safe){
		getParam(safe, result, 'contracts.safenum', /Счет:([\s\S]*?)(?:<br|<\/div>)/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(safe, result, 'contracts.safebalance', /Баланс:([\s\S]*?)(?:<br|<\/div>)/i, replaceTagsAndSpaces, parseBalance);
	}

	getParam(html, result, 'contracts.agreement', /Договор(?:\s|&nbsp;)+№([^<]*?)от/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'contracts.agreement_date', /Договор(?:\s|&nbsp;)+№[^<]*?от([^<]*)/i, replaceTagsAndSpaces, parseDate);

	if(AnyBalance.isAvailable('contracts.transactions'))
		processTransactions(contractid, result);
}

function processTransactions(contractid, result){
	var html = AnyBalance.requestGet(g_baseurl + 'cardContract/filter?contract=' + contractid + '&periodType=daysCount&days=999&from=&to=&condition=contains&purpose=', g_headers);

	var tbl = getElement(html, /<table[^>]+x-acct-operations[^>]*>/i);
	if(!tbl){
	    AnyBalance.trace('Не удалось найти таблицу операций!');
	    AnyBalance.trace(html);
		return;
	}

    result.transactions = [];
    var ops = getElements(tbl, /<tr[^>]+class="(?:odd)?"/ig);
    AnyBalance.trace('У контракта ' + contractid + ' найдено транзакций: ' + ops.length);
    for(var i=0; i<ops.length; ++i){
    	var o = {};
    	getParam(ops[i], o, 'contracts.transactions.date', /<td[^>]+column-1[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    	getParam(ops[i], o, 'contracts.transactions.date_done', /<td[^>]+column-2[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    	getParam(ops[i], o, 'contracts.transactions.sum', /<td[^>]+column-4[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    	var descr = getElement(ops[i], /<td[^>]+column-3[^>]*>/i);
    	var descr_inner = getParam(descr || '', null, null, /<td[^>]+l-name[^>]*>Назначение[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i);
    	getParam(descr_inner || descr, o, 'contracts.transactions.descr', null, replaceTagsAndSpaces, html_entity_decode);
    	getParam(descr || '', o, 'contracts.transactions.type', /<td[^>]+l-name[^>]*>Тип платежа[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    	getParam(descr || '', o, 'contracts.transactions.status', /<td[^>]+l-name[^>]*>Статус[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    	result.transactions.push(o);
    }
}

function processDeposits(result){
	var html = AnyBalance.requestGet(g_baseurl + 'get_deposit_page_block?block=groupDeposit&_=' + new Date().getTime(), g_headers);

	var blocks = getElements(html, /<div[^>]+class="contractblock"[^>]*>/i);
	AnyBalance.trace('Найдено контрактов на депозиты: ' + blocks.length);
	result.deposits = [];
	for(var i=0; i<blocks.length; ++i){
		var id = getParam(blocks[i], null, null, /ViewDepositContractAction.view\?contract=([^"]*)/i, replaceHtmlEntities, decodeURIComponent);
		var title = getParam(blocks[i], null, null, /<a[^>]+class="title[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);

		var c = {__id: id, __name: title};
		c.accnum = getParam(html, null, null, /Номер счета[\s\S]*?<div[^>]*class="column[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);

		if(__shouldProcess('deposits', c)){
			processDeposit(id, c, blocks[i]);
			result.deposits.push(c);
		}

	}

}

function processDeposit(id, result, html){
    AnyBalance.trace('Обработка депозита ' + id);

	getParam(html, result, 'deposits.balance', /Текущая сумма[\s\S]*?<div[^>]*class="column[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['deposits.currency', 'deposits.balance', 'deposits.pct_sum'], /Текущая сумма[\s\S]*?<div[^>]*class="column[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseCurrency);

	var pct_sum = getParam(html, null, null, /Сумма начисленных процентов[\s\S]*?<div[^>]*class="column[^>]*>([\s\S]*?)<\/div>/i);
	if(pct_sum){
		getParam(pct_sum, result, 'deposits.pct_sum', null, replaceTagsAndSpaces, parseBalance);
		getParam(pct_sum, result, 'deposits.pct_period', /выплата процентов:([^<)]*)/i, replaceTagsAndSpaces, html_entity_decode);
	}

	var pct = getParam(html, null, null, /Депозитная ставка[\s\S]*?<div[^>]*class="column[^>]*>([\s\S]*?)<\/div>/i);
	if(pct){
		getParam(pct, result, 'deposits.pct', null, replaceTagsAndSpaces, parseBalance);
		getParam(pct, result, 'deposits.capital', null, replaceTagsAndSpaces, function(str){return /с\s+капитализац/i.test(str)});
	}

	getParam(html, result, 'deposits.topup', /Пополнение депозита[\s\S]*?<div[^>]*class="column[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, function(str){return /^возможно/i.test(str)});
	getParam(html, result, 'deposits.withdraw', /Снятие средств[\s\S]*?<div[^>]*class="column[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, function(str){return /^возможно/i.test(str)});
	getParam(html, result, 'deposits.min_balance', /минимальный остаток должен составлять ([^<]*)/i, replaceTagsAndSpaces, parseBalance);

	getParam(html, result, 'deposits.agreement', /Договор(?:\s|&nbsp;)+№([^<]*?)от/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'deposits.agreement_date', /Договор(?:\s|&nbsp;)+№[^<]*?от([^<]*)/i, replaceTagsAndSpaces, parseDate);

	if(AnyBalance.isAvailable('deposits.transations'))
		processDepositTransactions(id, result);
}

function processDepositTransactions(id, result){
	var html = AnyBalance.requestGet(g_baseurl + 'depositContract/filter?contract=' + encodeURIComponent(id) + '&periodType=daysCount&days=999&from=&to=&condition=contains&purpose=', g_headers);
	if(AnyBalance.getLastStatusCode() >= 400){
		html = AnyBalance.requestGet(g_baseurl + 'ViewDepositContractAction.view?contract=' + encodeURIComponent(id), g_headers);
	}

	var tbl = getElement(html, /<table[^>]+x-acct-operations[^>]*>/i);
	if(!tbl){
	    AnyBalance.trace('Не удалось найти таблицу операций депозита!');
	    AnyBalance.trace(html);
		return;
	}

    result.transactions = [];

    //придется поправить html, а то они теги перепутали
    tbl = tbl.replace(/<tr>\s*(<tr[^>]*>|<\/tbody>)/ig, '</tr>$1');

    var ops = getElements(tbl, /<tr[^>]+class="(?:odd)?"/ig);
    AnyBalance.trace('У депозита ' + id + ' найдено транзакций: ' + ops.length);
    for(var i=0; i<ops.length; ++i){
    	var o = {};
    	getParam(ops[i], o, 'deposits.transactions.date', /<td[^>]+column-1[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    	getParam(ops[i], o, 'deposits.transactions.sum', /<td[^>]+column-4[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    	var descr = getElement(ops[i], /<td[^>]+column-2[^>]*>/i);
    	var descr_inner = getParam(descr || '', null, null, /<td[^>]+l-name[^>]*>Назначение[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i);
    	getParam(descr_inner || descr, o, 'deposits.transactions.descr', null, replaceTagsAndSpaces, html_entity_decode);
    	getParam(descr || '', o, 'deposits.transactions.type', /<td[^>]+l-name[^>]*>Тип платежа[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    	getParam(descr || '', o, 'deposits.transactions.status', /<td[^>]+l-name[^>]*>Статус[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    	result.transactions.push(o);
    }
}

function processTemplates(result){
	if(!AnyBalance.isAvailable('templates'))
		return;

	result.templates = [];
	var html = AnyBalance.requestGet(g_baseurl + 'payment-templates', g_headers);

	var tpls = getElements(html, /<li[^>]+class="[^"]*stf-item[^>]*>/ig);
	AnyBalance.trace('Найдено шаблонов: ' + tpls.length)

	var tpls_done = {};
	for(var i=0; i<tpls.length; ++i){
		var tpl = tpls[i];

		var ref = getParam(tpl, null, null, /<li[^>]+data-href="([^"]*)/i, replaceHtmlEntities);
		var id = getParam(ref, null, null, /templateId=([^&]*)/i, null, decodeURIComponent);
		var name = getParam(tpl, null, null, /<span[^>]+class="name[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
		if(tpls_done[id]){
			AnyBalance.trace('Шаблон ' + name + ' (' + id + ') уже обработан, пропускаем');
			continue;
		}

		var t = {__id: id, __name: name};

		if(__shouldProcess('templates', t)){
			processTemplate(t, tpl);
			tpls_done[id] = true;
			result.templates.push(t);
		}
	}
}

function processTemplate(result, tpl){
	var editlnk = getParam(tpl, null, null, /<a[^>]+class="action-link"[^>]*href="\/(payment-templates\/edit-template[^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
	
	getParam(tpl, result, 'count', /<small[^>]+class="count"[^>]*>([\s\S]*?)<\/small>/i, replaceTagsAndSpaces, parseBalance);

	html = AnyBalance.requestGet(g_baseurl + editlnk, g_headers);
	getParam(html, result, '__name', /<input[^>]+name="name"[^>]*value="([^"]*)/i, null, html_entity_decode);

	var prms = getElements(html, [/<div[^>]+class="level1[^>]*>/ig, /<h2[^>]+class="title"[^>]*>\s*Параметры/i])[0];
	if(!prms){
		AnyBalance.trace('Не найдены параметры шаблона: ' + html);
		return;
	}

	if(AnyBalance.isAvailable('templates.fields'))
   		result.fields = [];

	var rows = getElements(prms, /<div[^>]+class="row\s+separated"[^>]*>/ig);
	for(var i=0; i<rows.length; ++i){
		var row = rows[i];
		var name = getParam(row, null, null, /<div[^>]+class="[^"]*column-A[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		var value = getParam(row, null, null, /<div[^>]+class="[^"]*column-E[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		switch(name){
			case 'Статус параметров':
				break;
		    case 'Тип платежа':
		    	getParam(value, result, 'templates.type');
		    	break;
		    case 'Сумма по умолчанию':
		    	getParam(value, result, 'templates.sum', null, null, parseBalance);
		    	break;
		    default:
		    	if(result.fields){
					var f = {};
					getParam(name, f, 'templates.fields.name');
					getParam(value, f, 'templates.fields.value');
					result.fields.push(f);
		    	}
		    	break;
		}
	}

	if(result.fields){
		//Теперь попробуем доп. инфу по параметрам получить
		var ref = getParam(tpl, null, null, /<li[^>]+data-href="\/([^"]*)/i, replaceHtmlEntities);
		html = AnyBalance.requestGet(g_baseurl + ref, g_headers);

		if(/<button[^>]+data-action=['"]back/i.test(html)){
		    AnyBalance.trace('Найдена кнопка Вернуться. Нажимаем её, чтобы получить расширенный список параметров.');

			var form = getElement(html, /<form[^>]+method="post"[^>]*>/i);
			var params = createFormParams(html, function(params, str, name, value) {
				if (name == 'action') 
					return 'back';
				return value;
			});
			params.back = '';
		    
			html = AnyBalance.requestPost(AnyBalance.getLastUrl().replace(/\?.*/, '') + '?', params, g_headers);
		}

		var rows = getElements(html, /<div[^>]+class="[^>]*b-receiver[^>]*>/ig);
		AnyBalance.trace('Для шаблона ' + result.__name + ' найдено доп. параметров: ' + rows.length);

		for(var i=0; i<rows.length; ++i){
			var row = rows[i];
			var name = getParam(row, null, null, /<div[^>]+class="[^"]*column-A[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
			var value = getParam(row, null, null, /<div[^>]+class="[^"]*column-E[^>]*>([\s\S]*?)<\/div>/i);

			var f = findAndAddField(result.fields, name);

			if(/<input/i.test(value)){
				getParam(value, f, 'id', /<input[^>]+name="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
				getParam(value, f, 'value', /<input[^>]+value="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
			}else{
				getParam(value, f, 'value', null, replaceTagsAndSpaces, html_entity_decode);
			}
			
			if(/<div[^>]+b-receiver[^>]+unimportant/i.test(row))
				getParam(true, f, 'unimportant');
	    }
	}
}

function findAndAddField(fields, name){
	for(var i=0; i<fields.length; ++i){
		if(fields[i].name == name)
			return fields[i];
	}

	var f = {name: name};
	fields.push(f);
	return f;
}

function processCredentials(html, result){
	getParam(html, result, 'fio', /<a[^>]+class="cur_user"[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);
	if(AnyBalance.isAvailable('phone', 'email', 'reg_date')){
		html = AnyBalance.requestGet(g_baseurl + 'settings', g_headers);
		getParam(html, result, 'phone', /Номер мобильного телефона[\s\S]*?<div[^>]+s-wizard-right[^>]*>([\s\S]*?)(?:<font|<\/div>)/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, 'email', /E-Mail[\s\S]*?<div[^>]+s-wizard-right[^>]*>([\s\S]*?)(?:<font|<\/div>)/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, 'reg_date', /Дата регистрации[\s\S]*?<div[^>]+s-wizard-right[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseDate);
	}
}

function __shouldProcess(counter, info){
	if(!AnyBalance.shouldProcess)
		return !!info.__id;
	return AnyBalance.shouldProcess(counter, info);
}