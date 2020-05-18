/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию о бонусах на карте Клуба Перекресток.

Сайт магазина: http://www.perekrestok.ru/
Личный кабинет: https://prcab.x5club.ru/cwa/
*/

var g_headers = {
	'Accept': 'application/json, text/plain, */*',
	'Accept-Language': 'ru,en-US;q=0.8,en;q=0.6',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Safari/537.36',
	Origin: "https://travel.open.ru"
};

var baseurl = "https://travel.open.ru/"
var domain = getParam(baseurl, /\/\/(.*?)\//);
var apiHeaders = {
	Referer: baseurl
};


function callApi(verb, postParams){
	var method = 'GET';
	var h = apiHeaders;
	if(isset(postParams)){
		method = 'POST';
	}
	
	var html = AnyBalance.requestPost(baseurl + '_api/' + verb, postParams, addHeaders(h), {HTTP_METHOD: method});

	var json = getJson(html);
	if(json.error){
		AnyBalance.trace(html);
		throw new AnyBalance.Error("Неправильный логин или пароль", null, /WRONG_STATE/i.test(json.error.code));
	}

	return json;
}

function main () {
    var prefs = AnyBalance.getPreferences ();
    AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите 10 цифр номера бонусного счета (снизу на лицевой стороне карты Travel).');
	checkEmpty(/^\d{10}$/.test(prefs.login), 'Введите 10 цифр номера бонусного счета без пробелов и разделителей.');
	checkEmpty(prefs.password, 'Введите пароль.');
		
    AnyBalance.trace('Входим в кабинет ' + baseurl);

    var json = callApi('mt/authenticate', {
		id:	prefs.login,	
		password:	prefs.password,
		source:	'openbank'
    });

    var result = {success: true};

    json = callApi('buyermanager/getUserInfo/?' + createUrlEncodedParams({
    	_: +new Date(),
    	allPaxLocales: 'true',
    	source: 'openbank'
    }));

    getParam(json.bonuses.total, result, 'balance');
    getParam(Object.keys(json.bonuses.bankTotals.openbank.cuids).join(', '), result, '__tariff');

    if(json.bonuses.movements && json.bonuses.movements.length){
    	var m = json.bonuses.movements[json.bonuses.movements.length-1];
    	getParam(m.amount * (m.type === 'out' ? -1 : 1), result, 'last_op_sum');
    	getParam(m.dateCreated, result, 'last_op_date', null, null, parseDateISO);
    	getParam(m.type, result, 'last_op_type');
    }

    AnyBalance.setResult (result);
}
