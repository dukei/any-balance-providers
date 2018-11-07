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

  if(json.redirectToCorp){
  	mainIssa();
  	return;
  }
  
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
  getParam(json.userData.MSISDN, result, 'phone');

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

/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function mainIssa() {
  var prefs = AnyBalance.getPreferences();
  var baseurl = 'https://issa.life.com.by/';

  AB.checkEmpty(prefs.login, 'Введите номер телефона!');
  AB.checkEmpty(prefs.password, 'Введите пароль!');

  var matches = prefs.login.match(/^(\d{2})(\d{7})$/);
  if (!matches)
    throw new AnyBalance.Error('Пожалуйста, введите 9 последних цифр номера телефона (без префикса +375) без пробелов и разделителей.');

		var main = 'ru/';
	  var html = AnyBalance.requestGet(baseurl + main, g_headers);

		if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

  html = AnyBalance.requestPost(baseurl + main, {
    csrfmiddlewaretoken: AB.getParam(html, null, null, /csrfmiddlewaretoken['"][\s\S]*?value=['"]([^"']*)['"]/i),
    msisdn_code: matches[1],
    msisdn: matches[2],
    super_password: prefs.password,
    form: true,
    next: '/ru/'
  }, addHeaders({
    Referer: baseurl + main
  }));

  // Иногда после логина висит 500ая ошибка, при переходе на главную все начинает работать
  if (/Ошибка 500/i.test(html)) {
    AnyBalance.trace('Ошибка при логине... попробуем исправить...');
    html = AnyBalance.requestGet(baseurl + main + 'informaciya/abonent/', g_headers);
  }

  if (!/logout/i.test(html)) {
    if (/action\s*=\s*["']https:\/\/issa2\.life\.com\.by/i.test(html)) {
      AnyBalance.trace('Этот номер не поддерживается в новом кабинете, нас редиректит на старый адрес...');
      doOldCabinet(prefs, matches);
      return;
    }
    var error = getParam(html, null, null, /errorlist[^"]*"[^<]([\s\S]*?)<\/ul>/i, AB.replaceTagsAndSpaces);
    if (error) {
      throw new AnyBalance.Error(error, null, /пароль/i.test(error));
    }
    AnyBalance.trace(html);
    throw new AnyBalance.Error("Не удалось зайти в личный кабинет. Сайт изменен?");
  }

  var result = {
    success: true,
    balance: null
  };

//  html = AnyBalance.requestGet(baseurl + 'ru/informaciya/abonent/', g_headers);

  getParam(html, result, '__tariff', [/Тарифный план([^<]+)/i, /(?:Тарифный план|Наименование тарифного плана)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i], replaceTagsAndSpaces);
  getParam(html, result, 'fio', /ФИО(?:[^>]+>){2}([^<]+)/i, replaceTagsAndSpaces);
  getParam(html, result, 'phone', /Номер (?:life|телефона)(?:[^>]+>){2}([^<]+)/i, replaceTagsAndSpaces);
  // СМС/ММС
  sumParam(html, result, 'sms_left_other', /SMS на все сети(?:[^>]+>){2}([^<]+)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
  sumParam(html, result, 'sms_left', /SMS внутри сети(?:[^>]+>){2}([^<]+)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
  sumParam(html, result, 'mms_left', /MMS внутри сети(?:[^>]+>){2}([^<]+)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
  // Карманы
  html = sumParam(html, result, 'carmani_min_left', /(?:&#34;|"|\()карманы(?:&#34;|"|\))(?:[^>]*>){2}([\s\S]*?)<\//ig, replaceTagsAndSpaces, parseMinutes, aggregate_sum, true);
  // Минуты
  sumParam(html, result, 'min_left_other', /Звонки (?:на|во|в) (?:все|другие) сети(?:[^>]+>){2}([^<]+)/ig, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
  sumParam(html, result, 'min_left', /Звонки внутри сети(?:[^>]+>){2}([^<]+)/ig, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
  sumParam(html, result, 'min_left_other', /Звонки для группы(?:[^>]+>){2}([^<]+)/ig, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
  // Трафик
  sumParam(html, result, 'traffic_night_left', />\s*Ночной интернет(?:[^>]+>){2}([^<]+(?:МБ|Гб|Кб|Байт))/ig, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
  sumParam(html, result, 'traffic_left', />(?:(?:Безлимитный)?\s*интернет|Интернет со скидкой)(?:[^>]+>){2}([^<]+(?:МБ|Гб|Кб|Байт))/ig, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
  sumParam(html, result, 'traffic_msg_left', />интернет[^<]*(?:viber|whatsapp)(?:[^>]+>){2}([^<]+ед)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
  // Баланс
  getParam(html, result, 'balance', /<tr>\s*<td[^>]*>\s*(?:Общий|Основной) (?:сч(?:е|ё)т\s*(?=<)|баланс:)([\s\S]*?)<\/tr>/i, replaceTagsAndSpaces, parseBalance);
  getParam(html, result, 'balance', /<tr>\s*<td[^>]*>\s*Счёт к оплате за текущий период([\s\S]*?)<\/tr>/i, replaceTagsAndSpaces, parseBalance);

  getParam(html, result, 'limit', /<td[^>]*>\s*Корпоративный лимит(?:[\s\S]*?<td[^>]*>)([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseBalance);
  getParam(html, result, 'limit_used', /Использованный корпоративный лимит(?:[\s\S]*?<td[^>]*>)([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseBalance);

  // Баланс для постоплаты
  if (!isset(result.balance) || result.balance === 0)
    getParam(html, result, 'balance', /Задолженность на линии(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
  getParam(html, result, 'balance_bonus', /<tr>\s*<td[^>]*>\s*Бонусный (?:сч(?:е|ё)т\s*(?=<)|баланс:)([\s\S]*?)<\/tr>/i, replaceTagsAndSpaces, parseBalance);
  // Оплаченные обязательства
  getParam(html, result, 'balance_corent', /Оплаченные обязательства(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, parseBalance);

  // Life points
  getParam(html, result, 'life_points', /Бонусный счет для участников клуба my life(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);


  html = AnyBalance.requestGet(baseurl + 'ru/upravleniye-kontraktom/smena-tarifnogo-plana/', g_headers);
  getParam(html, result, '__tariff', /href="[^"]*">([^<]+)(?:[^>]*>){11}Активен/i, replaceTagsAndSpaces);

  if (isAvailable(['packs', 'packs_deadline'])) {
    html = AnyBalance.requestGet(baseurl + 'ru/upravleniye-kontraktom/upravleniye-uslugami/', g_headers);

    var packs = sumParam(html, null, null, /<tr>\s*<td[^>]*>\s*<p>[^<]+<\/p>(?:[^>]*>){5}\s*Активная(?:[^>]*>){2}\s*до[^<]+/ig, null);

    AnyBalance.trace('Найдено активных пакетов: ' + packs.length);

    sumParam(packs, result, 'packs', /<tr>\s*<td[^>]*>\s*<p>([^<]+)<\/p>/ig, replaceTagsAndSpaces, null, aggregate_join);
    sumParam(packs, result, 'packs_deadline', /Активная(?:[^>]*>){2}\s*до([^<]+)/ig, replaceTagsAndSpaces, parseDate, aggregate_min);
  }

  AnyBalance.setResult(result);
}

