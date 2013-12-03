/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток и другие параметры карт Банка Авангард через интернет банк.

Сайт оператора: http://www.avangard.ru/
Личный кабинет: https://www.avangard.ru/login/logon_enter.html
*/

var replaceFloat2 = [/\s+/g, '', /,/g, '', /(\d)\-(\d)/g, '$1.$2'];

function parseBalance2(text){
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
    'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Cache-Control':'max-age=0',
    'Connection':'keep-alive',
	'Origin':'https://www.avangard.ru',
    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.57 Safari/537.36'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://www.avangard.ru/';
    AnyBalance.setDefaultCharset('windows-1251');
    
    var what = prefs.what || 'card';
    if(prefs.num && !/\d{4}/.test(prefs.num))
        throw new AnyBalance.Error("Введите 4 последних цифры номера " + g_phrases.karty[what] + " или не вводите ничего, чтобы показать информацию по " + g_phrases.karte1[what]);

    var html = AnyBalance.requestPost(baseurl + "client4/afterlogin", {
        login:prefs.login,
        passwd:prefs.password,
        x:38,
        y:6,
    }, g_headers);

    var error = getParam(html, null, null, /<!--WAS_ERROR-->([\s\S]*?)<!--\/WAS_ERROR-->/i, replaceTagsAndSpaces);
    if(error)
        throw new AnyBalance.Error(error);

    var firstpage = getParam(html, null, null, /window.location\s*=\s*"([^"]*)"/i);
    if(!firstpage)
        throw new AnyBalance.Error("Не удалось найти ссылку на первую страницу банка.");

    AnyBalance.trace("We seem to enter the bank...");

    var url = AnyBalance.getLastUrl();
    //Физики и IP почему-то на разные папки редиректятся... Узнаем, на какую нас занесло
    var bankType = getParam(url, null, null, /avangard.ru\/(\w+Avn)/i);
    if(!bankType)
        throw new AnyBalance.Error('Не удаётся определить тип банка по url: ' + url);
    AnyBalance.trace('Тип банка: ' + bankType);

    //Зачем-то банк требует удалить эту куку
    //AnyBalance.setCookie('www.avangard.ru', 'JSESSIONID', null, {path: '/' + bankType});

    baseurl += bankType;
    html = AnyBalance.requestGet(baseurl + "/" + firstpage, g_headers);

    if(bankType == 'clbAvn'){
        fetchBankYur(html, baseurl);
    }else{
        fetchBankPhysic(html, baseurl);
    }
}

function fetchBankYur(html, baseurl){
    var prefs = AnyBalance.getPreferences();
    var what = prefs.what || 'card';

    if(what == 'card')
        throw new AnyBalance.Error('Для интернет-банка для юридических лиц карты пока не поддерживаются. Выберите информацию по счету или обратитесь к автору провайдера.');

    if(/<title>session_error<\/title>/i.test(html)){
        if(!prefs.__dbg){
            var error = getParam(html, null, null, /<body>([\s\S]*?)<\/body>/i, replaceTagsAndSpaces, html_entity_decode);
            throw new AnyBalance.Error(error);
        }
    }

    //Без этого почему-то не даёт получить инфу по картам.
    html = AnyBalance.requestGet(baseurl + '/faces/facelet-pages/iday_balance.jspx', g_headers);

    html = AnyBalance.requestPost(baseurl + '/faces/facelet-pages/iday_balance.jspx', {
        docslist___jeniaPopupFrame:'',
        'docslist:main:selVal':0,
        'docslist:main:clTbl:_s':0,
        'docslist:main:clTbl:_us':0,
        'docslist:main:clTbl:rangeStart':0,
        'docslist:main:accTbl:_s':0,
        'docslist:main:accTbl:_us':0,
        'docslist:main:accTbl:rangeStart':0,
        'oracle.adf.faces.FORM':'docslist',
        'oracle.adf.faces.STATE_TOKEN':getStateToken(html),
        'docslist:main:clTbl:_sm':'',
        'docslist:main:accTbl:_sm':'',
        'event':'',
        'source':'docslist:main:_id514'
     }, addHeaders({Referer: baseurl + '/faces/facelet-pages/iday_balance.jspx'}));

     var table = getParam(html, null, null, /<table[^>]+class="x2f"[^>]*>([\s\S]*?)<\/table>/i);
     if(!table)
        throw new AnyBalance.Error('Не найдена таблица счетов. Сайт изменен?');

     var re = new RegExp('<tr[^>]*>(?:[\\s\\S](?!</tr>))*?(?:\\d\\s*){16}' + (prefs.num ? prefs.num : '(?:\\d\\s*){4}') + '[\\s\\S]*?</tr>', 'i');
     var tr = getParam(table, null, null, re);
     if(!tr)
        throw new AnyBalance.Error(prefs.num ? 'Не найден счет с последними цифрами ' + prefs.num : 'Не найдено ни одного счета');

     var result = {success: true};
     getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
     getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
     getParam(tr, result, 'accnum', /((?:\d\s*){20})/i, replaceTagsAndSpaces, html_entity_decode);
     getParam(tr, result, 'accname', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)(?:<\/td>|<\/div>)/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}

function getStateToken(html){
       var token = getParam(html, null, null, /<input[^>]*name="oracle\.adf\.faces\.STATE_TOKEN"[^>]*value="([^"]*)/i);
       return token;
}

function fetchAccountPhysic(html, baseurl) {
	var prefs = AnyBalance.getPreferences();
	var cardNum = prefs.num || '';
	
	var pattern = new RegExp('<table\\s+width="700"[^>]*>(?:[^>]*>){8,25}\\d{5,}'+cardNum+'(?:[\\s\\S]*?</table>){2,4}', 'i');
	
	

}

function fetchBankPhysic(html, baseurl){
    var prefs = AnyBalance.getPreferences();
    var what = prefs.what || 'card';

	var cardNum = prefs.num || '';
	
    var pattern = null;
    if(what == 'card')
		// (<tr>(?:[^>]*>){3,8}\d+\*{6}6553(?:[\s\S]*?</td\s*>){6})
        pattern = new RegExp('(<tr>(?:[^>]*>){3,8}\\d+\\*{6}' + (prefs.num || '\\d{4}') + '(?:[\\s\\S]*?</td\\s*>){6})');
    else
		//<table\s+width="700"[^>]*>(?:[^>]*>){22,25}\d+7817(?:[\s\S]*?</table>){2,4}
        pattern = new RegExp('<table\\s+width="700"[^>]*>(?:[^>]*>){8,25}\\d{5,}'+cardNum+'(?:[\\s\\S]*?</table>){2,4}', 'i');
	
	var tr = getParam(html, null, null, pattern);
	if(!tr)
		throw new AnyBalance.Error(prefs.num ? 'Не удалось найти ' + g_phrases.kartu[what] + ' с последними цифрами ' + prefs.num : 'Не удалось найти ни ' + g_phrases.karty1[what] + '!');

	var result = {success: true};
	getParam(tr, result, 'accname', /(?:[^>]*>){7}([^<]*)/, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'accnum', /\d{20}/);
    getParam(tr, result, '__tariff', /\d{20}/);
	if(!isset(result.__tariff))
		result.__tariff = result.accname;

	getParam(tr, result, 'balance', /&#1086;&#1089;&#1090;&#1072;&#1090;&#1086;&#1082; &#1085;&#1072; &#1089;&#1095;&#1077;&#1090;&#1077;(?:[^>]*>){4}[^>]*Bold[^>]*>([\s\S]*?)<\/tr/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, ['currency', 'balance'], /&#1086;&#1089;&#1090;&#1072;&#1090;&#1086;&#1082; &#1085;&#1072; &#1089;&#1095;&#1077;&#1090;&#1077;(?:[^>]*>){4}[^>]*Bold[^>]*>([\s\S]*?)<\/tr/i, replaceTagsAndSpaces, parseCurrency);
	
	if(AnyBalance.isAvailable('limit', 'minpay', 'minpaydate', 'freepay', 'freepaydate', 'debt', 'balance', 'lgotsum', 'lgottill', 'cardname', 'cardtill', 'cardtype', 'cardstatus')) {
       //{source:'f:_id164:0:_id180'}
       var source = getParam(tr, null, null, /\{source:'([^']*)/i);
       //<input type="hidden" name="oracle.adf.faces.STATE_TOKEN" value="-118qdrmfn5">
       var token = getStateToken(html);
       if(source && token) {
			// AnyBalance.setCookie('avangard.ru', 'oracle.uix', '0^^GMT+4:00');
			// AnyBalance.setCookie('avangard.ru', 'xscroll-faces/pages/accounts/all_acc.jspx', '0:1354528466127');
			// AnyBalance.setCookie('avangard.ru', 'yscroll-faces/pages/accounts/all_acc.jspx', '0:1354528466130');
            html = AnyBalance.requestPost(baseurl + '/faces/pages/accounts/all_acc.jspx', {
                'oracle.adf.faces.FORM':'f',
                'oracle.adf.faces.STATE_TOKEN': token,
                'source': source,
            }, addHeaders({Referer: baseurl + '/faces/pages/accounts/all_acc.jspx'})) ;

			if(what == 'card') {
				getParam(html, result, 'cardname', /&#1048;&#1084;&#1103; &#1085;&#1072; &#1082;&#1072;&#1088;&#1090;&#1077;(?:[^>]*>){18}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
				getParam(html, result, 'cardtill', /&#1057;&#1088;&#1086;&#1082; &#1076;&#1077;&#1081;&#1089;&#1090;&#1074;&#1080;&#1103;(?:[^>]*>){20}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
				getParam(html, result, 'cardtype', /&#1058;&#1080;&#1087;(?:[^>]*>){22}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
				getParam(html, result, 'cardstatus', /&#1057;&#1090;&#1072;&#1090;&#1091;&#1089;(?:[^>]*>){24}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
			}
			// Это для кредитного счета
			if(!isset(result.balance)) {
				getParam(html, result, 'balance', /&#1044;&#1086;&#1089;&#1090;&#1091;&#1087;&#1085;&#1086; &#1082; &#1080;&#1089;&#1087;&#1086;&#1083;&#1100;&#1079;&#1086;&#1074;&#1072;&#1085;&#1080;&#1102;(?:[^>]*>){4}([\s\S]*?)<\/td/i, replaceTagsAndSpaces, parseBalance);
				getParam(html, result, ['currency', 'balance'], /&#1044;&#1086;&#1089;&#1090;&#1091;&#1087;&#1085;&#1086; &#1082; &#1080;&#1089;&#1087;&#1086;&#1083;&#1100;&#1079;&#1086;&#1074;&#1072;&#1085;&#1080;&#1102;(?:[^>]*>){4}([\s\S]*?)<\/td/i, replaceTagsAndSpaces, parseCurrency);
			}	   
            //До 31.08.2012 для уплаты минимального платежа необходимо внести 1,675.05 RUR     
            //&#1044;&#1086; 31.08.2012 &#1076;&#1083;&#1103; &#1091;&#1087;&#1083;&#1072;&#1090;&#1099; &#1084;&#1080;&#1085;&#1080;&#1084;&#1072;&#1083;&#1100;&#1085;&#1086;&#1075;&#1086; &#1087;&#1083;&#1072;&#1090;&#1077;&#1078;&#1072; &#1085;&#1077;&#1086;&#1073;&#1093;&#1086;&#1076;&#1080;&#1084;&#1086; &#1074;&#1085;&#1077;&#1089;&#1090;&#1080; 1,675.05 RUR
            getParam(html, result, 'minpaydate', /&#1044;&#1086;\s*([\d\.]+)\s*&#1076;&#1083;&#1103; &#1091;&#1087;&#1083;&#1072;&#1090;&#1099; &#1084;&#1080;&#1085;&#1080;&#1084;&#1072;&#1083;&#1100;&#1085;&#1086;&#1075;&#1086; &#1087;&#1083;&#1072;&#1090;&#1077;&#1078;&#1072; &#1085;&#1077;&#1086;&#1073;&#1093;&#1086;&#1076;&#1080;&#1084;&#1086; &#1074;&#1085;&#1077;&#1089;&#1090;&#1080;/i, null, parseDate);
            getParam(html, result, 'minpay', /&#1044;&#1086;\s*[\d\.]+\s*&#1076;&#1083;&#1103; &#1091;&#1087;&#1083;&#1072;&#1090;&#1099; &#1084;&#1080;&#1085;&#1080;&#1084;&#1072;&#1083;&#1100;&#1085;&#1086;&#1075;&#1086; &#1087;&#1083;&#1072;&#1090;&#1077;&#1078;&#1072; &#1085;&#1077;&#1086;&#1073;&#1093;&#1086;&#1076;&#1080;&#1084;&#1086; &#1074;&#1085;&#1077;&#1089;&#1090;&#1080;([^<]*)/i, replaceTagsAndSpaces, parseBalance2);
            //Кредитный лимит
            getParam(html, result, 'limit', /&#1050;&#1088;&#1077;&#1076;&#1080;&#1090;&#1085;&#1099;&#1081; &#1083;&#1080;&#1084;&#1080;&#1090;:[\s\S]*?<td[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
            var limit = getParam(html, null, null, /&#1050;&#1088;&#1077;&#1076;&#1080;&#1090;&#1085;&#1099;&#1081; &#1083;&#1080;&#1084;&#1080;&#1090;:[\s\S]*?<td[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
            //Для выполнения условия льготного периода Вы можете внести сумму в размере 14,656.58 RUR по 20.08.2012 включительно
            //&#1044;&#1083;&#1103; &#1074;&#1099;&#1087;&#1086;&#1083;&#1085;&#1077;&#1085;&#1080;&#1103; &#1091;&#1089;&#1083;&#1086;&#1074;&#1080;&#1103; &#1083;&#1100;&#1075;&#1086;&#1090;&#1085;&#1086;&#1075;&#1086; &#1087;&#1077;&#1088;&#1080;&#1086;&#1076;&#1072; &#1042;&#1099; &#1084;&#1086;&#1078;&#1077;&#1090;&#1077; &#1074;&#1085;&#1077;&#1089;&#1090;&#1080; &#1089;&#1091;&#1084;&#1084;&#1091; &#1074; &#1088;&#1072;&#1079;&#1084;&#1077;&#1088;&#1077; 14,656.58 RUR &#1087;&#1086; 20.08.2012
            getParam(html, result, 'freepaydate', /&#1044;&#1083;&#1103; &#1074;&#1099;&#1087;&#1086;&#1083;&#1085;&#1077;&#1085;&#1080;&#1103; &#1091;&#1089;&#1083;&#1086;&#1074;&#1080;&#1103; &#1083;&#1100;&#1075;&#1086;&#1090;&#1085;&#1086;&#1075;&#1086; &#1087;&#1077;&#1088;&#1080;&#1086;&#1076;&#1072; &#1042;&#1099; &#1084;&#1086;&#1078;&#1077;&#1090;&#1077; &#1074;&#1085;&#1077;&#1089;&#1090;&#1080; &#1089;&#1091;&#1084;&#1084;&#1091; &#1074; &#1088;&#1072;&#1079;&#1084;&#1077;&#1088;&#1077;[^<]*?&#1087;&#1086;\s*([\d\.]+)/i, null, parseDate);
            getParam(html, result, 'freepay', /&#1044;&#1083;&#1103; &#1074;&#1099;&#1087;&#1086;&#1083;&#1085;&#1077;&#1085;&#1080;&#1103; &#1091;&#1089;&#1083;&#1086;&#1074;&#1080;&#1103; &#1083;&#1100;&#1075;&#1086;&#1090;&#1085;&#1086;&#1075;&#1086; &#1087;&#1077;&#1088;&#1080;&#1086;&#1076;&#1072; &#1042;&#1099; &#1084;&#1086;&#1078;&#1077;&#1090;&#1077; &#1074;&#1085;&#1077;&#1089;&#1090;&#1080; &#1089;&#1091;&#1084;&#1084;&#1091; &#1074; &#1088;&#1072;&#1079;&#1084;&#1077;&#1088;&#1077;([^<]*?)&#1087;&#1086;/i, replaceTagsAndSpaces, parseBalance2);
            if(AnyBalance.isAvailable('debt') && limit){
                result.debt = limit - result.balance; //Задолженность
            }
            if(AnyBalance.isAvailable('lgotsum', 'lgottill')){
                html = AnyBalance.requestPost(baseurl + '/faces/pages/accounts/card_acc_detailed.jspx', {
                    'f:_id216:rangeStart':0,
                    'oracle.adf.faces.FORM':'f',
                    'oracle.adf.faces.STATE_TOKEN':getStateToken(html),
                    source:getParam(html, null, null, /info_card_preference_enabled.gif[\s\S]*?\{source:'([^']*)/i)
                }, g_headers);

                html = AnyBalance.requestPost(baseurl + '/faces/pages/accounts/preference_info_inner.jspx', {time: new Date().getTime()}, addHeaders({
                    'Referer':baseurl + '/faces/pages/accounts/preference_info.jspx',
                    'X-Requested-With':'XMLHttpRequest'
                }));
				getParam(html, result, 'lgotsum', /Для получения льготы необходимо сделать покупок на сумму\s*<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
				getParam(html, result, 'lgottill', /Для получения льготы необходимо сделать покупок на сумму(?:[\s\S]*?<span[^>]*>){2}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseDate);
            }
       }
    }
	/*	var $html = $(html);
    var acccardnum = null;
	
    var $acc = $html.find('table[width="700"]').filter(function(i){
        var matches = pattern.exec($(this).text());
        if(matches && !acccardnum)
            acccardnum = matches[1];
        return !!matches;
    }).first();

    if(!$acc.size()){
        if(prefs.num)
            throw new AnyBalance.Error('Не удалось найти ' + g_phrases.kartu[what] + ' с последними цифрами ' + prefs.num);
        else
            throw new AnyBalance.Error('Не удалось найти ни ' + g_phrases.karty1[what] + '!');
    }

    var result = {success: true};

    getParam($acc.find('a.xl').text(), result, 'accnum', /(\d{20})/);
    getParam($acc.find('a.xl').text(), result, '__tariff', /(\d{20})/);
    getParam($acc.find('tr:has(a.xl)').text(), result, 'accname', /([\S\s]*?)\d{20}/, replaceTagsAndSpaces);
    
	getParam($acc.find('tr:first-child td:last-child td:nth-child(5)').text(), result, 'balance', null, replaceTagsAndSpaces, parseBalance);
    //var balance = getParam($acc.find('tr:first-child td:last-child b').text(), null, null, null, replaceTagsAndSpaces, parseBalance);
    getParam($acc.find('tr:first-child td:last-child td:last-child').text(), result, 'currency', null, replaceTagsAndSpaces);
	
    var cardnum = '';
    if(what == 'card'){
        var $card = $acc.find('table.cardListTable tr:contains("' + acccardnum + '")').first();
        if($card.size()){
            cardnum = getParam($card.find('td:nth-child(2)').text(), null, null, null, replaceTagsAndSpaces);
            getParam($card.find('td:nth-child(2)').text(), result, 'cardnum', null, replaceTagsAndSpaces);
            getParam($card.find('td:nth-child(2)').text(), result, '__tariff', null, replaceTagsAndSpaces);
            getParam($card.find('td:nth-child(3)').text(), result, 'cardname', null, replaceTagsAndSpaces);
            getParam($card.find('td:nth-child(4)').text(), result, 'cardtill', null, replaceTagsAndSpaces);
            getParam($card.find('td:nth-child(5)').text(), result, 'cardtype', null, replaceTagsAndSpaces);
            getParam($card.find('td:nth-child(6)').text(), result, 'cardstatus', null, replaceTagsAndSpaces);
        }
    }

    if(AnyBalance.isAvailable('limit', 'minpay', 'minpaydate', 'freepay', 'freepaydate', 'debt')){
       //{source:'f:_id164:0:_id180'}
       var source = getParam($acc.find('a.xl').attr('onclick'), null, null, /\{source:'([^']*)/i);
       //<input type="hidden" name="oracle.adf.faces.STATE_TOKEN" value="-118qdrmfn5">
       var token = getStateToken(html);
       if(source && token){
//            AnyBalance.setCookie('www.avangard.ru', 'oracle.uix', '0^^GMT+4:00');
//            AnyBalance.setCookie('www.avangard.ru', 'xscroll-faces/pages/accounts/all_acc.jspx', '0:1354528466127');
//            AnyBalance.setCookie('www.avangard.ru', 'yscroll-faces/pages/accounts/all_acc.jspx', '0:1354528466130');

            html = AnyBalance.requestPost(baseurl + '/faces/pages/accounts/all_acc.jspx', {
                'oracle.adf.faces.FORM':'f',
                'oracle.adf.faces.STATE_TOKEN': token,
                source: source
            }, g_headers/*, {Referer: baseurl + '/faces/pages/accounts/all_acc.jspx'}*);
       
            //До 31.08.2012 для уплаты минимального платежа необходимо внести 1,675.05 RUR     
            //&#1044;&#1086; 31.08.2012 &#1076;&#1083;&#1103; &#1091;&#1087;&#1083;&#1072;&#1090;&#1099; &#1084;&#1080;&#1085;&#1080;&#1084;&#1072;&#1083;&#1100;&#1085;&#1086;&#1075;&#1086; &#1087;&#1083;&#1072;&#1090;&#1077;&#1078;&#1072; &#1085;&#1077;&#1086;&#1073;&#1093;&#1086;&#1076;&#1080;&#1084;&#1086; &#1074;&#1085;&#1077;&#1089;&#1090;&#1080; 1,675.05 RUR
            getParam(html, result, 'minpaydate', /&#1044;&#1086;\s*([\d\.]+)\s*&#1076;&#1083;&#1103; &#1091;&#1087;&#1083;&#1072;&#1090;&#1099; &#1084;&#1080;&#1085;&#1080;&#1084;&#1072;&#1083;&#1100;&#1085;&#1086;&#1075;&#1086; &#1087;&#1083;&#1072;&#1090;&#1077;&#1078;&#1072; &#1085;&#1077;&#1086;&#1073;&#1093;&#1086;&#1076;&#1080;&#1084;&#1086; &#1074;&#1085;&#1077;&#1089;&#1090;&#1080;/i, null, parseDate);
            getParam(html, result, 'minpay', /&#1044;&#1086;\s*[\d\.]+\s*&#1076;&#1083;&#1103; &#1091;&#1087;&#1083;&#1072;&#1090;&#1099; &#1084;&#1080;&#1085;&#1080;&#1084;&#1072;&#1083;&#1100;&#1085;&#1086;&#1075;&#1086; &#1087;&#1083;&#1072;&#1090;&#1077;&#1078;&#1072; &#1085;&#1077;&#1086;&#1073;&#1093;&#1086;&#1076;&#1080;&#1084;&#1086; &#1074;&#1085;&#1077;&#1089;&#1090;&#1080;([^<]*)/i, replaceTagsAndSpaces, parseBalance2);
            //Кредитный лимит
            getParam(html, result, 'limit', /&#1050;&#1088;&#1077;&#1076;&#1080;&#1090;&#1085;&#1099;&#1081; &#1083;&#1080;&#1084;&#1080;&#1090;:[\s\S]*?<td[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
            var limit = getParam(html, null, null, /&#1050;&#1088;&#1077;&#1076;&#1080;&#1090;&#1085;&#1099;&#1081; &#1083;&#1080;&#1084;&#1080;&#1090;:[\s\S]*?<td[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
            //Для выполнения условия льготного периода Вы можете внести сумму в размере 14,656.58 RUR по 20.08.2012 включительно
            //&#1044;&#1083;&#1103; &#1074;&#1099;&#1087;&#1086;&#1083;&#1085;&#1077;&#1085;&#1080;&#1103; &#1091;&#1089;&#1083;&#1086;&#1074;&#1080;&#1103; &#1083;&#1100;&#1075;&#1086;&#1090;&#1085;&#1086;&#1075;&#1086; &#1087;&#1077;&#1088;&#1080;&#1086;&#1076;&#1072; &#1042;&#1099; &#1084;&#1086;&#1078;&#1077;&#1090;&#1077; &#1074;&#1085;&#1077;&#1089;&#1090;&#1080; &#1089;&#1091;&#1084;&#1084;&#1091; &#1074; &#1088;&#1072;&#1079;&#1084;&#1077;&#1088;&#1077; 14,656.58 RUR &#1087;&#1086; 20.08.2012
            getParam(html, result, 'freepaydate', /&#1044;&#1083;&#1103; &#1074;&#1099;&#1087;&#1086;&#1083;&#1085;&#1077;&#1085;&#1080;&#1103; &#1091;&#1089;&#1083;&#1086;&#1074;&#1080;&#1103; &#1083;&#1100;&#1075;&#1086;&#1090;&#1085;&#1086;&#1075;&#1086; &#1087;&#1077;&#1088;&#1080;&#1086;&#1076;&#1072; &#1042;&#1099; &#1084;&#1086;&#1078;&#1077;&#1090;&#1077; &#1074;&#1085;&#1077;&#1089;&#1090;&#1080; &#1089;&#1091;&#1084;&#1084;&#1091; &#1074; &#1088;&#1072;&#1079;&#1084;&#1077;&#1088;&#1077;[^<]*?&#1087;&#1086;\s*([\d\.]+)/i, null, parseDate);
            getParam(html, result, 'freepay', /&#1044;&#1083;&#1103; &#1074;&#1099;&#1087;&#1086;&#1083;&#1085;&#1077;&#1085;&#1080;&#1103; &#1091;&#1089;&#1083;&#1086;&#1074;&#1080;&#1103; &#1083;&#1100;&#1075;&#1086;&#1090;&#1085;&#1086;&#1075;&#1086; &#1087;&#1077;&#1088;&#1080;&#1086;&#1076;&#1072; &#1042;&#1099; &#1084;&#1086;&#1078;&#1077;&#1090;&#1077; &#1074;&#1085;&#1077;&#1089;&#1090;&#1080; &#1089;&#1091;&#1084;&#1084;&#1091; &#1074; &#1088;&#1072;&#1079;&#1084;&#1077;&#1088;&#1077;([^<]*?)&#1087;&#1086;/i, replaceTagsAndSpaces, parseBalance2);

            if(AnyBalance.isAvailable('debt') && limit){
                result.debt = limit - result.balance; //Задолженность
            }

           
            if(AnyBalance.isAvailable('lgotsum', 'lgottill')){
                html = AnyBalance.requestPost(baseurl + '/faces/pages/accounts/card_acc_detailed.jspx', {
                    'f:_id216:rangeStart':0,
                    'oracle.adf.faces.FORM':'f',
                    'oracle.adf.faces.STATE_TOKEN':getStateToken(html),
                    source:getParam(html, null, null, /info_card_preference_enabled.gif[\s\S]*?\{source:'([^']*)/i)
                }, g_headers);

                html = AnyBalance.requestPost(baseurl + '/faces/pages/accounts/preference_info_inner.jspx', {time: new Date().getTime()}, addHeaders({
                    'Referer':baseurl + '/faces/pages/accounts/preference_info.jspx',
                    'X-Requested-With':'XMLHttpRequest'
                }));
            
                getParam(html, result, 'lgotsum', /Для получения льготы необходимо сделать покупок на сумму\s*<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
                getParam(html, result, 'lgottill', /Для получения льготы необходимо сделать покупок на сумму(?:[\s\S]*?<span[^>]*>){2}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseDate);
                 
            }
       }
    }
*/
    AnyBalance.setResult(result);
}
