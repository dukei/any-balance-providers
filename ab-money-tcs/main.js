/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток и другие параметры карт банка Тинькофф Кредитные Системы, используя систему Интернет-Банк.

Сайт оператора: http://www.tcsbank.ru/
Личный кабинет: https://www.tcsbank.ru/authentication/?service=http%3A%2F%2Fwww.tcsbank.ru%2Fbank%2F
*/

var g_headers = {
    'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.60 Safari/537.1'
}

function main(){
    var prefs = AnyBalance.getPreferences();
    if(AnyBalance.getLevel() < 4)
        throw new AnyBalance.Error('Этот провайдер требует AnyBalance API v.4+');

    var basedomain = "www.tcsbank.ru";
    var baseurl = "https://" + basedomain;
    AnyBalance.setDefaultCharset('utf-8');

    var html, sessionid;
    html = AnyBalance.requestGet(baseurl + '/api/v1/session/?username=' + encodeURIComponent(prefs.login) + '&password=' + encodeURIComponent(prefs.password), g_headers);

	if(/технические работы/i.test(html)) {
		throw new AnyBalance.Error('В настоящий момент на сайте проводятся технические работы. Попробуйте запустить обновление позже.');
	}	
	
    json = getJson(html);
    if(json.resultCode == 'AUTHENTICATION_FAILED')
        throw new AnyBalance.Error(json.errorMessage || 'Авторизация прошла неуспешно. Проверьте логин и пароль.');
    if(json.resultCode && json.resultCode != 'OK')
        throw new AnyBalance.Error("Вход в интернет банк не удался: " + json.resultCode);

    sessionid = json.payload.sessionid || json.payload.sessionId;

    if(!sessionid){
        var error = json.errorMessage;
        if(error)
            throw new AnyBalance.Error(error);
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось найти идентификатор сессии. Сайт изменен?');
    }
        
    AnyBalance.setCookie(basedomain, 'sessionid', sessionid);
	/*    
    if(!prefs.__debug){ //Вход в отладчике глючит, поэтому входим вручную, а проверяем только извлечение счетчиков
        //Устанавливает JSESSIONID
        AnyBalance.requestGet(baseurl + '/authentication/?service=' + encodeURIComponent(baseurl + '/bank/'), g_headers);

        html = AnyBalance.requestPost('https://auth.tcsbank.ru/cas/login', {
            callback:'jQuery1820823795270640403_1355329522395',
            stamp:'_1355329529005_835711790',
            service: baseurl + '/api/v1/session/',
            _eventId:'submit',
            asyncAuthError: baseurl + '/api/v1/auth_error/',
            username:prefs.login,
            password:prefs.password,
            async:true,
            _: new Date().getTime()
        }, addHeaders({Referer: baseurl + '/authentication/?service=' + baseurl + '/bank/accounts/'}));

        //AnyBalance.trace(html);
        var json = getParam(html, null, null, /^jQuery\w+\(\s*(.*)\)\s*$/i);
        if(json){
            var json = getJson(json);
            if(json.resultCode == 'AUTHENTICATION_FAILED')
                throw new AnyBalance.Error(json.errorMessage || 'Авторизация прошла неуспешно. Проверьте логин и пароль.');
            if(json.resultCode != 'OK')
                throw new AnyBalance.Error("Вход в интернет банк не удался: " + json.resultCode);
            if(!json.payload)
                throw new AnyBalance.Error("Не удалось найти идентификатор сессии!");
            sessionid = json.payload;
            AnyBalance.setCookie(basedomain, 'sessionid', sessionid);
        }else{
            //Не вернулся json. Наверное, в чем-то проблема
            throw new AnyBalance.Error("Не удалось зайти в интернет банк. Сайт изменен?");
        }
    }else{
        //В отладчике просто получаем куки в уже зайденной сессии
        var sessionid = AnyBalance.getCookie('sessionid', {domain: 'www.tcsbank.ru'});
        if(!sessionid)
            throw new AnyBalance.Error("Зайдите в ТКС банк вручную, затем запустите отладчик");
    } */

    //Данные грузятся только после получения этой страницы, хитрецы, блин...
    AnyBalance.requestGet(baseurl + '/bank/accounts/', g_headers);

    var accounts = AnyBalance.requestGet(baseurl + '/api/v1/accounts/?sessionid=' + sessionid, addHeaders({
        Accept:'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With':'XMLHttpRequest',
        Referer: baseurl + '/bank/accounts/'
    }));
    
	if(/технические работы/i.test(accounts)) {
		throw new AnyBalance.Error('В настоящий момент на сайте проводятся технические работы. Попробуйте запустить обновление позже.');
	}
	
    accounts = getJson(accounts);

    if(accounts.resultCode != 'OK')
        throw new AnyBalance.Error('Не удалось получить список карт: ' + accounts.resultCode);

    if(prefs.type == 'card'){
        fetchCard(accounts, baseurl, sessionid);
    }else if(prefs.type == 'dep'){
        fetchDep(accounts, baseurl, sessionid);
    }else{
        fetchCard(accounts, baseurl, sessionid);
    }
}

function fetchCard(accounts, baseurl, sessionid){
    var cards = [];
    for(var i=0; i<accounts.payload.length; ++i){
        if(/карты/i.test(accounts.payload[i].name)){
            cards = cards.concat(accounts.payload[i].accounts);
        }
    }
    if(cards.length == 0)
        throw new AnyBalance.Error("У вас нет ни одной карты!");
    accounts = cards;

    var prefs = AnyBalance.getPreferences();
    if(prefs.num && !/^\d{4}$/.test(prefs.num))
        throw new AnyBalance.Error("Укажите 4 последних цифры карты или не указывайте ничего, чтобы получить информацию по первой карте.");

    var card = null;
    var cardNumber = 0;

    if(!prefs.num){
        card = accounts[0];
    }else{
        findcard: 
        for(var i=0; i<accounts.length; ++i){
            for(var j=0; j<accounts[i].cardNumbers.length; ++j){
                 if(endsWith(accounts[i].cardNumbers[j].value, prefs.num)){
                     card = accounts[i];
                     cardNumber = j;
                     break findcard;
                 }
            }
        }
    }
    
    if(!card)
        throw new AnyBalance.Error("Не удалось найти карту с последними цифрами " + prefs.num);

    var result = {success: true};
    
    var thiscard = card.cardNumbers[cardNumber];

    if(AnyBalance.isAvailable('balance'))
        result.balance = thiscard.availableBalance.value;
    if(AnyBalance.isAvailable('currency'))
        result.currency = card.moneyAmount.currency.name;
    if(AnyBalance.isAvailable('debt') && isset(card.debtAmount))
        result.debt = card.debtAmount.value;
    if(AnyBalance.isAvailable('minpay') && isset(card.currentMinimalPayment))
        result.minpay = card.currentMinimalPayment.value;
    
    if(AnyBalance.isAvailable('name'))
        result.name = thiscard.name;
    if(AnyBalance.isAvailable('cardnum'))
        result.cardnum = thiscard.value;
    if(AnyBalance.isAvailable('accnum'))
        result.accnum = card.externalAccountNumber;
    if(AnyBalance.isAvailable('freeaddleft') && card.renewalAmountLeft)
        result.freeaddleft = parseBalance(card.renewalAmountLeft.value+'');
    if(AnyBalance.isAvailable('till') && isset(thiscard.expiration))
        result.till = thiscard.expiration.milliseconds;
    if(AnyBalance.isAvailable('limit') && isset(card.creditLimit))
        result.limit = card.creditLimit.value;
    if(AnyBalance.isAvailable('minpaytill') && isset(card.duedate))
        result.minpaytill = card.duedate.milliseconds;

    if(AnyBalance.isAvailable('pcts')){
        //Информация по выписке
        var statements = AnyBalance.requestGet(baseurl + '/api/v1/statements/?sessionid=' + sessionid + '&account=' + card.id, addHeaders({
            Accept:'application/json, text/javascript, */*; q=0.01',
            'X-Requested-With':'XMLHttpRequest',
            Referer: baseurl + '/bank/accounts/'
        }));
    
        try{
            statements = getJson(statements).payload[0]; //получаем самую последнюю выписку

            if(AnyBalance.isAvailable('pcts') && isset(statements.interest))
                result.pcts = statements.interest.value;
        }catch(e){
            AnyBalance.trace('Не удалось получить информацию по выписке: ' + e.message);
        }
    }

    result.__tariff = thiscard.name;
    
    AnyBalance.setResult(result);
}

function fetchDep(accounts, baseurl, sessionid){
    var deps = [];
    for(var i=0; i<accounts.payload.length; ++i){
        if(/Вклады/i.test(accounts.payload[i].name)){
            deps = deps.concat(accounts.payload[i].accounts);
        }
    }
    if(deps.length == 0)
        throw new AnyBalance.Error("У вас нет ни одного депозита!");
    accounts = deps;

    var prefs = AnyBalance.getPreferences();
    if(prefs.num && !/^\d{4,}$/.test(prefs.num))
        throw new AnyBalance.Error("Укажите не менее 4 последних цифр номера депозита, или не указывайте ничего, чтобы получить информацию по первому депозиту.");

    var dep = null;

    if(!prefs.num){
        dep = accounts[0];
    }else{
        finddep: 
        for(var i=0; i<accounts.length; ++i){
            if(endsWith(accounts[i].externalAccountNumber, prefs.num)){
                dep = accounts[i];
                break finddep;
            }
        }
    }
    
    if(!dep)
        throw new AnyBalance.Error("Не удалось найти депозит с последними цифрами " + prefs.num);

    var result = {success: true};
    
    if(AnyBalance.isAvailable('balance'))
        result.balance = dep.moneyAmount.value;
    if(AnyBalance.isAvailable('currency'))
        result.currency = dep.moneyAmount.currency.name;
//    if(AnyBalance.isAvailable('startAmount'))
//        result.startAmount = dep.startAmount;
    if(AnyBalance.isAvailable('name'))
        result.name = dep.name;
    if(AnyBalance.isAvailable('accnum'))
        result.accnum = dep.externalAccountNumber;
    if(AnyBalance.isAvailable('rate'))
        result.rate = dep.depositRate;
    if(AnyBalance.isAvailable('till'))
        result.till = dep.plannedCloseDate.milliseconds;
    if(AnyBalance.isAvailable('pcts') && isset(dep.interest))
        result.pcts = dep.interest.value;
    result.__tariff = dep.name;
    
    AnyBalance.setResult(result);
}

