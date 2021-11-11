/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Encoding': 'gzip, deflate, br',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.6',
	'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.82 Safari/537.36'
};

var baseurl = "https://halvacard.ru";
var g_csrf;
var g_savedData;

function main(){
    var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');	
	
    AnyBalance.setDefaultCharset('utf-8');
	
	if(!g_savedData)
		g_savedData = new SavedData('halva', prefs.login);

	g_savedData.restoreCookies();

    AnyBalance.trace ('Пробуем войти в личный кабинет...');
	
	var html = AnyBalance.requestGet(baseurl + '/lk', g_headers);
	
	if(AnyBalance.getLastStatusCode() >= 400){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сайт Халва-Совкомбанк временно недоступен. Попробуйте ещё раз позже');
    }
	
	if(/window.isAuthUser = 1/i.test(html)){
		AnyBalance.trace('Похоже, мы уже в личном кабинете');
	}else{
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		clearAllCookies();
    	loginSite(prefs);
    }

    var result = {success: true};
	
	html = AnyBalance.requestGet(baseurl + '/lk/api/account/products', g_headers);
	
	var json = getJson(html);
	var cards = json.cards;
	AnyBalance.trace('Найдено карт: ' + cards.length);
	for (var i=0; i<cards.length; i++) {
		var num = getParam(cards[i].cards[0].maskedNumber);
		AnyBalance.trace('Номер карты: ' + num);
		var cardId = cards[i].cards[0].id;
		AnyBalance.trace('ID карты: ' + cardId);
		if(prefs.lastdigits && endsWith(num, prefs.lastdigits)) {
			var cardId = cards[i].cards[0].id;
		}else{
			var cardId = cards[0].cards[0].id;
		}
    }
	
	if (AnyBalance.isAvailable('balance', 'balance_own', 'balance_credit', 'credit_limit', 'min_payment', 'next_pay_date', 'outstand_debt', 'overdue_days', 'overdue_debt', 'currency', 'acc_number', 'agreement', 'agreement', 'agreement_date', 'acc_number_credit', 'agreement_credit', 'agreement_date_credit', 'card', '__tariff', 'card_name', 'card_type', 'card_pay_sys', 'card_burn', 'next_sett_date', 'cashback', 'cashback_expect', 'cashback_expect_date', 'scores', 'scores_expect')) {
		AnyBalance.trace('Пробуем получить данные по счету...');
	
	    html = AnyBalance.requestGet(baseurl + '/lk/api/card/' + cardId + '/extended', g_headers);
	
	    var json = getJsonEval(html);
	    AnyBalance.trace(JSON.stringify(json));
		
		var cardData = getJson(html).cards[0]; // Информация по карте
	    var cashBackInfo = getJson(html).cashBackInfo; // Данные по кешбэку
	
	    getParam(json.balance, result, 'balance', null, null, parseBalance);
		getParam(json.ownFunds, result, 'balance_own', null, null, parseBalance);
		getParam(json.creditBalance, result, 'balance_credit', null, null, parseBalance);
		getParam(json.creditLimit, result, 'credit_limit', null, null, parseBalance);
		getParam(json.minPayment, result, 'min_payment', null, null, parseBalance);
		getParam(json.nextPayDate, result, 'next_pay_date', null, null, parseDateISO);
		getParam(json.outstandingDebt, result, 'outstand_debt', null, null, parseBalance);
		getParam(json.overdueDays, result, 'overdue_days', null, null, parseBalance);
		getParam(json.overdueDebt, result, 'overdue_debt', null, null, parseBalance);
		getParam(json.currencyInfo.symbol, result, ['currency', 'balance']);
		getParam(json.accountNumber, result, 'acc_number');
		getParam(json.agreementNumber, result, 'agreement');
		getParam(json.agreementStartDate, result, 'agreement_date', null, null, parseDateISO);
		getParam(json.creditAccountNumber, result, 'acc_number_credit');
		getParam(json.creditAgreementNumber, result, 'agreement_credit');
		getParam(json.creditAgreementStartDate, result, 'agreement_date_credit', null, null, parseDateISO);
		getParam (cardData.maskedNumber, result, 'card', /\S{16}$/, [/(\S{4})(\S{4})(\S{4})(\S{4})/, "$1 $2 $3 $4"]);
		getParam (cardData.maskedNumber, result, '__tariff', /\S{16}$/, [/(\S{4})(\S{4})(\S{4})(\S{4})/, "$1 $2 $3 $4"]);
		getParam(cardData.productName, result, 'card_name');
		var card_type = {
			CREDIT: 'Кредитная',
			DEBET: 'Дебетовая'
		};
		getParam (card_type[cardData.cardType]||cardData.cardType, result, 'card_type');
		getParam(cardData.paymentSystem, result, 'card_pay_sys');
		getParam(cardData.expirationDate, result, 'card_burn', null, null, parseDateISO);
		getParam(cardData.nextSettlementDate, result, 'next_sett_date', null, null, parseDateISO);
		getParam(cashBackInfo.cashBackBalance, result, 'cashback', null, null, parseBalance);
		getParam(cashBackInfo.expectedCashBack, result, 'cashback_expect', null, null, parseBalance);
		getParam(cashBackInfo.expectedCashBackDate, result, 'cashback_expect_date', null, null, parseDateISO);
		getParam(cashBackInfo.totalScoresBalance, result, 'scores', null, null, parseBalance);
		getParam(cashBackInfo.totalExpectedScores, result, 'scores_expect', null, null, parseBalance);
		
	}
	
	if (AnyBalance.isAvailable('fio', 'phone')) {
		AnyBalance.trace('Пробуем получить данные по пользователю...');
	
	    html = AnyBalance.requestGet(baseurl + '/lk/api/account/user-info', g_headers);
	
	    var json = getJsonEval(html);
	    AnyBalance.trace(JSON.stringify(json));
		
		var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d)(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+$1 $2 $3-$4-$5'];
		getParam(json.fullName, result, 'fio');
		getParam(json.phone, result, 'phone', null, replaceNumber);
		
	}
	
	if (AnyBalance.isAvailable('exp_full_amount', 'exp_loan_amount', 'exp_own_amount', 'income_amount', 'last_operation')) {
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
	
	    if (operData.length != 0) {
	        getParam(histData.expensesFullAmount, result, 'exp_full_amount', null, null, parseBalance);
	    	getParam(histData.expensesLoanAmount, result, 'exp_loan_amount', null, null, parseBalance);
	    	getParam(histData.expensesOwnAmount, result, 'exp_own_amount', null, null, parseBalance);
	    	getParam(histData.incomeAmount, result, 'income_amount', null, null, parseBalance);
		
	        var lastOperSum = getParam(lastOper.accountAmount, null, null, null, null, parseBalance);
	    	var lastOperDate = getParam(lastOper.transactionDateTime.replace(/(\d{4})-(\d{2})-(\d{2})(?:[\s\S]*)/,'$3.$2.$1'));
	    	var lastOperDesc = getParam(lastOper.description);
	    	var lastOperName = getParam(lastOper.operationName);
		
	    	var g_oper_dir = {
	    		OUTGO: '-',
	    		INCOME: '+'
	    	};
	    	var oper_dir = getParam(g_oper_dir[lastOper.direction]||lastOper.direction);
		
	    	var g_lastOperCat = {
	    		ReportCat_other: 'Прочее',
	    		ReportCat_cashout: 'Операции в банкомате',
	    		ReportCat_travels: 'Путешествия',
	    		ReportCat_transfers: 'Переводы',
	    		ReportCat_cafe: 'Рестораны и кафе',
	    		undefined: 'Неизвестно'
	    	};
	    	var lastOperCat = getParam(g_lastOperCat[lastOper.operationCategory]||lastOper.operationCategory);
		
	    	var oper = lastOperDate + '; ' + oper_dir + ' ' + lastOperSum + ' ₽; ';
	    	oper += lastOperName + ' (' + lastOperDesc + '); ';
	    	oper += 'Категория: ' + lastOperCat;
        	getParam(oper, result, 'last_operation');
	    }else {
	    	getParam('Нет операций', result, 'last_operation');
	    }		
	}	
	
	AnyBalance.setResult(result);
}

function getHalvaJson(html){
	try {
		var json = getJson(html);
	} catch(e) {
		AnyBalance.trace(html);
		
		if(/При загрузке страницы произошла ошибка|Страницу загрузить не удалось/i.test(html))
			throw new AnyBalance.Error('Сайт временно работает с перебоями, попробуйте обновить данные позже');
		
		throw new AnyBalance.Error('Не удалось получить информацию. Пожалуйста, свяжитесь с разработчиком');
	}

	return json;
}

function loginSite(prefs){
    var html = AnyBalance.requestGet(baseurl + '/lk', g_headers);

    g_csrf = getParam(html, /<meta[^>]+name="csrf-token"[^>]*content="([^"]*)/i, replaceHtmlEntities);
	if(AnyBalance.getLastStatusCode() >= 400){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сайт Халва-Совкомбанк временно недоступен. Попробуйте ещё раз позже');
    }
	if(/технически|technical/i.test(html)){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('На сайте ведутся технические работы. Попробуйте ещё раз позже');
	}
	if(!g_csrf){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменён?');
	}

	var captcha = solveRecaptcha('Пожалуйста, докажите, что вы не робот', AnyBalance.getLastUrl(), JSON.stringify({SITEKEY: '6LfmTIIaAAAAAPz7Y3RQeu1hIY-W9-DkEk-LUXtn', TYPE: 'V3', ACTION: 'login', USERAGENT: g_headers['User-Agent']}));
	var params = [
		['login',prefs.login],
		['pass',prefs.password],
		['captchaWord',''],
		['token', captcha],
		['action','login'],
	];
	
	AnyBalance.trace('Пробуем войти по логину ' + prefs.login + ' и паролю...');
	
	html = AnyBalance.requestPost(baseurl + '/lk/api/auth-log/log-pas', params, addHeaders({
		'Accept': 'application/json, text/plain, */*',
		'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
		'Referer': baseurl + '/lk',
		'X-CSRF-Token': g_csrf,
	}));
	
	var json = getHalvaJson(html);
	AnyBalance.trace(JSON.stringify(json));

    if (/Recaptcha blocked/i.test(json)) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Личный кабинет временно заблокирован. Попробуйте ещё раз позже');
    }else if (json.errorCode) {
    	if (json.level == "FAIL") {
			var error = json.message;
        	if (error) {
				AnyBalance.trace(html);
        		throw new AnyBalance.Error(error);	
        	}

        	AnyBalance.trace(html);
        	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменён?');
        }
    }else {
		var code = AnyBalance.retrieveCode('Пожалуйста, введите код подтверждения, высланный на номер ' + prefs.login, null, {inputType: 'number', time: 170000});

		var otp = [
	    	['pin',code],
	    ];
	
	    AnyBalance.trace('Сайт затребовал проверку с помощью кода подтверждения из SMS');
	
	    html = AnyBalance.requestPost(baseurl + '/lk/api/auth-log/otp', otp, addHeaders({
	    	'Accept': 'application/json, text/plain, */*',
	    	'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
	    	'Referer': baseurl + '/lk',
	    	'X-CSRF-Token': g_csrf,
	    }));
	
	    var json = getHalvaJson(html);
	    AnyBalance.trace(JSON.stringify(json));
		
		if (json.errorCode) {
    	    if (json.level == "FAIL") {
		    	var error = json.message;
            	if (error) {
		    		AnyBalance.trace(html);
            		throw new AnyBalance.Error(error);	
            	}

            	AnyBalance.trace(html);
            	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменён?');
            }
        }
	
	}
	
	g_savedData.setCookies();
	g_savedData.save();
	return html;
}
