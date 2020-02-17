/**
 Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
 */

var g_baseurl = 'https://click.alfabank.ru';

var g_headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'ru,en-US;q=0.8,en;q=0.6',
    'Connection': 'keep-alive',
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2272.118 Safari/537.36'
//	'Origin': null, //Падает пейстор на этом
//	'Cookie2': '$Version=1'
};

var g_some_action = '<m xmlns="http://oracle.com/richClient/comm"><k v="type"><s>action</s></k></m>';
var g_mainHtml;
var g_csrfToken;
var g_pageID;

function login(options) {
    AnyBalance.setOptions({cookiePolicy: 'rfc2109'});
    AnyBalance.setDefaultCharset('utf-8');

    var prefs = AnyBalance.getPreferences();

    if(!g_mainHtml) {
        checkEmpty(prefs.login, 'Введите логин!');
        checkEmpty(prefs.password, 'Введите пароль!');

        return processClick(options);
    }else{
        return g_mainHtml;
    }
}

var g_mainHtmlIs20;
function isClick20() {
    if(!isset(g_mainHtmlIs20))
        g_mainHtmlIs20 = /\(C2skin\)/.test(g_mainHtml);
    return g_mainHtmlIs20;
}

function processClick(options) {
    var prefs = AnyBalance.getPreferences();

    var html = AnyBalance.requestGet(g_baseurl + '/ALFAIBSR/', g_headers);

    var state = getJsonObject(html, /window.initialState\s*=/);
    var requestId = state.passport.authorization.requestId;

/*    html = AnyBalance.requestPost(g_baseurl + '/AlfaSign/security', {
        username: prefs.login,
        password: prefs.password,
        request_id: state.passport.authorization.requestId
    }, g_headers);
*/
    html = AnyBalance.requestPost(g_baseurl + '/oam/server/auth_cred_submit', {
        username: prefs.login,
        password: prefs.password,
        request_id: requestId
    }, g_headers);

    if(/<input[^>]+otp_param/i.test(html)){
    	AnyBalance.trace('Затребован одноразовый пароль');
    	var form = getElement(html, /<form[^>]+approve-login/i);
    	if(!form){
    		AnyBalance.trace(html);
    		throw new AnyBalance.Error('Не удалось получить форму ввода одноразового пароля. Сайт изменен?');
    	}

		var params = AB.createFormParams(form, function(params, str, name, value) {
			if (name == 'otp_param')
				return AnyBalance.retrieveCode('Введите код подтверждения входа из СМС', null, {inputType: 'number'});
			return value;
		});

		html = AnyBalance.requestPost(g_baseurl + '/oam/server/auth_cred_submit', params, g_headers);
    }

    if (!/"_afrLoop",\s*"(\d+)"/i.test(html)) {
        //Мы остались на странице входа. какая-то ошибка
        var error = getElement(html, /<div[^>]+class="[^"]*\b(?:red|notification__message)\b/i, replaceTagsAndSpaces);
        if (error)
            throw new AnyBalance.Error(error, null, /парол/i.test(error));
        error = getParam(html, null, null, /(Неверный логин или пароль)/i);
        if (error)
            throw new AnyBalance.Error(error, null, true);

        var error_code = getParam(AnyBalance.getLastUrl(), null, null, /p_error_code=([^&]*)/i, null, decodeURIComponent);
        if (error_code) {
            var jsons = AnyBalance.requestGet(g_baseurl + '/SLAlfaSignFront10/errors?code=' + error_code + '&type=' + getParam(error_code, null, null, /[^\-]*/), g_headers);
            var json = getJson(jsons);
            if (json.result != 'SUCCESS') {
                AnyBalance.trace('Не удалось получить ошибку: ' + jsons);
            } else {
                error = json.payload[error_code];
            }
            if (error)
                throw new AnyBalance.Error(error, null, /логин или пароль/i.test(error));
        }

        AnyBalance.trace(html);
        throw new AnyBalance.Error("Не удалось зайти в интернет-банк. Сайт изменен?");
    }

    html = clickGoToUrl(html, {isHtml: true, sessionRequired: true});
    var lastUrl = AnyBalance.getLastUrl();

    if (/faces\/main\/changePassword|faces\/routeChangePwd\/changePassword/i.test(html)) {
        throw new AnyBalance.Error("Вам необходимо сменить старый пароль. Зайдите в Альфа-Клик через браузер, поменяйте пароль, затем введите новый пароль в настройки провайдера.", null, true);
    }

    if(!/images\/close.png/i.test(html) //Click 2.0
    	 && !/&#1042;&#1099;&#1093;&#1086;&#1076;/i.test(html) //Click 1.0
    	 ){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в Альфа-Клик. Сайт изменен?');
    }

    g_mainHtml = html;

    if (isClick20()) {  //Альфаклик 2.0
        AnyBalance.trace("Определен Альфа-Клик 2.0");

        turnOffLoginOtp(); //Поскольку альфа-клик самостоятельно включает эту опцию почему-то, приходится её отключать каждый раз
    } else {
        AnyBalance.trace("Определен Альфа-Клик 1.0");
        if(!options || !options.allowClick10)
            throw new AnyBalance.Error('К сожалению, Альфа-Клик 1.0 не поддерживается. Зайдите в Альфа-Клик через браузер и переключите ваш Альфа-Клик на версию 2.0');
    }

    __setLoginSuccessful();

    return html;
}

function clickGoToUrl(urlOrHtml, options){
    if(!options)
        options = {};

    var html = options.isHtml ? urlOrHtml : AnyBalance.requestGet(urlOrHtml, g_headers);

    var afr = getParam(html, null, null, /"_afrLoop",\s*"(\d+)"/i);
    if (!afr)
        throw new AnyBalance.Error('Не удаётся найти параметр для входа: _afrLoop. Сайт изменен?');

    var sess = getParam(html, null, null, /var\s+sess\s*=\s*"([^"]*)/i, replaceSlashes);
    if (options.sessionRequired && !sess)
        throw new AnyBalance.Error('Не удаётся найти параметр для входа: sess. Сайт изменен?');

    html = AnyBalance.requestGet(g_baseurl + '/ALFAIBSR/' + sess + '?_afrLoop=' + afr + '&_afrWindowMode=0&_afrWindowId=null', g_headers);
    var ct = getParam(html, null, null, /<div[^>]+id="ct"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
    AnyBalance.trace('CSRF token found: ' + ct);
    g_csrfToken = ct;

    var url = getParam(html, null, null, /location\.href\s*=\s*'(\/ALFA[^']*)/, replaceSlashes);

    html = AnyBalance.requestGet(g_baseurl + url, g_headers);

    afr = getParam(html, null, null, /"_afrLoop",\s*"(\d+)"/i);
    if (!afr)
        throw new AnyBalance.Error('Не удаётся найти очередной параметр для входа: _afrLoop. Сайт изменен?');

    html = AnyBalance.requestGet(g_baseurl + url + '&_afrLoop=' + afr + '&_afrWindowMode=0&_afrWindowId=null', g_headers);
    return html;
}

function paramToCookie(name) {
	var url = AnyBalance.getLastUrl();
    var param = url.match(new RegExp('[?&]' + name + '=([^&]*)'));
    if (param && param.length > 1) {
    	AnyBalance.setCookie(g_baseurl.replace(/https?:\/\//i, ''), name, param[1], {path: '/ALFAIBSR'}); 
    }
}

function clickFollowUrl(url){
	var maxCounter = 5;
	while(--maxCounter){
		var html = AnyBalance.requestGet(url, g_headers);

        var afr = getParam(html, null, null, /"_afrLoop",\s*"(\d+)"/i);
        if (!afr)
            break;
        
        url = AnyBalance.getLastUrl();
        
        html = AnyBalance.requestGet(url + '&_afrLoop=' + afr + '&_afrWindowMode=0&_afrWindowId=null', g_headers);

        //Проверим, нет ли нового токена
    	var ct = getParam(html, null, null, /<div[^>]+id="ct"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
    	if(ct){
    		AnyBalance.trace('CSRF token found: ' + ct);
    		g_csrfToken = ct;
    	}

    	//Проверим, не надо ли какой параметр загнать в куки
    	var cookies = sumParam(html, null, null, /paramToCookie\s*\(\s*['"]([^'"]*)/ig);
    	for(var i=0; i<cookies.length; ++i){
    		paramToCookie(cookies[i]);
    	}
        
        //Проверим, не надо ли дополнительной переадресации
        url = getParam(html, null, null, /location\.href\s*=\s*'(\/ALFA[^']*)/, replaceSlashes);
        if(!url)
        	break;

        url = g_baseurl + url;

    }

    if(maxCounter == 0){
    	AnyBalance.trace('Не удалось перейти на ссылку: ' + html);
    	throw new AnyBalance.Error('Не удалось перейти на ссылку');
    }

    return html;
}


function processCards2(html, result) {
    if (!AnyBalance.isAvailable('cards'))
        return;

    AnyBalance.trace('Получаем информацию о картах');

    html = getMainPageOrModule2(html, 'card');

    var rows = getElements(html, /<table[^>]+card-list/ig);
    
    if (!rows.length) {
        if (/Удобство пластиковых карт:/i.test(html)) {
            AnyBalance.trace('Нет ни одной карты');
        } else {
            AnyBalance.trace('Не удалось найти карты\n' + html);
            return;
        }
    }

    result.cards = [];

    AnyBalance.trace('Найдено карт: ' + rows.length);
    for (var i = 0; i < rows.length; ++i) {
        var row = rows[i];
        //ID - 4 последние цифры карты
        var id = getParam(row, /\*{4}([\s\S]*?)<\/a>/i, replaceTagsAndSpaces);
        var name = getParam(row, /<a[^>]+style="[^"]*display:\s*inline;[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces);

        var c = {
            __id: id, 
            __name: name + ' (' + id + ')'
        };

        if (__shouldProcess('cards', c)) {
            processCard2(html, row, c);
        }

        result.cards.push(c);
    }
}

function processCard2(html, row, result) {
    var event = getParam(row, /\*{4}[\s\S]*?<a[^>]+id="([^"]*)/i, replaceHtmlEntities);
    html = getNextPage(html, event, [
        ['event', '%EVENT%'],
        ['event.%EVENT%', g_some_action],
        ['oracle.adf.view.rich.PPR_FORCED', 'true']
    ]);

    //Баланс счета
    getParam(html, result, 'cards.balance', /&#1041;&#1072;&#1083;&#1072;&#1085;&#1089; &#1089;&#1095;&#(?:1077|1105);&#1090;&#1072;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, ['cards.currency', 'cards.balance', 'cards.topay', 'cards.debt', 'cards.minpay', 'cards.penalty', 'cards.late', 'cards.overdraft', 'cards.limit'],
        /&#1041;&#1072;&#1083;&#1072;&#1085;&#1089; &#1089;&#1095;&#(?:1077|1105);&#1090;&#1072;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
    //Срок действия
    getParam(html, result, 'cards.till', /&#1057;&#1088;&#1086;&#1082; &#1076;&#1077;&#1081;&#1089;&#1090;&#1074;&#1080;&#1103;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    //Номер
    getParam(html, result, 'cards.num', /&#1053;&#1086;&#1084;&#1077;&#1088;<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    //Тип
    getParam(html, result, ['cards.type', 'cards.credit'], /&#1058;&#1080;&#1087;<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    if(AnyBalance.isAvailable('cards.credit'))
        result.credit = /кредитн/i.test('' + result.type);
    //Название счета
    getParam(html, result, 'cards.acctype', /&#1053;&#1072;&#1079;&#1074;&#1072;&#1085;&#1080;; &#1089;&#1095;&#(?:1077|1105);&#1090;&#1072;<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    //Рады вас видеть
    getParam(html, result, 'cards.holder', /&#1056;&#1072;&#1076;&#1099; &#1042;&#1072;&#1089; &#1074;&#1080;&#1076;&#1077;&#1090;&#1100;,([^<(]*)/i, replaceTagsAndSpaces);
    //Статус
    getParam(html, result, 'cards.status', /&#1057;&#1090;&#1072;&#1090;&#1091;&#1089;<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    //Номер счета
    getParam(html, result, 'cards.accnum', /&#1053;&#1086;&#1084;&#1077;&#1088; &#1089;&#1095;&#(?:1077|1105);&#1090;&#1072;<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

    if (AnyBalance.isAvailable('cards.transactions')) {
        processCardTransactions(html, result);
    }
}

function processAccounts2(html, result) {
    if (!AnyBalance.isAvailable('accounts'))
        return;

    AnyBalance.trace('Получаем информацию о счетах');

    html = getMainPageOrModule2(html, 'acc');

    var rows = getElements(html, /<table[^>]+class="accounts_table"[^>]*>/ig);
    if (!rows.length) {
        AnyBalance.trace(html);
        AnyBalance.trace('Не удалось найти ни одного счета');
        return;
    }
    AnyBalance.trace('Найдено счетов: ' + rows.length);

    result.accounts = [];

    for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        var id = getParam(row, null, null, /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
        var name = getParam(row, null, null, /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

        var a = {
            __id: id,
            __name: name + ' (' + id.substr(-4) + ')'
        };

        if (__shouldProcess('accounts', a)) {
            processAccount2(html, row, a);
        }

        result.accounts.push(a);
    }
}

function n2(n) {
    return n < 10 ? '0' + n : '' + n;
}

function processAccount2(html, row, result) {
    var tds = getElements(row, /<td[^>]*>/ig);
    getParam(tds[4], result, ['accounts.currency', 'accounts.balance'], null, replaceTagsAndSpaces);
    getParam(tds[3], result, 'accounts.balance', null, replaceTagsAndSpaces, parseBalance);
    getParam(tds[0], result, 'accounts.type', null, replaceTagsAndSpaces);
    getParam(tds[1], result, 'accounts.num', null, replaceTagsAndSpaces);

    if (AnyBalance.isAvailable('accounts.date_start', 'accounts.transactions', 'accounts.own', 'accounts.limit', 'accounts.blocked')) {
        var event = getParam(tds[0], null, null, /<a[^>]+id="([^"]*)/i, replaceTagsAndSpaces);
        html = getNextPage(html, event, [
            ['event', '%EVENT%'],
            ['event.%EVENT%', g_some_action],
            ['oracle.adf.view.rich.PPR_FORCED', 'true']
        ]);

        //Текущий баланс
        getParam(html, result, 'accounts.own', /&#1058;&#1077;&#1082;&#1091;&#1097;&#1080;&#1081; &#1073;&#1072;&#1083;&#1072;&#1085;&#1089;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        //Овердрафт
        getParam(html, result, 'accounts.limit', /&#1054;&#1074;&#1077;&#1088;&#1076;&#1088;&#1072;&#1092;&#1090;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        //Дата открытия счета
        getParam(html, result, 'accounts.date_start', /&#1044;&#1072;&#1090;&#1072; &#1086;&#1090;&#1082;&#1088;&#1099;&#1090;&#1080;&#1103; &#1089;&#1095;&#1105;&#1090;&#1072;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
        //Заблокировано средств
        getParam(html, result, 'accounts.blocked', /&#1047;&#1072;&#1073;&#1083;&#1086;&#1082;&#1080;&#1088;&#1086;&#1074;&#1072;&#1085;&#1086; &#1089;&#1088;&#1077;&#1076;&#1089;&#1090;&#1074;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

        if (AnyBalance.isAvailable('accounts.transactions')) {
            processAccountTransactions(html, result);
        }
    }
}

function createParams(params, event) {
    var ret = {};
    for (var i = 0; i < params.length; ++i) {
        if (!params[i]) continue;
        ret[params[i][0].replace(/%EVENT%/g, event)] = params[i][1].replace(/%EVENT%/g, event);
    }
    return ret;
}

function getMainPageOrModule2(html, type) {
    var commands = {
        card: 'pt1:menu:ATP2_r1:0:i1:1:cl2',
        acc: 'pt1:menu:ATP2_r1:0:i1:0:cl2',
        dep: 'pt1:menu:ATP2_r1:0:i1:3:cl2',
        crd: 'pt1:menu:ATP2_r1:0:i1:2:cl2',
        providers: 'pt1:menu:ATP2_r1:0:i1:6:cl2'
    };

    var event = commands[type] ? commands[type] : type;

    return getNextPage(html, event, [
        ['oracle.adf.view.rich.RENDER', 'pt1:menu:ATP2_r1'],
        ['oracle.adf.view.rich.DELTAS', '{pt1:menu:ATP2_r1:0:i1:3:p1={_shown=}}'],
        ['event', '%EVENT%'],
        ['event.%EVENT%', g_some_action],
        ['oracle.adf.view.rich.PROCESS', 'pt1:menu:ATP2_r1']
    ]);
}

function parseScriptTag(str) {
    var cdata = getParam(str, null, null, /^\s*<!\[CDATA\[([\s\S]*)?\]\]>\s*$/i);
    if (cdata)
        return cdata;
    return html_entity_decode(str);
}

function getNextPage(html, event, extra_params, options) {
    var form = getParam(html, null, null, /<form[^>]*name="f1"[^>]*>([\s\S]*?)<\/form>/i);
    var action = getParam(html, null, null, /<form[^>]*name="f1"[^>]*action="(\/ALFAIBSR[^"]*)/i, replaceHtmlEntities);
    if (!action)
        throw new AnyBalance.Error('Не удаётся найти форму ввода команды. Сайт изменен?');

    if (!options)
        options = {};

    var params = createFormParams(form, function (params, str, name, value) {
        if (/::input$/.test(name))
            return; //Ненужные поля
        if (options.paramsFunc)
            value = (options.paramsFunc)(params, str, name, value);
        return value;
    }, true);
    var paramsModule = createParams(joinArrays(params, extra_params), event);

    var newhtml = AnyBalance.requestPost(g_baseurl + action, paramsModule, addHeaders(options.headers || {
            "Adf-Ads-Page-Id": g_pageID,
            "Adf-Rich-Message": "true",
            "Csrf-Token": g_csrfToken
        }), {options: options.requestOptions});
    if (!/<\?Adf-Rich-Response-Type\s*\?>/i.test(newhtml))
        return newhtml; //Не рич ответ, возвращаем, как есть

    var scripts;
    if (options.withScripts) {
        var join_n = create_aggregate_join('\n');
        scripts = sumParam(newhtml, null, null, /<script>([\s\S]*?)<\/script>/ig, null, parseScriptTag, join_n); //Получаем скрипты
    }

    var fragments = sumParam(newhtml, null, null, /<fragment>\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/fragment>/ig); //Получаем фрагменты

    for (var i = 0; i < fragments.length; i++) {
        var fragment = fragments[i];
        var id = getParam(fragment, null, null, /^\s*<[^>]+[\s"]id="([^"]*)/i, replaceHtmlEntities);
        if (id == 'afr::DocWrapper') {
            html = fragment;
            break; //У нас полная замена страницы
        }
        var elemToReplace = getElement(html, new RegExp('<\\w+[^>]*[\\s"]id="' + id + '"[^>]*>', 'i'));
        html = html.replace(elemToReplace, fragment);
    }

    if(/<div[^>]+id="pt1:menu:ATP2_r1"[^>]*>/i.test(html)) //Есть главное меню
        g_mainHtml = html;

    var pageId = getParam(newhtml, null, null, /AdfPage.PAGE._setPageId\('([^']*)/i, replaceSlashes);
    if(isset(pageId))
        g_pageID = pageId;

    return options.withScripts ? {html: html, scripts: scripts} : html;
}

function processCredits2(html, result) {
    if (!AnyBalance.isAvailable('credits'))
        return;

    AnyBalance.trace('Получаем информацию о кредитах');

    html = getMainPageOrModule2(html, 'crd');

    var creditTitles = getElements(html, /<a[^>]+id="[^"]*::disAcr"[^>]*>/ig);
    if (!creditTitles) {
        AnyBalance.trace('Не удаётся найти ни одного кредита!');
        return;
    }

    AnyBalance.trace('Кредитов в системе: ' + creditTitles.length);
    result.credits = [];

    for (var j = 0; j < creditTitles.length; ++j) {
        var crdhtml = html;
        if (j > 0) {
            AnyBalance.trace('Запрос кредита №' + (j + 1));
            var event = getParam(creditTitles[j], null, null, /<a[^>]+id="([^"]*)::disAcr"/i, replaceHtmlEntities);
            crdhtml = getNextPage(html, event, [
                ['event', '%EVENT%'],
                ['event.%EVENT%', '<m xmlns="http://oracle.com/richClient/comm"><k v="expand"><b>1</b></k><k v="type"><s>disclosure</s></k></m>'],
                ['oracle.adf.view.rich.PROCESS', 'pt1:r12:0:pt2']
            ]);
        }

        //Подробная информация
        event = getParam(crdhtml, null, null, /<a[^>]+id="([^"]*)"[^>]*>&#1055;&#1086;&#1076;&#1088;&#1086;&#1073;&#1085;&#1072;&#1103; &#1080;&#1085;&#1092;&#1086;&#1088;&#1084;&#1072;&#1094;&#1080;&#1103;/i);
        if (!event) {
            AnyBalance.trace(crdhtml);
            throw new AnyBalance.Error('Не удаётся найти ссылку на подробную информацию о кредите!', {investigate: true});
        }

        AnyBalance.trace('Запрос данных по кредиту №' + (j + 1));
        crdhtml = getNextPage(crdhtml, event, [
            ['event', '%EVENT%'],
            ['event.%EVENT%', g_some_action],
            ['oracle.adf.view.rich.PPR_FORCED', 'true']
        ]);

        var id = getParam(crdhtml, null, null, /\d{20}/i);
        var name = getParam(creditTitles[j], null, null, null, replaceTagsAndSpaces);
        var crd = {
            __id: id,
            __name: name
        };

        if (__shouldProcess('credits', crd)) {
            processCredit2(crdhtml, crd);
        }

        result.credits.push(crd);
    }
}

//получаем ближайшую дату платежа из 10-е число.
function parseNDay(str){
	var d = getParam(str, null, null, /(\d+)[^<]*число/i, null, parseBalance);
 	if(!isset(d))
 		return;
    
     var dt = new Date();
     var dtNew = new Date(dt.getFullYear(), dt.getMonth() + (dt.getDate() > d ? 1 : 0), d);
     AnyBalance.trace('Parsed date ' + dtNew + ' from ' + str);
     return dtNew.getTime();
}

function processCredit2(html, result) {
    var params = getElements(html, /<table[^>]+pglCreditDetails(?:Label)?List[^>]*/ig);
    var wasMinpay = false;
    for (var i = 0; i < params.length; i++) {
        var param = params[i];
        var tds = getElements(param, /<td[^>]*>/ig);
        if (tds.length < 2)
            continue; //Неправильная опция
        var name = getParam(tds[tds.length - 2], null, null, null, replaceTagsAndSpaces);
        var value = getParam(tds[tds.length - 1], null, null, null, replaceTagsAndSpaces);

        if (/Для полного погашения|Доступно для трат/i.test(name)) {
            getParam(value, result, 'credits.balance', null, null, parseBalance);
            getParam(value, result, ['credits.currency', 'credits.balance'], null, null, parseCurrency);
        } else if (/Собственных средств/i.test(name)) {
            getParam(value, result, 'credits.own', null, null, parseBalance);
        } else if (/Задолженность|Остаток задолженности|Для полного погашения/i.test(name)) {
            getParam(value, result, 'credits.debt', null, null, parseBalance);
        } else if (/сумма основного долга/i.test(name) && !wasMinpay) {
            getParam(value, result, 'credits.debt_main', null, null, parseBalance);
        } else if (/сумма начисленных процентов/i.test(name) && !wasMinpay) {
            getParam(value, result, 'credits.debt_pct', null, null, parseBalance);
        } else if (/Процентная ставка/i.test(name)) {
            getParam(value, result, 'credits.pct', null, null, parseBalance);
        } else if (/Установленный лимит|Начальная сумма кредита/i.test(name)) {
            getParam(value, result, 'credits.limit', null, null, parseBalance);
        } else if (/Неподтверждённые операции/i.test(name)) {
            getParam(value, result, 'credits.blocked', null, null, parseBalance);
        } else if (/Льготный период/i.test(name)) {
            getParam(value, result, 'credits.gracepay', null, null, parseBalance);
        } else if (/Дата начала льготного периода/i.test(name)) {
            getParam(value, result, 'credits.grace_start', null, null, parseDateWord);
        } else if (/Дата окончания льготного периода/i.test(name)) {
            getParam(value, result, 'credits.gracepay_till', null, null, parseDateWord);
        } else if (/дата платежа|Оплатить до/i.test(name)) {
            getParam(value, result, 'credits.pay_till', null, null, parseDateWord);
        } else if (/Ближайший плат[её]ж|Минимальный плат[её]ж|Ежемесячный плат[её]ж/i.test(name)) {
        	wasMinpay = true;
            getParam(value, result, ['credits.minpay', 'credits.minpay_left'], null, null, parseBalance);
        } else if ('основной долг' == name && wasMinpay) {
            getParam(value, result, 'credits.minpay_main', null, null, parseBalance);
        } else if ('проценты' == name && wasMinpay) {
            getParam(value, result, 'credits.minpay_pct', null, null, parseBalance);
        } else if (/Дата выдачи/i.test(name)) {
            getParam(value, result, 'credits.date_start', null, null, parseDateWord);
        } else if (/Срок кредита/i.test(name)) {
            getParam(value, result, 'credits.period');
        } else if (/День платежа/i.test(name)) {
            getParam(value, result, 'credits.payment_day');
            getParam(value, result, 'credits.minpay_till', null, null, parseNDay);
        } else if (/Уже внесено/i.test(name)) {
            getParam(value, result, ['credits.minpay_paid', 'credits.minpay_left'], null, null, parseBalance);
        } else {
            AnyBalance.trace('Неизвестный параметр: ' + name + ': ' + value + '\n' + param);
        }
    }

    getParam(html, result, 'credits.minpay_left', /<span[^>]+ACCreditsLargeHeaderFont[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);

    if (AnyBalance.isAvailable('credits.transactions')) {
        processCreditTransactions(html, result);
    }
}

function processInfo2(html, result) {
    if (AnyBalance.isAvailable('info')) {
        AnyBalance.trace('Получаем информацию о пользователе');

        result = result.info = {};
        getParam(html, result, 'info.mphone', /<div[^>]*>([^<]*)<div[^>]+id="[^"]*mymobilePopup/i, replaceTagsAndSpaces);

        var baseurl = 'https://settings.alfabank.ru/';

        html = clickFollowUrl(baseurl + 'settings/profile');
        
        var info = getJsonObject(html, /window.initialState\s*=\s*JSON.parse\s*\(\s*'/);
        if(!info){
        	AnyBalance.trace('Не удалось получить json с именем: ' + html);
        	throw new AnyBalance.Error('Не удалось получить json с именем, сайт изменен?');
        }

        var join_space = create_aggregate_join(' '), replaceValue = [/<input[^>]+value="([^"]*)".*/i, '$1', replaceHtmlEntities, /<input.*/i, ''];

        sumParam(jspath1(info, '$.profileInfo.customer.lastName'), result, 'info.fio', null, null, null, join_space);
        sumParam(jspath1(info, '$.profileInfo.customer.firstName'), result, 'info.fio', null, null, null, join_space);
        sumParam(jspath1(info, '$.profileInfo.customer.middleName'), result, 'info.fio', null, null, null, join_space);

        getParam(jspath1(info, '$.profileInfo.customer.email'), result, 'info.email');

        if(AnyBalance.isAvailable('info.mphone', 'info.rphone', 'info.wphone', 'info.hphone', 'info.login', 'info.login2', 'info.check', 'info.mobile')){
            html = AnyBalance.requestGet(baseurl + 'settings/api/load?_=' + new Date().getTime(), g_headers);
            info = getJson(html);
            
            getParam(jspath1(info, '$[*].contacts.clickPhone'), result, 'info.mphone');
            getParam(jspath1(info, '$[*].contacts.registrationPhone'), result, 'info.rphone');
            getParam(jspath1(info, '$[*].contacts.workPhone'), result, 'info.wphone');
            getParam(jspath1(info, '$[*].contacts.homePhone'), result, 'info.hphone');
            
            getParam(jspath1(info, '$[*].channels[?(@.id=="C2")].login'), result, 'info.login');
            getParam(jspath1(info, '$[*].channels[?(@.id=="C2")].alternativeLogin'), result, 'info.login2');
            
            //Услуга «Альфа-Чек» подключена к следующим картам:
            var cards = jspath(info, '$[*].cards[?(@.alfaCheck.enabled==true)]');
            
            if (cards && AnyBalance.isAvailable('info.check')) {
                var cs = [];
                for (var i = 0; i < cards.length; i++) {
                    var row = cards[i];
                    var c = {};
                    getParam(jspath1(row, '$.maskedNumber'), c, 'info.check.card');
                    getParam(jspath1(row, '$.alfaCheck.phone'), c, 'info.check.phone');
                    cs.push(c);
                }
                result.check = cs;
            }
            
            //Услуга «Альфа-Мобайл ... подключена
            getParam(!jspath1(info, '$[*].channels[?(@.id=="M2")].isBlocked'), result, 'info.mobile');
        }
    }
}


function processDeposits2(html, result) {
    if (!AnyBalance.isAvailable('deposits'))
        return;

    AnyBalance.trace('Получаем информацию о депозитах');

    html = getMainPageOrModule2(html, 'dep');

    var rows = sumParam(html, null, null, /<table[^>]+(?:[\s\S](?!<\/?table))*?>\d{20}<[\s\S]*?<\/table>/ig);
    if (!rows.length) {
        if (/Депозиты в банке, как и накопительные/i.test(html))
            AnyBalance.trace('Нет ни одного депозита');
        else {
            AnyBalance.trace('Не удалось найти депозиты: ' + html);
            return;
        }
    }

    AnyBalance.trace('Найдено депозитов: ' + rows.length);

    result.deposits = [];

    for (var i = 0; i < rows.length; i++) {
        var row = rows[i];

        var name = getParam(row, null, null, /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
        var id = getParam(row, null, null, /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
        var currency = getParam(row, null, null, /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);

        var d = {
            __id: id,
            __name: name + ' ' + currency + ' (' + id.substr(-4) + ')'
        };

        if(!currency){
            AnyBalance.trace('Не удалось получить баланс и валюту для депозита ' + d.__name + ': ' + row);
        }

        if (__shouldProcess('deposits', d)) {
            processDeposit2(html, row, d);
        }

        result.deposits.push(d);
    }
}

function parseBool(str) {
    if (/Не предусмотрена/i.test(str))
        return false;
    return /Да/i.test(str);
}

function processDeposit2(html, row, result) {
    AnyBalance.trace('Получаем депозит ' + result.__name);

    getParam(row, result, 'deposits.acctype', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(row, result, 'deposits.accnum', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(row, result, 'deposits.balance', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(row, result, 'deposits.currency', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
    getParam(row, result, 'deposits.till', />\s*&#1044;&#1086; (\d+[^>]*<)/i, replaceTagsAndSpaces, parseDateWord);

    if (AnyBalance.isAvailable('deposits.expressnum', 'deposits.balance_start', 'deposits.pct_sum', 'deposits.date_start',
            'deposits.period', 'deposits.pct', 'deposits.pct_cap', 'deposits.topup', 'deposits.topup_till', 'deposits.topup_min',
            'deposits.withdraw', 'deposits.balance_min', 'deposits.pct_conditions', 'deposits.prolongate')) {
        //Детали депозита
        var event = getParam(row, null, null, /<a[^>]+id="([^"]*)"[^>]*p_AFTextOnly/i, replaceHtmlEntities);
        html = getNextPage(html, event, [
            ['event', '%EVENT%'],
            ['event.%EVENT%', g_some_action],
            ['oracle.adf.view.rich.PPR_FORCED', 'true']
        ]);

        var params = getElements(html, /<tr[^>]+id="pt\d+:plam\d+[^>]*>/ig);
        for (var i = 0; i < params.length; i++) {
            var param = params[i];
            var name = getParam(param, null, null, /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
            var value = getParam(param, null, null, /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

            if (/Экспресс-счёт/i.test(name)) {
                getParam(value, result, 'deposits.expressnum');
            } else if (/Сумма на дату открытия/i.test(name)) {
                getParam(value, result, 'deposits.balance_start', null, null, parseBalance);
            } else if (/Сумма выплаченных процентов/i.test(name)) {
                getParam(value, result, 'deposits.pct_sum', null, null, parseBalance);
            } else if (/Дата открытия/i.test(name)) {
                getParam(value, result, 'deposits.date_start', null, null, parseDateWord);
            } else if (/Срок депозита/i.test(name)) {
                getParam(value, result, 'deposits.period', null, null, parseBalance);
            } else if (/Процентная ставка$/i.test(name)) {
                getParam(value, result, 'deposits.pct', null, null, parseBalance);
            } else if (/Процентная ставка с учетом капитализации/i.test(name)) {
                getParam(value, result, 'deposits.pct_cap', null, null, parseBalance);
            } else if (/Возможность пополнения/i.test(name)) {
                getParam(value, result, 'deposits.topup', null, null, parseBool);
            } else if (/Крайний срок пополнения/i.test(name)) {
                getParam(value, result, 'deposits.topup_till', null, null, parseDateWord);
            } else if (/Минимальная сумма пополнения/i.test(name)) {
                getParam(value, result, 'deposits.topup_min', null, null, parseBalance);
            } else if (/Возможность частичного снятия/i.test(name)) {
                getParam(value, result, 'deposits.withdraw', null, null, parseBool);
            } else if (/Сумма неснижаемого остатка/i.test(name)) {
                getParam(value, result, 'deposits.balance_min', null, null, parseBalance);
            } else if (/Условие начисления процентов/i.test(name)) {
                getParam(value, result, 'deposits.pct_conditions');
            } else if (/Автоматическая пролонгация/i.test(name)) {
                getParam(value, result, 'deposits.prolongate', null, null, parseBool);
            } else if (/Текущий баланс|Депозитный счёт|Дата окончания/i.test(name)) {
                //continue; //Уже обработано
            } else {
                AnyBalance.trace('Неизвестный параметр ' + name + ': ' + value + '\n' + param);
            }
        }
    }

    if (AnyBalance.isAvailable('deposits.transactions')) {
        processDepositTransactions(html, result);
    }
}

function turnOffLoginOtp(){
	try{
		var html = AnyBalance.requestGet("https://settings.alfabank.ru/settings/logins-passwords", g_headers);
		var referer = AnyBalance.getLastUrl();
		html = AnyBalance.requestGet("https://settings.alfabank.ru/settings/api/load?_=" + new Date().getTime(), addHeaders({
			Referer: referer,
			'X-Requested-With': 'XMLHttpRequest',
		}));

		var json = getJson(html);
		for(var i=0; i<json.length; ++i){
			if(json[i].channels){
				json = json[i];
				break;
			}
		}
		var found = false;
		for(var i=0; json.channels && i<json.channels.length; ++i){
			var c = json.channels[i];
			if(c.id === 'C2'){
				found = true;
				if(c.hasAdditionalLoginPassword){
					AnyBalance.trace('В настройках требуется подтверждение входа по SMS, отключаем...');
					html = AnyBalance.requestPost('https://settings.alfabank.ru/settings/api/entry-method/save', {
						entryMethod: 'WITHOUT_SMS'
					}, addHeaders({
						Referer: referer,
						'X-Requested-With': 'XMLHttpRequest',
					}));

					json = getJson(html);
					AnyBalance.requestPost('https://settings.alfabank.ru/settings/api/pipe-operation', {
						'authMethod[methodId]': json.authMethods[0].methodId,
						'authMethod[passwordSize]': json.authMethods[0].passwordSize || '',
						'operationId': json.references[0],
						'type': 'GENERATE_PASSWORD'
					}, addHeaders({
						Referer: referer,
						'X-Requested-With': 'XMLHttpRequest',
					}));

					AnyBalance.requestPost('https://settings.alfabank.ru/settings/api/pipe-operation', {
						'operationId': json.references[0],
						'isBundle': 'false',
						'references[]': json.references.join(','),
						'password': '',
						'type': 'CONFIRM'
					}, addHeaders({
						Referer: referer,
						'X-Requested-With': 'XMLHttpRequest',
					}));
					
					AnyBalance.trace('Может быть, отключили...');
				}else{
					AnyBalance.trace('Подтверждение входа по SMS не требуется...');
				}

				break;
			}
		}

		if(!found)
			AnyBalance.trace('Не удалось найти настройку SMS при входе');
	}catch(e){
		AnyBalance.trace('Ошибка отключения OTP при входе: ' + e.message);
	}
}
