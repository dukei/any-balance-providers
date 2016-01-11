/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var baseurl = 'https://www.ibank.belapb.by/v1/cgi/bsi.dll?';

function login(){
	var jsonInfo = loginBSS(baseurl);

	var html = AnyBalance.requestPost(baseurl, {
        SID:g_bss_sessionId,
        tic:1,
        T:'RT_2IC.form',
        nvgt:1,
        SCHEMENAME:'WORKSPACE'
    }, g_headers);

    return {
    	info: jsonInfo,
    	html: html
    };
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка карт
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(info, result) {
	if(!AnyBalance.isAvailable('cards'))
		return;

	var pluginid = getParam(info.html, null, null, /PCards#([^#]*)/i, replaceTagsAndSpaces);

    var html = AnyBalance.requestPost(baseurl, {
        SID:g_bss_sessionId,
        T:'RT_2Plugin.plugin',
        SchemeName:'PCards',
        PluginID: pluginid,
        TemplateName: 'simple'
    }, g_headers);

	var cards = getElements(html, /<li[^>]+class="page_widget_inner"[^>]*>/ig);
	AnyBalance.trace('Найдено карт: ' + cards.length);
	if(cards.length == 0){
        if(/У вас нет карт/i.test(html)){
            AnyBalance.trace('У вас нет карт');
            result.cards = [];
        }else {
            AnyBalance.trace(html);
            AnyBalance.trace('Не удалось найти таблицу с картами.');
        }
		return;
	}

	result.cards = [];
	
	for(var i=0; i < cards.length; ++i){
		var card = cards[i];
		var accid = getParam(card, null, null, /ToSTM\(\'([^']*)/i, replaceHtmlEntities);
		var cardid = getParam(card, null, null, /ToSTM\(\'[^']*','([^']*)/i, replaceHtmlEntities);
		var name = getParam(card, null, null, /<a[^>]+ToSTM[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces);

		var c = {__id: cardid , __name: name, num: cardid, accnum: accid};

		if (__shouldProcess('cards', c)) {
			processCard(card, c);
		}

		result.cards.push(c);
	}
}

function getCardBalance(card, result){
    if(AnyBalance.isAvailable('cards.balance')){
    	try{
            var cardinfo = getParam(card, null, null, /GetRest\(([^)]*)/, null, html_entity_decode);
            if(!cardinfo){
                AnyBalance.trace('Card row: ' + card);
                throw new AnyBalance.Error('Не удаётся найти ссылку на обновление баланса. Сайт изменен?');
            }
            
            var cardid = getParam(cardinfo, null, null, /,\s*"([^"]*)/i, replaceSlashes);
            var curr = getParam(cardinfo, null, null, /,[^,]*,([^,]*)/i, parseBalance);
            if(!cardid || !curr){
                AnyBalance.trace('Card row: ' + card);
                throw new AnyBalance.Error('Не удаётся найти идентификатор карты и валюты. Сайт изменен?');
            }
            
            html = AnyBalance.requestPost(baseurl, {
                SID:g_bss_sessionId,
                tic:1,
                T:'RT_2CardRest.doOperation',
                TIC:1,
                OPER:'GETREST',
                CARD:cardid, 
                CURR:curr,
                SCHEMENAME:'WORKSPACE'
            }, g_headers);
            
            getParam(html, result, 'cards.balance', /RST="([^"]*)/i, replaceTagsAndSpaces, parseBalance);
        }catch(e){
        	AnyBalance.trace('Получение баланса не удалось: ' + e.message);
        }
    }
}

function getCardInfo(id){
	var cards = getCardsInfo();
	for(var i=0; i<cards.length; ++i){	
		var card = cards[i];
		if(card.__id == id)
			return card;
	}
}

function getCardsInfo(){
	if(isset(getCardsInfo.info))
		return getCardsInfo.info;

    html = AnyBalance.requestPost(baseurl, {
        SID:g_bss_sessionId,
        tic:1,
        T:'RT_2IC.SC',
        ngvt:1,
        SCHEMENAME:'CARDSCARD',
        FILTERIDENT: 'ALL'
    }, g_headers);

    var cards = getCardsInfo.info = [];

	var table = getElement(html, /<table[^>]+ID="SCROLLER"[^>]*>/i);
	if(!table) {
		var error = getParam(html, null, null, /<BSS_ERROR>([\s\S]*?)<\/BSS_ERROR>/i, replaceTagsAndSpaces);
		if(error){
	    	AnyBalance.trace('Не удалось получить список карт: ' + error);
		}else{
	    	AnyBalance.trace(html);
	    	AnyBalance.trace('Не удалось найти таблицу карт!');
	    }
		return;

	}
	if(!/<THEAD>\s*<TR/i.test(table)){
		//Исправим таблицу без строк
		table = replaceAll(table, [/<THEAD>/i, '<THEAD><TR>', /<\/THEAD>/i, '</TR></THEAD>']);
	}
	
	var colsDef = {
		type: {
			re: /Тип карт/i,
			result_func: null,
		},
		__id: { //Чтобы он был получен обязательно
			re: /номер карт/i,
			result_func: null,
		},
		main: {
			re: /осн[^<]*?доп/i,
			result_func: function(str){
				return /осн/i.test(str);
			},
		},
		holder: {
			re: /Держатель/i,
			result_func: null
		},
		status: {
			re: /Статус/i,
			result_func: null
		},
		till: {
			re: /Срок действия/i,
			result_func: parseDate
		}
	};

	processTable(table, cards, 'cards.', colsDef);

	return cards;
}

function processCard(card, result) {
    getParam(card, result, 'cards.limit', /Лимит овердрафта:([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(card, result, 'cards.balance_min', /Неснижаемый остаток:([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(card, result, ['cards.currency', 'cards.balance', 'cards.limit', 'cards.balance_min'], /RESTISO="\s*([^"]*)/i, replaceHtmlEntities);

    getCardBalance(card, result);

    //Получим всякие доп. параметры для карты
    var cardInfo = getCardInfo(result.__id);
    if(cardInfo){
    	for(var prop in cardInfo){
    		result[prop] = cardInfo[prop];
    	}
    }else{
    	AnyBalance.trace('Доп. параметры не найдены для карты ' + result.__name);
    }

	if(AnyBalance.isAvailable('cards.transactions')) {
		processCardTransactions(card, result);
	}
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка депозитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processDeposits(html, result) {
	if(!AnyBalance.isAvailable('deposits'))
		return;

    html = AnyBalance.requestPost(baseurl, {
        SID:g_bss_sessionId,
        tic:1,
        T:'RT_2IC.form',
        ngvt:1,
        SCHEMENAME:'STM',
        XACTION: 'NEW'
    }, g_headers);
	
	var table = getElement(html, /<table[^>]+ID="SCROLLER"[^>]*>/i);
	if(!table) {
		var error = getParam(html, null, null, /<BSS_ERROR>([\s\S]*?)<\/BSS_ERROR>/i, replaceTagsAndSpaces);
		if(error){
	    	AnyBalance.trace('Не удалось получить список депозитов: ' + error);
		}else{
	    	AnyBalance.trace(html);
	    	AnyBalance.trace('Не удалось найти таблицу депозитов!');
	    }
		return cards;
	}

	var colsDef = {
		type: {
			re: /Наименование вклада/i,
			result_func: null,
		},
		num: {
			re: /номер договора/i,
			result_func: null,
		},
		balance: {
			re: /Остаток/i,
		},
		currency: {
			re: /Валюта/i,
			result_func: null
		},
		till: {
			re: /Дата[^<]+окончания/i,
			result_func: parseDate
		}
	};

	var head = getElement(table, /<THEAD[^>]*>/i);
	var body = getElement(table, /<TBODY[^>]*>/i);
	var ths = getElements(head, /<th\b[^>]*>/ig);
	var cols = initCols(colsDef, ths);
	var trs = getElements(body, /<tr[^>]*>/ig);

	AnyBalance.trace('Найдено ' + trs.length + ' депозитов');

	result.deposits = [];

	for(var i=0; i < trs.length; ++i){
        var tr = trs[i];
        var tds = getElements(tr, /<td[^>]*>/ig);

        var id = getParam(tr, null, null, /<input[^>]+STM="([^"]*)/i, replaceHtmlEntities);
        var name = getParam(tds[cols.type], null, null, null, replaceTagsAndSpaces);
        var num = getParam(tds[cols.num], null, null, null, replaceTagsAndSpaces);

        var d = {__id: id, __name: name + ' (' + num.substr(-4) + ')', num: num};
        fillColsResult(colsDef, cols, tds, d, 'deposits.');

		if(__shouldProcess('deposits', d)) {
			processDeposit(tr, d);
		}

		result.deposits.push(d);
	}
}

function processDeposit(html, result) {
    if(isAvailable('deposits.transactions'))
        processDepositTransactions(html, result);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка кредитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCredits(info, result) {
	if(!AnyBalance.isAvailable('credits'))
		return;

    html = AnyBalance.requestPost(baseurl, {
        SID:g_bss_sessionId,
        tic:1,
        T:'RT_2IC.SC',
        ngvt:1,
        SCHEMENAME:'CREDITS',
        FILTERIDENT: 'NEW'
    }, g_headers);
	
	var table = getElement(html, /<table[^>]+ID="SCROLLER"[^>]*>/i);
	if(!table) {
		var error = getParam(html, null, null, /<BSS_ERROR>([\s\S]*?)<\/BSS_ERROR>/i, replaceTagsAndSpaces);
		if(error){
	    	AnyBalance.trace('Не удалось получить список кредитов: ' + error);
		}else{
	    	AnyBalance.trace(html);
	    	AnyBalance.trace('Не удалось найти таблицу кредитов!');
	    }
		return cards;
	}

	var colsDef = {
		type: {
			re: /Тип кредита/i,
			result_func: null,
		},
		num: {
			re: /номер договора/i,
			result_func: null,
		},
		currency: {
			re: /Валюта/i,
			result_func: null
		},
		date_start: {
			re: /Дата заключения/i,
			result_func: parseDate
		},
		till: {
			re: /Дата[^<]+окончания/i,
			result_func: parseDate
		}
	};

	var head = getElement(table, /<THEAD[^>]*>/i);
	var body = getElement(table, /<TBODY[^>]*>/i);
	var ths = getElements(head, /<th\b[^>]*>/ig);
	var cols = initCols(colsDef, ths);
	var trs = getElements(body, /<tr[^>]*>/ig);

	AnyBalance.trace('Найдено ' + trs.length + ' кредитов');

	result.credits = [];

	for(var i=0; i < trs.length; ++i){
        var tr = trs[i];
        var tds = getElements(tr, /<td[^>]*>/ig);

        var id = getParam(tr, null, null, /SIDR="([^"]*)/i, replaceHtmlEntities);
        var name = getParam(tds[cols.type], null, null, null, replaceTagsAndSpaces);
        var num = getParam(tds[cols.num], null, null, null, replaceTagsAndSpaces);

        var d = {__id: id, __name: name + ' (' + num.substr(-4) + ')', num: num};
        fillColsResult(colsDef, cols, tds, d, 'credits.');

		if(__shouldProcess('credits', d)) {
			processCredit(tr, d);
		}

		result.credits.push(d);
	}
}

function processCredit(html, result){
    AnyBalance.trace('Обработка кредита ' + result.__name);

    if(AnyBalance.isAvailable('credits.fio', 'credits.address', 'credits.balance', 'credits.minpay_debt', 'credits.minpay_pct', 'credits.minpay_future', 'credits.minpay')){
        html = AnyBalance.requestPost(baseurl, {
            SID:g_bss_sessionId,
            tic:1,
            T:'RT_2IC.view',
            SCHEMENAME:'CREDITS',
            IDR: result.__id,
            FORMACTION: 'VIEW',
            TERMINALID: ''
        }, g_headers);

    	getParam(html, result, 'credits.fio', /Кредитополучатель[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    	getParam(html, result, 'credits.address', /Адрес кредитополучателя[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    	getParam(html, result, 'credits.balance', /Остаток по кредиту[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    	getParam(html, result, 'credits.minpay_debt', /Погашение основного долга[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    	getParam(html, result, 'credits.minpay_pct', /Погашение начисленных процентов[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    	getParam(html, result, 'credits.minpay_future', /Погашение платежей будущих периодов[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    	sumParam(html, result, 'credits.minpay', /Погашение основного долга[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    	sumParam(html, result, 'credits.minpay', /Погашение начисленных процентов[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    }

    if(AnyBalance.isAvailable('credits.transactions')){
    	processCreditTransactions(html, result);
    }

}

function processInfo(info, result){
	if(!AnyBalance.isAvailable('info'))
		return;

    result.info = {};
    getParam(info.info.CNS, result.info, 'info.fio');
}
