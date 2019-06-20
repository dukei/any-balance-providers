/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Accept-Encoding': 'gzip, deflate',
	'Connection': 'keep-alive',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36',
    'Referer': 'https://mybank.by/',
};

var apiHeaders = {
	'Accept': 'application/json, text/plain, */*',
    'Origin': 'https://mybank.by',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36',
    'Content-Type': 'application/json',
    'Referer': 'https://mybank.by/',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'ru,en-US;q=0.9,en;q=0.8,ru-RU;q=0.7',
	'Connection': 'keep-alive',
}

var g_baseurl = 'https://mybank.by/';
var g_cookie;

function callApi(verb, getParams, postParams){
	var method = 'GET';
	var h = apiHeaders;
	if(isset(postParams)){
		method = 'POST';
		h = addHeaders({'Content-Type': 'application/json;charset=UTF-8'}, apiHeaders);
	}
	
	//AnyBalance.setCookie('mybank.by', 'JSESSIONID', g_cookie);
	var html = AnyBalance.requestPost(g_baseurl + 'api/v1/' + verb, postParams && JSON.stringify(postParams), addHeaders(h), {HTTP_METHOD: method});
	var json = getJson(html);
	if(json.error){
		AnyBalance.trace(html);
		throw new AnyBalance.Error(json.error.description, null, /парол/i.test(json.error.description));
	}

	return json.data;
}

function main() {
    AnyBalance.setOptions({cookiePolicy: 'rfc2965'});
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://mybank.by/';
	var searchType = prefs.search_type || 'card_num';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите номер телефона!');
	checkEmpty(/^\+\d+$/.test(prefs.login), 'Введите номер телефона в международном формате без пробелов и разделителей +375xxxxxxxxx !');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(g_baseurl, g_headers);
	g_cookie = AnyBalance.getCookie('JSESSIONID');

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var data = callApi('user/isAuthenticated');
	if(!data){
		data = callApi('login/userIdentityByPhone', null, {
			"phoneNumber":prefs.login, //.replace(/(.*)(\d\d)(\d\d\d)(\d\d)(\d\d)$/, '$1($2)$3-$4-$5'),
			"loginWay":"1"
		});
		if(data.smsCode){
			throw new AnyBalance.Error('Вход требует ввода смс-кода. Данная операция пока не поддерживается. Пожалуйста, обратитесь к автору провайдера');
		}
		data = callApi('login/checkPassword', null, {"password":prefs.password});
		data = callApi('user/userRole', null, data.userInfo.dboContracts[0]);

		//AnyBalance.setCookie('mybank.by', 'JSESSIONID', g_cookie);
		html = AnyBalance.requestGet(g_baseurl + 'main_authorised', g_headers);
	}

    data = callApi('user/loadUser');

    AnyBalance.trace('Найдено ' + data.products.length + ' продуктов');
    var p = null, card = null, cardContract = null;
    for(var i=0; i<data.products.length; ++i){
    	var _p = data.products[i];
    	AnyBalance.trace('Найден продукт ' + _p.description + ', ' +  _p.accountId);	
    	if(!prefs.num){
    		p = _p;
    		break;
    	}
    	var cs = _p.cards.filter(function(c){ return endsWith(c.pan, prefs.num) });
        if(searchType === 'card_num' && cs.length > 0){
            p = _p;
            card = cs[0];
            break;
        }
    	
    	cs = _p.cardContract.filter(function(c){ return endsWith(c.contractNum, prefs.num) });
        if(searchType === 'acc_num' && cs.length > 0){
            p = _p;
            cardContract = cs[0];
            break;
        }
    }

    if(!p)
		throw new AnyBalance.Error('Не удалось найти ' + (prefs.num ?
			'счет ' + (searchType == 'card_num' ? 'по номеру карты' : 'по договору') + ' с последними цифрами ' + prefs.num :
			'ни одной карты!'));

	card = card || p.cards[0];
	cardContract = cardContract || p.cardContract[0];
	
	var result = {success: true};

	getParam(p.avlBalance, result, 'balance', null, null, parseBalance);
	getParam(p.ownFunds, result, 'own', null, null, parseBalance);
	getParam(p.gracePeriodAvalDays, result, 'credit', null, null, parseBalance);
	getParam(p.avlLimit, result, 'limit', null, null, parseBalance);
	getParam(p.cardAccounts[0].currencyCode, result, ['currency', 'balance', 'limit', 'debt', 'nachisl', 'grace_pay']);
	getParam(p.description, result, 'cardname');
	getParam(card.pan, result, 'cardnum');
	getParam(card.description + ', ' + p.description, result, '__tariff');
	getParam(cardContract.contractNum, result, 'order_num');
	
	if(isAvailable(['debt', 'nachisl', 'grace_pay', 'grace_pay_till', 'halava_bonus'])) {
		getParam(p.points, result, 'halava_bonus', null, null, parseBalance);
		getParam(p.debtPayment, result, 'debt', null, null, parseBalance);
		getParam(p.debtPaymentSumCom, result, 'nachisl', null, null, parseBalance);
		getParam(p.loanNextPaymentAmmount, result, 'grace_pay', null, null, parseBalance);
		getParam(p.gracePeriodEnd, result, 'grace_pay_till', null, null, parseDateISO);
	}
	
	AnyBalance.setResult(result);
}

if (!Array.prototype.filter) {
  Array.prototype.filter = function(fun/*, thisArg*/) {
    'use strict';

    if (this === void 0 || this === null) {
      throw new TypeError();
    }

    var t = Object(this);
    var len = t.length >>> 0;
    if (typeof fun !== 'function') {
      throw new TypeError();
    }

    var res = [];
    var thisArg = arguments.length >= 2 ? arguments[1] : void 0;
    for (var i = 0; i < len; i++) {
      if (i in t) {
        var val = t[i];

        // ПРИМЕЧАНИЕ: Технически, здесь должен быть Object.defineProperty на
        //             следующий индекс, поскольку push может зависеть от
        //             свойств на Object.prototype и Array.prototype.
        //             Но этот метод новый и коллизии должны быть редкими,
        //             так что используем более совместимую альтернативу.
        if (fun.call(thisArg, val, i, t)) {
          res.push(val);
        }
      }
    }

    return res;
  };
}