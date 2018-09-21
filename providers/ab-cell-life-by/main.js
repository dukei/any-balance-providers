/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'application/json, text/plain, */*',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Referer': 'https://life.com.by/',
	'Authorization': 'Basic eDQ6eDRwYXNzQXNEZWZhdWx0NjY2',
	'Content-Type': 'application/json;charset=UTF-8',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36',
};

function callApi(verb, params){
	var html = AnyBalance.requestPost('https://life.com.by/~api/json/' + verb, JSON.stringify(params), g_headers);

	if(AnyBalance.getLastStatusCode() == 401){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Отказ в доступе. Неправильный логин или пароль?', null, true);
	}

	if(AnyBalance.getLastStatusCode() >= 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка вызова API ' + verb + ': ' + AnyBalance.getLastStatusCode());
	}

	var json = getJson(html);
	return json;
}

function main() {
  var prefs = AnyBalance.getPreferences();

  AB.checkEmpty(prefs.login, 'Введите номер телефона!');
  AB.checkEmpty(prefs.password, 'Введите пароль!');

  var json = callApi('extend.lifeconnector/getOauthAccessToken', {
  	"msisdn":"375" + prefs.login,
  	"password": prefs.password
  });

  if(!json.accessToken){
  	var error = json.error && json.error.text;
  	if(error)
  		throw new AnyBalance.Error(replaceAll(error, replaceTagsAndSpaces), null, /не существует|парол/i.test(error));
  	AnyBalance.trace(JSON.stringify(json));
  	throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
  }

  var result = {
    success: true,
    balance: null
  };

  getParam(json.userData.tariffName, result, '__tariff');
  getParam(json.userData.infoTable.MSISDN, result, 'phone');

  if(AnyBalance.isAvailable('fio')){
  	json = callApi('extend.account/getAccountData', {"chainName":"LH_Active_TP","language":"rus"});
  	getParam(json.firstName + ' ' + json.lastName, result, 'fio');
  }

  if(AnyBalance.isAvailable('balance')){
  	json = callApi('extend.account/getAccountData', {"chainName":"LHA_getUserBalance","language":"rus"});
  	getParam(json.total, result, 'balance');
  }
  
  if(AnyBalance.isAvailable('sms_left_other', 'min_left_other', 'traffic_left', 'sms_left', 'min_left')){
  	json = callApi('extend.account/getAccountData', {"chainName":"LHA_getCurrentBalances","language":"rus"});

  	for(var i=0; i<json.length; ++i){
  		var item = json[i];
  		if(item.popupData.apiPathData.type === 'gprs'){
  			getParam(item.title, result, 'traffic_left', null, null, parseTraffic);
  		}else if(item.popupData.apiPathData.type === 'moc'){
  			getParam(item.title, result, 'min_left', null, null, parseBalance);
  			getParam(item.text, result, 'min_left_other', null, null, parseBalance);
  		}else if(item.popupData.apiPathData.type === 'sms'){
  			getParam(item.title, result, 'sms_left', null, null, parseBalance);
  			getParam(item.title, result, 'sms_left_other', null, null, parseBalance);
  		}else{
  			AnyBalance.trace('Неизвестный остаток: ' + json.stringify(item));
  		}
  	}
  }

  AnyBalance.setResult(result);
}
