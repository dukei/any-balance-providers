/**
 Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
 */

function trace(obj){
    AnyBalance.trace(stringifyCircular(obj));
}

function stringifyCircular(obj){
    var cache = [];

    return JSON.stringify(obj, function(key, value) {
        if (typeof value === 'object' && value !== null) {
            var idx = cache.indexOf(value);
            if (idx !== -1) {
                return idx;
            }
            // Store value in our collection
            value.__reference__id = cache.length;
            cache.push(value);
        }
        return value;
    });
}

function Message(payload, theme, properties) {
    this.__type = 'com.mobiletransport.messaging.DefaultMessageImpl';
    this.correlationId = '' + Math.floor(-2147483647 + Math.random() * 2147483647 * 2);
    this.id = '' + Math.floor(-2147483647 + Math.random() * 2147483647 * 2);
    this.payload = payload;
    this.sendTimestamp = new Date().getTime();
    this.theme = theme || 'Default theme';
    this.timeToLive = 30000;
    this.properties = new Properties(properties || {});
}

function Properties(obj) {
    this.__type = 'java.util.Hashtable';
    for (var prop in obj) {
        this[prop] = obj[prop];
    }
}

function isDate(d) {
    return Object.prototype.toString.call(d) == '[object Date]';
}

function getType(obj, name, parent) {
    if (obj === null)
        return 'null';
    if (typeof(obj) == 'object' && isDate(obj))
        return 'date';
    if (typeof(obj) == 'object' && !isArray(obj))
        return 'map';
    if (typeof(obj) == 'object' && isArray(obj))
        return 'list';
    if (typeof(obj) == 'string')
        return 'string';
    if (typeof(obj) == 'number')
        return (parent && parent.__types && parent.__types[name]) || (obj % 1 === 0 ? 'long' : 'double');
    if (typeof(obj) == 'boolean')
        return 'boolean';
    throw new AnyBalance.Error('Unknown type for ' + obj + ' (' + name + ' of ' + parent + ')');
}

function fmt2pos(n) {
    return n < 10 ? '0' + n : '' + n;
}

function fmt3pos(n) {
    return n < 10 ? '00' + n : (n < 100 ? '0' + n : '' + n);
}

function encodeXML(val) {
    return ('' + val).replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function putTypeVal(ret, type, val){
    ret.push('<', type, '>', serialize(val), '</', type, '>');
}

function serialize(obj) {
    if (obj === null) {
        return '';
    }else if (typeof(obj) == 'object' && isDate(obj)) {
        return '' + obj.getUTCFullYear() + fmt2pos(obj.getUTCMonth() + 1) + fmt2pos(obj.getUTCDate()) + 'T' + fmt2pos(obj.getUTCHours()) + fmt2pos(obj.getUTCMinutes()) + fmt2pos(obj.getUTCSeconds()) + '.' + fmt3pos(obj.getUTCMilliseconds()) + 'Z';
    } else if (typeof(obj) == 'object' && !isArray(obj)) {
        var ret = ['<type>', encodeXML(obj.__type), '</type>'];
        for (var prop in obj) {
            if (/^__types?$/.test(prop))
                continue;
            ret.push('<string>', encodeXML(prop), '</string>');
            var tp = getType(obj[prop], prop, obj);
            putTypeVal(ret, tp, obj[prop]);
        }
        return ret.join('');
    } else if (typeof(obj) == 'object' && isArray(obj)) {
        var ret = ['<type>', encodeXML(obj.__type), '</type>', '<length>', obj.length, '</length>'];
        for (var i = 0; i < obj.length; ++i) {
            var tp = getType(obj[i], null, obj);
            putTypeVal(ret, tp, obj[i]);
        }
        return ret.join('');
    } else if (typeof(obj) == 'string') {
        return encodeXML(obj);
    } else if (typeof(obj) == 'boolean') {
        return obj ? '1' : '0';
    } else if (typeof(obj) == 'number') {
        return '' + obj;
    }
}

function request(m) {
    var sm = '<map>' + serialize(m) + '</map>';

    AnyBalance.trace('Requesting ' + getParam(m.payload.__type, null, null, /\.(\w+)$/));

    var ver = "2.5.0";
    var wordsStr = CryptoJS.enc.Utf8.parse(sm);
    var wordsVer = CryptoJS.enc.Utf8.parse(ver);
    var words = new CryptoJS.lib.WordArray.init([wordsStr.sigBytes + wordsVer.sigBytes + 1, wordsVer.sigBytes << 24], 5);
    var sizesSize = words.sigBytes;
    words.concat(wordsVer).concat(wordsStr);

    var ret = AnyBalance.requestPost("https://mb.vtb24.ru/mobilebanking/burlap/", CryptoJS.enc.Base64.stringify(words), {
        'mb-protocol-version': ver,
        'mb-app-version': '0.1.46',
        Connection: 'Keep-Alive'
    });

	words = CryptoJS.enc.Base64.parse(ret);

    if (AnyBalance.getLastStatusCode() >= 400)
        throw new AnyBalance.Error('Error requesting ' + sm + ': ' + CryptoJS.enc.Utf8.stringify(words));

    var xml = CryptoJS.enc.Utf8.stringify(words, sizesSize + wordsVer.sigBytes);
    AnyBalance.trace(xml);
    var obj = deserialize(xml);

    if(typeof(obj.payload) == 'string')
        throw new AnyBalance.Error(obj.payload);

    AnyBalance.trace('Returned ' + getParam(obj.payload.__type, null, null, /\.(\w+)$/));
//    if(AnyBalance.getPreferences().__dbg)
    trace(obj);

    if(/ErrorResponse/.test(obj.payload.__type))
        throw new AnyBalance.Error(obj.payload.message, null, obj.payload.type == 'invalid-credentials');

    return obj;
}

function deserialize(xml) {
    try{
        var parser = new EasySAXParser();

        var stack = [];
        var propNamesStack = [];
        var propName = null;
        var container = null;
        var obj = null;
        var text = null;
        var refMap = [];
        var refCount = 0;

        parser.on('error', function (msg) {
            AnyBalance.trace(msg);
        });

        parser.on('startNode', function (elem, attr, uq, tagend, getStrNode) {
            text = ''; //В начале тэга всегда сбрасываем текст содержимого
            switch (elem) {
                case 'map':
                    obj = {};
                    break;
                case 'list':
                    obj = [];
                    break;
                default:
                    return; //Нечего делать
            }
            refMap[refCount++] = obj;
            stack.push(obj);
            propNamesStack.push(propName);
            propName = null; //Сбрасываем имя проперти текущее
            container = elem;
        });

        function putValue(val, getTypedVal, bSetName) {
            if (container == 'list') {
                //Просто айтем в массиве
                obj.push(getTypedVal(val));
            } else if (container == 'map') {
                if (propName) {
                    //Имя свойства уже установлено, значит, это значение
                    obj[propName] = getTypedVal(val);
                    propName = null;
                } else {
                    if(!bSetName)
                        throw new AnyBalance.Error('deserialize error: unexpected property without name: <' + elem + '>' + val);
                    else
                        propName = val;
                }
            } else {
                throw new AnyBalance.Error('deserialize error: unexpected value outside the container: <' + elem + '>' + val);
            }
        }

        parser.on('endNode', function (elem, uq, tagstart, str) {
            var val = text;
            switch (elem) {
                case 'type':
                    obj.__type = val;
                    break;
                case 'length':
                    if(container != 'list')
                        throw new AnyBalance.Error('deserialize error: unexpected length outside list: <' + elem + '>' + val);
                    //А можно и не обрабатывать, всё равно наполняем постепенно
                    break;
                case 'string':
                    putValue(val, function(val){return val}, true);
                    break;
                case 'boolean':
                    putValue(val, function(val){return val.toLowerCase() == "true" || val == "1"});
                    break;
                case 'null':
                    putValue(val, function(val){return null});
                    break;
                case 'double':
                    putValue(val, function(val){return parseFloat(val)});
                    break;
                case 'long':
                case 'int':
                    putValue(val, function(val){return parseInt(val,10)});
                    break;
                case 'date':
                    putValue(val, function(val){
                        var matches = val.match(/(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)\.(\d\d\d)Z/);
                        if(!matches)
                            throw new AnyBalance.Error('deserialize error: unexpected date format: <' + elem + '>' + val);
                        var d = new Date(0);
                        d.setUTCFullYear(parseInt(matches[1],10), parseInt(matches[2],10) - 1, parseInt(matches[3],10));
                        d.setUTCHours(parseInt(matches[4],10), parseInt(matches[5],10), parseInt(matches[6],10), parseInt(matches[7],10));
                        if(isNaN(d.getTime()))
                            throw new AnyBalance.Error('Failed to parse date: <' + elem + '> ' + val);
                        	
                        return d;
                    });
                    break;
                case 'map':
                case 'list':
                    var contObj = stack.pop();
                    propName = propNamesStack.pop();
                    if (stack.length > 0) {
                        obj = stack[stack.length - 1];
                        container = isArray(obj) ? 'list' : 'map';
                        if(container == 'map') {
                            obj[propName] = contObj;
                        }else{
                            obj.push(contObj);
                        }
                        propName = null;
                    }
                    break;
                case 'ref':
                    putValue(val, function(val){
                        var id = parseInt(val,10);
                        if(!refMap[id])
                            throw new AnyBalance.Error('Inexistent reference: ' + id + ' of ' + refMap.length);
                        return refMap[id];
                    });
                    break;
                default:
                    throw new AnyBalance.Error('deserialize error: unexpected tag: <' + elem + '>' + val);
            }
        });

        parser.on('textNode', function (s, uq) {
            text = uq(s);
        });

        parser.parse(xml);
        return obj;

    }catch(e){
        AnyBalance.trace('Error unserializing xml: ' + xml);
        AnyBalance.trace('Exception: ' + e.message + ': ' + e.stack);
        throw e;
    }

}

function isSessionValid() {
    if(!g_commonProperties['CLIENT-TOKEN'])
        return false;

    try {
        var obj = request(new Message({
            __type: 'ru.vtb24.mobilebanking.protocol.product.MainPageProductsRequest',
            portfolioTypeMto: {
                __type: 'ru.vtb24.mobilebanking.protocol.product.PortfolioTypeMto',
                id: 'ACCOUNTS_AND_CARDS'
            }
        }, null, g_commonProperties));
    } catch (e) {
        return false;
    }

    return true;
}

var g_objInfo, g_commonProperties;

function login() {
    var prefs = AnyBalance.getPreferences();

    AnyBalance.trace('Обновление из мобильного приложения');

    AnyBalance.setOptions({FORCE_CHARSET: 'base64', REQUEST_CHARSET: 'base64'});

    checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(prefs.password, 'Введите пароль!');

    // Получаем sessionID
    var sessionId = AnyBalance.getData('sessionId', prefs.sessionId || '');

    g_commonProperties = {
        APP_VERSION: '5.3.8',
        DEVICE_PLATFORM: 'ANDROID',
        'CLIENT-TOKEN': sessionId,
        'DEVICE_OS': 'Android OS 5.1.1'
    };

    if(!isSessionValid()) {
        AnyBalance.trace('Необходимо авторизоваться...');
        var session = request(new Message({

            __type: 'ru.vtb24.mobilebanking.protocol.security.StartSessionRequest',
            sessionContext: {
                __type: 'ru.vtb24.mobilebanking.protocol.security.SessionContextMto',
                certificateNumber: null,
                clientIp: '192.168.1.51',
                outerSessionId: 'VTB_TEST_APP',
                timeoutDuration: null,
                userAgent: null
            }
        }));

        sessionId = session.payload.sessionId;
        g_commonProperties['CLIENT-TOKEN'] = sessionId;

        var obj = request(new Message({
            __type: 'ru.vtb24.mobilebanking.protocol.security.LoginRequest',
            login: prefs.login,
            password: prefs.password
        }, 'LoginRequest theme', g_commonProperties));

        if(!obj.payload.authorizationLevel || obj.payload.authorizationLevel.id != 'IDENTIFIED') {
            trace(obj);
            throw new AnyBalance.Error('Неизвестная ошибка. Сайт изменен?');
        }

        if(obj.payload.authorization.type.id != 'NONE'){
            //Надо вводить код...
            AnyBalance.trace('Придется, черт возьми, вводить код: ' + obj.payload.authorization.type.id);
        }

        var userid = obj.payload.userInfo.unc;

        obj = request(new Message({
            __type: 'ru.vtb24.mobilebanking.protocol.security.SelectAuthorizationTypeRequest',
            authorizationType: obj.payload.authorization.type
        }, 'SelectAuthorizationTypeRequest theme', g_commonProperties));

        obj = request(new Message({
            __type: 'ru.vtb24.mobilebanking.protocol.security.GetChallengeRequest'
        }, 'GetChallengeRequest theme', g_commonProperties));

        var code = '';
        if(obj.payload.authorization.type.id != 'NONE'){
            var code = AnyBalance.retrieveCode(obj.payload.authorization.message, null, {inputType: 'number', time: 300000});
        }

        g_commonProperties.USER_ID = userid;

        g_objInfo = request(new Message({
            __type: 'ru.vtb24.mobilebanking.protocol.security.ConfirmLoginRequest',
            inChallengeResponse: code
        }, 'ConfirmLoginRequest theme', g_commonProperties));

        // save data here
        AnyBalance.setData('sessionId', sessionId);
        AnyBalance.saveData();
    }else{
        AnyBalance.trace('Пользуемся существующей сессией...');
    }

    __setLoginSuccessful();
}

var g_cardsAndAccounts;
function getCardsAndAccounts(){
    if(g_cardsAndAccounts)
        return g_cardsAndAccounts;

    //Раньше мы это из MainPageProductsRequest получали, но там почему-то карты не всегда возвращаются.
    var obj = request(new Message({
        __type: 'ru.vtb24.mobilebanking.protocol.product.PortfolioRequest',
        refreshImmediately: true,
        portfolioType: {
            __type: 'ru.vtb24.mobilebanking.protocol.product.PortfolioTypeMto',
            id: 'ACCOUNTS_AND_CARDS'
        }
    }, null, g_commonProperties));

    obj.payload.products = [];

    //Приводим к плоскому виду, как MainPageProductsRequest
    for(var i=0; i<obj.payload.portfolio.productGroups.length; ++i){
        var group = obj.payload.portfolio.productGroups[i];
        for (var j = 0; j < group.items.length; j++) {
            var p = group.items[j];
            obj.payload.products.push(p);
        }
    }

    AnyBalance.trace('Найдено ' + obj.payload.products.length + ' карт и счетов');
    g_cardsAndAccounts = obj;

    return obj;
}

function processCards(result){
    if(!AnyBalance.isAvailable('cards'))
        return;

    var obj = getCardsAndAccounts(g_cardsAndAccounts);

    var cards = [];
    for(var i=0; i<obj.payload.products.length; ++i){
        var p = obj.payload.products[i];
        if(/Card/i.test(p.__type)){
            cards.push(p);
        }
    }

    AnyBalance.trace('Найдено ' + cards.length + ' карт');
    result.cards = [];

    for (i = 0; i < cards.length; i++) {
        var p = cards[i];

        var c = {
            __id: p.id,
            __name: p.displayName + ' ' + p.baseCurrency.currencyCode + ' ' + p.number.substr(-4),
            num: p.number
        };

        if(__shouldProcess('cards', c)){
            processCard(p, c);
        }

        result.cards.push(c);
    }
}

function processCard(p, result){
    getParam(p.displayName, result, 'cards.name');
    getParam(p.balance.allowedSum, result, 'cards.balance');
    getParam(p.balance.amountSum, result, 'cards.own');
    getParam(p.baseCurrency.currencyCode, result, ['cards.currency', 'cards.balance', 'cards.gracepay', 'cards.minpay', 'cards.limit', 'cards.own', 'cards.blocked']);
    getParam(p.balance.authorizedSum, result, 'cards.blocked');
    getParam(p.embossed, result, 'cards.holder');
    getParam(p.expireDate.getTime(), result, 'cards.till');
    getParam(p.issueDate.getTime(), result, 'cards.date_start');
    getParam(p.brandName, result, 'cards.ps'); //Visa
    getParam(p.coBrandName, result, 'cards.cobrand');
    getParam(p.isEmitedForOwner, result, 'cards.for_owner');
    getParam(p.isMain, result, 'cards.is_main');
    getParam(p.status.id, result, 'cards.status'); //ACTIVE

    //Для кредитной карты получаем больше параметров
    if(/Credit/.test(p.__type) && AnyBalance.isAvailable('cards.limit', 'cards.pct', 'cards.minpay', 'cards.gracepay', 'cards.credit_till', 'cards.minpay_till', 'cards.grace_till')){
        var obj = request(new Message({
            __type: 'ru.vtb24.mobilebanking.protocol.ObjectRequest',
            identity: {
                __type: 'ru.vtb24.mobilebanking.protocol.ObjectIdentityMto',
                id: p.id,
                type: p.__type
            }
        }, null, g_commonProperties));

        var ca = obj.payload.cardAccount, li = ca && ca.loanInfo;
        if(ca && ca.creditLimit != null)
            getParam(ca.creditLimit, result, 'cards.limit');
        if(li){
            if(li.interestRate != null)
                getParam(li.interestRate, result, 'cards.pct');
            if(li.minAmountForRepayment != null)
                getParam(li.minAmountForRepayment, result, 'cards.minpay');
            if(li.graceAmountForRepayment != null)
                getParam(li.graceAmountForRepayment, result, 'cards.gracepay');
            if(li.limitEndDate)
                getParam(li.limitEndDate.getTime(), result, 'cards.credit_till');
            if(li.repaymentDate)
                getParam(li.repaymentDate.getTime(), result, 'cards.minpay_till');
            if(li.graceEndDate)
                getParam(li.graceEndDate.getTime(), result, 'cards.grace_till');
        }
    }

    if (AnyBalance.isAvailable('cards.transactions')) {
        processCardTransactions(p, result);
    }
}

function processAccounts(result){
    if(!AnyBalance.isAvailable('accounts'))
        return;

    var obj = getCardsAndAccounts(g_cardsAndAccounts);

    var accs = [];
    for(var i=0; i<obj.payload.products.length; ++i){
        var p = obj.payload.products[i];
        if(!/Card/i.test(p.__type)){
            accs.push(p);
        }
    }

    AnyBalance.trace('Найдено ' + accs.length + ' счетов');
    result.accounts = [];

    for (i = 0; i < accs.length; i++) {
        var p = accs[i];

        var c = {
            __id: p.id,
            __name: p.displayName + ' ' + p.amount.currency.currencyCode + ' ' + p.number.substr(-4),
            num: p.number
        };

        if(__shouldProcess('accounts', c)){
            processAccount(p, c);
        }

        result.accounts.push(c);
    }
}

function processAccount(p, result) {
    getParam(p.name, result, 'accounts.name');
    getParam(p.amount.sum, result, 'accounts.balance');
    getParam(p.amount.currency.currencyCode, result, ['accounts.currency', 'accounts.balance']);
    getParam(p.status.id, result, 'accounts.status'); //OPEN
    if (p.openDate)
        getParam(p.openDate.getTime(), result, 'accounts.date_start');
    if (p.closeDate)
        getParam(p.closeDate.getTime(), result, 'accounts.till');

    if (AnyBalance.isAvailable('accounts.last_op_date')) {
        var obj = request(new Message({
            __type: 'ru.vtb24.mobilebanking.protocol.ObjectRequest',
            identity: {
                __type: 'ru.vtb24.mobilebanking.protocol.ObjectIdentityMto',
                id: p.id,
                type: p.__type
            }
        }, null, g_commonProperties));

        if (obj.lastOperationDate)
            getParam(obj.lastOperationDate.getTime(), result, 'accounts.last_op_date');
    }

    if (AnyBalance.isAvailable('accounts.transactions')) {
        processAccountTransactions(p, result);
    }
}

function processDeposits(result){
    if(!AnyBalance.isAvailable('deposits'))
        return;

    var obj = request(new Message({
        __type: 'ru.vtb24.mobilebanking.protocol.product.MainPageProductsRequest',
        portfolioTypeMto: {
            __type: 'ru.vtb24.mobilebanking.protocol.product.PortfolioTypeMto',
            id: 'INVESTMENTS_AND_SAVINGS'
        }
    }, null, g_commonProperties));

    AnyBalance.trace('Найдено ' + obj.payload.products.length + ' депозитов');

    result.deposits = [];

    if(obj.payload.products.length == 0) {
        AnyBalance.trace('У вас нет ни одного депозита!');
        return;
    }

    for(var i=0; i<obj.payload.products.length; ++i){
        var p = obj.payload.products[i];

        var c = {
            __id: p.id,
            __name: p.displayName,
            num: p.number
        };

        if(__shouldProcess('deposits', c)){
            processDeposit(p, c);
        }

        result.deposits.push(c);
    }
}

function processDeposit(p, result){
	if(p.account && p.account.amount){
    	getParam(p.account.amount.sum, result, 'deposits.balance');
    	getParam(p.account.amount.currency.currencyCode, result, ['deposits.currency', 'deposits.balance']);
    }
	if(p.amount){
    	getParam(p.amount.sum, result, 'deposits.balance');
    	getParam(p.amount.currency.currencyCode, result, ['deposits.currency', 'deposits.balance']);
    }

    if(p.openDate)
    	getParam(p.openDate.getTime(), result, 'deposits.date_start');
    if(p.endDate || p.closeDate)
    	getParam((p.endDate || p.closeDate).getTime(), result, 'deposits.till');
    
    if(p.status)
    	getParam(p.status.id, result, 'deposits.status'); //OPEN

    if(AnyBalance.isAvailable('deposits.pct', 'deposits.own')){
        var obj = request(new Message({
            __type: 'ru.vtb24.mobilebanking.protocol.ObjectRequest',
            identity: {
                __type: 'ru.vtb24.mobilebanking.protocol.ObjectIdentityMto',
                id: p.id,
                type: p.__type
            }
        }, null, g_commonProperties));

        var info = obj.payload.info;
        if(info){
        	getParam(info.interestRate, result, 'deposits.pct');
        	getParam(info.depositSum, result, 'deposits.own');
        }else{
        	AnyBalance.trace('Не найдена доп. информация по депозиту');
        }
    }
}

function processInfo(result){
    if(!AnyBalance.isAvailable('info'))
        return;

    if(!g_objInfo){
        AnyBalance.trace('Info can be obtained with fresh login only!');
        return;
    }

    var info = result.info = {};
    getParam(g_objInfo.payload.userInfo.id, info, 'info.id');
    getParam(g_objInfo.payload.userInfo.unc, info, 'info.unc');
    getParam(g_objInfo.payload.userInfo.firstName, info, 'info.name');
    getParam(g_objInfo.payload.userInfo.lastName, info, 'info.name_last');
    getParam(g_objInfo.payload.userInfo.patronymic, info, 'info.name_patronymic');
    getParam(g_objInfo.payload.userInfo.firstNameLatin, info, 'info.name_lat');
    getParam(g_objInfo.payload.userInfo.lastNameLatin, info, 'info.name_last_lat');
    getParam(g_objInfo.payload.userInfo.sex, info, 'info.sex'); //MAN|WOMAN
    getParam(g_objInfo.payload.userInfo.phoneWork, info, 'info.wphone');
    getParam(g_objInfo.payload.userInfo.phoneMobile, info, 'info.mphone');
    getParam(g_objInfo.payload.userInfo.email, info, 'info.email');
    getParam(g_objInfo.payload.userInfo.birthday && g_objInfo.payload.userInfo.birthday.getTime(), info, 'info.birthday');
}

function processCredits(result) {
    if (!AnyBalance.isAvailable('credits'))
        return;

    var obj = request(new Message({
        __type: 'ru.vtb24.mobilebanking.protocol.product.MainPageProductsRequest',
        portfolioTypeMto: {
            __type: 'ru.vtb24.mobilebanking.protocol.product.PortfolioTypeMto',
            id: 'CREDITS'
        }
    }, null, g_commonProperties));

    AnyBalance.trace('Найдено ' + obj.payload.products.length + ' кредитов');

    result.credits = [];

    if (obj.payload.products.length == 0) {
        AnyBalance.trace('У вас нет ни одного кредита!');
        return;
    }

    for (var i = 0; i < obj.payload.products.length; ++i) {
        var p = obj.payload.products[i];

        var c = {
            __id: p.id,
            __name: p.displayName,
            num: p.number,
            accnum: p.account.number
        };

        if (__shouldProcess('credits', c)) {
            processCredit(p, c);
        }

        result.credits.push(c);
    }
}

function processCredit(p, result){
    getParam(p.creditSum.sum, result, 'credits.limit');
    getParam(p.creditSum.currency.currencyCode, result, ['credits.currency', 'credits.balance', 'credits.limit']);
    getParam(p.account.amount.sum, result, 'credits.balance');
    getParam(p.account.contract.contractPeriod.unit.id, result, 'credits.period_unit'); //MONTH
    getParam(p.account.contract.contractPeriod.value, result, 'credits.period');
    if(p.issueDate)
        getParam(p.issueDate.getTime(), result, 'credits.date_start');
    if(p.endDate)
        getParam(p.endDate.getTime(), result, 'credits.till');
    getParam(p.status.id, result, 'credits.status'); //OPEN

    if(AnyBalance.isAvailable('credits.pct', 'credits.debt', 'credits.minpay_debt', 'credits.minpay_pct', 'credits.minpay', 'credits.minpay_till', 'credits.gracepay', 'credits.gracepay_till')){
        var obj = request(new Message({
            __type: 'ru.vtb24.mobilebanking.protocol.ObjectRequest',
            identity: {
                __type: 'ru.vtb24.mobilebanking.protocol.ObjectIdentityMto',
                id: p.id,
                type: p.__type
            }
        }, null, g_commonProperties));

        var info = obj.payload.loan;
        getParam(info.interestRate, result, 'credits.pct');
        getParam(info.totalLiability, result, 'credits.debt');
        getParam(info.currentLiability, result, 'credits.minpay_debt');
        getParam(info.currentInterest, result, 'credits.minpay_pct');
        getParam(info.repaymentSum, result, 'credits.minpay');
        if(info.repaymentDate)
	        getParam(info.repaymentDate.getTime(), result, 'credits.minpay_till');
        if(info.graceAmountForRepayment != null)
            getParam(info.graceAmountForRepayment, result, 'credits.gracepay');
        if(info.graceEndDate != null)
            getParam(info.graceEndDate.getTime(), result, 'credits.gracepay_till');
    }

    if(AnyBalance.isAvailable('credits.schedule')){
        processCreditSchedule(p, result);
    }

    if(AnyBalance.isAvailable('credits.transactions')){
        processCreditTransactions(p, result);
    }
}



