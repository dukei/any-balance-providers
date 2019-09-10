/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	Connection: 'Keep-Alive',
	'Cache-Control': 'no-cache',
	'User-Agent': 'ozonapp_android/5.9.5+682',
	'x-o3-app-name': 'ozonapp_android',
	'x-o3-app-version': '5.9.5(682)',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = "https://api.ozon.ru/";
	var baseurlPartner = "https://ows.ozon.ru/";
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'location/v1/current?latitude=4.9E-324&longitude=4.9E-324&ignoreclient=true', g_headers);

	var html = AnyBalance.requestPost(baseurl + 'OAuth/v1/auth/token', {
		grant_type:	'anonymous',
		client_id:	'androidapp',
		client_secret:	'MaiNNqA859bnMqw'
	}, g_headers);
	var json = getJson(html);

	g_headers.Authorization = json.token_type + ' ' + json.access_token;

	html = AnyBalance.requestGet(baseurl + 'user/v5/reg/check?login=' + encodeURIComponent(prefs.login), g_headers);
	json = getJson(html);

	if(json.status != 'found'){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Логин не найден.', null, true);
	}

	html = AnyBalance.requestPost(baseurl + 'OAuth/v1/auth/token', {
		grant_type:	'password',
		client_id:	'androidapp',
		client_secret:	'MaiNNqA859bnMqw',
		userName:	prefs.login,
		password:	prefs.password,
		ab_group:  '70',
	}, g_headers);
	var json = getJson(html);

	if(!json.access_token){
		if(json.error === 'access_denied')
			throw new AnyBalance.Error('Неправильный пароль', null, true);
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var access_token = json.access_token;
	g_headers.Authorization = json.token_type + ' ' + access_token;

	var result = {success: true};
	
	if (isAvailable(['balance', 'blocked', 'available', 'bonus'])) {
		html = AnyBalance.requestGet(baseurl + 'my-account-api.bx/account/v1', g_headers);

		json = getJson(html);
		
		getParam(json.clientAccountEntryInformationForWeb.current, result, 'balance');
		getParam(json.clientAccountEntryInformationForWeb.blocked, result, 'blocked');
		getParam(json.clientAccountEntryInformationForWeb.accessible, result, 'available');
		getParam(json.clientAccountEntryInformationForWeb.score, result, 'bonus');
	}
	
	var orders = 0;
	if (isAvailable(['order_sum', 'weight', 'ticket', 'state'])) {
		html = AnyBalance.requestGet(baseurl + 'composer-api.bx/page/json/v1?url=%2Fmy%2Forderlist', g_headers);

		json = getJson(html);

		for(var i in json.csma.orderListApp){
			var ol = json.csma.orderListApp[i].orderList;

			if(ol && ol.length){
				var order = ol[0];
		    
		        for(var j=0; j<order.elements.length; ++j){
		        	var el = order.elements[j];
		        	if(/сумма/i.test(el.text)){
                		getParam(el.text, result, 'order_sum', null, null, parseBalance);
                		break;
		        	}
		        }

				getParam(order.status.name, result, 'state');
				getParam(order.number, result, 'ticket');
		    
				if(AnyBalance.isAvailable('weight')){
					html = AnyBalance.requestGet(baseurl + 'my-account-api.bx/orders/v2/details?number=' + encodeURIComponent(order.number), g_headers);
					json = getJson(html).data[0];
		    
					for(var i=0; i<json && json.shipments.length; ++i){
						sumParam(json.shipments[i].total.weight, result, 'weight', null, null, parseWeight);
					}
				}
			}
		}

	}

	result.__tariff = prefs.login;
	
	AnyBalance.setResult(result);
}

/** Вычисляет вес в кг из переданной строки. */
function parseWeight(text, defaultUnits) {
    return parseWeightEx(text, 1000, 1, defaultUnits);
}

/** Вычисляет вес в нужных единицах из переданной строки. */
function parseWeightEx(text, thousand, order, defaultUnits) {
    var _text = replaceAll(text, replaceSpaces);
    var val = getParam(_text, /(-?\.?\d[\d\.,]*)/, replaceFloat, parseFloat);
    if (!isset(val) || val === '') {
        AnyBalance.trace("Could not parse Weight value from " + text);
        return;
    }
    var units = getParam(_text, /([кk]?[гgтt])/i);
    if (!units && !defaultUnits) {
        AnyBalance.trace("Could not parse Weight units from " + text);
        return;
    }
    if (!units)
        units = defaultUnits;

    function scaleWeight(odr){
    	val = Math.round(val / Math.pow(thousand, order - (odr || 0)) * 100) / 100;
    }

    switch (units.substr(0, 1).toLowerCase()) {
        case 'г':
        case 'g':
            scaleWeight();
            break;
        case 'k':
        case 'к':
            scaleWeight(1);
            break;
        case 't':
        case 'т':
            scaleWeight(2);
            break;
    }
    var textval = '' + val;
    if (textval.length > 6)
        val = Math.round(val);
    else if (textval.length > 5)
        val = Math.round(val * 10) / 10;
    var dbg_units = {
        0: 'г',
        1: 'кг',
        2: 'т',
    };
    AnyBalance.trace('Parsing weight (' + val + dbg_units[order] + ') from: ' + text);
    return val;
}

