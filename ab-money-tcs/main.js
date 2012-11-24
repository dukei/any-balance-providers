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

    var baseurl = "https://www.tcsbank.ru";
    AnyBalance.setDefaultCharset('utf-8');

    var html;
    if(!prefs.__debug){ //Вход в отладчике глючит, поэтому входим вручную, а проверяем только извлечение счетчиков
//        html = AnyBalance.requestGet(baseurl + '/authentication/?service=http%3A%2F%2Fwww.tcsbank.ru%2Fbank%2F', headers);

        html = AnyBalance.requestPost('https://auth.tcsbank.ru/cas/login', {
            callback:'jQuery171018063926370814443_1348651876467',
            service: baseurl + '/bank/',
            _eventId:'submit',
            asyncAuthError: baseurl + '/service/auth_error/',
            username:prefs.login,
            password:prefs.password,
            async:true,
            _: new Date().getTime()
        }, g_headers);

//        AnyBalance.trace(html);
        var json = getParam(html, null, null, /^jQuery\w+\(\s*(.*)\)\s*$/i);
        if(json){
            var json = getJson(json);
            if(json.resultCode == 'AUTHENTICATION_FAILED')
                throw new AnyBalance.Error(json.errorMessage || 'Авторизация прошла неуспешно. Проверьте логин и пароль.');
            if(json.resultCode != 'OK')
                throw new AnyBalance.Error("Вход в интернет банк не удался: " + json.resultCode);
        }else{
            var logout = getParam(html, null, null, /(\/authentication\/logout)/i);
            if(!logout)
                throw new AnyBalance.Error("Не удалось зайти в интернет банк. Неправильный логин-пароль?");
        }
    }
        
    var accounts = AnyBalance.requestGet(baseurl + '/service/accounts', addHeaders({'X-Requested-With':'XMLHttpRequest', Referer: baseurl + '/bank/accounts/'}));
    accounts = getJson(accounts);

    if(accounts.resultCode != 'OK')
        throw new AnyBalance.Error('Не удалось получить список карт: ' + accounts.resultCode);

    if(prefs.type == 'card'){
        fetchCard(accounts, baseurl);
    }else if(prefs.type == 'dep'){
        fetchDep(accounts, baseurl);
    }else{
        fetchCard(accounts, baseurl);
    }
}

function fetchCard(accounts, baseurl){
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
    result.__tariff = thiscard.name;

    if(AnyBalance.isAvailable('minpaytill', 'limit', 'freeaddleft')){
        var accinfo = AnyBalance.requestGet(baseurl + '/service/account_info?request=current&account=' + card.id, addHeaders({'X-Requested-With':'XMLHttpRequest', Referer: baseurl + '/bank/accounts/'}));
        accinfo = getJson(accinfo);
        if(accinfo.resultCode == 'OK'){
            for(var i=0; i<accinfo.payload.length; ++i){
                var cat = accinfo.payload[i];
                for(var j=0; j<cat.fields.length; ++j){
                    var field = cat.fields[j];
                    if(field.label == 'Кредитный лимит' && AnyBalance.isAvailable('limit'))
                        result.limit = field.value.value;
                    if(field.label == 'Оплатить до' && AnyBalance.isAvailable('minpaytill'))
                        result.minpaytill = parseDate(field.value);
                    if(field.label == 'Осталось бесплатных пополнений' && AnyBalance.isAvailable('freeaddleft'))
                        result.freeaddleft = field.value;
                }
            }
        }else{
            AnyBalance.trace('Не удалось получить расширенную информацию по карте: ' + JSON.stringify(accinfo));
        }
    }
    
    AnyBalance.setResult(result);
}

function fetchDep(accounts, baseurl){
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
    result.__tariff = dep.name;

    if(AnyBalance.isAvailable('pcts')){
        var accinfo = AnyBalance.requestGet(baseurl + '/service/account_info?request=current&account=' + dep.id, addHeaders({'X-Requested-With':'XMLHttpRequest', Referer: baseurl + '/bank/accounts/'}));
        accinfo = getJson(accinfo);
        if(accinfo.resultCode == 'OK'){
            for(var i=0; i<accinfo.payload.length; ++i){
                var cat = accinfo.payload[i];
                for(var j=0; j<cat.fields.length; ++j){
                    var field = cat.fields[j];
                    if(field.label == 'Начислено процентов за весь период' && AnyBalance.isAvailable('pcts'))
                        result.pcts = field.value.value;
                }
            }
        }else{
            AnyBalance.trace('Не удалось получить расширенную информацию по депозиту: ' + JSON.stringify(accinfo));
        }
    }
    
    AnyBalance.setResult(result);
}

