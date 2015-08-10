/**
 Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
 */

var replaceFloat2 = [/\s+/g, '', /,/g, '', /(\d)\-(\d)/g, '$1.$2'];

function parseBalance2(text) {
    var _text = text.replace(/\s+/g, '');
    var val = getParam(_text, null, null, /(-?\d[\d\.,\-]*)/, replaceFloat2, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

var g_phrases = {
    karty: {card: 'карты', acc: 'счета'},
    kartu: {card: 'карту', acc: 'счет'},
    karte1: {card: 'первой карте', acc: 'первому счету'},
    karty1: {card: 'одной карты', acc: 'одного счета'}
}

var g_headers = {
    'Accept': 'image/webp,*/*;q=0.8',
    'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language': 'ru,en;q=0.8',
    'Cache-Control': 'max-age=0',
    'Connection': 'keep-alive',
    'Origin': 'https://www.avangard.ru',
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/32.0.1700.107 Safari/537.36',
};

function main() {
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://www.avangard.ru/';
    AnyBalance.setDefaultCharset('windows-1251');
	
    checkEmpty(prefs.login, 'Введите логин в интернет-банк!');
    checkEmpty(prefs.password, 'Введите пароль в интернет-банк!');
	
    var what = prefs.what || 'card';
    if (prefs.num && !/\d{4}/.test(prefs.num))
        throw new AnyBalance.Error("Введите 4 последних цифры номера " + g_phrases.karty[what] + " или не вводите ничего, чтобы показать информацию по " + g_phrases.karte1[what]);
	
	var html = AnyBalance.requestGet(baseurl + 'login/www/ibank_enter.php', g_headers);
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'login') 
			return prefs.login;
		else if (name == 'passwd')
			return prefs.password;

		return value;
	});
	
    html = AnyBalance.requestPost(baseurl + "client4/afterlogin", params, addHeaders({
		Referer: baseurl + 'login/www/ibank_enter.php',
		'Content-Type':'application/x-www-form-urlencoded'
	}));
	
    var error = getParam(html, null, null, [/<!--WAS_ERROR-->([\s\S]*?)<!--\/WAS_ERROR-->/i, /img\/login_error\.png/i], [replaceTagsAndSpaces, /img\/login_error\.png/i, 'Вы ошиблись в логине или пароле. Будьте внимательны при наборе пароля.']);
    if (error)
        throw new AnyBalance.Error(error, null, /Вы ошиблись в логине или пароле/i.test(error));
	
    var firstpage = getParam(html, null, null, /window.location\s*=\s*"([^"]*)"/i);
    if (!firstpage)
        throw new AnyBalance.Error("Не удалось найти ссылку на первую страницу банка.");
	
    AnyBalance.trace("We seem to enter the bank...");
	
    var url = AnyBalance.getLastUrl();
    //Физики и IP почему-то на разные папки редиректятся... Узнаем, на какую нас занесло
    var bankType = getParam(url, null, null, /avangard.ru\/(\w+Avn)/i);
    if (!bankType)
        throw new AnyBalance.Error('Не удаётся определить тип банка по url: ' + url);
    AnyBalance.trace('Тип банка: ' + bankType);
	
    //Зачем-то банк требует удалить эту куку
    //AnyBalance.setCookie('www.avangard.ru', 'JSESSIONID', null, {path: '/' + bankType});
	
    baseurl += bankType;
    html = AnyBalance.requestGet(baseurl + "/" + firstpage, g_headers);
	
    if (bankType == 'clbAvn') {
        fetchBankYur(html, baseurl);
    } else {
        fetchBankPhysic(html, baseurl);
    }
}

function fetchBankYur(html, baseurl) {
    var prefs = AnyBalance.getPreferences();
    var what = prefs.what || 'card';

    if (what == 'card')
        throw new AnyBalance.Error('Для интернет-банка для юридических лиц карты пока не поддерживаются. Выберите информацию по счету или обратитесь к автору провайдера.');

    if (/<title>session_error<\/title>/i.test(html)) {
        if (!prefs.__dbg) {
            var error = getParam(html, null, null, /<body>([\s\S]*?)<\/body>/i, replaceTagsAndSpaces, html_entity_decode);
            throw new AnyBalance.Error(error);
        }
    }

    //Без этого почему-то не даёт получить инфу по картам.
    //html = AnyBalance.requestGet(baseurl + '/faces/facelet-pages/iday_balance.jspx', g_headers);

    html = AnyBalance.requestPost(baseurl + '/faces/facelet-pages/iday_balance.jspx', {
        docslist___jeniaPopupFrame: '',
        'docslist:main:selVal': 0,
        'docslist:main:clTbl:_s': 0,
        'docslist:main:clTbl:_us': 0,
        'docslist:main:clTbl:rangeStart': 0,
        'docslist:main:accTbl:_s': 0,
        'docslist:main:accTbl:_us': 0,
        'docslist:main:accTbl:rangeStart': 0,
        'oracle.adf.faces.FORM': 'docslist',
        'oracle.adf.faces.STATE_TOKEN': getStateToken(html),
        'docslist:main:clTbl:_sm': '',
        'docslist:main:accTbl:_sm': '',
        'event': '',
        'source': 'docslist:main:_id526'
    }, addHeaders({Referer: baseurl + '/faces/facelet-pages/iday_balance.jspx'}));

    var table = getParam(html, null, null, /<table[^>]+class="x2f"[^>]*>([\s\S]*?)<\/table>/i);
    if (!table)
        throw new AnyBalance.Error('Не найдена таблица счетов. Сайт изменен?');

    var re = new RegExp('<tr[^>]*>(?:[\\s\\S](?!</tr>))*?(?:\\d\\s*){16}' + (prefs.num ? prefs.num : '(?:\\d\\s*){4}') + '[\\s\\S]*?</tr>', 'i');
    var tr = getParam(table, null, null, re);
    if (!tr)
        throw new AnyBalance.Error(prefs.num ? 'Не найден счет с последними цифрами ' + prefs.num : 'Не найдено ни одного счета');

    var result = {success: true};
    getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'accnum', /((?:\d\s*){20})/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'accname', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)(?:<\/td>|<\/div>)/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}

var g_lastToken;
function getStateToken(html) {
    //Всегда запоминаем предыдущий токен, на случай, если он понадобится в дальнейшем
    //Потому что иногда получаемые страницы токена не содержат
    var token = getParam(html, null, null, /<input[^>]*name="oracle\.adf\.faces\.STATE_TOKEN"[^>]*value="([^"]*)/i);
    if (token)
        g_lastToken = token;
    return g_lastToken;
}

function fetchAccountPhysic(html, baseurl) {
    var prefs = AnyBalance.getPreferences();
    var cardNum = prefs.num || '';

    var pattern = new RegExp('<table\\s+width="700"[^>]*>(?:[^>]*>){8,25}\\d{5,}' + cardNum + '(?:[\\s\\S]*?</table>){2,4}', 'i');
}

function formatDate(date) {
    var day = date.getDate();
    if (day < 10)
        day = '0' + day;

    var month = date.getMonth() + 1;
    if (month < 10)
        month = '0' + month;

    return day + '.' + month + '.' + date.getFullYear();
}

function submitForm(html, baseurl, source) {
    var form = getParam(html, null, null, /<form[^>]+name="f"[^>]*>[\s\S]*?<\/form>/i);
    if (!form) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось найти форму на странице. Сайт изменен?');
    }

    var params = createFormParams(form, function(params, str, name, value) {
        if (/type="submit"/i.test(str)) //Все сабмиты пропускаем
            return;
        return value;
    });
    params.source = source;

    var action = getParam(form, null, null, /<form[^>]+action="\/\w+Avn(\/[^"]*)/i, null, html_entity_decode);
    if (!action) {
        AnyBalance.trace(form);
        throw new AnyBalance.Error('Не удалось найти адрес передачи формы. Сайт изменен?');
    }

    return AnyBalance.requestPost(baseurl + action, params, g_headers);
}

function fetchBankPhysic(html, baseurl) {
    var prefs = AnyBalance.getPreferences();
    var what = prefs.what || 'card';

    var cardNum = prefs.num || '';

    var pattern = null;
    if (what == 'card')
        // (<tr>(?:[^>]*>){3,8}\d+\*{6}6553(?:[\s\S]*?</td\s*>){6})
        pattern = new RegExp('(<tr>(?:[^>]*>){3,8}\\d+\\*{6}' + (prefs.num || '\\d{4}') + '(?:[\\s\\S]*?</td\\s*>){6})');
    else
        //<table\s+width="700"[^>]*>(?:[^>]*>){22,25}\d+7817(?:[\s\S]*?</table>){2,4}
        pattern = new RegExp('<table\\s+width="700"[^>]*>(?:[^>]*>){8,25}\\d{5,}' + cardNum + '(?:[\\s\\S]*?</table>){2,4}', 'i');

    var tr = getParam(html, null, null, pattern);
    if (!tr)
        throw new AnyBalance.Error(prefs.num ? 'Не удалось найти ' + g_phrases.kartu[what] + ' с последними цифрами ' + prefs.num : 'Не удалось найти ни ' + g_phrases.karty1[what] + '!');

    var result = {success: true};
    getParam(tr, result, ['__tariff', 'accname'], /(?:[^>]*>){7}([^<]*)/, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'accnum', /\d{20}/);
    getParam(tr, result, '__tariff', /\d{20}/);
    if (AnyBalance.isAvailable('accname'))
        result.accname = result.__tariff;

    getParam(tr, result, 'balance', /&#1086;&#1089;&#1090;&#1072;&#1090;&#1086;&#1082; &#1085;&#1072; &#1089;&#1095;&#1077;&#1090;&#1077;(?:[^>]*>){4}[^>]*Bold[^>]*>([\s\S]*?)<\/tr/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, ['currency', 'balance'], /&#1086;&#1089;&#1090;&#1072;&#1090;&#1086;&#1082; &#1085;&#1072; &#1089;&#1095;&#1077;&#1090;&#1077;(?:[^>]*>){4}[^>]*Bold[^>]*>([\s\S]*?)<\/tr/i, replaceTagsAndSpaces, parseCurrency);

    if (AnyBalance.isAvailable('limit', 'minpay', 'minpaydate', 'freepay', 'freepaydate', 'debt', 'balance', 'lgotsum', 'lgottill', 'cardname', 'cardtill', 'cardtype', 'cardstatus')) {
        //{source:'f:_id164:0:_id180'}
        var source = getParam(tr, null, null, /\{source:'([^']*)/i);
        //<input type="hidden" name="oracle.adf.faces.STATE_TOKEN" value="-118qdrmfn5">
        var token = getStateToken(html);
        if (source && token) {
            // AnyBalance.setCookie('avangard.ru', 'oracle.uix', '0^^GMT+4:00');
            // AnyBalance.setCookie('avangard.ru', 'xscroll-faces/pages/accounts/all_acc.jspx', '0:1354528466127');
            // AnyBalance.setCookie('avangard.ru', 'yscroll-faces/pages/accounts/all_acc.jspx', '0:1354528466130');
            html = AnyBalance.requestPost(baseurl + '/faces/pages/accounts/all_acc.jspx', {
                'oracle.adf.faces.FORM': 'f',
                'oracle.adf.faces.STATE_TOKEN': token,
                'source': source,
            }, addHeaders({Referer: baseurl + '/faces/pages/accounts/all_acc.jspx'}));

            if (what == 'card') {
                getParam(html, result, 'cardname', /&#1048;&#1084;&#1103; &#1085;&#1072; &#1082;&#1072;&#1088;&#1090;&#1077;(?:[^>]*>){18}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
                getParam(html, result, 'cardtill', /&#1057;&#1088;&#1086;&#1082; &#1076;&#1077;&#1081;&#1089;&#1090;&#1074;&#1080;&#1103;(?:[^>]*>){20}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
                getParam(html, result, 'cardtype', /&#1058;&#1080;&#1087;(?:[^>]*>){22}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
                getParam(html, result, 'cardstatus', /&#1057;&#1090;&#1072;&#1090;&#1091;&#1089;(?:[^>]*>){24}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
            }
            // Это для кредитного счета
            if (!isset(result.balance)) {
                getParam(html, result, 'balance', /&#1044;&#1086;&#1089;&#1090;&#1091;&#1087;&#1085;&#1086; &#1082; &#1080;&#1089;&#1087;&#1086;&#1083;&#1100;&#1079;&#1086;&#1074;&#1072;&#1085;&#1080;&#1102;(?:[^>]*>){4}([\s\S]*?)<\/td/i, replaceTagsAndSpaces, parseBalance);
                getParam(html, result, ['currency', 'balance'], /&#1044;&#1086;&#1089;&#1090;&#1091;&#1087;&#1085;&#1086; &#1082; &#1080;&#1089;&#1087;&#1086;&#1083;&#1100;&#1079;&#1086;&#1074;&#1072;&#1085;&#1080;&#1102;(?:[^>]*>){4}([\s\S]*?)<\/td/i, replaceTagsAndSpaces, parseCurrency);
            }
            // Это кредит
            if (AnyBalance.isAvailable('minpaydate', 'minpay', 'limit', 'freepaydate', 'freepay', 'debt')) {
                var dt = new Date();
                var mdt = new Date(dt.getFullYear(), dt.getMonth(), 1);

                html = AnyBalance.requestPost(baseurl + '/faces/pages/accounts/acc_state_curr_debt_v.jspx', {
                    'f:startdate': formatDate(mdt),
                    'f:finishdate': formatDate(dt),
                    'oracle.adf.faces.FORM': 'f',
                    'oracle.adf.faces.STATE_TOKEN': getStateToken(html),
                    // Выписки и отчеты
                    source: getParam(html, null, null, /&#1042;&#1099;&#1087;&#1080;&#1089;&#1082;&#1080; &#1080; &#1086;&#1090;&#1095;&#1077;&#1090;&#1099;[\s\S]*?source:\\'([^\\']*)/i),
                    event: ''
                }, addHeaders({Referer: baseurl + '/faces/pages/sms/history.jspx'}));

                html = AnyBalance.requestPost(baseurl + '/faces/pages/sms/history.jspx', {
                    'f:startdate': formatDate(mdt),
                    'f:finishdate': formatDate(dt),
                    'oracle.adf.faces.FORM': 'f',
                    'oracle.adf.faces.STATE_TOKEN': getStateToken(html),
                    // Текущая задолженость
                    source: getParam(html, null, null, /&#1058;&#1077;&#1082;&#1091;&#1097;&#1072;&#1103; &#1079;&#1072;&#1076;&#1086;&#1083;&#1078;&#1077;&#1085;&#1085;&#1086;&#1089;&#1090;&#1100;[\s\S]*?source:\\'([^\\']*)/i),
                    event: ''
                }, addHeaders({Referer: baseurl + '/faces/pages/sms/history.jspx'}));

                //Вам необходимо внести на счет сумму не менее 2,936.32 RUR в срок по 31.12.2013г. включительно. 
                // Либо если деньги уже внесены - будет по другому
                // Сумма минимального платежа: 2 936.32 RUR 
                // и Льготный период оплаты: по 20.12.2013 г. 
                getParam(html, result, 'minpaydate', /&#1042;&#1072;&#1084; &#1085;&#1077;&#1086;&#1073;&#1093;&#1086;&#1076;&#1080;&#1084;&#1086; &#1074;&#1085;&#1077;&#1089;&#1090;&#1080; &#1085;&#1072; &#1089;&#1095;&#1077;&#1090; &#1089;&#1091;&#1084;&#1084;&#1091; &#1085;&#1077; &#1084;&#1077;&#1085;&#1077;&#1077;[^<]*&#1074; &#1089;&#1088;&#1086;&#1082; &#1087;&#1086;([^<]*)/i, null, parseDate);
                getParam(html, result, 'minpay', [/&#1057;&#1091;&#1084;&#1084;&#1072; &#1084;&#1080;&#1085;&#1080;&#1084;&#1072;&#1083;&#1100;&#1085;&#1086;&#1075;&#1086; &#1087;&#1083;&#1072;&#1090;&#1077;&#1078;&#1072;:([^<]*)/i, /&#1042;&#1072;&#1084; &#1085;&#1077;&#1086;&#1073;&#1093;&#1086;&#1076;&#1080;&#1084;&#1086; &#1074;&#1085;&#1077;&#1089;&#1090;&#1080; &#1085;&#1072; &#1089;&#1095;&#1077;&#1090; &#1089;&#1091;&#1084;&#1084;&#1091; &#1085;&#1077; &#1084;&#1077;&#1085;&#1077;&#1077;([^<]*)&#1074; &#1089;&#1088;&#1086;&#1082; &#1087;&#1086;/i], replaceTagsAndSpaces, parseBalance2);
                //Кредитный лимит
                var limit = getParam(html, null, null, /&#1050;&#1088;&#1077;&#1076;&#1080;&#1090;&#1085;&#1099;&#1081; &#1083;&#1080;&#1084;&#1080;&#1090;:(?:[^>]*>){10}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
                getParam(limit, result, 'limit');

                //Для выполнения условия льготного периода Вы можете внести сумму в размере 14,656.58 RUR по 20.08.2012 включительно
                //&#1044;&#1083;&#1103; &#1074;&#1099;&#1087;&#1086;&#1083;&#1085;&#1077;&#1085;&#1080;&#1103; &#1091;&#1089;&#1083;&#1086;&#1074;&#1080;&#1103; &#1083;&#1100;&#1075;&#1086;&#1090;&#1085;&#1086;&#1075;&#1086; &#1087;&#1077;&#1088;&#1080;&#1086;&#1076;&#1072; &#1042;&#1099; &#1084;&#1086;&#1078;&#1077;&#1090;&#1077; &#1074;&#1085;&#1077;&#1089;&#1090;&#1080; &#1089;&#1091;&#1084;&#1084;&#1091; &#1074; &#1088;&#1072;&#1079;&#1084;&#1077;&#1088;&#1077; 14,656.58 RUR &#1087;&#1086; 20.08.2012
                getParam(html, result, 'freepaydate', [/&#1051;&#1100;&#1075;&#1086;&#1090;&#1085;&#1099;&#1081; &#1087;&#1077;&#1088;&#1080;&#1086;&#1076; &#1086;&#1087;&#1083;&#1072;&#1090;&#1099;: &#1087;&#1086;([^<]*)/i, /&#1044;&#1083;&#1103; &#1074;&#1099;&#1087;&#1086;&#1083;&#1085;&#1077;&#1085;&#1080;&#1103; &#1091;&#1089;&#1083;&#1086;&#1074;&#1080;&#1103; &#1083;&#1100;&#1075;&#1086;&#1090;&#1085;&#1086;&#1075;&#1086; &#1087;&#1077;&#1088;&#1080;&#1086;&#1076;&#1072; &#1042;&#1099; &#1084;&#1086;&#1078;&#1077;&#1090;&#1077; &#1074;&#1085;&#1077;&#1089;&#1090;&#1080; &#1089;&#1091;&#1084;&#1084;&#1091; &#1074; &#1088;&#1072;&#1079;&#1084;&#1077;&#1088;&#1077;[^<]*?&#1087;&#1086;\s*([\d\.]+)/i], null, parseDate);
				//&#1054;&#1090;&#1095;&#1077;&#1090;&#1085;&#1072;&#1103; &#1089;&#1091;&#1084;&#1084;&#1072; &#1079;&#1072;&#1076;&#1086;&#1083;&#1078;&#1077;&#1085;&#1085;&#1086;&#1089;&#1090;&#1080;:([^<]*)/i
                getParam(html, result, 'freepay', [/&#1044;&#1083;&#1103; &#1074;&#1099;&#1087;&#1086;&#1083;&#1085;&#1077;&#1085;&#1080;&#1103; &#1091;&#1089;&#1083;&#1086;&#1074;&#1080;&#1103; &#1083;&#1100;&#1075;&#1086;&#1090;&#1085;&#1086;&#1075;&#1086; &#1087;&#1077;&#1088;&#1080;&#1086;&#1076;&#1072; &#1042;&#1099; &#1084;&#1086;&#1078;&#1077;&#1090;&#1077; &#1074;&#1085;&#1077;&#1089;&#1090;&#1080; &#1089;&#1091;&#1084;&#1084;&#1091; &#1074; &#1088;&#1072;&#1079;&#1084;&#1077;&#1088;&#1077;([^<]*?)&#1087;&#1086;/i], replaceTagsAndSpaces, parseBalance2);
                if (AnyBalance.isAvailable('debt') && limit) {
                    result.debt = limit - result.balance; //Задолженность
                }
            }
            if (AnyBalance.isAvailable('lgotsum', 'lgottill')) {
                html = AnyBalance.requestPost(baseurl + '/faces/pages/accounts/card_acc_detailed.jspx', {
                    'f:_id216:rangeStart': 0,
                    'oracle.adf.faces.FORM': 'f',
                    'oracle.adf.faces.STATE_TOKEN': getStateToken(html),
                    source: getParam(html, null, null, /info_card_preference_enabled.gif[\s\S]*?\{source:'([^']*)/i)
                }, g_headers);

                var _html = AnyBalance.requestPost(baseurl + '/faces/pages/accounts/preference_info_inner.jspx', {time: new Date().getTime()}, addHeaders({
                    'Referer': baseurl + '/faces/pages/accounts/preference_info.jspx',
                    'X-Requested-With': 'XMLHttpRequest'
                }));
                getParam(_html, result, 'lgotsum', /Для получения льготы необходимо сделать покупок на сумму\s*<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
                getParam(_html, result, 'lgottill', /Для получения льготы необходимо сделать покупок на сумму(?:[\s\S]*?<span[^>]*>){2}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseDate);
            }
        }
    }

    if (AnyBalance.isAvailable('miles', 'miles_avail', 'miles_due')) {
        html = submitForm(html, baseurl, 'f:airNotSelectedButton');
        //Бонусные мили
        var bonusSource = getParam(html, null, null, /<input[^>]+name="([^"]*)[^>]*value="&#1041;&#1086;&#1085;&#1091;&#1089;&#1085;&#1099;&#1077; &#1084;&#1080;&#1083;&#1080;"/i, null, html_entity_decode);
        if (!bonusSource) {
            AnyBalance.trace(html);
            AnyBalance.trace('Не удалось найти ссылку на Бонусные мили.');
        } else {
            html = submitForm(html, baseurl, bonusSource);

            //Всего бонусных миль на
            getParam(html, result, 'miles', /&#1042;&#1089;&#1077;&#1075;&#1086; &#1073;&#1086;&#1085;&#1091;&#1089;&#1085;&#1099;&#1093; &#1084;&#1080;&#1083;&#1100; &#1085;&#1072;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
            //доступных миль
            getParam(html, result, 'miles_avail', />&#1076;&#1086;&#1089;&#1090;&#1091;&#1087;&#1085;&#1099;&#1093; &#1084;&#1080;&#1083;&#1100;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
            //ожидаемых миль
            getParam(html, result, 'miles_due', />&#1086;&#1078;&#1080;&#1076;&#1072;&#1077;&#1084;&#1099;&#1093; &#1084;&#1080;&#1083;&#1100;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        }

    }

    AnyBalance.setResult(result);
}
