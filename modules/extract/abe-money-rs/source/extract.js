/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:35.0) Gecko/20100101 Firefox/35.0'
};

var baseurl = 'https://online.rsb.ru/hb/faces/';

function login() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');

    var json = getProductsJson();
    if(!json) {

        var html = AnyBalance.requestPost(baseurl + 'security_check', {
            j_username: prefs.login,
            j_password: prefs.password,
            systemid: 'hb'
        }, g_headers);

        var redirect = getParam(html, null, null, /window.location\s*=\s*"faces\/([^"]*)/i, replaceSlashes);
        if (redirect)
            html = AnyBalance.requestGet(baseurl + redirect, g_headers);

        if (!/<div[^>]+class="b-login"[^>]*>/i.test(html)) {
            while (/Ввод пароля из SMS-сообщения/i.test(html)) {
                var err = getParam(html, null, null, /<div[^>]+class="b-errors-message"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
                var prmpt = getParam(html, null, null, /<label[^>]+for="temp_pass"[^>]*>([\s\S]*?)<\/label>/i, replaceTagsAndSpaces);
                var sms_off = 'Для пользования провайдером удобно отключить одноразовый пароль на вход в настройках интернет-банка. Это безопасно, для проведения любых операций SMS-пароль всё равно будет требоваться.';
                if (err)
                    prmpt = err + '\n\n' + prmpt;
                else
                    prmpt = prmpt + '\n\n' + 'Для пользования провайдером удобно отключить одноразовый пароль на вход в настройках интернет-банка. Это безопасно, для проведения любых операций SMS-пароль всё равно будет требоваться.';

                var form = getParam(html, null, null, /<form[^>]+action="[^"]*sms.jsp[\s\S]*?<\/form>/i);
                if (!form)
                    throw new AnyBalance.Error('Не удаётся найти форму ввода одноразового смс кода на вход.\n\n' + sms_off);

                var params = createFormParams(form, function (params, str, name, value) {
                    if (/submit_by_enth?er/i.test(str))
                        return AnyBalance.retrieveCode(prmpt, null, {time: 300000, inputType: "number"});
                    if (/type="submit"/i.test(str)) {
                        if (/&#1042;&#1086;&#1081;&#1090;&#1080;/.test(str))
                            params.source = name;
                        return;
                    }

                    return value;
                });

                html = AnyBalance.requestPost(baseurl + 'system/login/sms/sms.jsp', params);
            }
        }

        if (!/<div[^>]+class="b-login"[^>]*>/i.test(html)) {
            var href = getParam(html, null, null, /window.location\s*=\s*"([^"]*)/i, replaceSlashes);
            if (href) {
                AnyBalance.trace("Переходим на " + href);
                html = AnyBalance.requestGet(joinUrl(baseurl, href));
            }

            if (/Ввод пароля из SMS-сообщения/i.test(html))
                throw new AnyBalance.Error('У вас настроен вход по паролю из SMS сообщения. Для пользования провайдером удобно отключить этот пароль в настройках интернет-банка. Это безопасно, для проведения любых операций SMS-пароль всё равно будет требоваться.');

            var error = getParam(html, null, null, /<div[^>]+class="b-frm-warning2"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);

            if (!error)
                error = getParam(html, null, null, /<h2[^>]+class="b-auth-error[^>]*>([\s\S]*?)<\/h2>/i, replaceTagsAndSpaces);

            if (!error)
                error = getParam(html, null, null, /<div[^>]+class="b-auth-blocked"[^>]*>\s*<p>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);

            if (/необходимо задать новый пароль/i.test('' + error))
                error += ' Зайдите в интернет-банк https://online.rsb.ru через браузер, задайте новый пароль и введите новый пароль в настройки провайдера.';

            if (error)
                throw new AnyBalance.Error(error, null, /новый пароль|или пароль|Доступ в систему заблокирован/i.test(error));

            AnyBalance.trace(html);
            throw new AnyBalance.Error('Ошибка авторизации. Проверьте логин и пароль');
        }

        json = getProductsJson();
    }else{
        AnyBalance.trace('Используем существующую сессию...');
    }

    return json;
}

function getProductsJson(){
	if(getProductsJson.cached_json)
		return getProductsJson.cached_json;

	var html = AnyBalance.requestGet(baseurl + 'request.json', g_headers);
    if(/'data'/.test(html))
        return false;

	var json = getJson(html);
	if(!json.data){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка получения списка карт. Сайт изменен?');
	}

	return getProductsJson.cached_json = json;

}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка счетов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processAccounts(json, result) {
    if(!AnyBalance.isAvailable('accounts'))
        return;

    var products = [];
    for(var i=0; i<json.data.length; ++i){
        var p = json.data[i];
        if(p.type == 'account')
            products.push(p);
    }

    AnyBalance.trace('Найдено счетов: ' + products.length);
	result.accounts = [];
	
	for(var i=0; i < products.length; ++i){
        var p = products[i];
		var id = p.id;
        var num = p.num;
		var title = p.title + ' ' + num.substr(-4);
		
		var c = {__id: id, __name: title, num: num};
		
		if(__shouldProcess('accounts', c)) {
			processAccount(p, c);
		}
		
		result.accounts.push(c);
	}
}

function processAccount(account, result){
    AnyBalance.trace('Обработка счета ' + result.__name);
	
    getParam(account.title, result, 'accounts.name');
    getParam(account.acc[0].available, result, 'accounts.balance', null, null, parseBalance);
    getParam(account.acc[0].currency, result, ['accounts.currency' , 'accounts.balance']);
    getParam(account.date_create, result, 'accounts.date_start', null, null, parseDate);

    if(AnyBalance.isAvailable('accounts.transactions', 'accounts.status', 'accounts.tariff')){
        var html = AnyBalance.requestGet(joinUrl(baseurl, account.link), g_headers);

        if(AnyBalance.isAvailable('accounts.status', 'accounts.tariff')){
            var details = getElement(html, /<table[^>]+prod-balance_var2[^>]*>/i, replaceHtmlEntities);
            getParam(details, result, 'accounts.status', /Состояние[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces); //Открыт
            getParam(details, result, 'accounts.tariff', /Тарифный план[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, [/Тарифный план\s*-/i, '', replaceTagsAndSpaces]); //Открыт
        }

        if(AnyBalance.isAvailable('accounts.transactions')) {
            processAccountTransactions(html, result);
        }
    }

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка карт
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(json, result) {
	if(!AnyBalance.isAvailable('cards'))
		return;

    var products = [];
    for(var i=0; i<json.data.length; ++i){
        var p = json.data[i];
        if(p.type == 'card')
            products.push(p);
    }

    AnyBalance.trace('Найдено карт: ' + products.length);
    result.cards = [];

    for(var i=0; i < products.length; ++i){
        var p = products[i];
        if(!p.acc)
            continue; //Это несозданная виртуальная карта, вероятно

        var id = p.id;
        var num = p.num;
        var title = p.title + ' ' + num.substr(-4);


        var c = {__id: id, __name: title, num: num};

        if(__shouldProcess('cards', c)) {
            processCard(p, c);
        }

        result.cards.push(c);
    }
}

function followDetailsLink(html, re){
    //Подробнее
    var href = getParam(html, null, null, re);
    if(!href)
        return;
    return followDetailsLinkStr(html, href);
}

function followDetailsLinkStr(html, href, options){
    var form = getElement(html, /<form[^>]+name="mainform"[^>]*>/i);
    var params = createFormParams(form);
    params.source = getParam(href, null, null, /source\s*:\s*'([^']*)/);
    var action = getParam(form, null, null, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities);
    var url = joinUrl(baseurl, action);

    html = AnyBalance.requestPost(url, params, g_headers, options);
    return html;
}


function processCard(card, result) {
    AnyBalance.trace('Обработка карты ' + result.__name);

    function parseMain(str){
        return /основная/i.test(str);
    }

    getParam(card.acc[0].available, result, 'cards.balance', null, null, parseBalance);
    getParam(card.acc[0].lock, result, 'cards.blocked', null, null, parseBalance);
    getParam(card.acc[0].own, result, 'cards.own', null, null, parseBalance);
    getParam(card.acc[0].currency, result, ['cards.currency', 'cards.balance', 'cards.blocked', 'cards.own']);

	getParam(card.enddate, result, 'cards.till', null, replaceTagsAndSpaces, parseDate);
    getParam(card.date_create, result, 'cards.date_start', null, replaceTagsAndSpaces, parseDate);
    getParam(card.tarif, result, 'cards.tariff');

    var url = joinUrl(baseurl, card.link);
    var html = AnyBalance.requestGet(url, g_headers)

    var finDetails = getElement(html, /<table[^>]+mb60[^>]*>/i, html_entity_decode);
    getParam(finDetails, result, 'cards.limit', /Лимит[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    if(AnyBalance.isAvailable('cards.transactions')) {
        processCardTransactions(html, result);
    }

    if(AnyBalance.isAvailable('cards.accnum', 'cards.main', 'cards.status', 'cards.contract', 'cards.excerpt')) {
        html = followDetailsLink(html, /<table[^>]+prod-balance_var2[\s\S]*?(<a[^>]+link_more[^>]*>)/i);
        var props = getElement(html, /<div[^>]+b-prod-props[^>]*>/i, replaceHtmlEntities);
        getParam(props, result, 'cards.accnum', /Номер счета в банке:([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);

        var details = getElement(html, /<table[^>]+prod-balance_var2[^>]*>/i, replaceHtmlEntities);
        getParam(details, result, 'cards.main', />\s*Тип[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseMain);
        getParam(details, result, 'cards.status', />\s*Статус[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces); //Активирована
        getParam(details, result, 'cards.contract', />\s*Договор[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, [/№/ig, '', replaceTagsAndSpaces]);
        getParam(details, result, 'cards.gracepay', /Сумма для реализации Льготного периода[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(details, result, 'cards.gracepay_till', /Дата окончания Льготного периода[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);

        //Счета-выписки по карте
        if(AnyBalance.isAvailable('cards.excerpt')) {
            processCardExerpt(html, result);
        }
    }

}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка депозитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processDeposits(json, result) {
    if(!AnyBalance.isAvailable('deposits'))
        return;

    var products = [];
    for(var i=0; i<json.data.length; ++i){
        var p = json.data[i];
        if(p.type == 'deposit')
            products.push(p);
    }

    AnyBalance.trace('Найдено депозитов: ' + products.length);
    result.deposits = [];

    for(var i=0; i < products.length; ++i){
        var p = products[i];

        var id = p.id;

        var url = joinUrl(baseurl, p.link);
        AnyBalance.trace('Детали по депозиту находятся по ссылке ' + url);
        var html = AnyBalance.requestGet(url, g_headers);

        var detailsTable = AB.getElement(html, /<table[^>]+prod-balance_var2[^>]*>/, replaceHtmlEntities);

        var num = getParam(detailsTable, null, null, /Номер депозитного счета[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
        var contract = getParam(detailsTable, null, null, /Номер договора[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
        var title = p.title + ' ' + num.substr(-4);

        var c = {__id: id, __name: title, num: num, contract: contract};

        if(__shouldProcess('deposits', c)) {
            processDeposit(p, c, html);
        }

        result.deposits.push(c);
    }
}

function processDeposit(dep, result, html) {
    AnyBalance.trace('Обработка депозита ' + result.__name);

    getParam(dep.acc[0].available, result, 'deposits.balance', null, null, parseBalance);
    getParam(dep.acc[0].currency, result, ['deposits.currency' , 'deposits.balance']);
    getParam(dep.date_create, result, 'deposits.date_start', null, null, parseDate);
    getParam(dep.end, result, 'deposits.till', null, null, parseDate);
    getParam(dep.rate, result, 'deposits.pct', null, null, parseBalance);
    getParam(dep.title, result, 'deposits.name');

    var detailsTable = AB.getElement(html, /<table[^>]+prod-balance_var2[^>]*>/, replaceHtmlEntities);
    getParam(detailsTable, result, 'deposits.prolong', /Автоматическое возобновление[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBool);
    getParam(detailsTable, result, 'deposits.prolong_times', /Количество свершившихся автоматических возобновлений[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка кредитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCredits(json, result) {
	if(!AnyBalance.isAvailable('credits'))
		return;

    var products = [];
    for(var i=0; i<json.data.length; ++i){
        var p = json.data[i];
        if(p.type == 'loan')
            products.push(p);
    }

    AnyBalance.trace('Найдено кредитов: ' + products.length);
    result.credits = [];

    for(var i=0; i < products.length; ++i){
        var p = products[i];
        var id = p.id;
        var num = p.num;
        var title = p.title + ' ' + num.substr(-4);

        var c = {__id: id, __name: title, num: num};

        if(__shouldProcess('credits', c)) {
            processCredit(p, c);
        }

        result.credits.push(c);
    }
}

function parseBool(str){
    return /включено/i.test(str);
}

function processCredit(credit, result){
    AnyBalance.trace('Обработка кредита ' + result.__name);

	getParam(credit.loan.amount, result, 'credits.limit', null, replaceTagsAndSpacesAndBalances, parseBalance);
}

function processInfo(html, result){
    if(!AnyBalance.isAvailable('info'))
        return;

    html = AnyBalance.requestGet(baseurl + 'rs/settings/Settings.jspx', g_headers);
    var info = result.info = {};
    getParam(html, info, 'info.fio', /&#1048;&#1084;&#1103; ([^<]*)/i, replaceTagsAndSpaces);
    getParam(html, info, 'info.login', /<input[^>]+name="mainform:login"[^>]*value="([^"]*)/i, replaceHtmlEntities);
    getParam(html, info, 'info.email', /<input[^>]+name="mainform:email"[^>]*value="([^"]*)/i, replaceHtmlEntities);
}
