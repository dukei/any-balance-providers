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
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
    'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'ru,en;q=0.8',
    'Cache-Control': 'max-age=0',
    'Connection': 'keep-alive',
    'Origin': 'https://ib.avangard.ru',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36'
};

var baseurl = 'https://www.avangard.ru/';
var baseurlNew = 'https://ib.avangard.ru/';
var g_lastToken;

function main() {
    var prefs = AnyBalance.getPreferences();
    
    AnyBalance.setDefaultCharset('windows-1251');
	
    checkEmpty(prefs.login, 'Введите логин в интернет-банк!');
    checkEmpty(prefs.password, 'Введите пароль в интернет-банк!');
	
    var what = prefs.what || 'card';
    if (prefs.num && !/\d{4}/.test(prefs.num))
        throw new AnyBalance.Error("Введите 4 последних цифры номера " + g_phrases.karty[what] + " или не вводите ничего, чтобы показать информацию по " + g_phrases.karte1[what]);
	
	var html = AnyBalance.requestGet(baseurlNew + 'login/www/ibank_enter.php', g_headers);
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'login') 
			return prefs.login;
		else if (name == 'passwd')
			return prefs.password;

		return value;
	});
	
    html = AnyBalance.requestPost(baseurlNew + "client4/afterlogin", params, addHeaders({
		Referer: baseurlNew + 'login/www/ibank_enter.php',
		'Content-Type':'application/x-www-form-urlencoded'
	}));
	
    var error = getParam(html, null, null, [/<!--WAS_ERROR-->([\s\S]*?)<!--\/WAS_ERROR-->/i, /img\/login_error\.png/i], [replaceTagsAndSpaces, /img\/login_error\.png/i, 'Вы ошиблись в логине или пароле. Будьте внимательны при наборе пароля.']);
    if (error)
        throw new AnyBalance.Error(error, null, /Вы ошиблись в логине или пароле/i.test(error));
	
    var firstpage = getParam(html, null, null, /window.location\s*=\s*"([^"]*)"/i);
    if (!firstpage)
        throw new AnyBalance.Error("Не удалось найти ссылку на первую страницу банка.");
	
    AnyBalance.trace("Похоже, мы вошли в интернет-банк...");
	
    var url = AnyBalance.getLastUrl();
    //Физики и IP почему-то на разные папки редиректятся... Узнаем, на какую нас занесло
    var bankType = getParam(url, null, null, /avangard.ru\/(\w+Avn)/i);
    if (!bankType)
        throw new AnyBalance.Error('Не удаётся определить тип банка по url: ' + url);
    AnyBalance.trace('Тип банка: ' + bankType);
	
    //Зачем-то банк требует удалить эту куку
    //AnyBalance.setCookie('www.avangard.ru', 'JSESSIONID', null, {path: '/' + bankType});
	
    baseurl += bankType;
	baseurlNew += bankType;
    html = AnyBalance.requestGet(baseurlNew + "/" + firstpage, g_headers);

    if(/blocking_warning/i.test(html)){
    	AnyBalance.trace('Банк выдаёт какое-то сообщение. Пропускаем его');
    	var a = getParam(html, null, null, /<a[^>]+>\s*<img[^>]+&#1055;&#1088;&#1086;&#1076;&#1086;&#1083;&#1078;&#1080;&#1090;&#1100;/i); //Продолжить
    	var source = getParam(a, null, null, /id:"([^"]*)/i, replaceHtmlEntities);
        html = submitForm(html, baseurlNew, source);
    }
	
	if(/&#1059;&#1089;&#1090;&#1072;&#1085;&#1086;&#1074;&#1080;&#1090;&#1100; &#1055;&#1048;&#1053;-&#1082;&#1086;&#1076;/i.test(html)){
    	AnyBalance.trace('Банк выдаёт сообщение о необходимости установки ПИН-кода. Пропускаем его');
		var button = getElements(html, [/<div[^>]+class="action-buttons-holder"[^>]*><button[\s\S]*?<\/div>/ig, /&#1054;&#1090;&#1084;&#1077;&#1085;&#1072;/i])[0]; //Кнопка Отмена
	    var source = getParam(button, null, null, /button id="([^"]*)/i); //Id кнопки
		html = AnyBalance.requestPost(baseurlNew + '/faces/pages/petitions/change_pin/change_pin_first_page.xhtml', [
		    ['javax.faces.partial.ajax','true'],
            ['javax.faces.source',source],
            ['javax.faces.partial.execute','@all'],
            [source,source],
            ['f','f'],
            ['f:j_idt30:userComment',''],
            ['f:mailBackText',''],
            ['f:feedBackText',''],
            ['javax.faces.ViewState',getStateToken(html)],
        ], addHeaders({Referer: baseurlNew + '/faces/pages/petitions/change_pin/change_pin_first_page.xhtml'})); //Даёт редирект на Список счетов
        if (/redirect url/i.test(html))
			var url = getParam(html, null, null, /redirect url="\/\w+Avn([^"]*)/i, replaceHtmlEntities);
		    AnyBalance.trace('Редирект на страницу ' + url);
		    html = AnyBalance.requestGet(baseurlNew + url, g_headers);
    }
	
    if (bankType == 'clbAvn') {
		throw new AnyBalance.Error('Интернет-банк для юридических лиц пока не поддерживается. Выберите другой счет или обратитесь к автору провайдера.');
        fetchBankYur(html, baseurl);
    } else {
        fetchBankPhysic(html, baseurlNew);
    }
}

function fetchBankYur(html, baseurl) {
    var prefs = AnyBalance.getPreferences();
    var what = prefs.what || 'card';

    if (what == 'card')
        throw new AnyBalance.Error('Для интернет-банка для юридических лиц карты пока не поддерживаются. Выберите информацию по счету или обратитесь к автору провайдера.');

    if (/<title>session_error<\/title>/i.test(html)) {
        if (!prefs.__dbg) {
            var error = getParam(html, null, null, /<body>([\s\S]*?)<\/body>/i, replaceTagsAndSpaces);
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
        'source': getParam(html, null, null, /source:\\'(docslist:main:[^\\']*)/i, replaceHtmlEntities)
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
    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, 'accnum', /((?:\d\s*){20})/i, replaceTagsAndSpaces);
    getParam(tr, result, 'accname', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)(?:<\/td>|<\/div>)/i, replaceTagsAndSpaces);

    AnyBalance.setResult(result);
}

function getStateToken(html) {
    //Всегда запоминаем предыдущий токен, на случай, если он понадобится в дальнейшем
    //Потому что иногда получаемые страницы токена не содержат
    var token = getParam(html, null, null, /id="javax.faces.ViewState"[^>]*value="([^"]*)/i);
    if (token)
        g_lastToken = token;
    return g_lastToken;
}

function fetchAccountPhysic(html, baseurlNew) {
    var prefs = AnyBalance.getPreferences();
    var cardNum = prefs.num || '';

    var pattern = new RegExp('cardDisplay">(?:[^>]*>){3,8}\\d+\\*{6}' + (prefs.num || '\\d{4}') + '(?:[\\s\\S]*?</td\\s*>){5}');
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

function submitForm(html, baseurlNew, source) {
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

    var action = getParam(form, null, null, /<form[^>]+action="\/\w+Avn(\/[^"]*)/i, replaceHtmlEntities);
    if (!action) {
        AnyBalance.trace(form);
        throw new AnyBalance.Error('Не удалось найти адрес передачи формы. Сайт изменен?');
    }

    return AnyBalance.requestPost(baseurlNew + action, params, g_headers);
}

function fetchBankPhysic(html, baseurlNew) {
    var prefs = AnyBalance.getPreferences();
	
    //Надо сохранить для поиска ссылки на Бонусные мили
	var milesSource = getElements(html, [/<li[^>]+class="navigation-menu__item"[^>]*><a href[\s\S]*?<\/li>/ig, /&#1040;&#1074;&#1080;&#1072;&#1073;&#1080;&#1083;&#1077;&#1090;&#1099;/i])[0]; //Кнопка Авиабилеты
	var bonusSource = getParam(milesSource, null, null, /onclick=[\s\S]*?\{\\'([^\\']*)/i); //Id кнопки
	//Надо сохранить для поиска ссылки на Текущую задолженность
	var currSource = getElements(html, [/<li[^>]*><a[\s\S]*?href[\s\S]*?<\/li>/ig, /&#1058;&#1077;&#1082;&#1091;&#1097;&#1072;&#1103; &#1079;&#1072;&#1076;&#1086;&#1083;&#1078;&#1077;&#1085;&#1085;&#1086;&#1089;&#1090;&#1100;/i])[0]; //Кнопка Текущая задолженность
	var debtSource = getParam(currSource, null, null, /onclick=[\s\S]*?\{\'([^\']*)/i); //Id кнопки
	
    var what = prefs.what || 'card';

    var cardNum = prefs.num || '';
	
    var pattern = null;
    if (what == 'card')
        // (<tr>(?:[^>]*>){3,8}\d+\*{6}6553(?:[\s\S]*?</td\s*>){6})
        pattern = new RegExp('cardDisplay">(?:[^>]*>){3,8}\\d+\\*{6}' + (prefs.num || '\\d{4}') + '(?:[\\s\\S]*?</td\\s*>){5}');
    else
        //<table\s+width="700"[^>]*>(?:[^>]*>){22,25}\d+7817(?:[\s\S]*?</table>){2,4}
        pattern = new RegExp('<table\\s+width="100%"[^>]*>(?:[^>]*>){5,22}\\d+' + (prefs.num || '\\d{4}') + '(?:[\\s\\S]*?</table>){1}');
	
    var tr = getParam(html, null, null, pattern);
	
    if (!tr)
        throw new AnyBalance.Error(prefs.num ? 'Не удалось найти ' + g_phrases.kartu[what] + ' с последними цифрами ' + prefs.num : 'Не удалось найти ни ' + g_phrases.karty1[what] + '!');

    var result = {success: true};
	//Id кнопки перехода в детальную информацию о счете
	var source = getParam(tr, null, null, /&#1044;&#1077;&#1090;&#1072;&#1083;&#1100;&#1085;&#1072;&#1103; &#1080;&#1085;&#1092;&#1086;&#1088;&#1084;&#1072;&#1094;&#1080;&#1103; &#1087;&#1086; &#1089;&#1095;&#1077;&#1090;&#1091;\"\s*onclick=[\s\S]*?\{'([^']*)/i);
	
	var token = getStateToken(html);
    if (source && token) {
	
	    html = AnyBalance.requestPost(baseurlNew + '/faces/pages/accounts/all_acc.xhtml', [
            ['f','f'],
            ['f:j_idt29:userComment',''],
            ['f:mailBackText',''],
            ['f:feedBackText',''],
            ['f:j_idt531_input',''],
            ['javax.faces.ViewState',token],
            [source,source],
        ], addHeaders({Referer: baseurlNew + '/faces/pages/accounts/all_acc.xhtml'}));
		
		getParam(html, result, ['__tariff', 'accname'], /\d{20}/i, replaceTagsAndSpaces);
        getParam(html, result, 'accnum', /\d{20}/i, replaceTagsAndSpaces);
		getParam(html, result, 'cardtype', /(?:<div[^>]+class="cardsInfo"[^>]*>[\s\S]*?"bold">|<span[^>]+class="bold account_data"[^>]*>)([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
        getParam(html, result, '__tariff', /\d{20}/i, replaceTagsAndSpaces);
		getParam(html, result, 'cardstart', /&#1044;&#1072;&#1090;&#1072; &#1086;&#1090;&#1082;&#1088;&#1099;&#1090;&#1080;&#1103; &#1089;&#1095;&#1077;&#1090;&#1072;:[\s\S]*?"bold"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
        if (AnyBalance.isAvailable('accname'))
            result.accname = result.__tariff;

        getParam(html, result, 'balance', /(?:&#1044;&#1086;&#1089;&#1090;&#1091;&#1087;&#1085;&#1086; &#1082; &#1080;&#1089;&#1087;&#1086;&#1083;&#1100;&#1079;&#1086;&#1074;&#1072;&#1085;&#1080;&#1102; &#1085;&#1072;|&#1058;&#1077;&#1082;&#1091;&#1097;&#1080;&#1081; &#1086;&#1089;&#1090;&#1072;&#1090;&#1086;&#1082;)[\s\S]*?"bold"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, ['currency', 'balance'], /(?:&#1044;&#1086;&#1089;&#1090;&#1091;&#1087;&#1085;&#1086; &#1082; &#1080;&#1089;&#1087;&#1086;&#1083;&#1100;&#1079;&#1086;&#1074;&#1072;&#1085;&#1080;&#1102; &#1085;&#1072;|&#1058;&#1077;&#1082;&#1091;&#1097;&#1080;&#1081; &#1086;&#1089;&#1090;&#1072;&#1090;&#1086;&#1082;)[\s\S]*?"bold"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseCurrencyMy);
	    getParam(html, result, 'balance_month', /\(&#1089;&#1086; &#1074;&#1089;&#1077;&#1093; &#1090;&#1077;&#1082;&#1091;&#1097;&#1080;&#1093; &#1080; &#1082;&#1072;&#1088;&#1090;&#1086;&#1095;&#1085;&#1099;&#1093; &#1089;&#1095;&#1077;&#1090;&#1086;&#1074; &#1074;&#1086; &#1074;&#1089;&#1077;&#1093; &#1074;&#1072;&#1083;&#1102;&#1090;&#1072;&#1093;\)[\s\S]*?class="bold">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	    getParam(html, result, 'currency_full', /(?:&#1044;&#1086;&#1089;&#1090;&#1091;&#1087;&#1085;&#1086; &#1082; &#1080;&#1089;&#1087;&#1086;&#1083;&#1100;&#1079;&#1086;&#1074;&#1072;&#1085;&#1080;&#1102; &#1085;&#1072;|&#1058;&#1077;&#1082;&#1091;&#1097;&#1080;&#1081; &#1086;&#1089;&#1090;&#1072;&#1090;&#1086;&#1082;)[\s\S]*?"bold"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseCurrencySilent);
	    getParam(html, result, 'fio', /<h3[^>]+class="header__user">([\s\S]*?)<\/h3>/i, replaceTagsAndSpaces);
	}

    if (AnyBalance.isAvailable('limit', 'minpay', 'minpaydate', 'freepay', 'freepaydate', 'debt', 'balance', 'lgotsum', 'lgottill', 'cardname', 'cardtill', 'cardtype', 'cardstatus')) {
        //{source:'f:_id164:0:_id180'}
        var source = getParam(tr, null, null, /onclick=[\s\S]*?\{'([^']*)/i);

        //<input type="hidden" name="oracle.adf.faces.STATE_TOKEN" value="-118qdrmfn5">
        //var token = getStateToken(html); //Мешает получению бонусных миль
        if (source && token) {
            // AnyBalance.setCookie('avangard.ru', 'oracle.uix', '0^^GMT+4:00');
            // AnyBalance.setCookie('avangard.ru', 'xscroll-faces/pages/accounts/all_acc.jspx', '0:1354528466127');
            // AnyBalance.setCookie('avangard.ru', 'yscroll-faces/pages/accounts/all_acc.jspx', '0:1354528466130');
            html = AnyBalance.requestPost(baseurlNew + '/faces/pages/accounts/all_acc.xhtml', [
                ['f','f'],
                ['f:j_idt29:userComment',''],
                ['f:mailBackText',''],
                ['f:feedBackText',''],
                ['f:j_idt531_input',''],
                ['javax.faces.ViewState',token],
                [source,source],
            ], addHeaders({Referer: baseurlNew + '/faces/pages/accounts/all_acc.xhtml'}));
			
            if (what == 'card') {
				getParam(html, result, ['__tariff', 'accname'], /\d+\*{6}\d{4}/i, replaceTagsAndSpaces);
                getParam(html, result, 'accnum', /\d+\*{6}\d{4}/i, replaceTagsAndSpaces);
                getParam(html, result, '__tariff', /\d+\*{6}\d{4}/i, replaceTagsAndSpaces);
                if (AnyBalance.isAvailable('accname'))
                   result.accname = result.__tariff;

                getParam(html, result, 'balance', /&#1044;&#1086;&#1089;&#1090;&#1091;&#1087;&#1085;&#1086; &#1082; &#1080;&#1089;&#1087;&#1086;&#1083;&#1100;&#1079;&#1086;&#1074;&#1072;&#1085;&#1080;&#1102; &#1085;&#1072;[\s\S]*?"bold"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
                getParam(html, result, ['currency', 'balance'], /&#1044;&#1086;&#1089;&#1090;&#1091;&#1087;&#1085;&#1086; &#1082; &#1080;&#1089;&#1087;&#1086;&#1083;&#1100;&#1079;&#1086;&#1074;&#1072;&#1085;&#1080;&#1102; &#1085;&#1072;[\s\S]*?"bold"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseCurrencyMy);
			    getParam(html, result, 'balance_month', /\(&#1089;&#1086; &#1074;&#1089;&#1077;&#1093; &#1090;&#1077;&#1082;&#1091;&#1097;&#1080;&#1093; &#1080; &#1082;&#1072;&#1088;&#1090;&#1086;&#1095;&#1085;&#1099;&#1093; &#1089;&#1095;&#1077;&#1090;&#1086;&#1074; &#1074;&#1086; &#1074;&#1089;&#1077;&#1093; &#1074;&#1072;&#1083;&#1102;&#1090;&#1072;&#1093;\)[\s\S]*?class="bold">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
			    getParam(html, result, 'currency_full', /&#1044;&#1086;&#1089;&#1090;&#1091;&#1087;&#1085;&#1086; &#1082; &#1080;&#1089;&#1087;&#1086;&#1083;&#1100;&#1079;&#1086;&#1074;&#1072;&#1085;&#1080;&#1102; &#1085;&#1072;[\s\S]*?"bold"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseCurrencySilent);
				getParam(html, result, 'fio', /<h3[^>]+class="header__user">([\s\S]*?)<\/h3>/i, replaceTagsAndSpaces);
				
                getParam(html, result, 'cardname', /&#1048;&#1084;&#1103; &#1085;&#1072; &#1082;&#1072;&#1088;&#1090;&#1077;(?:[^>]*>){27}([^<]*)/i, replaceTagsAndSpaces);
				getParam(html, result, 'cardstart', /&#1087;&#1086;&#1083;&#1091;&#1095;&#1077;&#1085;&#1080;&#1103;(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces);
                getParam(html, result, 'cardtill', /&#1057;&#1088;&#1086;&#1082; &#1076;&#1077;&#1081;&#1089;&#1090;&#1074;&#1080;&#1103;(?:[^>]*>){29}([^<]*)/i, replaceTagsAndSpaces);
                getParam(html, result, 'cardtype', /&#1058;&#1080;&#1087;(?:[^>]*>){28}([^<]*)/i, replaceTagsAndSpaces);
                getParam(html, result, 'cardstatus', /&#1057;&#1090;&#1072;&#1090;&#1091;&#1089;(?:[^>]*>){27}([^<]*)/i, replaceTagsAndSpaces);
            }
            // Это для кредитного счета
            if (!isset(result.balance)) {
                getParam(html, result, 'balance', /&#1044;&#1086;&#1089;&#1090;&#1091;&#1087;&#1085;&#1086; &#1082; &#1080;&#1089;&#1087;&#1086;&#1083;&#1100;&#1079;&#1086;&#1074;&#1072;&#1085;&#1080;&#1102;(?:[^>]*>){4}([\s\S]*?)<\/td/i, replaceTagsAndSpaces, parseBalance);
                getParam(html, result, ['currency', 'balance'], /&#1044;&#1086;&#1089;&#1090;&#1091;&#1087;&#1085;&#1086; &#1082; &#1080;&#1089;&#1087;&#1086;&#1083;&#1100;&#1079;&#1086;&#1074;&#1072;&#1085;&#1080;&#1102;(?:[^>]*>){4}([\s\S]*?)<\/td/i, replaceTagsAndSpaces, parseCurrencyMy);
				getParam(html, result, 'currency_full', /&#1044;&#1086;&#1089;&#1090;&#1091;&#1087;&#1085;&#1086; &#1082; &#1080;&#1089;&#1087;&#1086;&#1083;&#1100;&#1079;&#1086;&#1074;&#1072;&#1085;&#1080;&#1102;(?:[^>]*>){4}([\s\S]*?)<\/td/i, replaceTagsAndSpaces, parseCurrencySilent);
            }
            // Это кредит
            if (AnyBalance.isAvailable('minpaydate', 'minpay', 'limit', 'freepaydate', 'freepay', 'debt')) {
            //  var dt = new Date();
            //  var mdt = new Date(dt.getFullYear(), dt.getMonth(), 1);
                		//Бонусные мили
		        if (!debtSource) {
                    AnyBalance.trace(html);
                    AnyBalance.trace('Не удалось найти ссылку на Текущую задолженность.');
                } else {	
		    		html = AnyBalance.requestPost(baseurlNew + '/faces/pages/accounts/all_acc.xhtml', [
                        ['f','f'],
                        ['f:j_idt29:userComment',''],
                        ['f:mailBackText',''],
                        ['f:feedBackText',''],
                        ['f:j_idt531_input',''],
                        ['javax.faces.ViewState',token],
                        [debtSource,debtSource],
                    ], addHeaders({Referer: baseurlNew + '/faces/pages/accounts/all_acc.xhtml'}));
                    //Вам необходимо внести на счет сумму не менее 2,936.32 RUR в срок по 31.12.2013г. включительно. 
                    // Либо если деньги уже внесены - будет по другому
                    // Сумма минимального платежа: 2 936.32 RUR 
                    // и Льготный период оплаты: по 20.12.2013 г. 
                    getParam(html, result, 'minpaydate', /&#1042;&#1072;&#1084; &#1085;&#1077;&#1086;&#1073;&#1093;&#1086;&#1076;&#1080;&#1084;&#1086; &#1074;&#1085;&#1077;&#1089;&#1090;&#1080; &#1085;&#1072; &#1089;&#1095;&#1077;&#1090; &#1089;&#1091;&#1084;&#1084;&#1091; &#1085;&#1077; &#1084;&#1077;&#1085;&#1077;&#1077;[^<]*&#1074; &#1089;&#1088;&#1086;&#1082; &#1087;&#1086;([^<]*)/i, null, parseDate);
                    getParam(html, result, 'minpay', [/&#1057;&#1091;&#1084;&#1084;&#1072; &#1084;&#1080;&#1085;&#1080;&#1084;&#1072;&#1083;&#1100;&#1085;&#1086;&#1075;&#1086; &#1087;&#1083;&#1072;&#1090;&#1077;&#1078;&#1072;:([^<]*)/i, /&#1042;&#1072;&#1084; &#1085;&#1077;&#1086;&#1073;&#1093;&#1086;&#1076;&#1080;&#1084;&#1086; &#1074;&#1085;&#1077;&#1089;&#1090;&#1080; &#1085;&#1072; &#1089;&#1095;&#1077;&#1090; &#1089;&#1091;&#1084;&#1084;&#1091; &#1085;&#1077; &#1084;&#1077;&#1085;&#1077;&#1077;([^<]*)&#1074; &#1089;&#1088;&#1086;&#1082; &#1087;&#1086;/i], replaceTagsAndSpaces, parseBalance2);
		    		getParam(html, result, 'reporteddebt', /&#1054;&#1090;&#1095;&#1077;&#1090;&#1085;&#1072;&#1103; &#1089;&#1091;&#1084;&#1084;&#1072; &#1079;&#1072;&#1076;&#1086;&#1083;&#1078;&#1077;&#1085;&#1085;&#1086;&#1089;&#1090;&#1080;(?:[^:]*:){1}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
                    //Кредитный лимит
                    var limit = getParam(html, null, null, /&#1050;&#1088;&#1077;&#1076;&#1080;&#1090;&#1085;&#1099;&#1081; &#1083;&#1080;&#1084;&#1080;&#1090;(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
                    getParam(limit, result, 'limit');
		    		getParam(html, result, 'currrate', /&#1058;&#1077;&#1082;&#1091;&#1097;&#1072;&#1103; &#1089;&#1090;&#1072;&#1074;&#1082;&#1072;(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces);
		    		getParam(html, result, 'nextrate', /&#1057;&#1090;&#1072;&#1074;&#1082;&#1072; &#1089;&#1083;&#1077;&#1076;. &#1084;&#1077;&#1089;&#1103;&#1094;&#1072;(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces);
		    		getParam(html, result, 'overdebt', /&#1047;&#1072;&#1076;&#1086;&#1083;&#1078;&#1077;&#1085;&#1085;&#1086;&#1089;&#1090;&#1100; &#1087;&#1086; &#1086;&#1074;&#1077;&#1088;&#1076;&#1088;&#1072;&#1092;&#1090;&#1091;(?:[^>]*>){2}-?([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		    		getParam(html, result, 'outinterest', /&#1053;&#1072;&#1095;&#1080;&#1089;&#1083;&#1077;&#1085;&#1085;&#1099;&#1077;, &#1085;&#1086; &#1085;&#1077; &#1087;&#1086;&#1075;&#1072;&#1096;&#1077;&#1085;&#1085;&#1099;&#1077; &#1087;&#1088;&#1086;&#1094;&#1077;&#1085;&#1090;&#1099; &#1087;&#1086; &#1082;&#1088;&#1077;&#1076;&#1080;&#1090;&#1091;(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		    		getParam(html, result, 'outcommissions', /&#1053;&#1072;&#1095;&#1080;&#1089;&#1083;&#1077;&#1085;&#1085;&#1099;&#1077;, &#1085;&#1086; &#1085;&#1077; &#1087;&#1086;&#1075;&#1072;&#1096;&#1077;&#1085;&#1085;&#1099;&#1077; &#1082;&#1086;&#1084;&#1080;&#1089;&#1089;&#1080;&#1080;(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);

                    //Для выполнения условия льготного периода Вы можете внести сумму в размере 14,656.58 RUR по 20.08.2012 включительно
                    //&#1044;&#1083;&#1103; &#1074;&#1099;&#1087;&#1086;&#1083;&#1085;&#1077;&#1085;&#1080;&#1103; &#1091;&#1089;&#1083;&#1086;&#1074;&#1080;&#1103; &#1083;&#1100;&#1075;&#1086;&#1090;&#1085;&#1086;&#1075;&#1086; &#1087;&#1077;&#1088;&#1080;&#1086;&#1076;&#1072; &#1042;&#1099; &#1084;&#1086;&#1078;&#1077;&#1090;&#1077; &#1074;&#1085;&#1077;&#1089;&#1090;&#1080; &#1089;&#1091;&#1084;&#1084;&#1091; &#1074; &#1088;&#1072;&#1079;&#1084;&#1077;&#1088;&#1077; 14,656.58 RUR &#1087;&#1086; 20.08.2012
                    getParam(html, result, 'freepaydate', [/&#1051;&#1100;&#1075;&#1086;&#1090;&#1085;&#1099;&#1081; &#1087;&#1077;&#1088;&#1080;&#1086;&#1076; &#1086;&#1087;&#1083;&#1072;&#1090;&#1099;: &#1087;&#1086;([^<]*)/i, /&#1044;&#1083;&#1103; &#1074;&#1099;&#1087;&#1086;&#1083;&#1085;&#1077;&#1085;&#1080;&#1103; &#1091;&#1089;&#1083;&#1086;&#1074;&#1080;&#1103; &#1083;&#1100;&#1075;&#1086;&#1090;&#1085;&#1086;&#1075;&#1086; &#1087;&#1077;&#1088;&#1080;&#1086;&#1076;&#1072; &#1042;&#1099; &#1084;&#1086;&#1078;&#1077;&#1090;&#1077; &#1074;&#1085;&#1077;&#1089;&#1090;&#1080; &#1089;&#1091;&#1084;&#1084;&#1091; &#1074; &#1088;&#1072;&#1079;&#1084;&#1077;&#1088;&#1077;[^<]*?&#1087;&#1086;\s*([\d\.]+)/i], null, parseDate);
		    		//&#1054;&#1090;&#1095;&#1077;&#1090;&#1085;&#1072;&#1103; &#1089;&#1091;&#1084;&#1084;&#1072; &#1079;&#1072;&#1076;&#1086;&#1083;&#1078;&#1077;&#1085;&#1085;&#1086;&#1089;&#1090;&#1080;:([^<]*)/i
                    getParam(html, result, 'freepay', [/&#1044;&#1083;&#1103; &#1074;&#1099;&#1087;&#1086;&#1083;&#1085;&#1077;&#1085;&#1080;&#1103; &#1091;&#1089;&#1083;&#1086;&#1074;&#1080;&#1103; &#1083;&#1100;&#1075;&#1086;&#1090;&#1085;&#1086;&#1075;&#1086; &#1087;&#1077;&#1088;&#1080;&#1086;&#1076;&#1072; &#1042;&#1099; &#1084;&#1086;&#1078;&#1077;&#1090;&#1077; &#1074;&#1085;&#1077;&#1089;&#1090;&#1080; &#1089;&#1091;&#1084;&#1084;&#1091; &#1074; &#1088;&#1072;&#1079;&#1084;&#1077;&#1088;&#1077;([^<]*?)&#1087;&#1086;/i], replaceTagsAndSpaces, parseBalance2);
                    if (AnyBalance.isAvailable('debt') && limit) {
                        result.debt = limit - result.balance; //Задолженность
                    }
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
        //Бонусные мили
		if (!bonusSource) {
            AnyBalance.trace(html);
            AnyBalance.trace('Не удалось найти ссылку на Бонусные мили.');
        } else {
            //var token = getStateToken(html); //var token = getStateToken(html); //Мешает получению бонусных миль
            html = AnyBalance.requestPost(baseurlNew + '/faces/pages/accounts/all_acc.xhtml', [
			    ['f','f'],
                ['f:j_idt29:userComment',''],
                ['f:mailBackText',''],
                ['f:feedBackText',''],
                ['f:j_idt531_input',''],
                ['javax.faces.ViewState',token],
                [bonusSource,bonusSource],
            ], addHeaders({Referer: baseurlNew + '/faces/pages/accounts/all_acc.xhtml'}));
			
			var milesSource1 = getElements(html, [/<li[^>]+class="navigation-menu__item"[^>]*><a href[\s\S]*?<\/li>/ig, /&#1041;&#1086;&#1085;&#1091;&#1089;&#1085;&#1099;&#1077; &#1084;&#1080;&#1083;&#1080;/i])[0]; //Кнопка Бонусные мили
	        var bonusSource1 = getParam(milesSource1, null, null, /onclick=[\s\S]*?\{\\'([^\\']*)/i); //Id кнопки 
            //var token = getStateToken(html); //var token = getStateToken(html); //Мешает получению бонусных миль
			var dt = new Date();
            html = AnyBalance.requestPost(baseurlNew + '/faces/pages/air/search_flights.xhtml', [
			    ['f','f'],
                ['f:j_idt100:j_idt102:0:fromLocation1:cityFromSearch_input',''],
                ['f:j_idt100:j_idt102:0:fromLocation1:cityFromSearch_hinput',''],
                ['f:j_idt100:j_idt102:0:toLocation1:cityFromSearch_input',''],
                ['f:j_idt100:j_idt102:0:toLocation1:cityFromSearch_hinput',''],
                ['f:j_idt100:j_idt102:0:j_idt121:j_idt129_input',formatDate(dt)],
                ['f:j_idt192_input',1],
                ['f:j_idt194_input',0],
                ['f:j_idt196_input',0],
                ['f:j_idt198_focus',''],
                ['f:j_idt198_input','CHANGED'],
                ['f:j_idt202_focus',''],
                ['f:j_idt202_input','ECONOMY'],
                ['f:j_idt207_focus',''],
                ['f:j_idt207_input','all'],
                ['javax.faces.ViewState',token],
                [bonusSource1,bonusSource1],
            ], addHeaders({Referer: baseurlNew + '/faces/pages/air/search_flights.xhtml'}));
			
            //Всего бонусных миль на
            getParam(html, result, 'miles', /&#1042;&#1089;&#1077;&#1075;&#1086; &#1073;&#1086;&#1085;&#1091;&#1089;&#1085;&#1099;&#1093; &#1084;&#1080;&#1083;&#1100; &#1085;&#1072;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
            //доступных миль
            getParam(html, result, 'miles_avail', /&#1074; &#1090;.&#1095;. &#1076;&#1086;&#1089;&#1090;&#1091;&#1087;&#1085;&#1099;&#1093; &#1084;&#1080;&#1083;&#1100;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
            //ожидаемых миль
            getParam(html, result, 'miles_due', /&#1074; &#1090;.&#1095;. &#1086;&#1078;&#1080;&#1076;&#1072;&#1077;&#1084;&#1099;&#1093; &#1084;&#1080;&#1083;&#1100;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        }

    }

    AnyBalance.setResult(result);
}

var g_currency = {
	RUB: '₽',
	RUR: '₽',
	USD: '$',
	EUR: '€',
	GBP: '£',
	JPY: 'Ұ',
	CHF: '₣',
	CNY: '¥',
	undefined: ''
};

function parseCurrencyMy(text){
    var currency = parseCurrency(text);
    return g_currency[currency] ? '' + g_currency[currency] : currency;
}