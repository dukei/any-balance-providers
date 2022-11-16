/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.6',
	'Connection': 'keep-alive',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36'
};

var baseurl = 'https://halvacard.ru';
var g_savedData;
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d)(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+$1 $2 $3-$4-$5'];

function main(){
    var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');	
	
    AnyBalance.setDefaultCharset('utf-8');
	
	if(!g_savedData)
		g_savedData = new SavedData('halva', prefs.login);

	g_savedData.restoreCookies();
	
//	var pinCode = prefs.pin || g_savedData.get('pin');
//	if(!prefs.pin)
//		g_savedData.get('pin');
	
	var html = loadProtectedPage((baseurl + '/', g_headers));
	
	if(AnyBalance.getLastStatusCode() >= 400){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сайт Халва-Совкомбанк временно недоступен. Попробуйте ещё раз позже');
    }
	
	html = AnyBalance.requestGet(baseurl + '/lk', g_headers);
	
	if(!/window.isAuthUser = 1/i.test(html)){
//		if(!pinCode || !/window.isPinAuthAvailable = true/i.test(html)){
			AnyBalance.trace('Сессия новая. Будем логиниться заново...');
			clearAllCookiesExceptProtection();
			loginSite();
//	    }else{
//		    AnyBalance.trace('PIN-код сохранен. Пробуем войти по PIN-коду...');
//		    loginPinCode();
//		}
	
	}else{
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
    }

    var result = {success: true};
	
	var html = AnyBalance.requestGet(baseurl + '/lk/api/account/products', g_headers);
	
	var json = getJson(html);
	if(json.cards && json.cards.length < 1)
		throw new AnyBalance.Error('У вас нет ни одной карты Халва-Совкомбанк');
	
	var currCard;
	for(var i=0; i<json.cards.length; ++i){
		var cardAcc = json.cards[i];
		var cardsCount = cardAcc.cards;
		for(var j=0; j<cardsCount.length; ++j){
	    	var card = cardsCount[j];
	    	AnyBalance.trace('Найдена карта ' + card.maskedNumber);
	    	if(!currCard && (!prefs.lastdigits || endsWith(card.maskedNumber, prefs.lastdigits))){
	    		AnyBalance.trace('Выбрана карта ' + card.maskedNumber);
	    		currCard = card;
	    	}
	    }
	}

    if(!currCard)
		throw new AnyBalance.Error('Не удалось найти карту с последними цифрами ' + prefs.lastdigits);
	
	var cardId = currCard.id;
	
	if (AnyBalance.isAvailable(['balance', 'balance_own', 'balance_credit', 'credit_limit', 'min_payment', 'next_pay_date', 'outstand_debt', 'overdue_days', 'overdue_debt', 'currency', 'acc_number', 'agreement', 'agreement', 'agreement_date', 'acc_number_credit', 'agreement_credit', 'agreement_date_credit', 'card', '__tariff', 'card_name', 'card_type', 'card_pay_sys', 'card_burn', 'next_sett_date', 'cashback', 'cashback_expect', 'cashback_expect_date', 'scores', 'scores_expect'])) {
		AnyBalance.trace('Пробуем получить данные по карте...');
	
	    html = AnyBalance.requestGet(baseurl + '/lk/api/card/' + cardId + '/extended', g_headers);
	
	    var json = getJsonEval(html);
	    AnyBalance.trace(JSON.stringify(json));
		
		var cardInfo = ''; // Информация по карте
		for(var i=0; i<json.cards.length; ++i){
		    var card = json.cards[i];
		    if(card.id == cardId){
				cardInfo = card;
			}
	    }
		
	    var cashBackInfo = json.cashBackInfo; // Информация по кешбэку
	
	    getParam(json.balance, result, ['balance', 'currency'], null, null, parseBalance);
		getParam(json.ownFunds, result, 'balance_own', null, null, parseBalance);
		getParam(json.creditBalance, result, 'balance_credit', null, null, parseBalance);
		getParam(json.creditLimit, result, 'credit_limit', null, null, parseBalance);
		getParam(json.minPayment && json.minPayment.amount, result, 'min_payment', null, null, parseBalance);
		getParam(json.minPayment && json.minPayment.calcDate, result, 'next_calc_date', null, null, parseDateISO);
		getParam(json.minPayment && json.minPayment.payDate, result, 'next_pay_date', null, null, parseDateISO);
		getParam(json.outstandingDebt, result, 'outstand_debt', null, null, parseBalance);
		getParam(json.overdueDays, result, 'overdue_days', null, null, parseBalance);
		getParam(json.overdueDebt, result, 'overdue_debt', null, null, parseBalance);
		getParam(json.currencyInfo.symbol, result, ['currency', 'balance']);
	    getParam(json.currencyInfo.code, result, 'currency_code');
		getParam(json.accountNumber, result, 'acc_number');
		getParam(json.agreementNumber, result, 'agreement');
		getParam(json.agreementStartDate, result, 'agreement_date', null, null, parseDateISO);
		getParam(json.creditAccountNumber, result, 'acc_number_credit');
		getParam(json.creditAgreementNumber, result, 'agreement_credit');
		getParam(json.creditAgreementStartDate, result, 'agreement_date_credit', null, null, parseDateISO);
		getParam (cardInfo.maskedNumber, result, 'card', /\S{16}$/, [/(\S{4})(\S{4})(\S{4})(\S{4})/, '$1 $2 $3 $4']);
		getParam (cardInfo.maskedNumber, result, '__tariff', /\S{16}$/, [/(\S{4})(\S{4})(\S{4})(\S{4})/, '$1 $2 $3 $4']);
		getParam(cardInfo.productName, result, 'card_name');
		var card_type = {
			CREDIT: 'Кредитная',
			DEBET: 'Дебетовая'
		};
		getParam (card_type[cardInfo.cardType]||cardInfo.cardType, result, 'card_type');
		getParam(cardInfo.paymentSystem, result, 'card_pay_sys');
		getParam(cardInfo.expirationDate, result, 'card_burn', null, null, parseDateISO);
		getParam(cardInfo.nextSettlementDate, result, 'next_sett_date', null, null, parseDateISO);
		getParam(cashBackInfo.cashBackBalance, result, 'cashback', null, null, parseBalance);
		getParam(cashBackInfo.expectedCashBack, result, 'cashback_expect', null, null, parseBalance);
		getParam(cashBackInfo.expectedCashBackDate, result, 'cashback_expect_date', null, null, parseDateISO);
		getParam(cashBackInfo.totalScoresBalance, result, 'scores', null, null, parseBalance);
		getParam(cashBackInfo.totalExpectedScores, result, 'scores_expect', null, null, parseBalance);
		
	}
	
	if (AnyBalance.isAvailable(['fio', 'phone'])) {
		AnyBalance.trace('Пробуем получить данные по пользователю...');
	
	    html = AnyBalance.requestGet(baseurl + '/lk/api/user/info', g_headers);
	
	    var json = getJsonEval(html);
	    AnyBalance.trace(JSON.stringify(json));
		
		getParam(json.fullName, result, 'fio');
		getParam(json.phone, result, 'phone', null, replaceNumber);
		
	}
	
	if (AnyBalance.isAvailable(['exp_full_amount', 'exp_loan_amount', 'exp_own_amount', 'income_amount', 'last_operation'])) {
		AnyBalance.trace('Пробуем получить данные по операциям...');
		
	    var dt = new Date();
        var dtPrev = new Date(dt.getFullYear(), dt.getMonth()-1, dt.getDate());
        var dts = dt.getFullYear() + '-' + n2(dt.getMonth()+1) + '-' + n2(dt.getDate()); // + 'T00:00:00.000Z';
        var dtPrevs = dtPrev.getFullYear() + '-' + n2(dtPrev.getMonth()+1) + '-' + n2(dtPrev.getDate()); // + 'T00:00:00.000Z';
	
	    try{
	        html = AnyBalance.requestGet(baseurl + '/lk/api/card/' + cardId + '/history-expenses?startDate=' + dtPrevs + '&endDate=' + dts, g_headers);
		
	    	var json = getJsonEval(html);
	        AnyBalance.trace(JSON.stringify(json));
		
	    	var histData = getJson(html)[0];
	    	var operData = histData.operationsList; // Список всех операций
	    	var lastOper = histData.operationsList[0]; // Последняя операция
		
	    	AnyBalance.trace('Найдено операций: ' + operData.length);
        }catch(e){
	    	AnyBalance.trace('Не удалось получить историю операций: ' + e.message);
	    }
	
	    if (operData.length>0) {
	        getParam(histData.expensesFullAmount, result, 'exp_full_amount', null, null, parseBalance);
	    	getParam(histData.expensesLoanAmount, result, 'exp_loan_amount', null, null, parseBalance);
	    	getParam(histData.expensesOwnAmount, result, 'exp_own_amount', null, null, parseBalance);
	    	getParam(histData.incomeAmount, result, 'income_amount', null, null, parseBalance);
		
	    	var dts = getParam(lastOper.transactionDateTime, null, null, null, null, parseDateISO);
			var dt = new Date(dts);
			var lastOperDate = n2(dt.getDate()) + '.' + n2(dt.getMonth()+1) + '.' + dt.getFullYear() + ' ' + n2(dt.getHours()) + ':' + n2(dt.getMinutes());
	    	var lastOperSum = getParam(lastOper.accountAmount, null, null, null, null, parseBalance);
			var lastOperDesc = getParam('' + lastOper.description);
	    	var lastOperName = getParam('' + lastOper.operationName);
		
	    	var g_oper_dir = {
	    		OUTGO: '-',
	    		INCOME: '+'
	    	};
	    	var oper_dir = getParam('' + (g_oper_dir[lastOper.direction]||lastOper.direction));
		
	    	var g_lastOperCat = {
	    		ReportCat_other: 'Прочее',
	    		ReportCat_cashout: 'Операции в банкомате',
	    		ReportCat_travels: 'Путешествия',
	    		ReportCat_transfers: 'Переводы',
	    		ReportCat_cafe: 'Рестораны и кафе',
				ReportCat_food: 'Продукты',
				ReportCat_Pets: 'Животные',
				ReportCat_transport: 'Транспорт',
				ReportCat_entert: 'Развлечения и спорт',
				ReportCat_Public_Service: 'ЖКХ',
				ReportCat_Public_travels: 'Путешествия',
				ReportCat_repair: 'Дом, ремонт',
	    		undefined: 'Неизвестно'
	    	};
	    	var lastOperCat = getParam('' + (g_lastOperCat[lastOper.operationCategory]||lastOper.operationCategory));
		
	    	var oper = 'Время: ' + lastOperDate;
			oper += '<br>Сумма: ' + oper_dir + ' '  + lastOperSum + ' ₽';
	    	oper += '<br>Описание: ' + lastOperName + ' | ' + lastOperDesc;
	    	oper += '<br>Категория: ' + lastOperCat;
        	getParam(oper, result, 'last_operation');
	    }else {
	    	getParam('Нет операций', result, 'last_operation');
	    }		
	}	
	
	AnyBalance.setResult(result);
}

function loginSite(){
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');
	
    var html = AnyBalance.requestGet(baseurl + '/lk', g_headers);
	
	var csrfToken = getParam(html, /<meta[^>]+name="csrf-token"[^>]*content="([^"]*)/i, replaceHtmlEntities);
	if(!csrfToken){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти токен авторизации. Сайт изменен?');
	}
	
	html = AnyBalance.requestPost('https://halvacard.ru/lk/api/auth-log/log-pas', {login: prefs.login, pass: prefs.password}, addHeaders({
		'Accept': 'application/json, text/plain, */*',
		'Battery-Charge': '1',
        'Browser-Language': 'ru-RU',
        'Browser-Languages': '["ru-RU"]',
        'Browser-Time-UTC': (new Date()).toISOString(),
		'Origin': baseurl,
	    'Referer': baseurl + '/lk',
		'Terminal-Screen-Res': '1600x900',
	    'X-CSRF-Token': csrfToken
	}));
	
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));

    if (/BLOCKED/i.test(html)) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Личный кабинет временно заблокирован. Попробуйте еще раз позже');
    }else if (/ERROR|FAIL/i.test(json.code)) {
		var error = json.message;
        if (error) {
			AnyBalance.trace(html);
			throw new AnyBalance.Error(error, false, /парол/i.test());
        }

        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }else{
		AnyBalance.trace('Сайт затребовал код подтверждения из SMS');
		var code = AnyBalance.retrieveCode('Пожалуйста, введите код подтверждения, высланный на номер +7' + prefs.login, null, {inputType: 'number', time: 60000});
	
	    html = AnyBalance.requestPost(baseurl + '/lk/api/auth-log/otp', {pin: code}, addHeaders({
			'Accept': 'application/json, text/plain, */*',
			'Battery-Charge': '1',
            'Browser-Language': 'ru-RU',
            'Browser-Languages': '["ru-RU"]',
            'Browser-Time-UTC': (new Date()).toISOString(),
			'Origin': baseurl,
		    'Referer': baseurl + '/lk',
			'Terminal-Screen-Res': '1600x900',
		    'X-CSRF-Token': csrfToken
		}));
	
	    var json = getJson(html);
	    AnyBalance.trace(JSON.stringify(json));
		
		if (/ERROR|FAIL/i.test(json.code)) {
		    var error = json.message;
            if (error) {
		    	AnyBalance.trace(html);
            	throw new AnyBalance.Error(error, false, /код/i.test());
            }

            AnyBalance.trace(html);
            throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
        }
	}
	
	if (json.challenge) {
//		AnyBalance.trace('Сайт затребовал установку PIN-кода'); // Халва предлагает установить PIN для входа. С ним возможно возобновление сессии без SMS
//		if(!prefs.pin){
//		    var pinCode = AnyBalance.retrieveCode('Пожалуйста, создайте PIN-код из четырех цифр и введите его в поле ниже.' + '\n\nЕсли вы не хотите устанавливать PIN-код сейчас, введите 0.\n\nВНИМАНИЕ! Без установки PIN-кода при каждом обновлении потребуется подтверждать вход с помощью кода из SMS', null, {inputType: 'number', time: 180000});
//		    if (pinCode == 0){
//				AnyBalance.trace('Установка PIN-кода отменена пользователем'); // Отменяем, чтобы получить куки авторизации
                AnyBalance.trace('Отказываемся от установки PIN-кода'); // Отменяем, чтобы получить куки авторизации (временно отказываемся от ПИН в связи с Qrator)
	            html = AnyBalance.requestPost(baseurl + '/lk/api/auth-log/cancel-pin-bio', {}, addHeaders({
					'Accept': 'application/json, text/plain, */*',
		            'Content-Type': 'application/json;charset=UTF-8',
					'Battery-Charge': '1',
                    'Browser-Language': 'ru-RU',
                    'Browser-Languages': '["ru-RU"]',
                    'Browser-Time-UTC': (new Date()).toISOString(),
					'Origin': baseurl,
		            'Referer': baseurl + '/lk',
					'Terminal-Screen-Res': '1600x900',
		            'X-CSRF-Token': csrfToken
		        }));
//				var pinCode = '';
//		    }else{
//				AnyBalance.trace('Новый PIN-код установлен'); // Отправляем, чтобы получить куки авторизации
//				html = AnyBalance.requestPost(baseurl + '/lk/api/auth-log/create-pin-bio', JSON.stringify({pin: pinCode}), addHeaders({
//					'Accept': 'application/json, text/plain, */*',
//		            'Content-Type': 'application/json;charset=UTF-8',
//					'Battery-Charge': '1',
//                    'Browser-Language': 'ru-RU',
//                    'Browser-Languages': '["ru-RU"]',
//		            'Browser-Time-UTC': (new Date()).toISOString(),
//					'Origin': baseurl,
//		            'Referer': baseurl + '/lk',
//					'Terminal-Screen-Res': '1600x900',
//		            'X-CSRF-Token': csrfToken
//	            }));
//		    }
//		}else{
//			AnyBalance.trace('PIN-код уже установлен в настройках'); // Отправляем, чтобы получить куки авторизации
//			var pinCode = prefs.pin;
//			html = AnyBalance.requestPost(baseurl + '/lk/api/auth-log/create-pin-bio', JSON.stringify({pin: pinCode}), addHeaders({
//				'Accept': 'application/json, text/plain, */*',
//		        'Content-Type': 'application/json;charset=UTF-8',
//				'Battery-Charge': '1',
//                'Browser-Language': 'ru-RU',
//                'Browser-Languages': '["ru-RU"]',
//                'Browser-Time-UTC': (new Date()).toISOString(),
//				'Origin': baseurl,
//		        'Referer': baseurl + '/lk',
//				'Terminal-Screen-Res': '1600x900',
//		        'X-CSRF-Token': csrfToken
//		    }));
//		}
	
	    var json = getJson(html);
	    AnyBalance.trace(JSON.stringify(json));
		
		if (AnyBalance.getLastStatusCode() != 200) {
		    var error = json.message;
            if (error) {
		    	AnyBalance.trace(html);
            	throw new AnyBalance.Error(error, false, /код|парол/i.test());
            }

            AnyBalance.trace(html);
            throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
        }
    }
	
	html = AnyBalance.requestGet(baseurl + '/lk', g_headers);
	
	if(!/window.isAuthUser = 1/i.test(html)){
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }
	
//	g_savedData.set('pin', pinCode);
	g_savedData.setCookies();
	g_savedData.save();
	return html;
}

function loginPinCode() {
    var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');
	
	g_savedData.restoreCookies();
	
	var pinCode = prefs.pin || g_savedData.get('pin');
	if(!prefs.pin)
		g_savedData.get('pin');
	
	var html = AnyBalance.requestGet(baseurl + '/lk', g_headers);
	
	var csrfToken = getParam(html, /<meta[^>]+name="csrf-token"[^>]*content="([^"]*)/i, replaceHtmlEntities);
	if(!csrfToken){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти токен авторизации. Сайт изменен?');
	}

    html = AnyBalance.requestPost(baseurl + '/lk/api/auth-log/log-pin', {pin: pinCode}, addHeaders({
		'Accept': 'application/json, text/plain, */*',
		'Battery-Charge': '1',
        'Browser-Language': 'ru-RU',
        'Browser-Languages': '["ru-RU"]',
        'Browser-Time-UTC': (new Date()).toISOString(),
		'Origin': baseurl,
	    'Referer': baseurl + '/lk',
		'Terminal-Screen-Res': '1600x900',
	    'X-CSRF-Token': csrfToken
	}));
	
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
		
	if(AnyBalance.getLastStatusCode() != 200){
		AnyBalance.trace('Требуется повторная авторизация');
		clearAllCookiesExceptProtection();
		loginSite();
	}
	
	html = AnyBalance.requestGet(baseurl + '/lk', g_headers);
	
	if(!/window.isAuthUser = 1/i.test(html)){
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }

	g_savedData.set('pin', pinCode);
	g_savedData.setCookies();
	g_savedData.save();
	
	return html;
}

function loadProtectedPage(headers){
	var prefs = AnyBalance.getPreferences();
	const url = 'https://halvacard.ru/';

    var html = AnyBalance.requestGet(url, headers);
    if(/__qrator/.test(html)||AnyBalance.getLastStatusCode()==403) {
        AnyBalance.trace("Обнаружена защита от роботов. Пробуем обойти...");
        clearAllCookies();

        const bro = new BrowserAPI({
            userAgent: g_headers["User-Agent"],
            rules: [{
                resType: /^(image|stylesheet|font)$/.toString(),
                action: 'abort',
            }, {
                url: /_qrator/.toString(),
                action: 'request',
            }, {
                resType: /^(image|stylesheet|font|script)$/i.toString(),
                action: 'abort',
            }, {
                url: /\.(png|jpg|ico)/.toString(),
                action: 'abort',
            }, {
                url: /.*/.toString(),
                action: 'request',
            }],
            additionalRequestHeaders: {
                headers: headers
            }
        });

        const r = bro.open(url);
        try {
            bro.waitForLoad(r.page);
            html = bro.content(r.page).content;
            const cookies = bro.cookies(r.page, url);
            BrowserAPI.useCookies(cookies);
        } finally {
            bro.close(r.page);
        }

        if(/__qrator/.test(html)||AnyBalance.getLastStatusCode()==403)
            throw new AnyBalance.Error('Не удалось обойти защиту. Сайт изменен?');

        AnyBalance.trace("Защита от роботов успешно пройдена");

        g_savedData.setCookies();
	    g_savedData.save();

    }

    return html;
}

function clearAllCookiesExceptProtection(){
    clearAllCookies(c => !/qrator|StickyID/i.test(c.name) && !/^TS0/i.test(c.name));
}
