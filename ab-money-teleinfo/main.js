/**
 Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
 */

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
            var tp = getType(obj[prop], prop, obj);
            putTypeVal(ret, tp, obj[prop]);
        }
        return ret.join('');
    } else if (typeof(obj) == 'string') {
        return encodeXML(obj);
    } else if (typeof(obj) == 'boolean') {
        return obj ? 'true' : 'false';
    } else if (typeof(obj) == 'number') {
        return '' + obj;
    }
}

function request(m) {
    var sm = '<map>' + serialize(m) + '</map>';

    AnyBalance.trace('Requesting ' + getParam(m.payload.__type, null, null, /\.(\w+)$/));

    var ver = "2.0.24";
    var wordsStr = CryptoJS.enc.Utf8.parse(sm);
    var wordsVer = CryptoJS.enc.Utf8.parse(ver);
    var words = new CryptoJS.lib.WordArray.init([wordsStr.sigBytes + wordsVer.sigBytes + 1, wordsVer.sigBytes << 24], 5);
    var sizesSize = words.sigBytes;
    words.concat(wordsVer).concat(wordsStr);

    var ret = AnyBalance.requestPost("https://mb.telebank.ru/mobilebanking/burlap/", CryptoJS.enc.Base64.stringify(words), {
        'mb-protocol-version': ver,
        'mb-app-version': '0.1.46',
        Connection: 'Keep-Alive'
    });

    words = CryptoJS.enc.Base64.parse(ret);

    if (AnyBalance.getLastStatusCode() >= 400)
        throw new AnyBalance.Error('Error requesting ' + sm + ': ' + CryptoJS.enc.Utf8.stringify(words));

    var xml = CryptoJS.enc.Utf8.stringify(words, sizesSize + wordsVer.sigBytes);
    var obj = deserialize(xml);
    AnyBalance.trace('Returned ' + getParam(obj.payload.__type, null, null, /\.(\w+)$/));
    return obj;
}

function deserialize(xml) {
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
                putValue(val, function(val){return val.toLowerCase() == "true"});
                break;
            case 'null':
                putValue(val, function(val){return null});
                break;
            case 'double':
                putValue(val, function(val){return Number.parseFloat(val)});
                break;
            case 'long':
            case 'int':
                putValue(val, function(val){return Number.parseInt(val)});
                break;
            case 'date':
                putValue(val, function(val){
                    var matches = val.match(/(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)\.(\d\d\d)Z/);
                    if(!matches)
                        throw new AnyBalance.Error('deserialize error: unexpected date format: <' + elem + '>' + val);
                    var d = new Date(0);
                    d.setUTCFullYear(Number.parseInt(matches[1]), Number.parseInt(matches[2]) - 1, Number.parseInt(matches[3]));
                    d.setUTCHours(Number.parseInt(matches[4]), Number.parseInt(matches[5]), Number.parseInt(matches[6]), Number.parseInt(matches[7]));
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
            		var id = Number.parseInt(val);
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

}


function main() {
	if(!AnyBalance.getCapabilities){
		AnyBalance.trace('Бинарные запросы не поддерживаются. Пока будем обновлять из веба...');
		mainWeb();
		return;
	}

    var prefs = AnyBalance.getPreferences();

    AnyBalance.setOptions({FORCE_CHARSET: 'base64'});

    checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(prefs.password, 'Введите пароль!');

    if(prefs.type && !/^(card|dep)$/.test(prefs.type))
    	throw new AnyBalance.Error('Сейчас поддерживаются только карты и счета и депозиты. Для поддержки других банковских продуктов обратитесь к разработчику.', null, true);

/*
    var xml = request(new Message({
        type: 'ru.vtb24.mobilebanking.protocol.atm.AtmListRequest',
        latitude: 55.8047245,
        longitude: 37.5813982,
        radius: 5,
        lastUpdateDate: new Date(0),
        __types: {radius: 'int'}
    }, 'AtmListRequest theme'));
*/

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

    var sessionId = session.payload.sessionId;
    var commonProperties = {
    	APP_VERSION: '5.0.10',
    	DEVICE_PLATFORM: 'ANDROID',
    	'CLIENT-TOKEN': sessionId,
    	'DEVICE_OS': 'Android OS 4.4.4'
    };

    var obj = request(new Message({
        __type: 'ru.vtb24.mobilebanking.protocol.security.LoginRequest',
        login: prefs.login,
        password: prefs.password
    }, 'LoginRequest theme', commonProperties));

    if(/ErrorResponse/.test(obj.payload.__type))
    	throw new AnyBalance.Error(obj.payload.message, null, obj.payload.type == 'invalid-credentials');

    if(!obj.payload.authorizationLevel || obj.payload.authorizationLevel.id != 'IDENTIFIED')
        throw new AnyBalance.Error('Неизвестная ошибка. Сайт изменен?');

    var userid = obj.payload.userInfo.unc;

    obj = request(new Message({
        __type: 'ru.vtb24.mobilebanking.protocol.security.SelectAuthorizationTypeRequest',
        authorizationType: {
        	__type: '>ru.vtb24.mobilebanking.protocol.security.AuthorizationTypeMto',
        	id: 'NONE',
        	value: 'None'
        }
    }, 'SelectAuthorizationTypeRequest theme', commonProperties));

    obj = request(new Message({
        __type: 'ru.vtb24.mobilebanking.protocol.security.GetChallengeRequest'
    }, 'GetChallengeRequest theme', commonProperties));

    commonProperties.USER_ID = userid;

    obj = request(new Message({
        __type: 'ru.vtb24.mobilebanking.protocol.security.ConfirmLoginRequest',
        inChallengeResponse: ''
    }, 'ConfirmLoginRequest theme', commonProperties));

    if(!prefs.type || prefs.type == 'card'){
    	fetchCard(commonProperties);
    }else if(prefs.type == 'dep'){
    	fetchDep(commonProperties);
    }

    /* Еще бывают
    var obj = request(new Message({
        __type: 'ru.vtb24.mobilebanking.protocol.product.MainPageProductsRequest',
        portfolioTypeMto: {
        	__type: 'ru.vtb24.mobilebanking.protocol.product.PortfolioTypeMto',
        	id: 'CREDITS'
        }
    }, null, commonProperties));

    var obj = request(new Message({
        __type: 'ru.vtb24.mobilebanking.protocol.product.MainPageProductsRequest',
        portfolioTypeMto: {
        	__type: 'ru.vtb24.mobilebanking.protocol.product.PortfolioTypeMto',
        	id: 'INVESTMENTS_AND_SAVINGS'
        }
    }, null, commonProperties));
    */
}

function fetchCard(commonProperties){
    var prefs = AnyBalance.getPreferences();

    var obj = request(new Message({
        __type: 'ru.vtb24.mobilebanking.protocol.product.MainPageProductsRequest',
        portfolioTypeMto: {
        	__type: 'ru.vtb24.mobilebanking.protocol.product.PortfolioTypeMto',
        	id: 'ACCOUNTS_AND_CARDS'
        }
    }, null, commonProperties));

    if(obj.payload.products.length == 0)
    	throw new AnyBalance.Error('У вас нет ни одного счета или карты!');

    var product = null;
    for(var i=0; i<obj.payload.products.length; ++i){
    	var p = obj.payload.products[i];
    	if(!prefs.card || endsWith(p.number, prefs.card)){
    	    product = p;
    	    break;
    	}
    }

    if(!(p = product))
    	throw new AnyBalance.Error('Не удалось найти карту или счет с последними цифрами ' + prefs.card);

    var result = {success: true};
    getParam(p.shortNumber, result, '__tariff');
    getParam(p.displayName, result, 'cardname');
    getParam(p.number + '', result, 'cardnum');
    getParam(p.balance.allowedSum, result, 'balance');
    getParam(p.balance.amountSum, result, 'own');
    getParam(p.baseCurrency.currencyCode, result, ['currency', 'balance', 'gracepay', 'minpay', 'limit', 'accbalance', 'own', 'blocked']);
    getParam(p.balance.authorizedSum, result, 'blocked');
    getParam(p.embossed, result, 'fio');
    getParam(p.expireDate.getTime(), result, 'till');

    if(AnyBalance.isAvailable('limit', 'pct', 'minpay', 'gracepay', 'credit_till', 'minpaytill', 'gracetill')){
        var obj = request(new Message({
            __type: 'ru.vtb24.mobilebanking.protocol.ObjectRequest',
            identity: {
            	__type: 'ru.vtb24.mobilebanking.protocol.ObjectIdentityMto',
            	id: p.id,
            	type: p.__type
            }
        }, null, commonProperties));
    	
    	var ca = obj.payload.cardAccount, li = ca && ca.loanInfo;
    	if(ca && ca.creditLimit != null)
        	getParam(ca.creditLimit, result, 'limit');
        if(li){
        	if(li.interestRate != null)
            	getParam(li.interestRate, result, 'pct');
            if(li.minAmountForRepayment != null)
            	getParam(li.minAmountForRepayment, result, 'minpay');
            if(li.graceAmountForRepayment != null)
            	getParam(li.graceAmountForRepayment, result, 'gracepay');
            if(li.limitEndDate)
                getParam(li.limitEndDate.getTime(), result, 'credit_till');
            if(li.repaymentDate)
                getParam(li.repaymentDate && li.repaymentDate.getTime(), result, 'minpaytill');
            if(li.graceEndDate)
                getParam(li.graceEndDate && li.graceEndDate.getTime(), result, 'gracetill');
        }
    }

    AnyBalance.setResult(result);
}


function fetchDep(commonProperties){
    var prefs = AnyBalance.getPreferences();

    var obj = request(new Message({
        __type: 'ru.vtb24.mobilebanking.protocol.product.MainPageProductsRequest',
        portfolioTypeMto: {
        	__type: 'ru.vtb24.mobilebanking.protocol.product.PortfolioTypeMto',
        	id: 'INVESTMENTS_AND_SAVINGS'
        }
    }, null, commonProperties));

    if(obj.payload.products.length == 0)
    	throw new AnyBalance.Error('У вас нет ни одного депозита!');

    var product = null;
    for(var i=0; i<obj.payload.products.length; ++i){
    	var p = obj.payload.products[i];
    	if(!prefs.card || endsWith(p.number, prefs.card)){
    	    product = p;
    	    break;
    	}
    }

    if(!(p = product))
    	throw new AnyBalance.Error('Не удалось найти депозит с последними цифрами ' + prefs.card);

    var result = {success: true};
    getParam(p.displayName, result, '__tariff');
    getParam(p.displayName, result, 'cardname');
    getParam(p.number + '', result, 'accnum');
    getParam(p.account.amount.sum, result, 'balance');
    getParam(p.account.amount.currency.currencyCode, result, ['currency', 'balance']);
//    getParam(p.embossed, result, 'fio');
    getParam(p.endDate.getTime(), result, 'till');

    if(AnyBalance.isAvailable('pct', 'own')){
        var obj = request(new Message({
            __type: 'ru.vtb24.mobilebanking.protocol.ObjectRequest',
            identity: {
            	__type: 'ru.vtb24.mobilebanking.protocol.ObjectIdentityMto',
            	id: p.id,
            	type: p.__type
            }
        }, null, commonProperties));
    	
    	var info = obj.payload.info;
       	getParam(info.interestRate, result, 'pct');
       	getParam(info.depositSum, result, 'own');
    }

    AnyBalance.setResult(result);
}
