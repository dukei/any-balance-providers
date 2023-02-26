/**
Провайдер AnyBalance (https://github.com/dukei/any-balance-providers)
 */

var g_headers = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Encoding': 'gzip, deflate, br',
  'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36'
};

var g_baseUrlAuth = 'https://api-auth.dom.ru/v1';
var g_baseUrlProfile = 'https://api-profile.dom.ru/v1';
var g_baseUrlLoyalty = 'https://api-loyalty.dom.ru/v1';

/* Оставляем для сохранения обратной совместимости */
var g_region_change = {
  kzn: 'kazan',
  nch: 'chelny',
  novosib: 'nsk',
  spb: 'interzet',
};

function main() {
  AnyBalance.setDefaultCharset('utf-8');

  var prefs = AnyBalance.getPreferences();

  /* Сохраняем обратную совместимость. Если не указаны новые параметры, используем старые */
  prefs.city = prefs.city || prefs.region;
  prefs.login = prefs.login || prefs.log;
  prefs.password = prefs.password || prefs.pwd;

  var city = prefs.city || 'ryazan'; // Рязань по умолчанию

  /* Оставляем для сохранения обратной совместимости */
  if (g_region_change[city]) {
    city = g_region_change[city];
  }

  AB.checkEmpty(prefs.login, 'Укажите ваш номер Договора/Телефона/Логин/E-mail!');
  AB.checkEmpty(prefs.password, 'Введите пароль от личного кабинета!');

  AnyBalance.trace('Selected city: ' + city);

  var result = {
    success: true
  };

  var accessToken = login(prefs.login, prefs.password, false, city);

  getPaymentInfo(accessToken, city, result);
  getProductsInfo(accessToken, city, result);
  if (AnyBalance.isAvailable('tariff_number', 'name'))
    getClientPersonal(accessToken, city, result);
  if (AnyBalance.isAvailable('bonus_balance', 'bonus_expires_sum', 'bonus_expires_date', 'cashback_level', 'cashback_next_level_date'))
    getProgramInfo(accessToken, city, result);

  AnyBalance.setResult(result);
}

function login(username, password, rememberMe, domain) {
  var response = requestJson('POST', g_baseUrlAuth, '/person/auth', {
      headers: {
        'Domain': domain
      },
      data: {
        'username': username,
        'password': password,
        'rememberMe': rememberMe ? 1 : 0
      }
    });

  return response.data.access_token;
}

function getClientPersonal(accessToken, domain, result) {
  var response = requestJson('GET', g_baseUrlProfile, '/info/personal', {
      headers: {
        'domain': domain,
        'authorization': 'Bearer ' + accessToken
      }
    });

  result['tariff_number'] = response.agreement;
  result['name'] = response.fio;
}

function getPaymentInfo(accessToken, domain, result) {
  var response = requestJson('GET', g_baseUrlProfile, '/info/payment', {
      headers: {
        'Domain': domain,
        'Authorization': 'Bearer ' + accessToken
      },
      params: {
        'floatRecSum': 1
      }
    });

  result['balance'] = parseBalanceSilent(response.balance);
  result['pay_sum'] = parseBalanceSilent(response.paySum);
  result['pay_till'] = parseDateISOSilent(response.payDay);
  result['pay_period'] = capitalFirstLetters(response.payPeriodDates);
}

function getProductsInfo(accessToken, domain, result) {
  var response = requestJson('GET', g_baseUrlProfile, '/info/products', {
      headers: {
        'Domain': domain,
        'Authorization': 'Bearer ' + accessToken
      }
    });

  result['__tariff'] = response.tariffName;
}

function getProgramInfo(accessToken, domain, result) {
  var response = requestJson('GET', g_baseUrlLoyalty, '/program/info', {
      headers: {
        'Domain': domain,
        'Authorization': 'Bearer ' + accessToken
      }
    });

  if (response) {
    result['bonus_balance'] = parseBalanceSilent(response.bonuses);
    result['bonus_expires_sum'] = parseBalanceSilent(response.expireBonuses);
    result['bonus_expires_date'] = parseDateISOSilent(response.expireDate);
    result['cashback_level'] = parseBalanceSilent(response.loyaltyCash);
    result['cashback_next_level_date'] = parseDateSilent(response.nextLevelDate);
  } else {
	AnyBalance.trace('Не удалось получить данные по программе лояльности');
  }
}

function requestJson(method, url, action, options) {
  var html, paramsStr = '';

  if (!options) {
    options = {};
  } else {
    if (options.params) {
      paramsStr = createParams(options.params);
    }
  }

  if (method == 'POST') {
    html = AnyBalance.requestPost(url + action + paramsStr, options.data, joinObjects(g_headers, options.headers));
  } else {
    html = AnyBalance.requestGet(url + action + paramsStr, joinObjects(g_headers, options.headers));
  }

  if (!html || AnyBalance.getLastStatusCode() >= 500) {
    AnyBalance.trace('Action: "' + action + '", Response: ' + html);
    throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже', null, true);
  }

  var json = getJson(html);
  
  if (json.status && json.status >= 400) {
	var error = json.message;
	if (error) {
      AnyBalance.trace('Action: "' + action + '", Response: ' + html);
      throw new AnyBalance.Error(error, null, /договор|парол/i.test(error));
	}
	  
    AnyBalance.trace('Action: "' + action + '", Response: ' + html);
    throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
  }

  return json;
}

function createParams(params) {
  var result = '';
  for (var param in params) {
    result += result ? '&' : '?';
    result += encodeURIComponent(param);
    result += '=';
    result += encodeURIComponent(params[param]);
  }

  return result;
}
