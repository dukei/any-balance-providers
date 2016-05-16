/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    Origin: 'https://online.crediteurope.ru',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:35.0) Gecko/20100101 Firefox/35.0'
};

var baseurl = 'https://online.crediteurope.ru/FWFIB/';

function getSessionId(html){
    return getParam(html, null, null, /<input[^>]+name="session_id"[^>]*value\s*=\s*['"]?([^'">\s]*)/i, replaceHtmlEntities);
}

function login() {
	var prefs = AnyBalance.getPreferences();

	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'allmenuitems.jsp?session_lang=ru', g_headers);
	var session_id = getSessionId(html);
	if(!session_id) {
        AnyBalance.trace('Сессия не установлена. Будем заходить заново');

        html = AnyBalance.requestGet(baseurl + 'loginNewNV.jsp', g_headers);
        var form = getElement(html, /<form[^>]+class="login"[^>]*>/i);
        if (!form) {
            AnyBalance.trace(html);
            throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
        }

        //Эта куки зачем-то нужна банку
        AnyBalance.setCookie(getParam(baseurl, null, null, /:\/\/([^\/]*)/), 'see3', '1');

        var params = createFormParams(form, function (params, str, name, value) {
            if (name == 'USERNAME')
                return prefs.login;
            else if (name == 'PASSWORD')
                return prefs.password;

            return value;
        });

        html = AnyBalance.requestPost(baseurl + 'loginNewNV.jsp', params, addHeaders({Referer: AnyBalance.getLastUrl()}));

        form = getElement(html, /<form[^>]+loginSMS[^>]*>/i);
        if(!form){
            var error = getElement(html, /<td[^>]*color:\s*red[^>]*>/i, replaceTagsAndSpaces);
            if(error)
                throw new AnyBalance.Error(error, null, /Пароль/i.test(error));
            AnyBalance.trace(html);
            throw new AnyBalance.Error('Не удаётся войти в интернет банк. Сайт изменен?');
        }

        params = createFormParams(form, function (params, str, name, value) {
            if (name == 'SMSPASS')
                return AnyBalance.retrieveCode("Пожалуйста, введите код из СМС, пришедшего вам не телефон, для входа в интернет-банк");
            return value;
        });

        html = AnyBalance.requestPost(baseurl + 'loginSMS.jsp', params, addHeaders({Referer: AnyBalance.getLastUrl()}));

        form = getElement(html, /<form[^>]+FWFServlet[^>]*>/i);
        if(!form){
            var error = getElement(html, /<td[^>]*color:\s*red[^>]*>/i, replaceTagsAndSpaces);
            if(error)
                throw new AnyBalance.Error(error);
            AnyBalance.trace(html);
            throw new AnyBalance.Error('Не удаётся войти в интернет банк после ввода СМС-кода. Сайт изменен?');
        }

        params = createFormParams(form, null, true); //Некоторые имена повторяются
        html = AnyBalance.requestPost(baseurl + 'FWFServlet', params, addHeaders({Referer: AnyBalance.getLastUrl()}));

        var frameurl = getParam(html, null, null, /<frame[^>]+name="mainframe"[^>]*src="([^"]*)/i, replaceHtmlEntities);
        if(!frameurl) {
            AnyBalance.trace(html);
            throw new AnyBalance.Error('Не удалось войти в интернет банк на главную страницу. Сайт изменен?');
        }

        AnyBalance.trace('Загружаем фреймсет...');
        var frames = sumParam(html, null, null, /<frame[^>]+src="([^"]*)/ig, replaceHtmlEntities);
        for(var i=0; i<frames.length; ++i){
            //На всякий случай грузим все фреймы, чтобы всё у сервера внутри правильно инициализировалось
            html = AnyBalance.requestGet(joinUrl(baseurl, frames[i]), addHeaders({Referer: baseurl + 'FWFServlet'}));
        }

        AnyBalance.trace('Получаем всё меню...');
        html = AnyBalance.requestGet(baseurl + 'allmenuitems.jsp?session_lang=ru', g_headers);
        session_id = getSessionId(html);
        if(!session_id) {
            AnyBalance.trace(html);
            throw new AnyBalance.Error('Не удалось получить меню после входа в интернет-банк. Сайт изменен?');
        }
    }else{
        AnyBalance.trace('Используем текущую сессию...');
    }

    __setLoginSuccessful();

	return html;
}

function getMenuPage(html, name){
    var param_str = getParam(html, null, null, new RegExp('evaluate\\s*\\([^)]*' + name + '[^)]*'));
    if(!param_str) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удаётся найти ссылку на меню ' + name + '. Сайт изменен?');
    }

    var session_id = getSessionId(html);
    var page = getParam(param_str, null, null, /\(\s*'([^']*)/);
    var menuname = getParam(param_str, null, null, /\((?:\s*[^,)]*,){2}\s*['"]?([^'",]*)/); //Третий параметр
    var menuId = getParam(param_str, null, null, /\((?:\s*[^,)]*,){3}\s*['"]?([^'",]*)/); //Четвертый параметр

    var session_id = getSessionId(html);
    html = AnyBalance.requestPost(baseurl + 'FWFServlet', {
        callType:	'mpageCall',
        page:	page,
        rights: '',
        path:	menuname,
        menuID:	menuId,
        allItems:	'true',
        session_id:	session_id,
        lang:	'ru'
    }, addHeaders({Referer: baseurl + 'allmenuitems.jsp?session_lang=ru'}));

    return html;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка информации о пользователе
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function processInfo(html, result){
    if(!AnyBalance.isAvailable('info'))
        return;

    var session_id = getSessionId(html);
    html = AnyBalance.requestPost(baseurl + 'FWFServlet', {
        callType:	'mpageCall',
        session_id:	session_id,
        lang:	'ru',
        USERGROUP:	'br',
        TOPFRAME_CALLING:	'true',
        page: ''
    }, addHeaders({Referer: baseurl + 'FWFServlet'}));

    var info = result.info = {};
    getParam(html, info, 'info.fio', /Здравствуйте,([^!<]*)/i, replaceTagsAndSpaces);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка счетов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processAccounts(html, result) {
    if(!AnyBalance.isAvailable('accounts'))
        return;

    html = getMenuPage(html, 'Текущие счета');

    var tbl = getElement(html, /<tbody[^>]+scrollContent[^>]*>/i);
    if(!tbl) {
        AnyBalance.trace(html);
        AnyBalance.trace('Не найдена таблица счетов');
    }

    result.accounts = [];

    var trs = getElements(tbl, /<tr[^>]*>/ig);
    if(!trs.length) {
        AnyBalance.trace(html);
        AnyBalance.trace('Счета не найдены');
        return;
    }

	AnyBalance.trace('Найдено счетов: ' + trs.length);

	for(var i=0; i < trs.length; ++i){
        var tr = trs[i];
        var num = getParam(tr, null, null, /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
        var name = getParam(tr, null, null, /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
		var title = name + ' ' + num.substr(-4);
		
		var c = {__id: num, __name: title, num: num};
		
		if(__shouldProcess('accounts', c)) {
			html = processAccount(html, tr, c);
		}
		
		result.accounts.push(c);
	}
}

function createPropTable(html){
    var elements = getElements(html, /<span[^>]+class\s*=\s*["']?base\b[^>]*>/ig);
    var parsedElems = [];
    for(var i=0; i<elements.length; ++i){
        var e = elements[i];
        var title = /font-weight:bold|left:10px|left:355px/i.test(e) ? -1 : 0;
        var vert = getParam(e, null, null, /top:\s*(\d+)px/i, replaceHtmlEntities, parseBalanceSilent);
        var hor = getParam(e, null, null, /left:\s*(\d+)px/i, replaceHtmlEntities, parseBalanceSilent);
        var text = getParam(e, null, null, null, replaceTagsAndSpaces);
        parsedElems.push({
            title: title,
            vert: vert,
            hor: hor,
            text: text
        });
    }

    parsedElems.sort(function(e1, e2){
        var v = e1.vert - e2.vert;
        if(v)
            return v;
        var h = e1.hor - e2.hor;
        if(h)
            return h;
    });

    var tbl = [], current;
    for(i=0; i<parsedElems.length; ++i){
        var e = parsedElems[i];
        if(e.title){
            if(current)
                tbl.push(current);
            current = {title: e.text, text: ''};
        }else{
            if(current)
                current.text += (current.text ? ' ' : '') + e.text;
        }
    }
    if(current)
        tbl.push(current);

    return tbl;
}

function performAction(nameRe, params, html){
    var action = getElements(html, [/<(?:a|button)[^>]*populateForm[^>]*>/ig, nameRe])[0];
    if(!action){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось найти действие: ' + nameRe.source);
    }

    return performActionByString(action, params, html);
}

function performActionByString(action, params, html){
    var aid = getParam(action, null, null, /populateForm\w*\s*\(\s*'?([^',]*)/, replaceHtmlEntities);
    if(aid == 'this')
        aid = getParam(action, null, null, /name\s*=\s*["']?([^"'\s>]*)/i, replaceHtmlEntities);
    var aname = getParam(action, null, null, /populateForm\w*\s*\([^,)]*\s*,\s*'?([^',]*)/, replaceHtmlEntities);

    if(Array.isArray(params)) {
        var prms = '';
        for (var i = 0; i < params.length; ++i) {
            prms += params[i].join(':') + '|';
        }
        params = prms;
    }else if(typeof params == 'object'){
        var prms = '';
        for (var i in params) {
            prms += i + ':' + params[i] + '|';
        }
        params = prms;
    }

    var form = getElement(html, /<form[^>]+name="generic"[^>]*>/i);
    var formparams = createFormParams(form, function (_params, str, name, value) {
        if (name == 'params')
            return params;
        if (name == 'triggeredbean')
            return aid;
        if (name == 'event')
            return aname;
        return value;
    });

    html = AnyBalance.requestPost(baseurl + 'FWFServlet', formparams, addHeaders({Referer: baseurl + 'FWFServlet'}));
    return html;
}

function processAccount(html, account, result){
    AnyBalance.trace('Обработка счета ' + result.__name);

    getParam(account, result, 'accounts.balance', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(account, result, ['accounts.currency', 'accounts.balance'], /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
    getParam(account, result, 'accounts.name', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

    if(AnyBalance.isAvailable('accounts.owner', 'accounts.date_start', 'accounts.transactions')) {
        var action = getParam(account, null, null, /<input[^>]+type=\s*['"]?radio[^>]*/i);
        var accval = getParam(action, null, null, /value\s*=\s*["']?([^"'\s>]*)/i, replaceHtmlEntities);
        var acccname = getParam(action, null, null, /name\s*=\s*["']?([^"'\s>]*)/i, replaceHtmlEntities);
        var params = acccname + ':' + accval + "|FRE$TabPage:0|0:true|";

        html = performActionByString(action, params, html);
        html = performAction(/Выписка по счету/i, params, html);

        var tbl = createPropTable(html);
        for (var i = 0; i < tbl.length; ++i) {
            var prop = tbl[i];
            if (/Имя владельца/i.test(prop.title))
                getParam(prop.text, result, 'accounts.owner');
            else if (/Дата открытия счета/i.test(prop.title))
                getParam(prop.text, result, 'accounts.date_start', null, null, parseDate);
        }

        if (AnyBalance.isAvailable('accounts.transactions')) {
            html = processAccountTransactions(html, result);
        }

        html = performAction(/geri.gif/i, params, html); //Назад
    }

    return html;
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка карт
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(html, result) {
	if(!AnyBalance.isAvailable('cards'))
		return;

    html = getMenuPage(html, 'Информация по Карте');

    var allcardsAction = getElements(html, [/<div[^>]+class=['"]?base\b[^>]*>/ig, /Все карты, включая заблокированные/i])[0];
    var cardsParams = {FRE$TabPage:0};
    if(allcardsAction){
        AnyBalance.trace('Включаем все карты.');
        var allcardsActionName = getParam(allcardsAction, null, null, /name\s*=\s*["']?([^"'\s>]*)/i, replaceHtmlEntities);
        cardsParams[allcardsActionName] = 'true';
        html = performActionByString(allcardsAction, cardsParams, html);
    }

    var tbl = getElements(html, [/<select[^>]*>/ig, /\d{6}\*{6}\d{4}/i])[0]; //Селект, содержащий номера карт
    if(!tbl) {
        AnyBalance.trace(html);
        AnyBalance.trace('Не найдена таблица карт');
    }
    var selectName = getParam(tbl, null, null, /<select[^>]+name\s*=\s*["']?([^"'\s>]*)/i, replaceHtmlEntities);

    result.cards = [];

    var trs = sumParam(tbl, null, null, /<option[^>]*>[\s\S]*?(?:<\/option>|(?=<option)|(?=<\/select>))/ig);
    if(!trs.length) {
        AnyBalance.trace(html);
        AnyBalance.trace('Карты не найдены');
        return;
    }

    AnyBalance.trace('Найдено карт: ' + (trs.length-1));

    for(var i=0; i < trs.length; ++i){
        var tr = trs[i];
        var id = getParam(tr, null, null, /\bvalue="([^"]*)/i, replaceHtmlEntities);
        if(!id)
            continue; //Пустая строка
        var num = getParam(tr, null, null, /\d{6}\*{6}\d{4}/i, replaceTagsAndSpaces);
        var name = getParam(tr, null, null, null, replaceTagsAndSpaces);

        var c = {__id: id, __name: name, num: num};

        if(__shouldProcess('cards', c)) {
            cardsParams[selectName] = i;
            html = processCard(html, tbl, cardsParams, c);
        }

        result.cards.push(c);
    }
}

function processCard(html, tbl, cardsParams, result) {
    AnyBalance.trace('Обработка карты ' + result.__name);

    html = performActionByString(tbl, cardsParams, html);
    var tbl = createPropTable(html);
    for (var i = 0; i < tbl.length; ++i) {
        var prop = tbl[i];
        if (/Тип карты/i.test(prop.title))
            getParam(prop.text, result, 'cards.type');
        if (/Тип продукта/i.test(prop.title))
            getParam(prop.text, result, 'cards.product_type');
        else if (/Имя владельца/i.test(prop.title))
            getParam(prop.text, result, 'cards.holder');
        else if (/Номер счета/i.test(prop.title))
            getParam(prop.text, result, 'cards.accnum');
        else if (/Валюта/i.test(prop.title))
            getParam(prop.text, result, ['cards.currency', 'cards.balance']);
        else if (/Статус Карты/i.test(prop.title)) //Активирована
            getParam(prop.text, result, 'cards.status');
        else if (/действительна до/i.test(prop.title))
            getParam(prop.text, result, 'cards.till', null, null, parseDate);
        else if (/Кредитный лимит/i.test(prop.title))
            getParam(prop.text, result, 'cards.limit', null, null, parseBalance);
        else if (/Лимит для снятия наличными/i.test(prop.title))
            getParam(prop.text, result, 'cards.limit_cash', null, null, parseBalance);
        else if (/Сумма доступных средств$/i.test(prop.title)) {
            getParam(prop.text, result, 'cards.balance', null, null, parseBalance);
            getParam(prop.text, result, 'cards.available', null, null, parseBalance);
        }else if (/Сумма доступных средств для снятия наличными/i.test(prop.title))
            getParam(prop.text, result, 'cards.available_cash', null, null, parseBalance);
        else if (/Собственные средства/i.test(prop.title))
            getParam(prop.text, result, 'cards.own', null, null, parseBalance);
        else if (/Задолженность по выписке/i.test(prop.title))
            getParam(prop.text, result, 'cards.debt_previous', null, null, parseBalance);
        else if (/Предварительный расчет задолженности на текущую дату/i.test(prop.title))
            getParam(prop.text, result, 'cards.debt', null, null, parseBalance);
        else if (/Сумма накопленных баллов/i.test(prop.title))
            getParam(prop.text, result, 'cards.bonus', null, null, parseBalance);
    }

    return html;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка депозитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processDeposits(html, result) {
	if(!AnyBalance.isAvailable('deposits'))
		return;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка кредитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCredits(html, result) {
	if(!AnyBalance.isAvailable('credits'))
		return;

    html = getMenuPage(html, 'Кредиты');

    var tbl = getElement(html, /<tbody[^>]+scrollContent[^>]*>/i);
    if(!tbl) {
        AnyBalance.trace(html);
        AnyBalance.trace('Не найдена таблица кредитов');
    }

    result.credits = [];

    var trs = getElements(tbl, /<tr[^>]*>/ig);
    if(!trs.length) {
        AnyBalance.trace(html);
        AnyBalance.trace('Кредиты не найдены');
        return;
    }

    AnyBalance.trace('Найдено кредитов: ' + trs.length);

    for(var i=0; i < trs.length; ++i){
        var tr = trs[i];
        var num = getParam(tr, null, null, /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
        var name = getParam(tr, null, null, /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
        var title = name + ' ' + num.substr(-4);

        var c = {__id: num, __name: title, num: num};

        if(__shouldProcess('credits', c)) {
            html = processCredit(html, tr, c);
        }

        result.credits.push(c);
    }
}

function parseBool(str){
    return !/нет/i.test(str);
}

function processCredit(html, tr, result){
    AnyBalance.trace('Обработка кредита ' + result.__name);

    getParam(tr, result, 'credits.balance', /(?:[\s\S]*?<td[^>]*>){14}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, ['credits.currency', 'credits.balance'], /(?:[\s\S]*?<td[^>]*>){14}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
    getParam(tr, result, 'credits.limit', /(?:[\s\S]*?<td[^>]*>){12}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'credits.till', /(?:[\s\S]*?<td[^>]*>){10}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    getParam(tr, result, 'credits.date_start', /(?:[\s\S]*?<td[^>]*>){8}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    getParam(tr, result, 'credits.status', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, 'credits.name', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

    if(AnyBalance.isAvailable('credits.type', 'credits.accnum', 'credits.minpay_till', 'credits.shoud_pay_full', 'credits_pay_full', 'credits.schedule')) {
        var action = getParam(tr, null, null, /<input[^>]+type=\s*['"]?radio[^>]*/i);
        var accval = getParam(action, null, null, /value\s*=\s*["']?([^"'\s>]*)/i, replaceHtmlEntities);
        var acccname = getParam(action, null, null, /name\s*=\s*["']?([^"'\s>]*)/i, replaceHtmlEntities);
        var params = acccname + ':' + accval + "|FRE$TabPage:0|0:true|";

        html = performActionByString(action, params, html);
        html = performAction(/Информация по кредиту/i, params, html);

        var tbl = createPropTable(html);
        for (var i = 0; i < tbl.length; ++i) {
            var prop = tbl[i];
            if (/Тип Кредита/i.test(prop.title))
                getParam(prop.text, result, 'credits.type');
            else if (/^Счет$/i.test(prop.title))
                getParam(prop.text, result, 'credits.accnum');
            else if (/Дата очередного платежа/i.test(prop.title))
                getParam(prop.text, result, 'credits.minpay_till', null, null, parseDate);
            else if (/К досрочному погашению/i.test(prop.title))
                getParam(prop.text, result, 'credits.should_pay_full', null, null, parseBool);
            else if (/Сумма полного досрочного погашения/i.test(prop.title))
                getParam(prop.text, result, 'credits.pay_full', null, null, parseBalance);
        }

        if (AnyBalance.isAvailable('credits.schedule')) {
            html = processCreditSchedule(html, result);
        }

        html = performAction(/Назад/i, params, html); //Назад
    }

    return html;
}

