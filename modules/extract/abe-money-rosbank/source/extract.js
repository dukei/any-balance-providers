/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Информация о карте, кредите, депозите в банке "ХоумКредит".

Сайт: http://www.homecredit.ru
ЛК: https://ib.homecredit.ru
*/

var g_headers = {
    Accept:             'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language':  'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
    Connection:         'keep-alive',
    'User-Agent':       'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36',
};

var g_baseurl = 'https://online.rosbank.ru/ibank/';

var g_Xml_Headers = {
	'Accept': 'application/xml, text/xml, */*; q=0.01',
	'X-Requested-With': 'XMLHttpRequest',
	'Wicket-Ajax': 'true',
	'Wicket-Ajax-BaseURL': '.',
	'Referer': g_baseurl + 'main'
}

function findWicketActions(html) {
    var actions = sumParam(html, null, null, /Wicket.Ajax.ajax\((\{[\s\S]*?\})\);/ig) || [];
    AnyBalance.trace('Found ' + actions.length + ' Wicket-ajax actions');
    return actions;
}

function requestWicketAction(action, params, last_URL, base_URL) {
    var focusedElementID = getParam(action, /c":"([^"]*)/i),
        request_url      = getParam(action, /u":"\.\/([^"]*)/i);

    return AnyBalance.requestPost(g_baseurl + request_url, params, addHeaders({
     'X-Requested-With': 'XMLHttpRequest',
     'Accept': 'application/xml, text/xml, */*; q=0.01',
     'Wicket-Ajax': 'true',
     'Referer': last_URL,
     'Wicket-Ajax-BaseURL': base_URL,
     'Wicket-FocusedElementId': focusedElementID
     }))

}

// Wicket-ajax actions search
function findWicketActions(html) {
	var actions = sumParam(html, /Wicket.Ajax.ajax\((\{[\s\S]*?\})\);/ig) || [];
	AnyBalance.trace('Found ' + actions.length + ' Wicket-ajax actions');
	return actions;
}

function findExactWicketAction(actions, exactId, event) {
	if(!actions)
		return;

	var ids = [];	
	for(var i=0; i< actions.length; i++) {
		var json = getJsonEval(actions[i].replace(/\^/g, ''), '');
		
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

			html = AnyBalance.requestGet(g_baseurl + url + '&_=' + new Date().getTime(), addHeaders(g_Xml_Headers));
		}else{
			return html;
		}
	}while(true);
}

function requestGetWicketAction(html, regex, params, preferredEvent) {
	var wicketId = regex;
	if(typeof wicketId !== 'string'){
		var wicketId = getParam(html, regex);
		if(!wicketId){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не нашли wicketId ' + regex.source);
		}
	}
	
	var actions = findWicketActions(html);
	var action = findExactWicketAction(actions, wicketId, preferredEvent);
	if(!action)
		throw new AnyBalance.Error('Не удалось найти action: ' + wicketId);

	return params ? 
		AnyBalance.requestPost(g_baseurl + action, params, addHeaders({'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'}, addHeaders(g_Xml_Headers))) :
		AnyBalance.requestGet(g_baseurl + action + '&_=' + new Date().getTime(), addHeaders(g_Xml_Headers));
}

function checkForRedirect(html) {
	if(/<redirect>/i.test(html)) {
		var href = getParam(html, null, null, /main;[^\]]+/i);
		if(!href) {
			AnyBalance.trace('Запрошен редиретк, но ссылка на него не найдена, сайт изменен?');
		}
		var html = AnyBalance.requestGet(g_baseurl + href, g_headers);
	}
	
	return html;
}


function login() {
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var html = AnyBalance.requestGet(g_baseurl, g_headers);

    if(!/actionLogout/i.test(html)) {
    	var form = getElement(html, /<form[^>]+operation/i);
    	if(!form)
    		throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
		
		var params = AB.createFormParams(form, function(params, str, name, value) {
			if (/actionComponent/i.test(name)) {
				return;
			} else if (/login/i.test(name)) {
			    return prefs.login
            } else if(/password/i.test(name)) {
			    return prefs.password
            }
			return value;
		});
        params['actions:list:2:actionComponent'] = '1';

        var actions = findWicketActions(html),
            last_URL = AnyBalance.getLastUrl(),
            base_URL = getParam(html, null, null, /Wicket.Ajax.baseUrl="([^"]*)/i) || 'home?0';

        html = requestWicketAction(actions[4], {'fields:field:1:login': prefs.login, '': ''},       last_URL, base_URL);
        html = requestWicketAction(actions[5], {'fields:field:2:password': prefs.password, '': ''}, last_URL, base_URL);
        html = requestWicketAction(actions[2], params, last_URL, base_URL);



        if(/AcceptTerms/i.test(html)){
            throw new AnyBalance.Error('Вы ещё ни разу не входили в интернет-банк или вам требуется сменить пароль. Зайдите в интернет банк через браузер на https://online.rosbank.ru/ibank/, затем попробуйте выполнить провайдер ещё раз');
        }

        if(!/redirect|<button[^>]*>\s*Готово\s*<\/button>/i.test(html)) {
            var error = getParam(html, null,null, /<span[^>]*error[^>]*>([\s\S]*?)<\/span>/i);
            if(error)
                throw new AnyBalance.Error(error, null, true);
            AnyBalance.trace(html);
            throw new AnyBalance.Error('Не удаётся войти в интернет банк. Сайт изменен?');
        }


        __setLoginSuccessful();

    }else{
        AnyBalance.trace('Найдена активная сессия. Используем её.');
    }

    return html;
}

function processAccounts(result){
    if(!AnyBalance.isAvailable('accounts'))
        return;

    var html = AnyBalance.requestGet(g_baseurl + 'main', g_headers);

    var actions = findWicketActions(html),
        last_URL = AnyBalance.getLastUrl(),
        base_URL = getParam(html, null, null, /Wicket.Ajax.baseUrl="([^"]*)/i) || 'main?1';

    var request_url = getParam(actions[actions.length - 1], null, null, /u":"\.\/([^"]*)/i);

    html = AnyBalance.requestPost(g_baseurl + request_url, null, addHeaders({
        'Wicket-Ajax': 'true',
        'Wicket-Ajax-BaseURL': base_URL,
        'Referer': last_URL
    }));

    var tbl = getElements(html, /<div[^>]*product account/ig).join('\n');
    if(!tbl){
        AnyBalance.trace(html);
        AnyBalance.trace('Не удалось получить таблицу счетов');
        return;
    }

    result.accounts = [];

    var trs = getElements(tbl, /<div[^>]*mainInfo[^>]*>/ig);
    AnyBalance.trace('Нашли ' + trs.length + ' счетов');

    for(var i=0; i<trs.length; ++i){
        var tr = trs[i];
        var id = getElement(tr, /<[^>]*class="number"/i, replaceTagsAndSpaces);
        var name = getElement(tr, /<[^>]*class="name/i, replaceTagsAndSpaces);

        var a = {
            __id: id,
            __name: name + ' ' + id.substr(-4),
            num: id
        };

        if(__shouldProcess('accounts', a)){
            processAccount(tr, a);
        }

        result.accounts.push(a);
    }
}

function processAccount(tr, result){
    AnyBalance.trace('Обработка счета ' + result.__name);

    getParam(tr, result, 'accounts.balance', /<span[^>]*class="sum"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'accounts.currency', /<span[^>]*class="currency"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseCurrency);

    if(AnyBalance.isAvailable('accounts.num', 'accounts.type', 'accounts.owner')) {
        var infourl = getParam(tr, null, null, /<a[^>]*href="\.\/([^"]*)/i, replaceHtmlEntities);
        var html = AnyBalance.requestGet(g_baseurl + infourl, g_headers);

        var actions  = findWicketActions(html),
            last_URL = AnyBalance.getLastUrl(),
            base_URL = getParam(html, null, null, /Wicket.Ajax.baseUrl="([^"]*)/i);

        var request_url = getParam(actions[actions.length - 1], null, null, /u":"\.\/([^"]*)/i);

        var inner_html = AnyBalance.requestPost(g_baseurl + request_url, null, addHeaders({
            'Wicket-Ajax': 'true',
            'Wicket-Ajax-BaseURL': base_URL,
            'Referer': last_URL
        }));

        getParam(inner_html, result, 'accounts.num', /Номер счёта:(?:[\s\S]*?)<div[^>]*class="stringField[^"]*[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
        getParam(inner_html, result, 'accounts.type', /Тип счёта:(?:[\s\S]*?)<div[^>]*class="stringField[^"]*[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
        getParam(inner_html, result, 'accounts.owner', /Наименование счёта:(?:[\s\S]*?)<div[^>]*class="stringField[^"]*[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
    }

    if(AnyBalance.isAvailable('accounts.transactions')){
        processTransactions(html, result);
    }

}

function processTransactions(html, result){
    AnyBalance.trace('Получаем транзакции для ' + result.__name);

    var actions  = findWicketActions(html),
        last_URL = AnyBalance.getLastUrl(),
        base_URL = getParam(html, null, null, /Wicket.Ajax.baseUrl="([^"]*)/i);

    var request_url = getParam(actions[7], null, null, /u":"\.\/([^"]*)/i);

    html = AnyBalance.requestPost(g_baseurl + request_url, {
        'ida2_hf_0': 'ida2_hf_0',
        'fields:field:1:dateRangeName:select': 'CUSTOM',
        'fields:field:2:dateRange:dateFrom:date': getFormattedDate({format: 'DD.MM.YYYY',offsetYear: 1}),
        'fields:field:2:dateRange:dateTo:date': getFormattedDate({format: 'DD.MM.YYYY'}),
        'fields:field:3:filter': '',
        'filterAction': '1'
    }, addHeaders({
        'Wicket-Ajax': 'true',
        'Wicket-Ajax-BaseURL': base_URL,
        'Referer': last_URL
    }));

    if(/загрузка/i.test(html)) {
        var transition_action = findWicketActions(html);
        if(!transition_action) {
            AnyBalance.trace(html);
            AnyBalance.trace("Не удалось найти ссылку для запроса транзакций");
        } else {
            request_url = getParam(transition_action[0], null, null, /u":"\.\/([^"]*)/i);
            AnyBalance.sleep(5000);
            html = AnyBalance.requestGet(g_baseurl + request_url + '&_=' + new Date().getTime(), addHeaders({
                'X-Requested-With': 'XMLHttpRequest',
                'Wicket-Ajax-BaseURL': last_URL,
                'Wicket-Ajax': 'true'
            }));
        }
    }

    var transactions = getElements(html, /<div[^>]*class="statementTransaction[^"]*"[^>]*>/ig);
    result.transactions = [];

    for(var i = 0; i < transactions.length; i++) {
        var t = {};

        getParam(transactions[i], t, 'transactions.sum',   /<span[^>]*class="sum"[^>]*>([\s\S]*?)<\/span>/i,       replaceTagsAndSpaces, parseBalance);
        getParam(transactions[i], t, 'transactions.descr', /<div[^>]*class="description"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
        getParam(transactions[i], t, 'transactions.type',  /<div[^>]*class="name"[^>]*>([\s\S]*?)<\/div>/i,        replaceTagsAndSpaces);
        getParam(transactions[i], t, 'transactions.date',  /<div[^>]*class="date"[^>]*>([\s\S]*?)<\/div>/i,        replaceTagsAndSpaces, parseDate);
        result.transactions.push(t);
    }
}

function processCards(result){
    if(!AnyBalance.isAvailable('cards'))
        return;

    var html = AnyBalance.requestGet(g_baseurl + 'main', g_headers);

    var actions = findWicketActions(html),
        last_URL = AnyBalance.getLastUrl(),
        base_URL = getParam(html, null, null, /Wicket.Ajax.baseUrl="([^"]*)/i) || 'main?1';

    var request_url = getParam(actions[actions.length - 1], null, null, /u":"\.\/([^"]*)/i);

    html = AnyBalance.requestPost(g_baseurl + request_url, null, addHeaders({
        'Wicket-Ajax': 'true',
        'Wicket-Ajax-BaseURL': base_URL,
        'Referer': last_URL
    }));

    var tbl = getElements(html, /<div[^>]*cards listView[^>]*>/ig);
    if(!tbl.length){
        AnyBalance.trace(html);
        AnyBalance.trace('Не удалось получить таблицу карт');
        return;
    }

    result.cards = [];

    var trs = getElements(tbl.join(), /<div[^>]*accountCard[^>]*>/ig);
    AnyBalance.trace('Нашли ' + trs.length + ' карт');

    for(var i=0; i<trs.length; ++i){
        var tr = trs[i];
        var id = getElement(tr, /<[^>]*class="number"/i, replaceTagsAndSpaces);
        var name = getElement(tr, /<[^>]*class="name/i, replaceTagsAndSpaces);

        var c = {
            __id: id,
            __name: name + ' ' + id.substr(-4),
            num: id
        };

        if(__shouldProcess('cards', c)){
            processCard(tr, c, html);
        }

        result.cards.push(c);
    }
}

function processCard(tr, result, html){
    AnyBalance.trace('Обработка карты ' + result.__name);

    //getParam(tr, result, 'cards.till', /<div[^>]*class="term"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseDate);
    //getParam(tr, result, 'cards.status', /([\s\S]*?<\/td>){3}/i, replaceTagsAndSpaces); //Карта активна

    if(AnyBalance.isAvailable('cards.balance', 'cards.currency', 'cards.num', 'cards.type', 'cards.blocked', 'cards.cardholder', 'cards.date_start')) {
    	var wicketId = getParam(tr, /^<[^>]+id="([^"]*)/i, replaceHtmlEntities);
    	html = requestGetWicketAction(html, wicketId);

        getParam(html, result, 'cards.balance',    /Доступный остаток(?:[\s\S]*?)<span[^>]*class="sum"[^>]*>([\s\S]*?)<\/span>/i,      replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'cards.blocked',    /Заблокировано(?:[\s\S]*?)<span[^>]*class="sum"[^>]*>([\s\S]*?)<\/span>/i,          replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'cards.currency',   /Доступный остаток(?:[\s\S]*?)<span[^>]*class="currency"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
        getParam(html, result, 'cards.type',       /Тип карты(?:[\s\S]*?)<div[^>]*formcontrol[^>]*>([\s\S]*?)<\/div>/i,                replaceTagsAndSpaces);
        getParam(html, result, 'cards.cardholder', /Держатель карты(?:[\s\S]*?)<div[^>]*formcontrol[^>]*>([\s\S]*?)<\/div>/i,          replaceTagsAndSpaces);
        getParam(html, result, 'cards.date_start', /Дата выпуска(?:[\s\S]*?)<span[^>]*formcontrol[^>]*>([\s\S]*?)<\/span>/i,           replaceTagsAndSpaces, parseDate);
        getParam(html, result, 'cards.accnum',     /Привязанные счета(?:[\s\S]*?)<div[^>]*class="number"[^>]*>([\s\S]*?)<\/div>/i,     replaceTagsAndSpaces);
    }

    if(AnyBalance.isAvailable('cards.transactions')){
        processTransactions(html, result);
    }

}

function processInfo(result){
    if(!AnyBalance.isAvailable('info'))
        return;

    var info = result.info = {};
    var html = AnyBalance.requestGet(g_baseurl + 'profile', g_headers);

    getParam(html, info, 'info.fio',    /Имя пользователя(?:[\s\S]*?)<div[^>]*class="value"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
    //getParam(html, info, 'info.email',  /<a[^>]+EmailHyperLink[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces);
    getParam(html, info, 'info.phone',  /Отправка SMS на номер телефона(?:[\s\S]*?)<div[^>]*class="description[^"]*"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
    getParam(html, info, 'info.notify', /Отправка SMS на номер телефона(?:[\s\S]*?)<div[^>]*class="value[^"]*"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces); //не получать уведомлений|Получать уведомления только об успешных операциях|Получать уведомления обо всех активных операциях
}