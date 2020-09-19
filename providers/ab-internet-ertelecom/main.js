/**
Провайдер AnyBalance (https://github.com/dukei/any-balance-providers)
 */

var g_headers = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Encoding': 'gzip, deflate, br',
  'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36'
};

var g_baseUrlAuth = 'https://api-auth.domru.ru/v1';
var g_baseUrlProfile = 'https://api-profile.domru.ru/v1';

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
  AB.checkEmpty(prefs.password, 'Введите пароль от Личного кабинета!');

  AnyBalance.trace('Selected city: ' + city);

  var result = {
    success: true
  };

  var accessToken = login(prefs.login, prefs.password, false, city);

  getClientPersonal(accessToken, city, result);
  getPaymentInfo(accessToken, city, result);
  getProductsInfo(accessToken, city, result);

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
        'Domain': domain,
        'Authorization': 'Bearer ' + accessToken
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
  result['pay_till'] = parseDateISOSilent(response.payDay);
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

  if (!html || AnyBalance.getLastStatusCode() >= 400) {
    AnyBalance.trace('Action: "' + action + '", Response: ' + html);
    throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.', null, true);
  }

  var json = getJson(html);

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
