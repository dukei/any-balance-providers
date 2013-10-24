/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Информация о кредите в банке "Русский стандарт".

Сайт: https://online.rsb.ru/
*/

var replaceTagsAndSpacesAndBalances = [replaceTagsAndSpaces, /,\s*(\d)(?!\d)/i, ',0$1'];

function main() {
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');
    var baseurl = 'https://online.rsb.ru/hb/faces/';

	var html = AnyBalance.requestPost(baseurl + 'security_check', {
		j_username: prefs.login,
		j_password: prefs.password,
		systemid: 'hb'
	});
	
	if(!/<a[^>]+class="exit"[^>]*>/.test(html)){
		if(/Ввод пароля из SMS-сообщения/i.test(html))
			throw new AnyBalance.Error('У вас настроен вход по паролю из SMS сообщения. Для пользования провайдером необходимо отключить этот пароль в настройках интернет-банка. Это безопасно, для проведения любых операций SMS-пароль всё равно будет требоваться.');
	    throw new AnyBalance.Error('Ошибка авторизации. Проверьте логин и пароль');
	}
    html = AnyBalance.requestGet(baseurl + 'request.json');
	var json = getJson(html);
	if(!json.data){
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка получения списка карт. Сайт изменен?');
	}
    if(prefs.type == 'crd')
		fetchCredit(baseurl, json);
	else if(prefs.type == 'acc')
		fetchAccount(baseurl, json);
	else if(prefs.type == 'card')
		fetchCard(baseurl, json);
	else if(prefs.type == 'dep')
		fetchDeposit(baseurl);
	else
		fetchCredit(baseurl, json); //По умолчанию кредит
}

function fetchCard(baseurl, json){
    var prefs = AnyBalance.getPreferences();
    if(prefs.contract && !/^\d{4}$/.test(prefs.contract))
        throw new AnyBalance.Error('Пожалуйста, введите 4 последних цифры номера карты, по которой вы хотите получить информацию, или не вводите ничего, чтобы получить информацию по первой карте.');

    for(var i=0; i<json.data.length; ++i){
        var card = json.data[i];
        if(card.type == 'card' && (!prefs.contract || card.num4 == prefs.contract)){
            var acc = card.acc[0];
            var result = {success: true};

            getParam(acc.currency, result, ['currency','account_balance','own','gracepay']);
            getParam(acc.available+'', result, 'account_balance', null, replaceTagsAndSpacesAndBalances, parseBalance);
            getParam(acc.own+'', result, 'own', null, replaceTagsAndSpacesAndBalances, parseBalance);
            getParam(card.title, result, '__tariff');
            getParam(card.num4, result, 'cardnum');
            getParam(acc.name, result, 'accname');

            if(AnyBalance.isAvailable('till', 'contract_date', 'status', 'gracepay', 'gracetill', 'account_blocked_balance')){
                var url = getParam(card.link, null, null, /\/hb\/faces\/(.*)/);
                
                var html = AnyBalance.requestGet(baseurl + url);
                //Дата окончания срока действия карты
                getParam(html, result, 'till', /&#1044;&#1072;&#1090;&#1072; &#1086;&#1082;&#1086;&#1085;&#1095;&#1072;&#1085;&#1080;&#1103; &#1089;&#1088;&#1086;&#1082;&#1072; &#1076;&#1077;&#1081;&#1089;&#1090;&#1074;&#1080;&#1103; &#1082;&#1072;&#1088;&#1090;&#1099;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
                //Дата заключения договора
                getParam(html, result, 'contract_date', /&#1044;&#1072;&#1090;&#1072; &#1079;&#1072;&#1082;&#1083;&#1102;&#1095;&#1077;&#1085;&#1080;&#1103; &#1076;&#1086;&#1075;&#1086;&#1074;&#1086;&#1088;&#1072;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
                //Статус
                getParam(html, result, 'status', /&#1057;&#1090;&#1072;&#1090;&#1091;&#1089;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
                //Номер карты
                getParam(html, result, 'cardnum', /&#1053;&#1086;&#1084;&#1077;&#1088; &#1082;&#1072;&#1088;&#1090;&#1099;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/, replaceTagsAndSpaces, html_entity_decode);
                //Договор
                getParam(html, result, 'contract', />&#1044;&#1086;&#1075;&#1086;&#1074;&#1086;&#1088;<[\s\S]*?<td[^>]*>(?:&#8470; )?([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
                //Сумма для реализации Льготного периода -
                getParam(html, result, 'gracepay', /&#1057;&#1091;&#1084;&#1084;&#1072; &#1076;&#1083;&#1103; &#1088;&#1077;&#1072;&#1083;&#1080;&#1079;&#1072;&#1094;&#1080;&#1080; &#1083;&#1100;&#1075;&#1086;&#1090;&#1085;&#1086;&#1075;&#1086; &#1087;&#1077;&#1088;&#1080;&#1086;&#1076;&#1072;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpacesAndBalances, parseBalance);
                //Дата окончания Льготного периода -
                getParam(html, result, 'gracetill', /&#1044;&#1072;&#1090;&#1072; &#1086;&#1082;&#1086;&#1085;&#1095;&#1072;&#1085;&#1080;&#1103; &#1083;&#1100;&#1075;&#1086;&#1090;&#1085;&#1086;&#1075;&#1086; &#1087;&#1077;&#1088;&#1080;&#1086;&#1076;&#1072;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
				// Сумма заблокированных средств
				getParam(html, result, 'account_blocked_balance', /&#1047;&#1072;&#1073;&#1083;&#1086;&#1082;&#1080;&#1088;&#1086;&#1074;&#1072;&#1085;&#1085;&#1072;&#1103; &#1089;&#1091;&#1084;&#1084;&#1072;[\s\S]*?<span class="summ">([\s\S]*?)<\/span>/i, [/&nbsp;/ig, '', /&minus;/ig, '-', /<!--[\s\S]*?-->/g, '', /<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, '', /\s+/ig, '',], parseBalance);
            }
            AnyBalance.setResult(result);
            break;
        }
    }

    if(!AnyBalance.isSetResultCalled())
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.contract ? 'карту с последними цифрами ' + prefs.contract : 'ни одной карты'));
}

function fetchAccount(baseurl, json){
    var prefs = AnyBalance.getPreferences();
    if(prefs.contract && !/^\d{4}$/.test(prefs.contract))
        throw new AnyBalance.Error('Пожалуйста, введите 4 последних цифры номера счета, по которому вы хотите получить информацию, или не вводите ничего, чтобы получить информацию по первому счету.');

    for(var i=0; i<json.data.length; ++i) {
        var card = json.data[i];
        if(card.type == 'account' && (!prefs.contract || endsWith(card.num, prefs.contract))){
            var acc = card.acc[0];
            var result = {success: true};

            getParam(acc.currency, result, ['currency','account_balance','own','gracepay']);
            getParam(acc.available+'', result, 'account_balance', null, replaceTagsAndSpacesAndBalances, parseBalance);
            getParam(acc.own+'', result, 'own', null, replaceTagsAndSpacesAndBalances, parseBalance);
            getParam(card.title, result, '__tariff');
            getParam(card.num, result, 'cardnum');
            getParam(acc.name, result, 'accname');

            /*if(AnyBalance.isAvailable('till', 'contract_date', 'status', 'gracepay', 'gracetill', 'account_blocked_balance')){
                var url = getParam(card.link, null, null, /\/hb\/faces\/(.*)/);
                
                var html = AnyBalance.requestGet(baseurl + url);
                //Дата окончания срока действия карты
                getParam(html, result, 'till', /&#1044;&#1072;&#1090;&#1072; &#1086;&#1082;&#1086;&#1085;&#1095;&#1072;&#1085;&#1080;&#1103; &#1089;&#1088;&#1086;&#1082;&#1072; &#1076;&#1077;&#1081;&#1089;&#1090;&#1074;&#1080;&#1103; &#1082;&#1072;&#1088;&#1090;&#1099;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
                //Дата заключения договора
                getParam(html, result, 'contract_date', /&#1044;&#1072;&#1090;&#1072; &#1079;&#1072;&#1082;&#1083;&#1102;&#1095;&#1077;&#1085;&#1080;&#1103; &#1076;&#1086;&#1075;&#1086;&#1074;&#1086;&#1088;&#1072;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
                //Статус
                getParam(html, result, 'status', /&#1057;&#1090;&#1072;&#1090;&#1091;&#1089;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
                //Номер карты
                getParam(html, result, 'cardnum', /&#1053;&#1086;&#1084;&#1077;&#1088; &#1082;&#1072;&#1088;&#1090;&#1099;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/, replaceTagsAndSpaces, html_entity_decode);
                //Договор
                getParam(html, result, 'contract', />&#1044;&#1086;&#1075;&#1086;&#1074;&#1086;&#1088;<[\s\S]*?<td[^>]*>(?:&#8470; )?([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
                //Сумма для реализации Льготного периода -
                getParam(html, result, 'gracepay', /&#1057;&#1091;&#1084;&#1084;&#1072; &#1076;&#1083;&#1103; &#1088;&#1077;&#1072;&#1083;&#1080;&#1079;&#1072;&#1094;&#1080;&#1080; &#1083;&#1100;&#1075;&#1086;&#1090;&#1085;&#1086;&#1075;&#1086; &#1087;&#1077;&#1088;&#1080;&#1086;&#1076;&#1072;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpacesAndBalances, parseBalance);
                //Дата окончания Льготного периода -
                getParam(html, result, 'gracetill', /&#1044;&#1072;&#1090;&#1072; &#1086;&#1082;&#1086;&#1085;&#1095;&#1072;&#1085;&#1080;&#1103; &#1083;&#1100;&#1075;&#1086;&#1090;&#1085;&#1086;&#1075;&#1086; &#1087;&#1077;&#1088;&#1080;&#1086;&#1076;&#1072;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
				// Сумма заблокированных средств
				getParam(html, result, 'account_blocked_balance', /&#1047;&#1072;&#1073;&#1083;&#1086;&#1082;&#1080;&#1088;&#1086;&#1074;&#1072;&#1085;&#1085;&#1072;&#1103; &#1089;&#1091;&#1084;&#1084;&#1072;[\s\S]*?<span class="summ">([\s\S]*?)<\/span>/i, [/&nbsp;/ig, '', /&minus;/ig, '-', /<!--[\s\S]*?-->/g, '', /<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, '', /\s+/ig, '',], parseBalance);
            }*/
            AnyBalance.setResult(result);
            break;
        }
    }
	
    if(!AnyBalance.isSetResultCalled())
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.contract ? 'карту с последними цифрами ' + prefs.contract : 'ни одной карты'));	
}

function fetchDeposit(baseurl){
    //throw new AnyBalance.Error('В связи с изменениями в интернет банке депозиты временно не поддерживаются. Обращайтесь на dco@mail.ru для поддержки депозитов.');

    var prefs = AnyBalance.getPreferences();
    if(prefs.contract && !/^\d{10}$/.test(prefs.contract))
        throw new AnyBalance.Error('Пожалуйста, введите 10 цифр номера договора вклада, по которому вы хотите получить информацию, или не вводите ничего, чтобы получить информацию по первому вкладу.');

    var html = AnyBalance.requestGet(baseurl + 'rs/LoansAndDeposits.jspx');
	var sourceData = getParam(html, null, null, /<a[^>]+onclick="submitForm[^"]*source:'([^'"]*)'[^"]*"[^>]*>&#1044;&#1077;&#1087;&#1086;&#1079;&#1080;&#1090;&#1099;/i, replaceTagsAndSpaces);
    var token = getParam(html, null, null, /<input[^>]+name="oracle.adf.faces.STATE_TOKEN"[^>]*value="([^"]*)/i, null, html_entity_decode);

	html = AnyBalance.requestPost(baseurl + 'rs/LoansAndDeposits.jspx', {
		'oracle.adf.faces.FORM': 'mainform',
		'oracle.adf.faces.STATE_TOKEN': token,
		'source': sourceData
	});
	
    var re = new RegExp('(<tr[^>]*>(?:[\\s\\S](?!<\\/tr>))*' + 
       //Номер договора банковского вклада
       '&#1053;&#1086;&#1084;&#1077;&#1088; &#1076;&#1086;&#1075;&#1086;&#1074;&#1086;&#1088;&#1072; &#1073;&#1072;&#1085;&#1082;&#1086;&#1074;&#1089;&#1082;&#1086;&#1075;&#1086; &#1074;&#1082;&#1083;&#1072;&#1076;&#1072;\\s*-\\s*' +
       (prefs.contract ? prefs.contract : '\\d{10}') + '[\\s\\S]*?<\\/tr>)', 'i');

    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.contract ? 'вклад с номером договора ' + prefs.contract : 'ни одного вклада'));
    
    var result = {success: true};
    getParam(tr, result, 'currency', /<[^>]*class="b-summ"[^>]*><h4>([\s\S]*?)<\/h4>/i, replaceTagsAndSpaces, parseCurrency);
    getParam(tr, result, 'account_balance', /<[^>]*class="b-summ"[^>]*><h4>([\s\S]*?)<\/h4>/i, replaceTagsAndSpacesAndBalances, parseBalance);
    //Дата заключения договора банковского вклада
    getParam(tr, result, 'contract_date', /&#1044;&#1072;&#1090;&#1072; &#1079;&#1072;&#1082;&#1083;&#1102;&#1095;&#1077;&#1085;&#1080;&#1103; &#1076;&#1086;&#1075;&#1086;&#1074;&#1086;&#1088;&#1072; &#1073;&#1072;&#1085;&#1082;&#1086;&#1074;&#1089;&#1082;&#1086;&#1075;&#1086; &#1074;&#1082;&#1083;&#1072;&#1076;&#1072;\s*-([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseDate);
    //Статус
	//Номер договора банковского вклада
    getParam(tr, result, 'contract', /&#1053;&#1086;&#1084;&#1077;&#1088; &#1076;&#1086;&#1075;&#1086;&#1074;&#1086;&#1088;&#1072; &#1073;&#1072;&#1085;&#1082;&#1086;&#1074;&#1089;&#1082;&#1086;&#1075;&#1086; &#1074;&#1082;&#1083;&#1072;&#1076;&#1072;\s*-([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, '__tariff', /<h3><a[^>]+class="OraLink"[^>]*>([\s\S]*?)<\/a><\/h3>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'accname', /<h3><a[^>]+class="OraLink"[^>]*>([\s\S]*?)<\/a><\/h3>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}
// Новый вариант с json, переделывать не стал, потом может пригодиться
function fetchDeposit2(baseurl, json){
    var prefs = AnyBalance.getPreferences();
    if(prefs.contract && !/^\d{6,10}$/.test(prefs.contract))
        throw new AnyBalance.Error('Пожалуйста, введите 10 цифр номера договора вклада, по которому вы хотите получить информацию, или не вводите ничего, чтобы получить информацию по первому вкладу.');

    for(var i=0; i<json.data.length; ++i){
        var dep = json.data[i];
        if(dep.type == 'deposit'){
            var result = {success: true};

            /*getParam(dep.loan.amount, result, 'credit_sum', null, replaceTagsAndSpacesAndBalances, parseBalance);

            var url = getParam(card.link, null, null, /\/hb\/faces\/(.*)/);
            var html = AnyBalance.requestGet(baseurl + url); //Сразу получаем страницу деталей.

            var num = getParam(html, null, null, /&#1053;&#1086;&#1084;&#1077;&#1088; &#1082;&#1088;&#1077;&#1076;&#1080;&#1090;&#1072;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
            if(prefs.contract && prefs.contract != num){
                AnyBalance.trace('Первый кредит не подошёл, ищем нужный');
                //Не угадали с кредитом, надо найти нужный. Для этого надо перейти на список всех кредитов
                html = followLink(baseurl, html, '&#1050;&#1088;&#1077;&#1076;&#1080;&#1090;&#1099;'); //Кредиты
                
                //Номер кредита (Пробуем найти кредит с нужным номером)
                var re = new RegExp('(<tr[^>]*>(?:[\\s\\S](?!</tr>))*&#1053;&#1086;&#1084;&#1077;&#1088; &#1082;&#1088;&#1077;&#1076;&#1080;&#1090;&#1072;\\s*-\\s*' + prefs.contract + '[\\s\\S]*?</tr>)', 'i');
                var tr = getParam(html, null, null, re);
                if(!tr)
                    throw new AnyBalance.Error('Не удаётся найти кредит с номером ' + prefs.contract);

                //Сумма кредита
                getParam(tr, result, 'credit_sum', /<p>Сумма кредита\s*-([\s\S]*?)<\/p>/i, replaceTagsAndSpacesAndBalances, parseBalance);

                //Переходим по ссылке Информация по кредиту
                html = followLink(baseurl, html, '&#1048;&#1085;&#1092;&#1086;&#1088;&#1084;&#1072;&#1094;&#1080;&#1103; &#1087;&#1086; &#1082;&#1088;&#1077;&#1076;&#1080;&#1090;&#1091;', tr);
            }

            //Остаток задолженности
            getParam(html, result, 'credit_balance', /&#1054;&#1089;&#1090;&#1072;&#1090;&#1086;&#1082; &#1079;&#1072;&#1076;&#1086;&#1083;&#1078;&#1077;&#1085;&#1085;&#1086;&#1089;&#1090;&#1080;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpacesAndBalances, parseBalance);
            getParam(html, result, ['currency', 'credit_sum', 'account_balance', 'payment_sum'], /&#1054;&#1089;&#1090;&#1072;&#1090;&#1086;&#1082; &#1079;&#1072;&#1076;&#1086;&#1083;&#1078;&#1077;&#1085;&#1085;&#1086;&#1089;&#1090;&#1080;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
            //Остаток на счете
            getParam(html, result, 'account_balance', /&#1054;&#1089;&#1090;&#1072;&#1090;&#1086;&#1082; &#1085;&#1072; &#1089;&#1095;&#1105;&#1090;&#1077;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpacesAndBalances, parseBalance);
            //Номер кредита
            getParam(html, result, 'contract', /&#1053;&#1086;&#1084;&#1077;&#1088; &#1082;&#1088;&#1077;&#1076;&#1080;&#1090;&#1072;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
            //Дата заключения договора
            getParam(html, result, 'contract_date', /&#1044;&#1072;&#1090;&#1072; &#1079;&#1072;&#1082;&#1083;&#1102;&#1095;&#1077;&#1085;&#1080;&#1103; &#1076;&#1086;&#1075;&#1086;&#1074;&#1086;&#1088;&#1072;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
            //Следующий платеж
            getParam(html, result, 'payment_sum', /&#1057;&#1083;&#1077;&#1076;&#1091;&#1102;&#1097;&#1080;&#1081; &#1087;&#1083;&#1072;&#1090;&#1077;&#1078;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpacesAndBalances, parseBalance);
            //Оплатить до
            getParam(html, result, 'writeoff_date', /&#1054;&#1087;&#1083;&#1072;&#1090;&#1080;&#1090;&#1100; &#1076;&#1086;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
            //До списывания платежа осталось
            getParam(html, result, 'left', /&#1044;&#1086; &#1089;&#1087;&#1080;&#1089;&#1099;&#1074;&#1072;&#1085;&#1080;&#1103; &#1087;&#1083;&#1072;&#1090;&#1077;&#1078;&#1072;\s*(?:<[^>]*>\s*)*&#1086;&#1089;&#1090;&#1072;&#1083;&#1086;&#1089;&#1100;\s*(\d+)\s*&#1076;&#1085;/i, replaceTagsAndSpacesAndBalances, parseBalance);
            //Название продукта
            getParam(html, result, 'accname', /<div[^>]+class="b-product-item">([\s\S]*?)<\/h2>/i, replaceTagsAndSpaces, html_entity_decode);
            getParam(html, result, '__tariff', /<div[^>]+class="b-product-item">([\s\S]*?)<\/h2>/i, replaceTagsAndSpaces, html_entity_decode);*/

            AnyBalance.setResult(result);

            break;
        }
    }

    if(!AnyBalance.isSetResultCalled())
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.contract ? 'кредит с номером ' + prefs.contract : 'ни одного кредита'));

    AnyBalance.setResult(result);
}


function followLink(baseurl, html, name, fragment){
    var re = new RegExp('<a[^>]+onclick="submitForm[^"]+source:\'([^\']*)[^>]*>' + name + '</a>', 'i');
    var source = getParam(fragment || html, null, null, re);
    var token = getParam(html, null, null, /<input[^>]+name="oracle.adf.faces.STATE_TOKEN"[^>]*value="([^"]*)/i, null, html_entity_decode);
    var action = getParam(html, null, null, /<form[^>]+name="mainform"[^>]*action="\/hb\/faces\/([^"]*)/i, null, html_entity_decode);
    return AnyBalance.requestPost(baseurl + action, {
        'oracle.adf.faces.FORM':'mainform',
        'oracle.adf.faces.STATE_TOKEN':token,
        event:'',
        source:source
    });
}

function fetchCredit(baseurl, json){
    var prefs = AnyBalance.getPreferences();
    if(prefs.contract && !/^\d{6,10}$/.test(prefs.contract))
        throw new AnyBalance.Error('Пожалуйста, введите номер кредита, по которому вы хотите получить информацию, или не вводите ничего, чтобы получить информацию по первому кредиту.');

    for(var i=0; i<json.data.length; ++i){
        var card = json.data[i];
        if(card.type == 'loan'){
            var result = {success: true};

            getParam(card.loan.amount, result, 'credit_sum', null, replaceTagsAndSpacesAndBalances, parseBalance);

            var url = getParam(card.link, null, null, /\/hb\/faces\/(.*)/);
            var html = AnyBalance.requestGet(baseurl + url); //Сразу получаем страницу деталей.

            var num = getParam(html, null, null, [/&#1053;&#1086;&#1084;&#1077;&#1088; &#1076;&#1086;&#1075;&#1086;&#1074;&#1086;&#1088;&#1072;(?:[^>]*>){2,4}<td[^>]*>([\s\S]*?)<\/td>/i, /&#1053;&#1086;&#1084;&#1077;&#1088; &#1082;&#1088;&#1077;&#1076;&#1080;&#1090;&#1072;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i], replaceTagsAndSpaces, html_entity_decode);
            if(prefs.contract && prefs.contract != num){
                AnyBalance.trace('Первый кредит не подошёл, ищем нужный');
                //Не угадали с кредитом, надо найти нужный. Для этого надо перейти на список всех кредитов
                html = followLink(baseurl, html, '&#1050;&#1088;&#1077;&#1076;&#1080;&#1090;&#1099;'); //Кредиты
                
                //Номер кредита (Пробуем найти кредит с нужным номером)
                var re = new RegExp('(<tr[^>]*>(?:[\\s\\S](?!</tr>))*&#1053;&#1086;&#1084;&#1077;&#1088; &#1082;&#1088;&#1077;&#1076;&#1080;&#1090;&#1072;\\s*-\\s*' + prefs.contract + '[\\s\\S]*?</tr>)', 'i');
                var tr = getParam(html, null, null, re);
                if(!tr)
                    throw new AnyBalance.Error('Не удаётся найти кредит с номером ' + prefs.contract);

                //Сумма кредита
                getParam(tr, result, 'credit_sum', /<p>Сумма кредита\s*-([\s\S]*?)<\/p>/i, replaceTagsAndSpacesAndBalances, parseBalance);

                //Переходим по ссылке Информация по кредиту
                html = followLink(baseurl, html, '&#1048;&#1085;&#1092;&#1086;&#1088;&#1084;&#1072;&#1094;&#1080;&#1103; &#1087;&#1086; &#1082;&#1088;&#1077;&#1076;&#1080;&#1090;&#1091;', tr);
            }

            //Остаток задолженности
            getParam(html, result, 'credit_balance', /&#1054;&#1089;&#1090;&#1072;&#1090;&#1086;&#1082; &#1079;&#1072;&#1076;&#1086;&#1083;&#1078;&#1077;&#1085;&#1085;&#1086;&#1089;&#1090;&#1080;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpacesAndBalances, parseBalance);
            getParam(html, result, ['currency', 'credit_sum', 'account_balance', 'payment_sum'], /&#1054;&#1089;&#1090;&#1072;&#1090;&#1086;&#1082; &#1079;&#1072;&#1076;&#1086;&#1083;&#1078;&#1077;&#1085;&#1085;&#1086;&#1089;&#1090;&#1080;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
            //Остаток на счете
            getParam(html, result, 'account_balance', /&#1054;&#1089;&#1090;&#1072;&#1090;&#1086;&#1082; &#1085;&#1072; &#1089;&#1095;&#1105;&#1090;&#1077;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpacesAndBalances, parseBalance);
            //Номер кредита
            getParam(html, result, 'contract', /&#1053;&#1086;&#1084;&#1077;&#1088; &#1082;&#1088;&#1077;&#1076;&#1080;&#1090;&#1072;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
            //Дата заключения договора
            getParam(html, result, 'contract_date', /&#1044;&#1072;&#1090;&#1072; &#1079;&#1072;&#1082;&#1083;&#1102;&#1095;&#1077;&#1085;&#1080;&#1103; &#1076;&#1086;&#1075;&#1086;&#1074;&#1086;&#1088;&#1072;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
            //Следующий платеж
            getParam(html, result, 'payment_sum', /&#1057;&#1083;&#1077;&#1076;&#1091;&#1102;&#1097;&#1080;&#1081; &#1087;&#1083;&#1072;&#1090;&#1077;&#1078;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpacesAndBalances, parseBalance);
            //Оплатить до
            getParam(html, result, 'writeoff_date', /&#1054;&#1087;&#1083;&#1072;&#1090;&#1080;&#1090;&#1100; &#1076;&#1086;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
            //До списывания платежа осталось
            getParam(html, result, 'left', /&#1044;&#1086; &#1089;&#1087;&#1080;&#1089;&#1099;&#1074;&#1072;&#1085;&#1080;&#1103; &#1087;&#1083;&#1072;&#1090;&#1077;&#1078;&#1072;\s*(?:<[^>]*>\s*)*&#1086;&#1089;&#1090;&#1072;&#1083;&#1086;&#1089;&#1100;\s*(\d+)\s*&#1076;&#1085;/i, replaceTagsAndSpacesAndBalances, parseBalance);
            //Название продукта
            getParam(html, result, 'accname', /<div[^>]+class="b-product-item">([\s\S]*?)<\/h2>/i, replaceTagsAndSpaces, html_entity_decode);
            getParam(html, result, '__tariff', /<div[^>]+class="b-product-item">([\s\S]*?)<\/h2>/i, replaceTagsAndSpaces, html_entity_decode);

            AnyBalance.setResult(result);

            break;
        }
    }

    if(!AnyBalance.isSetResultCalled())
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.contract ? 'кредит с номером ' + prefs.contract : 'ни одного кредита'));

    AnyBalance.setResult(result);
}
