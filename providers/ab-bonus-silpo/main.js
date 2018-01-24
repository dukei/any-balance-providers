/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Сільпо - Мережа супермаркетів
Сайт Сільпо: http://silpo.ua
Персональная страничка: https://my.silpo.ua/
*/

var origin = 'https://my.silpo.ua';
var baseurl = origin + '/';
var g_headers = {
	Connection: "keep-alive",
	accept: "*/*",
	Origin: origin,
	"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36",
	Referer: baseurl,
	"Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
}

var g_verbsinfo = {
	"loginwithcapture": 'mutation loginwithcapture($barcode: String!, $password: String!, $ckey: String!) {\r\n  loginwithcapture(barcode: $barcode, password: $password, ckey: $ckey) {\r\n    accessToken {\r\n      ...AccessTokenFragment\r\n      __typename\r\n    }\r\n    user {\r\n      ...UserFragment\r\n      __typename\r\n    }\r\n    __typename\r\n  }\r\n}\r\n\r\nfragment AccessTokenFragment on AccessTokenType {\r\n  accessToken\r\n  expiresAt\r\n  __typename\r\n}\r\n\r\nfragment UserFragment on User {\r\n  id\r\n  firstName\r\n  lastName\r\n  middleName\r\n  email\r\n  emailConfirmed\r\n  notification\r\n  barcode\r\n  bonusAmount\r\n  vouchersAmount\r\n  spawnNextCouponDate\r\n  __typename\r\n}',
	"vouchers": 'query vouchers($current: Boolean) {\r\n  vouchers(current: $current) {\r\n    ...VoucherFragment\r\n    __typename\r\n  }\r\n}\r\n\r\nfragment VoucherFragment on Voucher {\r\n  id\r\n  value\r\n  useType\r\n  voucherType\r\n  voucherText\r\n  typeDescription\r\n  status\r\n  modifiedAt\r\n  startedAt\r\n  endAt\r\n  items {\r\n    name\r\n    type\r\n    value\r\n    __typename\r\n  }\r\n  isChangeable\r\n  __typename\r\n}',
}

function callApi(verb, data){
	
	var html = requestPostMultipart('https://silpo.ua/graphql', {
		query: g_verbsinfo[verb],
		variables: JSON.stringify(data),
		debugName: '""',
		operationName: '"' + verb + '"'
	}, addHeaders({
		Referer: baseurl
	}));

	var json = getJson(html);
	if(json.errors){
		var error = json.errors.map(function(e) { return e.message }).join(';\n');
		throw new AnyBalance.Error(error, null, /парол/i.test(error));
	}
	return json.data[verb];
}

function main(){
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите № карты');
	checkEmpty(prefs.pass, 'Введите пароль');

	var response = solveRecaptcha('Пожалуйста, докажите, что вы не робот', baseurl, '6Ld6QjMUAAAAAO8rI-MlhpdE2s0sF-m_qNY5gMYm');

	AnyBalance.trace('Logging in...');
	var json = callApi('loginwithcapture', {
		"barcode": prefs.login,
		"password":prefs.pass,
		"ckey":response
	});

	if(!json.accessToken){
		AnyBalance.trace(JSON.stringify(json));
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}
	g_headers["access-token"] = json.accessToken.accessToken;

	AnyBalance.trace('Got answer from authorization: "' + JSON.stringify(json) + '"');
	
	var result = {success: true};

	getParam(json.user.lastName + ' ' + json.user.firstName + ' ' + json.user.middleName, result, '__tariff');
	getParam(json.user.barcode, result, 'num');
	getParam(json.user.bonusAmount, result, 'bonus');

	json = callApi('vouchers', {"current":null});
	AnyBalance.trace('Найдено ' + json.length + ' ваучеров');
	json = json[0];
	
	getParam(json.value, result, 'skidka');
	getParam(json.modifiedAt, result, 'bonus_conversion', null, null, parseDateISO);

	for(var i=0; i<json.items.length; ++i){
		var item = json.items[i];
		if(item.type == 'BALANCE'){
			getParam(item.value, result, 'baly');
		}else if(item.type == 'PURCHASES'){
			getParam(item.value, result, 'purchases');
		}else if(item.type == 'COUPON'){
			getParam(item.value, result, 'coupon');
		}else if(item.type == 'RINGOO'){
			getParam(item.value, result, 'ringoo');
		}else if(item.type == 'BILA_ROMASHKA'){
			getParam(item.value, result, 'romashka');
		}else if(item.type == 'MONEYBOX'){
			getParam(item.value, result, 'moneybox');
		}else{
			AnyBalance.trace('Неизвестный ваучер: ' + JSON.stringify(item));
		}
	}

	AnyBalance.setResult(result);
}
