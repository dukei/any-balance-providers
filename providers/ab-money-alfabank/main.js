/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_countersTable = {
	common: {
		'userName': 'info.fio',
	}, 
	card: {
		"__forceAvailable": ['cards.accnum', 'cards.credit'],
    	"balance": "cards.balance",
		"currency": "cards.currency",
		"topay": "credits.minpay",
		"paytill": "credits.pay_till",
		"debt": "credits.debt",
		"blocked": ["accounts.blocked", "credits.blocked"],
		"own": ["accounts.own", "credits.own"],
		"gracetill": "credits.grace_till",
		"till": "cards.till",
		"status": "cards.status",
		"cardnum": "cards.num",
		"accnum": "cards.accnum",
		"limit": ["accounts.limit", "credits.limit"],
		"acctype": "cards.acctype",
		"cardtype": "cards.type",
		"status": "cards.status",
		"__tariff": "cards.num",
	},
	crd: {
    	"balance": "credits.balance",
		"currency": "credits.currency",
		"topay": "credits.minpay",
		"paytill": "credits.pay_till",
		"debt": "credits.debt",
		"blocked": "credits.blocked",
		"own": "credits.own",
		"gracetill": "credits.grace_till",
		"accnum": "credits.__id",
		"limit": "credits.limit",
		"acctype": "credits.__name",
		"__tariff": "credits.__name",
	},
    acc: {
    	"balance": "accounts.balance",
		"currency": "accounts.currency",
		"blocked": "accounts.blocked",
		"own": "accounts.own",
		"limit": "accounts.limit",
		"acctype": "accounts.type",
		"__tariff": "accounts.num",
    },
	dep: {
    	"balance": "deposits.balance",
		"currency": "deposits.currency",
		"till": "deposits.till",
		"accnum": "deposits.accnum",
		"acctype": "deposits.__name",
		"__tariff": "deposits.__name",
	}
};

var g_accountNumberForCard;

function main2(){
	var prefs = AnyBalance.getPreferences();
    if(!/^(card|acc|dep|crd)$/i.test(prefs.type || ''))
    	prefs.type = 'card';
	
    var adapter = new NAdapter(joinObjects(g_countersTable[prefs.type], g_countersTable.common), shouldProcess);
	
    adapter.processInfo2 = adapter.envelope(processInfo2);
    adapter.processCards2 = adapter.envelope(processCards2);
    adapter.processAccounts2 = adapter.envelope(processAccounts2);
    adapter.processDeposits2 = adapter.envelope(processDeposits2);
    adapter.processCredits2 = adapter.envelope(processCredits2);
	
	var result = {success: true};
	
	adapter.processInfo2(g_mainHtml, result);
	
	if(prefs.type == 'card') {
		adapter.processCards2(g_mainHtml, result);
		
		if(!adapter.wasProcessed('cards'))
			throw new AnyBalance.Error(prefs.cardnum ? 'Не найдена карта с последними цифрами ' + prefs.cardnum : 'У вас нет ни одной карты!');

		g_accountNumberForCard = adapter.traverse(result, 'cards.accnum');
		var credit = adapter.traverse(result, 'cards.credit');

		if(g_accountNumberForCard){
			if(credit)
				adapter.processCredits2(g_mainHtml, result);
			else
				adapter.processAccounts2(g_mainHtml, result);
		}else{
			AnyBalance.trace('Не удалось найти номер счета для карты...');
		}
		
		result = adapter.convert(result);
	} else if(prefs.type == 'acc') {
		adapter.processAccounts2(g_mainHtml, result);

		if(!adapter.wasProcessed('accounts'))
			throw new AnyBalance.Error(prefs.cardnum ? 'Не найден счет с последними цифрами ' + prefs.cardnum : 'У вас нет ни одного счета!');
		
		result = adapter.convert(result);
	} else if(prefs.type == 'crd') {
		adapter.processCredits2(g_mainHtml, result);

		if(!adapter.wasProcessed('loans'))
			throw new AnyBalance.Error(prefs.cardnum ? 'Не найден кредит с последними цифрами ' + prefs.cardnum : 'У вас нет ни одного кредита!');
		
		result = adapter.convert(result);
	} else if(prefs.type == 'dep') {
		adapter.processDeposits2(g_mainHtml, result);
		
		if(!adapter.wasProcessed('deposits'))
			throw new AnyBalance.Error(prefs.cardnum ? 'Не найден депозит последними цифрами ' + prefs.cardnum : 'У вас нет ни одного депозита!');
		
		result = adapter.convert(result);
	}
	
	AnyBalance.setResult(result);
}

function shouldProcess(counter, info){
	var prefs = AnyBalance.getPreferences();
	
	switch(counter){
		case 'cards':
		{
			if(prefs.type != 'card')
				return false;
		    if(!prefs.cardnum)
		    	return true;
			
			if(endsWith(info.__id, prefs.cardnum))
				return true;
		    
			return false;
		}
		case 'accounts':
		{
			if(prefs.type == 'acc'){
		        if(!prefs.cardnum)
		        	return true;
				
				if(endsWith(info.__id, prefs.cardnum))
					return true;
		    }else if(prefs.type == 'card'){
		    	return endsWith(info.__id, g_accountNumberForCard);
		    }
		}
		case 'credits':
		{
			if(prefs.type == 'crd'){
		        if(!prefs.cardnum)
		        	return true;
				
				if(endsWith(info.__id, prefs.cardnum))
					return true;
		    }else if(prefs.type == 'card'){
		    	return endsWith(info.__id, g_accountNumberForCard);
		    }
		}	
		case 'deposits':
		{
			if(prefs.type != 'dep')
				return false;
		    if(!prefs.cardnum)
		    	return true;
			
			if(endsWith(info.__id, prefs.cardnum))
				return true;
		}
		default:
			return false;
	}
}


function main(){
	var html = login({allowClick10: true});
	if(isClick20(html)){
	    main2();
	}else{
        if(prefs.type == 'card')
            processCard(html, baseurl);
        else if(prefs.type == 'acc')
            processAccount(html, baseurl);
        else if(prefs.type == 'dep')
            processDep(html, baseurl);
        else if(prefs.type == 'crd' || prefs.type == 'credit')
            processCredit(html, baseurl);
        else 
            processCard(html, baseurl);
	}
}

var g_currencyDependancy = ['currency', 'balance', 'topay', 'debt', 'minpay', 'penalty', 'late', 'overdraft', 'limit'];

var g_wasMainPage = false;

function getMainPageOrModule(html, type, baseurl) {
	var commands = {
		card: 'MCD__cardlist',
		acc: 'MAC__accountlist',
		dep: 'MDP__depositlist',
		crd: 'MCR__credits'
	};
	var action = getParam(html, null, null, /<form[^>]*name="f1"[^>]*action="\/(ALFAIBSR[^"]*)/i, null, html_entity_decode);
	if (!action) throw new AnyBalance.Error('Не удаётся найти форму ввода команды. Сайт изменен?');
	var viewstate = getParam(html, null, null, /<input[^>]*name="javax.faces.ViewState"[^>]*value="([^"]*)/i, null, html_entity_decode);
	if (!viewstate) throw new AnyBalance.Error('Не удаётся найти ViewState. Сайт изменен?');
	if (!g_wasMainPage) {
		var paramsMainPage = createParams([
			['pt1:r1:0:dt1:rangeStart', '0'],
			['pt1:r4:0:table1:rangeStart', '0'],
			['pt1:r2:0:t1:rangeStart', '0'],
			['org.apache.myfaces.trinidad.faces.FORM', 'f1'],
			['javax.faces.ViewState', viewstate],
			['oracle.adf.view.rich.RENDER', 'pt1:left:ATP1_r1'],
			['event', 'pt1:left:ATP1_r1:0:' + commands[type]],
			['event.pt1:left:ATP1_r1:0:' + commands[type], '<m xmlns="http://oracle.com/richClient/comm"><k v="type"><s>action</s></k></m>'],
			['oracle.adf.view.rich.PROCESS', 'pt1:left:ATP1_r1']
		]);
		g_wasMainPage = true;
		html = AnyBalance.requestPost(baseurl + action, paramsMainPage, addHeaders({
			"Adf-Rich-Message": "true"
		}));
	} else {
		var rangeStart = getParam(html, null, null, /<input[^>]*name="([^"]*rangeStart)/i, null, html_entity_decode);
		var paramsModule = createParams([
			rangeStart ? [rangeStart, '0'] : null, ['org.apache.myfaces.trinidad.faces.FORM', 'f1'],
			['javax.faces.ViewState', viewstate],
			['oracle.adf.view.rich.RENDER', 'pt1:left:ATP1_r1'],
			['event', 'pt1:left:ATP1_r1:0:' + commands[type]],
			['event.pt1:left:ATP1_r1:0:' + commands[type], '<m xmlns="http://oracle.com/richClient/comm"><k v="type"><s>action</s></k></m>'],
			['oracle.adf.view.rich.PROCESS', 'pt1:left:ATP1_r1']
		]);
		html = AnyBalance.requestPost(baseurl + action, paramsModule, addHeaders({
			"Adf-Rich-Message": "true"
		}));
	}
	return getParam(html, null, null, /<fragment><!\[CDATA\[([\s\S]*?)\]\]>/); //Вычленяем html;
}

function getDetails(html, event, baseurl, renderAndProcess) {
	var action = getParam(html, null, null, /<form[^>]*name="f1"[^>]*action="\/(ALFAIBSR[^"]*)/i, null, html_entity_decode);
	if (!action) 
		throw new AnyBalance.Error('Не удаётся найти форму ввода команды для получения деталей. Сайт изменен?');
	var viewstate = getParam(html, null, null, /<input[^>]*name="javax.faces.ViewState"[^>]*value="([^"]*)/i, null, html_entity_decode);
	if (!viewstate)
		throw new AnyBalance.Error('Не удаётся найти ViewState для получения деталей. Сайт изменен?');
	var rangeStart = getParam(html, null, null, /<input[^>]*name="([^"]*rangeStart)/i, null, html_entity_decode);
	if (!rangeStart)
		throw new AnyBalance.Error('Не удаётся найти rangeStart. Сайт изменен?');
	
	var paramsModule = createParams([
		[rangeStart, '0'],
		['org.apache.myfaces.trinidad.faces.FORM', 'f1'],
		['javax.faces.ViewState', viewstate],
		['event', event],
		['event.' + event, '<m xmlns="http://oracle.com/richClient/comm"><k v="type"><s>action</s></k></m>'],
		['oracle.adf.view.rich.PPR_FORCED', 'true']
	]);
	
	html = AnyBalance.requestPost(baseurl + action, paramsModule, addHeaders({"Adf-Rich-Message": "true"}));
	
	html = getParam(html, null, null, /<fragment><!\[CDATA\[([\s\S]*?)\]\]>/); //Вычленяем html;
	//Проверим на Функционал временно недоступен
	var error = getParam(html, null, null, /(&#1060;&#1091;&#1085;&#1082;&#1094;&#1080;&#1086;&#1085;&#1072;&#1083; &#1074;&#1088;&#1077;&#1084;&#1077;&#1085;&#1085;&#1086; &#1085;&#1077;&#1076;&#1086;&#1089;&#1090;&#1091;&#1087;&#1077;&#1085;[^<]*)/,	null, html_entity_decode);
	if (error)
		throw new AnyBalance.Error(error);
	
	return html;
}

function processCard(html, baseurl){
    html = getMainPageOrModule(html, 'card', baseurl);
    
    var prefs = AnyBalance.getPreferences();
    if(prefs.cardnum && !/^\d{4}$/.test(prefs.cardnum))
        throw new AnyBalance.Error("Введите 4 последних цифры номера карты или не вводите ничего, чтобы показать информацию по первой карте");

    var re = new RegExp('(<tr[^>]*>(?:[\\s\\S](?!<\\/tr>))*>\\d{4}\\s*[\\d\\*]{4}\\s*\\*{4}\\s*' + (prefs.cardnum ? prefs.cardnum : '\\d{4}') + '<[\\s\\S]*?<\\/tr>)', 'i');
    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.cardnum ? 'карту с последними цифрами ' + prefs.cardnum : 'ни одной карты'));
    
    var result = {success: true};
    getParam(tr, result, g_currencyDependancy, /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'till', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'cardnum', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'cardtype', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'acctype', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    var id = getParam(tr, null, null, /<a[^>]*id="([^"]*)[^>]*>/i, null, html_entity_decode);
    if(!id){
        var cardnum = getParam(tr, null, null, /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        throw new AnyBalance.Error('Не удается найти ID карты ' + cardnum);
    }

    html = getDetails(html, id, baseurl);
    //ФИО
    getParam(html, result, 'userName', /&#1060;&#1048;&#1054;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    //Статус
    getParam(html, result, 'status', /&#1057;&#1090;&#1072;&#1090;&#1091;&#1089;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    //Номер счета
    getParam(html, result, 'accnum', /&#1053;&#1086;&#1084;&#1077;&#1088;\s*&#1089;&#1095;&#1077;&#1090;&#1072;:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    //Баланс
    getParam(html, result, 'balance', /&#1041;&#1072;&#1083;&#1072;&#1085;&#1089;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    //Тип карты
    var type = getParam(html, null, null, /&#1058;&#1080;&#1087;\s*&#1082;&#1072;&#1088;&#1090;&#1099;:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	
    if (type && /кредитн/i.test(type) && AnyBalance.isAvailable('topay', 'paytill', 'minpay', 'penalty', 'late', 'overdraft', 'limit', 'debt', 'gracetill')) {
    	var accnum = getParam(html, null, null, /&#1053;&#1086;&#1084;&#1077;&#1088;\s*&#1089;&#1095;&#1077;&#1090;&#1072;:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    	if (!accnum)
			throw new AnyBalance.Error('Не удалось найти номер счета карты!');
		
    	html = getMainPageOrModule(html, 'crd', baseurl);
    	getCreditInfo(html, result, accnum, baseurl);
    }

    AnyBalance.setResult(result);
}

function getCreditInfo(html, result, accnum, baseurl, creditonly){
    //Сколько цифр осталось, чтобы дополнить до 20
    accnum = accnum || '';
    var accprefix = accnum.length;
    accprefix = 20 - accprefix;

    var re = new RegExp('(<tr[^>]*>(?:[\\s\\S](?!<\\/tr>))*>[^<]*' + (accprefix > 0 ? '\\d{' + accprefix + '}' : '') + accnum + '<[\\s\\S]*?<\\/tr>)', 'i');
    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (accnum ? 'кредитный счет с последними цифрами ' + accnum : 'ни одного кредитного счета!'));

    if(creditonly){
        getParam(tr, result, 'accnum', /(\d{20})/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(tr, result, 'acctype', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    }

    var id = getParam(tr, null, null, /<a[^>]*id="([^"]*)[^>]*>/i, null, html_entity_decode);
    if(!id){
        var accnum = getParam(tr, null, null, /(\d{20})/i, replaceTagsAndSpaces, html_entity_decode);
        throw new AnyBalance.Error('Не удается найти ID счета ' + accnum);
    }

    html = getDetails(html, id, baseurl);

    //Сумма к оплате:
    getParam(html, result, 'topay', /&#1057;&#1091;&#1084;&#1084;&#1072;\s*&#1082;\s*&#1086;&#1087;&#1083;&#1072;&#1090;&#1077;:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    //Оплатить до|Дата платежа
    getParam(html, result, 'paytill', /(?:&#1054;&#1087;&#1083;&#1072;&#1090;&#1080;&#1090;&#1100;\s*&#1076;&#1086;|&#1044;&#1072;&#1090;&#1072;\s*&#1087;&#1083;&#1072;&#1090;&#1077;&#1078;&#1072;):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    //Минимальный платеж|Ежемесячный платеж
    getParam(html, result, 'minpay', /(?:&#1052;&#1080;&#1085;&#1080;&#1084;&#1072;&#1083;&#1100;&#1085;&#1099;&#1081;\s*&#1087;&#1083;&#1072;&#1090;&#1077;&#1078;|&#1045;&#1078;&#1077;&#1084;&#1077;&#1089;&#1103;&#1095;&#1085;&#1099;&#1081;\s*&#1087;&#1083;&#1072;&#1090;&#1077;&#1078;)[^:]*:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    //Штрафы
    getParam(html, result, 'penalty', /&#1064;&#1090;&#1088;&#1072;&#1092;&#1099;[^:]*:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    //Просроченная задолженность
    getParam(html, result, 'late', /&#1055;&#1088;&#1086;&#1089;&#1088;&#1086;&#1095;&#1077;&#1085;&#1085;&#1072;&#1103;\s*&#1079;&#1072;&#1076;&#1086;&#1083;&#1078;&#1077;&#1085;&#1085;&#1086;&#1089;&#1090;&#1100;:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    //Несанкционированный перерасход
    getParam(html, result, 'overdraft', /&#1053;&#1077;&#1089;&#1072;&#1085;&#1082;&#1094;&#1080;&#1086;&#1085;&#1080;&#1088;&#1086;&#1074;&#1072;&#1085;&#1085;&#1099;&#1081;\s*&#1087;&#1077;&#1088;&#1077;&#1088;&#1072;&#1089;&#1093;&#1086;&#1076;:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    //Общая задолженность|Остаток задолженности
    getParam(html, result, 'debt', /(?:&#1054;&#1073;&#1097;&#1072;&#1103;\s*&#1079;&#1072;&#1076;&#1086;&#1083;&#1078;&#1077;&#1085;&#1085;&#1086;&#1089;&#1090;&#1100;|&#1054;&#1089;&#1090;&#1072;&#1090;&#1086;&#1082;\s*&#1079;&#1072;&#1076;&#1086;&#1083;&#1078;&#1077;&#1085;&#1085;&#1086;&#1089;&#1090;&#1080;):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    //Дата о?кончания льготного периода
    getParam(html, result, 'gracetill', /&#1044;&#1072;&#1090;&#1072;\s*(?:&#1086;)?&#1082;&#1086;&#1085;&#1095;&#1072;&#1085;&#1080;&#1103;\s*&#1083;&#1100;&#1075;&#1086;&#1090;&#1085;&#1086;&#1075;&#1086;\s*&#1087;&#1077;&#1088;&#1080;&#1086;&#1076;&#1072;:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    //Установленный лимит|Начальная сумма кредита
    getParam(html, result, 'limit', /(?:&#1059;&#1089;&#1090;&#1072;&#1085;&#1086;&#1074;&#1083;&#1077;&#1085;&#1085;&#1099;&#1081; (?:&#1082;&#1088;&#1077;&#1076;&#1080;&#1090;&#1085;&#1099;&#1081; )?&#1083;&#1080;&#1084;&#1080;&#1090;|&#1053;&#1072;&#1095;&#1072;&#1083;&#1100;&#1085;&#1072;&#1103; &#1089;&#1091;&#1084;&#1084;&#1072; &#1082;&#1088;&#1077;&#1076;&#1080;&#1090;&#1072;)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    if(creditonly) {
        //Доступный лимит
        getParam(html, result, 'balance', /&#1044;&#1086;&#1089;&#1090;&#1091;&#1087;&#1085;&#1099;&#1081;\s*&#1083;&#1080;&#1084;&#1080;&#1090;:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, g_currencyDependancy, /&#1044;&#1086;&#1089;&#1090;&#1091;&#1087;&#1085;&#1099;&#1081;\s*&#1083;&#1080;&#1084;&#1080;&#1090;:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
    }
}

function processCredit(html, baseurl){
    var prefs = AnyBalance.getPreferences();
    if(prefs.cardnum && !/^\d{4,}$/.test(prefs.cardnum))
        throw new AnyBalance.Error("Введите не меньше 4 последних цифр номера кредитного счета или не вводите ничего, чтобы показать информацию по первому кредитному счету");

    html = getMainPageOrModule(html, 'crd', baseurl);

    var result = {success: true};

    getCreditInfo(html, result, prefs.cardnum, baseurl, true);

    AnyBalance.setResult(result);
}

function processAccount(html, baseurl){
    var prefs = AnyBalance.getPreferences();
    if(prefs.cardnum && !/^\d{4,}$/.test(prefs.cardnum))
        throw new AnyBalance.Error("Введите не меньше 4 последних цифр номера счета или не вводите ничего, чтобы показать информацию по первому счету");

    html = getMainPageOrModule(html, 'acc', baseurl);
    
    //Сколько цифр осталось, чтобы дополнить до 20
    var accnum = prefs.cardnum || '';
    var accprefix = accnum.length;
    accprefix = 20 - accprefix;

    var re = new RegExp('(<tr[^>]*>(?:[\\s\\S](?!<\\/tr>))*>' + (accprefix > 0 ? '\\d{' + accprefix + '}' : '') + accnum + '<[\\s\\S]*?<\\/tr>)', 'i');
    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (accnum ? 'счет с последними цифрами ' + accnum : 'ни одного счета'));

    var result = {success: true};

    getParam(tr, result, g_currencyDependancy, /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
    getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'acctype', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'accnum', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}

function processDep(html, baseurl){
    var prefs = AnyBalance.getPreferences();
    if(prefs.cardnum && !/^\d{4,}$/.test(prefs.cardnum))
        throw new AnyBalance.Error("Введите не меньше 4 последних цифр номера счета депозита или не вводите ничего, чтобы показать информацию по первому депозиту");

    html = getMainPageOrModule(html, 'dep', baseurl);
    
    //Сколько цифр осталось, чтобы дополнить до 20
    var accnum = prefs.cardnum || '';
    var accprefix = accnum.length;
    accprefix = 20 - accprefix;

    var re = new RegExp('(<tr[^>]*>(?:[\\s\\S](?!<\\/tr>))*>' + (accprefix > 0 ? '\\d{' + accprefix + '}' : '') + accnum + '<[\\s\\S]*?<\\/tr>)', 'i');
    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (accnum ? 'депозит с последними цифрами ' + accnum : 'ни одного депозита'));

    var result = {success: true};

    getParam(tr, result, g_currencyDependancy, /(?:[\s\S]*?<td[^>]*>){7}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
    getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){7}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'acctype', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'accnum', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'till', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}
