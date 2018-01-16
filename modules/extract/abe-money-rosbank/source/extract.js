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

var g_baseurl = 'https://ibank.rosbank.ru/';

function findWicketActions(html) {
    var actions = sumParam(html, null, null, /Wicket.Ajax.ajax\((\{[\s\S]*?\})\);/ig) || [];
    AnyBalance.trace('Found ' + actions.length + ' Wicket-ajax actions');
    return actions;
}

function requestWicketAction(action, params, last_URL, base_URL) {
    var focusedElementID = getParam(action, null, null, /c":"([^"]*)/i),
        request_url      = getParam(action, null, null, /u":"\.\/([^"]*)/i);

    return AnyBalance.requestPost(g_baseurl + 'ibank/' + request_url, params, addHeaders({
     'X-Requested-With': 'XMLHttpRequest',
     'Accept': 'application/xml, text/xml, */*; q=0.01',
     'Wicket-Ajax': 'true',
     'Referer': last_URL,
     'Wicket-Ajax-BaseURL': base_URL,
     'Wicket-FocusedElementId': focusedElementID
     }))

}

function login() {
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var html = AnyBalance.requestGet(g_baseurl + 'ibank', g_headers);

    if(!/Logout.aspx/i.test(html)) {
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
            throw new AnyBalance.Error('Вы ещё ни разу не входили в интернет-банк или вам требуется сменить пароль. Зайдите в интернет банк через браузер на https://ibank.rosbank.ru/, затем попробуйте выполнить провайдер ещё раз');
        }

        if(!/redirect/i.test(html)) {
            var error = getParam(html, null,null, /<span[^>]*error[^>]*>([\s\S]*?)<\/span>/i);
            if(error)
                throw new AnyBalance.Error(error, null, true);
            AnyBalance.trace(html);
            throw new AnyBalance.Error('Не удаётся ввести логин. Сайт изменен?');
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

    var html = AnyBalance.requestGet(g_baseurl + 'ibank/main');

    var actions = findWicketActions(html),
        last_URL = AnyBalance.getLastUrl(),
        base_URL = getParam(html, null, null, /Wicket.Ajax.baseUrl="([^"]*)/i) || 'main?1';

    var request_url = getParam(actions[actions.length - 1], null, null, /u":"\.\/([^"]*)/i);

    html = AnyBalance.requestPost(g_baseurl + 'ibank/' + request_url, null, addHeaders({
        'Wicket-Ajax': 'true',
        'Wicket-Ajax-BaseURL': base_URL,
        'Referer': last_URL
    }));

    var tbl = getElement(html, /<div[^>]*product account[^>]*>/i);
    if(!tbl){
        AnyBalance.trace(html);
        AnyBalance.trace('Не удалось получить таблицу счетов');
        return;
    }

    result.accounts = [];

    var trs = getElements(tbl, /<div[^>]*mainInfo[^>]*>/i);
    AnyBalance.trace('Нашли ' + trs.length + ' счетов');

    for(var i=0; i<trs.length; ++i){
        var tr = trs[i];
        var id = getParam(tr, null, null, /<div[^>]*class="number"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
        var name = getParam(tr, null, null, /<a[^>]*class="name[^"]*"[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces);

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
        var html = AnyBalance.requestGet(g_baseurl + 'ibank/' + infourl, g_headers);

        var actions  = findWicketActions(html),
            last_URL = AnyBalance.getLastUrl(),
            base_URL = getParam(html, null, null, /Wicket.Ajax.baseUrl="([^"]*)/i);

        var request_url = getParam(actions[actions.length - 1], null, null, /u":"\.\/([^"]*)/i);

        var inner_html = AnyBalance.requestPost(g_baseurl + 'ibank/' + request_url, null, addHeaders({
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

    html = AnyBalance.requestPost(g_baseurl + 'ibank/' + request_url, {
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
            html = AnyBalance.requestGet(g_baseurl + 'ibank/' + request_url + '&_=' + new Date().getTime(), addHeaders({
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

    var html = AnyBalance.requestGet(g_baseurl + 'ibank/main');

    var actions = findWicketActions(html),
        last_URL = AnyBalance.getLastUrl(),
        base_URL = getParam(html, null, null, /Wicket.Ajax.baseUrl="([^"]*)/i) || 'main?1';

    var request_url = getParam(actions[actions.length - 1], null, null, /u":"\.\/([^"]*)/i);

    html = AnyBalance.requestPost(g_baseurl + 'ibank/' + request_url, null, addHeaders({
        'Wicket-Ajax': 'true',
        'Wicket-Ajax-BaseURL': base_URL,
        'Referer': last_URL
    }));

    var tbl = getElement(html, /<div[^>]*cards listView[^>]*>/i);
    if(!tbl){
        AnyBalance.trace(html);
        AnyBalance.trace('Не удалось получить таблицу счетов');
        return;
    }

    result.cards = [];

    var trs = getElements(tbl, /<div[^>]*accountCard[^>]*>/ig);
    AnyBalance.trace('Нашли ' + trs.length + ' карт');

    for(var i=0; i<trs.length; ++i){
        var tr = trs[i];
        var id = getParam(tr, null, null, /<div[^>]*class="number"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
        var name = getParam(tr, null, null, /<a[^>]*class="name[^"]*"[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces);

        var c = {
            __id: id,
            __name: name + ' ' + id.substr(-4),
            num: id
        };

        if(__shouldProcess('cards', c)){
            processCard(tr, c);
        }

        result.cards.push(c);
    }
}

function processCard(tr, result){
    AnyBalance.trace('Обработка карты ' + result.__name);

    getParam(tr, result, 'cards.till', /<div[^>]*class="term"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseDate);
    //getParam(tr, result, 'cards.status', /([\s\S]*?<\/td>){3}/i, replaceTagsAndSpaces); //Карта активна

    if(AnyBalance.isAvailable('cards.balance', 'cards.currency', 'cards.num', 'cards.type', 'cards.blocked', 'cards.cardholder', 'cards.date_start')) {
        var infourl = getParam(tr, null, null, /<a[^>]*href="\.\/([^"]*)/i, replaceHtmlEntities);
        var html = AnyBalance.requestGet(g_baseurl + 'ibank/' + infourl, g_headers);

        var actions  = findWicketActions(html),
            last_URL = AnyBalance.getLastUrl(),
            base_URL = getParam(html, null, null, /Wicket.Ajax.baseUrl="([^"]*)/i);

        var request_url = getParam(actions[actions.length - 1], null, null, /u":"\.\/([^"]*)/i);

        var inner_html = AnyBalance.requestPost(g_baseurl + 'ibank/' + request_url, null, addHeaders({
            'Wicket-Ajax': 'true',
            'Wicket-Ajax-BaseURL': base_URL,
            'Referer': last_URL
        }));

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
    var html = AnyBalance.requestGet(g_baseurl + 'ibank/profile', g_headers);

    getParam(html, info, 'info.fio',    /Имя пользователя(?:[\s\S]*?)<div[^>]*class="value"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
    //getParam(html, info, 'info.email',  /<a[^>]+EmailHyperLink[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces);
    getParam(html, info, 'info.phone',  /Отправка SMS на номер телефона(?:[\s\S]*?)<div[^>]*class="description[^"]*"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
    getParam(html, info, 'info.notify', /Отправка SMS на номер телефона(?:[\s\S]*?)<div[^>]*class="value[^"]*"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces); //не получать уведомлений|Получать уведомления только об успешных операциях|Получать уведомления обо всех активных операциях
}