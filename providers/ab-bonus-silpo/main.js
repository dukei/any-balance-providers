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
	"loginwithcapture": `mutation loginwithcapture($barcode: String!, $password: String!, $ckey: String!) {
  loginwithcapture(barcode: $barcode, password: $password, ckey: $ckey) {
    accessToken {
      ...AccessTokenFragment
      __typename
    }
    user {
      ...UserFragment
      __typename
    }
    __typename
  }
}

fragment AccessTokenFragment on AccessTokenType {
  accessToken
  expiresAt
  __typename
}

fragment UserFragment on User {
  id
  firstName
  lastName
  middleName
  email
  emailConfirmed
  notification
  barcode
  bonusAmount
  vouchersAmount
  spawnNextCouponDate
  __typename
}`,
	"vouchers": `query vouchers($current: Boolean) {
  vouchers(current: $current) {
    ...VoucherFragment
    __typename
  }
}

fragment VoucherFragment on Voucher {
  id
  value
  useType
  voucherType
  voucherText
  typeDescription
  status
  modifiedAt
  startedAt
  endAt
  items {
    name
    type
    value
    __typename
  }
  isChangeable
  __typename
}`,
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
