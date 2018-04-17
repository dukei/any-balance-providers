/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var baseurl = 'https://bank.beeline.ru/';
var g_headers = {
	'Accept': '*/*',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Connection': 'keep-alive',
	'Origin': 'https://bank.beeline.ru',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.186 Safari/537.36',
	channel: 'web',
};

function callApi(verb, getParams, postParams){
	var method = 'GET';
	var h = g_headers;
	if(isset(postParams)){
		method = 'POST';
		h = addHeaders({'Content-Type': 'application/json;charset=UTF-8'}, g_headers);
	}
	if(!getParams)
		getParams = {};
	if(!getParams.rid)
		getParams.rid = String(Math.random().toString(16).split(".")[1]);
	
	h = addHeaders({
		'X-Request-Id': getParams.rid,
		'X-XSRF-TOKEN': AnyBalance.getCookie('XSRF-TOKEN') + ''
	});
	
	var html = AnyBalance.requestPost(baseurl + 'api/v0001/' + verb + '?' + createUrlEncodedParams(getParams), postParams && JSON.stringify(postParams), h, {HTTP_METHOD: method});

	var json = getJson(html);
	return json;
}

function main() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var json = callApi('ping/session');
	json = callApi('authentication/authenticate', null, {
    	"principal": prefs.login,
    	"secret": prefs.password,
    	"type": "AUTO"
	});

	if(json.status != 'OK'){
		if(json.status == 'AUTH_WRONG'){
			throw AnyBalance.Error('Неверный логин или пароль', null, true);
		}
		AnyBalance.trace(JSON.stringify(json));
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};

	if(AnyBalance.isAvailable('fio')){
		json = callApi('consumer');

		getParam(json.data.fio, result, 'fio');
	}

	if(prefs.type == 'wallet'){
	 	json = callApi('wallets');

		if(json.status == 'OK'){
	 		for(var i=0; i<json.data.wallets.length; ++i){
	 			var wallet = json.data.wallets[i];
	 			AnyBalance.trace('Найден кошелек ' + wallet.currencyCode);
	 			if(!prefs.num || wallet.currencyCode.toLowerCase() == prefs.num.toLowerCase()){
					getParam(wallet.amount, result, 'balance', null, null, parseBalance);
					getParam(wallet.currencyCode, result, ['currency', 'balance']);
					getParam(wallet.name, result, '__tariff');

					lastOp(result, wallet.contractId);
					break;
	 			}
	 		}
	 		if(i >= json.data.wallets.length)
	 			throw new AnyBalance.Error(prefs.num ? 'Не найден кошелек с валютой ' + prefs.num : 'У вас нет кошельков');
	 	}else{
	 		AnyBalance.trace('Ошибка получения кошельков: ' + JSON.stringify(json));
	 		throw new AnyBalance.Error('Не удалось получить баланс по кошельку: ' + json.status);
	 	}
	 		
	}else{ //if(prefs.type == 'card')
		json = callApi('cards');
	
	 	if(json.status == 'OK'){
	 		for(var i=0; i<json.data.length; ++i){
	 			var card = json.data[i];
	 			AnyBalance.trace('Найдена карта ' + card.panTail);
	 			if(!prefs.num || endsWith(card.panTail, prefs.num)){
	 				for(var j=0; j<card.equities.length; ++j){
	 					var e = card.equities[j];
	 					if(e.type == 'FUNDS'){
							getParam(e.amount, result, 'balance', null, null, parseBalance);
							getParam(e.currencyCode, result, ['currency', 'balance']);
	 					}else if(e.type == 'BNS'){
							getParam(e.amount, result, 'extra', null, null, parseBalance);
	 					}
	 				}
					getParam(card.name + ' ' + card.panTail, result, '__tariff');

					lastOp(result, card.contractId);
					break;
	 			}
	 		}
	 		if(i >= json.data.length)
	 			throw new AnyBalance.Error(prefs.num ? 'Не найдена карта с последними цифрами ' + prefs.num : 'У вас нет карт');
	 	}else{
	 		AnyBalance.trace('Ошибка получения карт: ' + JSON.stringify(json));
	 		throw new AnyBalance.Error('Не удалось получить баланс по карте: ' + json.status);
	 	}
	}
	
	AnyBalance.setResult(result);
}

function lastOp(result, contractId){
	if(AnyBalance.isAvailable('last_op_date', 'last_op_sum', 'last_op_descr')){
		var hist = callApi('hst', {offset: 0, limit: 20, filter: JSON.stringify({contractId: contractId, topBefore: {$lt: +new Date()}})});
		if(hist.status == 'OK'){
			for(var j=0; j<hist.data.length; ++j){
				var h = hist.data[j];
				if(h.itemType == 'OPERATION'){
					getParam(h.date, result, 'last_op_date');
					getParam(h.money.income ? parseBalance(h.money.amount) : -h.money.amount, result, 'last_op_sum');
					if(h.typeName){
						getParam(h.typeName + ' ' + h.title, result, 'last_op_descr');
					}else{
						getParam(h.title + ' ' + h.description, result, 'last_op_descr');
					}
					break;
				}
			}
		}else{
			AnyBalance.trace('Can not get history: ' + JSON.stringify(hist));
		}
	}
}