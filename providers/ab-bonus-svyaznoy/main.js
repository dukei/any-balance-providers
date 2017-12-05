
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
  'Accept': 'application/json, text/javascript, */*; q=0.01',
  'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
  'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
  'Connection': 'keep-alive',
  'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
  'X-Requested-With': 'XMLHttpRequest'
};

function main() {
  var prefs = AnyBalance.getPreferences();
  var baseurlAuth = 'https://oauth.sclub.ru/';
  var baseurlApi = 'https://api.sclub.ru/';
  var baseurl = 'https://sclub.ru/';
  AnyBalance.setDefaultCharset('utf-8');

  AB.checkEmpty(prefs.login, 'Введите № карты!');
  checkEmailOrCardNum(prefs.login, 'Некорректный email или номер карты');
  AB.checkEmpty(prefs.password, 'Введите пароль!');

  var html = AnyBalance.requestGet(baseurl, g_headers);

  var res = AnyBalance.requestPost(baseurlAuth + 'connect/token', {
    grant_type: 'password',
    username: prefs.login,
    password: prefs.password,
    client_id: '1'
  }, addHeaders({
    Referer: baseurl
  }));

  var json = getJson(res);

  if(/recaptcha/i.test(json.message)){
  	AnyBalance.trace('Потребовалась рекапча...');
  	var recaptcha = solveRecaptcha('Пожалуйста, докажите, что вы не робот!', baseurl, '6LdBYQITAAAAAJ-XHv2zQovsH44LC_Eef-KVH1GT');
  	res = AnyBalance.requestPost(baseurlAuth + 'connect/token', {
    	grant_type: 'password',
    	username: prefs.login,
    	password: prefs.password,
    	client_id: '1'
  	}, addHeaders({
  		'recaptcha-code': recaptcha,
    	Referer: baseurl
	}));
  	json = getJson(res);
  }

  if (!json || json.error_description || json.message || !json.access_token) {
  	var error = json.error_description || json.message || json.error;
    if (error)
      throw new AnyBalance.Error(error, null, /Неверные данные для авторизации/.test(error));
    AnyBalance.trace(JSON.stringify(json));
    throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
  }

  var token = json.access_token;

  res = AnyBalance.requestGet(baseurlApi + 'identity/user', addHeaders({
    Referer: baseurl,
    Authorization: 'Bearer ' + token
  }));

  json = getJson(res);

  var result = {
    success: true
  };
  var cardNo = json.cards[0];
  if(!cardNo)
  	  throw new AnyBalance.Error('У вас нет ни одной бонусной карты');

  html = AnyBalance.requestGet(baseurlApi + 'cards/' + cardNo, addHeaders({
  	  Referer: baseurl,
      Authorization: 'Bearer ' + token
  }));
  var card = getJson(html);

  AB.getParam(json.nickName + '', result, 'customer', null, AB.replaceTagsAndSpaces);
  AB.getParam(card.pluses + '', result, 'balanceinpoints', null, AB.replaceTagsAndSpaces, AB.parseBalance);
  AB.getParam(card && card.balance/100, result, 'balanceinrubles', null, AB.replaceTagsAndSpaces, AB.parseBalance);
  AB.getParam(card && card.ean, result, 'cardnumber');
  AB.getParam(card && card.status, result, 'cardstate');
  AB.getParam(card && card.plan, result, '__tariff');
  AB.getParam(card && card.planExpires, result, 'till', null, null, parseDateISO);

  if (card && AnyBalance.isAvailable(['pointsinlastoper', 'lastoperationplace', 'lastoperationdate'])) {
    res = AnyBalance.requestGet(baseurlApi + 'identity/user/cards/' + card.ean + '/operations?orderByDateAsc=false&skip=0&take=10&type=', addHeaders({
      Referer: baseurl,
      Authorization: 'Bearer ' + token
    }));

    json = getJson(res);

    if (json.data && json.data.length) {
      var lastOperation = json.data[0];

      AB.getParam(lastOperation.amount + '', result, 'pointsinlastoper', null, AB.replaceTagsAndSpaces, AB.parseBalance);
      AB.getParam(lastOperation.operationDate + '', result, 'lastoperationdate', null, AB.replaceTagsAndSpaces, AB.parseDateISO);

      if(AnyBalance.isAvailable('lastoperationplace') && lastOperation.partnerStoreId){
    		res = AnyBalance.requestGet(baseurlApi + 'content/stores/?ids=' + lastOperation.partnerStoreId, addHeaders({
      			Referer: baseurl,
		        Authorization: 'Bearer ' + token
		    }));
    		json = getJson(res);

            AB.getParam(json[0] && json[0].brandName, result, 'lastoperationplace', null, AB.replaceTagsAndSpaces);
      }

    }
  }

  AnyBalance.setResult(result);
}

function checkEmailOrCardNum(n, msg) {
  if (/^[a-zA-Z0-9]+[a-zA-Z0-9_.-]*[a-zA-Z0-9_-]*@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+[a-zA-Z]+$/.test(n))
    return true;
  if (n && 13 == n.length) {
    var a = /298[0-9]{10}/.test(n);
    if (a) {
      for (var o, l = n.toString(), c = 0, u = 0, d = 0, f = 1; d < l.length - 1; d += 2, f += 2) {
        var p = Number(l.substr(d, 1));
        if (c += p, 13 > f) {
          var h = Number(l.substr(f, 1));
          u += h;
        }
      }
      if (u = 3 * u, o = c + u, o = (o + Number(l.substr(12, 1))) % 10, 0 === o)
        return true;
    }
  }
  throw new AnyBalance.Error(msg);
}
