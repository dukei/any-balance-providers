/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 			'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset': 	'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 	'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 		'keep-alive',
	'User-Agent': 		'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.87 Safari/537.36'
};

var baseurl;

function login() {
	var prefs = AnyBalance.getPreferences();

	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	AnyBalance.setOptions({PER_DOMAIN: {'enter.unicredit.ru': {SSL_ENABLED_CIPHER_SUITES_ADD: ['SSL_RSA_WITH_3DES_EDE_CBC_SHA']}}});

	baseurl = prefs.login != 'demo' ? "https://enter.unicredit.ru/v2/cgi/bsi.dll?" : "http://demo.enter.unicredit.ru/v2/cgi/bsi.dll?";

	var html = AnyBalance.requestGet(baseurl + 'T=RT_2Auth.BF', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту интернет-банка! Попробуйте обновить данные позже.');
	}

	if (!/exit/i.test(html)) {
		var mapId 		  = getParam(html, null, null, /<input[^>]*id="MapID"[^>]*value="([^"]*)"/i);
		var map 		  = getParam(html, null, null, /<input[^>]*id="Map"[^>]*value="([^"]*)"/i);
		var encryptedPass = encryptPass(prefs.password, map);


		html = AnyBalance.requestPost(baseurl, {
			tic: 		0,
			T:			'RT_2Auth.CL',
			A:			prefs.login,
			B:			encryptedPass,
			L:			'RUSSIAN',
			IdCaptcha:	'',
			C:			'',
			MapID:		mapId || '',
			BROWSER:	'Crome',
			BROWSERVER: '21.0.1180.60'
		}, addHeaders({
			Referer: baseurl + 'T=RT_2Auth.BF'
		}));

	}else{
		AnyBalance.trace('Уже залогинены, используем существующую сессию')
	}

	if (!/ClientInfo/i.test(html)) {
		var error = getParam(html, null, null, /<BSS_ERROR>\d*\|?([\s\S]*?)<\/BSS_ERROR>/i, [replaceTagsAndSpaces, /\[br\]/ig, '']);
		if (error)
			throw new AnyBalance.Error(error, null, /Ошибка при вводе логина или пароля/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в интернет-банк. Сайт изменен?');
	}

	var jsonInfo = getParam(html, null, null, /ClientInfo=(\{[\s\S]*?\})\s*(?:<\/div>|$)/i);
	if(!jsonInfo)
		throw new AnyBalance.Error("Не удалось найти информацию о сессии в ответе банка.");

	jsonInfo = JSON.parse(jsonInfo);

    __setLoginSuccessful();
	
	return jsonInfo;
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка счетов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processAccounts(jsonInfo, result) {
    if(!AnyBalance.isAvailable('accounts'))
        return;

	var html = AnyBalance.requestPost(baseurl, {
		SID:jsonInfo.SID,
		tic:1,
		T:'RT_2IC.form',
		nvgt:1,
		SCHEMENAME:'ACCOUNTSLIST',
		XACTION:''
	}, g_headers);

	var error = getParam(html, null, null, /<REDIRECT>[\s\S]*?'(NO)ACCOUNTS'/i);
	if(error) {
        AnyBalance.trace('У Вас нет ни одного счёта!');
        return;
    }

	var accounts = getElements(html, /<div[^>]+div-corner div-accounts[^>]*>/ig);
	if(!accounts.length) {
		var accID = getParam(html, null, null, /<REDIRECT>[\s\S]*?AccID=(\d+)/i);
		if(!accID) {
			AnyBalance.trace(html);
			AnyBalance.trace("Не удалось найти cчета!");
			return;
		}

		accounts[0] = AnyBalance.requestPost(baseurl, {
			SID:		jsonInfo.SID,
			tic:		1,
			T:			'RT_2IC.form',
			nvgt:		1,
			SCHEMENAME:	'ACCOUNT',
			XACTION:	'',
			AccID: 		accID
		}, g_headers);
	}

	AnyBalance.trace("Найдено счетов: " + accounts.length);
	result.accounts = [];

	for(var i = 0; i < accounts.length; i++) {
		var acc   = accounts[i];

		var id    = getParam(acc, null, null, /Номер счета(?:[^>]*>){3}([\s\S]*?)<\//i);
		var num   = getParam(acc, null, null, /Номер счета(?:[^>]*>){3}([\s\S]*?)<\//i);
		var title = getParam(acc, null, null, /<div[^>]+formheader(?:[^>]*>){8}([\s\S]*?)<\//i, replaceTagsAndSpaces);

		var c     = {__id: id, __name: title, num: num};

		if (__shouldProcess('accounts', c)) {
			processAccount(acc, c, jsonInfo, accID);
		}

		result.accounts.push(c);

	}
}

function processAccount(account, result, jsonInfo, accID){
    AnyBalance.trace('Обработка счета ' + result.__name);

	if(!accID) {
		accID = getParam(card, null, null, /cardID=(\d+)/i);
		if(!accID) {
			AnyBalance.trace(account);
			AnyBalance.trace("Не удалось найти ID счёта для запроса!");
			return;
		}

		account = AnyBalance.requestPost(baseurl, {
			SID:		jsonInfo.SID,
			tic:		1,
			T:			'RT_2IC.form',
			nvgt:		1,
			SCHEMENAME:	'ACCOUNT',
			XACTION:	'',
			AccID: 		accID
		}, g_headers)
	}

	getParam(account, result, 'accounts.balance', /<span[^>]+veryBig fat[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(account, result, ['accounts.currency', 'accounts.balance'], /<span[^>]+veryBig fat[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseCurrency);
	getParam(account, result, 'accounts.date_start', /Дата открытия(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDateWord);
	getParam(account, result, 'accounts.receiver', /Получатель(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(account, result, 'accounts.receiversINN', /ИНН получателя(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(account, result, 'accounts.type', /accRest(?:[^>]*>){7}([\s\S]*?)<\//i, replaceTagsAndSpaces);

	if(AnyBalance.isAvailable('accounts.transactions')) {
		processAccountTransactions(accID, jsonInfo, result);
    }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка карт
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(jsonInfo, result) {
	if(!AnyBalance.isAvailable('cards'))
		return;

	var html = AnyBalance.requestPost(baseurl, {
		SID:		jsonInfo.SID,
		tic:		1,
		T:			'RT_2IC.form',
		nvgt:		1,
		SCHEMENAME:	'CARDSLIST',
		XACTION:	''
	}, g_headers);

	var error = getParam(html, null, null, /<REDIRECT>[\s\S]*?'(NO)CARDS'/i);
	if(error) {
        AnyBalance.trace('У Вас нет ни одной карты!');
        return;
    }

	var cards = getElements(html, /<div[^>]+div-corner div-cards[^>]*>/ig);
	if(!cards.length){
		var cardID = getParam(html, null, null, /<REDIRECT>[\s\S]*?CardID=(\d+)/i);
		if(!cardID) {
			AnyBalance.trace(html);
			AnyBalance.trace("Не удалось найти карты!");
			return;
		}

		cards[0] = AnyBalance.requestPost(baseurl, {
			SID:		jsonInfo.SID,
			tic:		1,
			T:			'RT_2IC.form',
			nvgt:		1,
			SCHEMENAME:	'CARD',
			XACTION:	'',
			CardID: 	cardID
		}, g_headers);

	}

	AnyBalance.trace('Найдено карт: ' + cards.length);
	result.cards = [];
	
	for(var i=0; i < cards.length; ++i){
		var card  = cards[i];

		var id    = getParam(card, null, null, [/Номер карты:\s*([\d\*]*)/i, /<span[^>]+verybig fat(?:[^>]*>){3}([\s\S]*?)<div/i]);
		var num   = getParam(card, null, null, [/Номер карты:\s*([\d\*]*)/i, /<span[^>]+verybig fat(?:[^>]*>){3}([\s\S]*?)<div/i], replaceTagsAndSpaces);
		var title = getParam(card, null, null, [/<div[^>]+div-b[^>]*>([\s\S]*?)<\/div>/i, /<span[^>]+verybig fat(?:[^>]*>){6}([\s\S]*?)<\/div>/i], replaceTagsAndSpaces);

		var c = {__id: id, __name: title, num: num};

		if (__shouldProcess('cards', c)) {
			processCard(card, c, jsonInfo, cardID);
		}

		result.cards.push(c);
	}
}

function processCard(card, result, jsonInfo, cardID) {
    AnyBalance.trace('Обработка карты ' + result.__name);

	if(!cardID) {
		cardID = getParam(card, null, null, /cardID=(\d+)/i);
		if(!cardID) {
			AnyBalance.trace(card);
			AnyBalance.trace("Не удалось найти ID карты для запроса!");
			return;
		}

		card = AnyBalance.requestPost(baseurl, {
			SID:		jsonInfo.SID,
			tic:		1,
			T:			'RT_2IC.form',
			nvgt:		1,
			SCHEMENAME:	'CARD',
			XACTION:	'',
			CardID: 	cardID
		}, g_headers)
	}

	getParam(card, result, 'cards.balance', /<span[^>]+veryBig fat[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(card, result, 'cards.limit', /Кредитный лимит(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(card, result, 'cards.overdraftLimit', /овердрафтный лимит(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(card, result, 'cards.own', /Собственные средства(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(card, result, 'cards.minpay', /Минимальный платёж(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(card, result, 'cards.sumInProgress', /Транзакции в обработке(?:[^>]*>){4}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);

	getParam(card, result, 'cards.pct', /процентная ставка(?:[^>]*>){3}([^%]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(card, result, ['cards.currency', 'cards.overdraftLimit', 'cards.balance', 'cards.limit', 'cards.own', 'cards.minpay', 'cards.sumInProgress'], /Транзакции в обработке(?:[^>]*>){4}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseCurrency);
	getParam(card, result, 'cards.accnum', /Номер счета карты(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(card, result, 'cards.type', /<div[^>]+inforow2[^>]*>([\s\S]*?),\sактивна/i, replaceTagsAndSpaces);
	getParam(card, result, 'cards.holder', /Держатель(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(card, result, 'cards.onCardName', /Имя на карте(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(card, result, 'cards.minpay_till', /Оплатить до(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDate);
	getParam(card, result, 'cards.till', /Активна[^\d]*(\d+\.\d+\.\d+)/i, replaceTagsAndSpaces, parseDate);

	if(isAvailable('cards.transactions')) {
		processCardTransactions(cardID, jsonInfo, result);
	}
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка депозитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processDeposits(jsonInfo, result) {
	throw new AnyBalance.Error("Обработка депозитов пока не поддерживается. Пожалуйста, обратитесь к разработчикам.");

    //То, что было в старой версии положим пока сюда. Понадобится, когда нужно будет доделать депозиты.
    var html = AnyBalance.requestPost(baseurl, {
        SID:jsonInfo.SID,
        tic:1,
        T:'RT_2IC.form',
        nvgt:1,
        SCHEMENAME:'DEPOSITSLIST',
        XACTION:''
    }, headers);

    var error = getParam(html, null, null, /<REDIRECT>[\s\S]*?'(NO)DEPOSITS'/i);
    if(error)
        throw new AnyBalance.Error('У вас нет ни одного вклада');

    var depid = getParam(html, null, null, /<REDIRECT>[\s\S]*?DepID=([0-9A-Z]+)/i);
    if(!depid){
        var tpl = prefs.cardnum ? prefs.cardnum.toUpperCase() : '';
        var $html = $(html);

        var $dep = $html.find('div.div-b:has(span[onclick*="DepID=' + (tpl || '') + '"])').first();
        if(!$dep.size())
            throw new AnyBalance.Error('Не удаётся найти ' + (tpl ? 'сделку вклада №' + tpl : 'ни одного вклада'));

        depid = getParam($dep.html(), null, null, /DepID=([0-9A-Z]+)/i);
        if(!depid)
            throw new AnyBalance.Error('Не удаётся найти номер сделки для вклада. Интернет-банк изменился?');
    }

    html = AnyBalance.requestPost(baseurl, {
        SID:jsonInfo.SID,
        tic:1,
        T:'RT_2IC.form',
        nvgt:1,
        SCHEMENAME:'DEPOSIT',
        XACTION:'',
        DepID:depid
    }, headers);

    var result = {success: true};
    getParam(html, result, 'type', /<h1>([\s\S]*?)<\/h1>/i, replaceTagsAndSpaces);
    getParam(html, result, '__tariff', /<h1>([\s\S]*?)<\/h1>/i, replaceTagsAndSpaces);
    getParam(html, result, 'balance', /Текущая сумма вклада[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'currency', /Текущая сумма вклада[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
    getParam(html, result, 'pct', /Проценты:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'period', /Срок вклада:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(depid, result, 'accnum', /(.*)/i);
    getParam(html, result, 'status', /Статус:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(jsonInfo.USR, result, 'fio', /(.*)/i, replaceTagsAndSpaces);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка кредитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCredits(jsonInfo, result) {
	if(!AnyBalance.isAvailable('credits'))
		return;

    var  html = AnyBalance.requestPost(baseurl, {
        SID:jsonInfo.SID,
        tic:1,
        T:'RT_2IC.form',
        nvgt:1,
        SCHEMENAME:'CREDITSLIST',
        XACTION:''
    }, g_headers);

    var error = getParam(html, null, null, /<REDIRECT>[\s\S]*?'(NO)CREDITS'/i);
    if(error) {
        AnyBalance.trace('У вас нет ни одного кредита.');
        return;
    }

    var credits = getElements(html, /<div[^>]+div-b[^>]*>/ig);
    if(!credits.length) {
        var creditID = getParam(html, null, null, /<REDIRECT>[\s\S]*?CrdID=([0-9A-Z]+)/i);
        if(!creditID) {
            AnyBalance.trace(html);
            AnyBalance.trace("Не удалось найти кредиты!");
            return;
        }

        credits[0] = AnyBalance.requestPost(baseurl, {
            SID:        jsonInfo.SID,
            tic:        1,
            T:          'RT_2IC.form',
            nvgt:       1,
            SCHEMENAME: 'CREDIT',
            XACTION:    '',
            CrdID:      creditID
        }, g_headers);
    }

    AnyBalance.trace("Найдено кредитов: " + credits.length);
    result.credits = [];

    for(var i = 0; i < credits.length; i++) {
        var cred   = credits[i];

        var id    = getParam(cred, null, null, [/crdid=([0-9A-Z]+)/i, /Номер сделки(?:[^>]*>){3}([^<]*)/i]);
        var num   = getParam(cred, null, null, [/crdid=([0-9A-Z]+)/i, /Номер сделки(?:[^>]*>){3}([^<]*)/i]);
        var title = getParam(cred, null, null, [/<div[^>]+div-b(?:[^>]*>){2}([^<]*)/i, /<div[^>]+actual(?:[^>]*>){7}([\s\S]*?)<\//i], replaceTagsAndSpaces);

        var c     = {__id: id, __name: title, num: num};

        if (__shouldProcess('credits', c)) {
            processCredit(cred, c, jsonInfo, creditID);
        }

        result.credits.push(c);
    }
}

function processCredit(credit, result, jsonInfo, creditID){
    AnyBalance.trace('Обработка кредита ' + result.__name);

    if(!creditID) {
        creditID = getParam(credit, null, null, /CrdID=([0-9A-Z]+)/i);
        if(!creditID) {
            AnyBalance.trace(credit);
            AnyBalance.trace("Не удалось найти ID кредита для запроса!");
            return;
        }

        credit = AnyBalance.requestPost(baseurl, {
            SID:        jsonInfo.SID,
            tic:        1,
            T:          'RT_2IC.form',
            nvgt:       1,
            SCHEMENAME: 'CREDIT',
            XACTION:    '',
            CrdID:      creditID
        }, g_headers)
    }

    getParam(credit, result, 'credits.balance', /<span[^>]+verybig fat[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(credit, result, ['credits.currency', 'credits.balance', 'credits.pay'], /<span[^>]+verybig fat[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseCurrency);
    getParam(credit, result, 'credits.limit', /Сумма кредита(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(credit, result, 'credits.till', /Срок кредита(?:[^>]*>){3}[^-]*-([^<\)]*)/i, replaceTagsAndSpaces, parseDateWord);
    getParam(credit, result, 'credits.period', /Срок кредита(?:[^>]*>){3}([^\(]*)/i, replaceTagsAndSpaces, parseBalance); //в днях
    getParam(credit, result, 'credits.date_start', /Срок кредита(?:[^>]*>){3}[^\(]*\(([^-]*)/i, replaceTagsAndSpaces, parseDateWord);
    getParam(credit, result, 'credits.paymentsLeft', /<div[^>]*>Осталось выплат(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(credit, result, 'credits.pct', /Проценты(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		getParam(credit, result, 'credits.pay', /Ближайший платёж\s*([^,]*)/i, replaceTagsAndSpaces, parseBalance);
		getParam(credit, result, 'credits.paytill', /оплатить до\s*([^<]*)/i, replaceTagsAndSpaces, parseDateWord);

    if(AnyBalance.isAvailable('credits.schedule')) {
        processCreditSchedule(credit, result);
    }
}

function processInfo(jsonInfo, result){
    var html = AnyBalance.requestPost(baseurl,{
		SID:		jsonInfo.SID,
		tic: 		1,
		T:			'RT_2IC.form',
		nvgt:		1,
		SCHEMENAME: 'USERSETS',
		XACTION: 	''
	}, g_headers);

	var info = result.info = {};

    getParam(html, info, 'info.department', /Отделение(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces);
    getParam(html, info, 'info.contract', /контракт(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces);
    getParam(html, info, 'info.date_start', /контракт(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDate);
    getParam(html, info, 'info.fullFIO', /ФИО полностью(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces);
    getParam(html, info, 'info.latFIO', /ФИО, лат(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces);
    getParam(html, info, 'info.b_day', /Дата и место рождения(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces);
    getParam(html, info, 'info.doc_type', /Вид документа(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces);
    getParam(html, info, 'info.date_issued', /Выдан(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces);
    getParam(html, info, 'info.address', /Адрес:(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces);
    getParam(html, info, 'info.hphone', /Телефон домашний(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces);
    getParam(html, info, 'info.mphone', /Мобильный(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces);
    getParam(html, info, 'info.wphone', /Рабочий телефон(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces);
    getParam(html, info, 'info.fax', /Факс(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces);
    getParam(html, info, 'info.email', /E-mail(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces);
    getParam(html, info, 'info.CK', /Комплект СК(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces);
}

function encryptPass(pass, map){
	if(map){
		var ch='', i=0, k=0, TempPass='', PassTemplate=map.split(','), Pass='';
		TempPass=pass;
		while(TempPass!=''){
			ch=TempPass.substr(0, 1);
			k = ch.charCodeAt(0);
			if(k>0xFF) k-=0x350;
			if(k==7622) k=185;
			TempPass=TempPass.length>1?TempPass.substr(1, TempPass.length):'';
			if(Pass!='')Pass=Pass+';';
			Pass=Pass+PassTemplate[k];
		}
		return Pass;
	}else{
		return pass;
	}

}