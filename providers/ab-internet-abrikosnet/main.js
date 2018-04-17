/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
  'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
  'Connection': 'keep-alive',
  'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
  var prefs = AnyBalance.getPreferences();
  var baseurl = 'https://lk.abrikosnet.ru/';
  AnyBalance.setDefaultCharset('utf-8');

  checkEmpty(prefs.login, 'Введите логин!');
  checkEmpty(prefs.password, 'Введите пароль!');

  var html = AnyBalance.requestGet(baseurl + 'users/', g_headers);

  if (!html || AnyBalance.getLastStatusCode() > 400) {
    AnyBalance.trace(html);
    throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
  }

  var params = createFormParams(html, function(params, str, name, value) {
    if (name == 'login') {
      return prefs.login;
    } else if (name == 'password') {
      return prefs.password;
    }
    return value;
  });

  html = AnyBalance.requestPost(baseurl + 'users/auth.action', params, g_headers);

  if (!/doLogout/i.test(html)) {
    var error = getElementById(html, 'login-error', replaceTagsAndSpaces);
    if (error) {
      throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
    }
    AnyBalance.trace(html);
    throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
  }

  html = AnyBalance.requestGet(baseurl + 'users/profile.action', g_headers);

  var result = {success: true};

  getParam(html, result, 'balance', /Баланс[\s\S]*?<dd[^>]*?value[^>]*?>\s*?<span[^>]*?>([\s\S]*?)</i, replaceTagsAndSpaces, parseBalance);
  getParam(html, result, '__tariff', /Тарифный\s*?план[\s\S]*?<dd[^>]*?value[^>]*?>([\s\S]*?)</i, replaceTagsAndSpaces);
  getParam(html, result, 'fee', /Абонентская\s*?плата[\s\S]*?<dd[^>]*?value[^>]*?>([\s\S]*?)</i, replaceTagsAndSpaces, parseBalance);
  getParam(html, result, 'fio', /Ф\.И\.О\.[\s\S]*?<td[^>]*?value[^>]*?>([\s\S]*?)</i, replaceTagsAndSpaces);
  getParam(html, result, 'address', /Адрес[\s\S]*?<td[^>]*?value[^>]*?>([\s\S]*?)</i, replaceTagsAndSpaces);
  getParam(html, result, 'contract', /№\s*?договора[\s\S]*?<td[^>]*?value[^>]*?>([\s\S]*?)</i, replaceTagsAndSpaces);
  getParam(html, result, 'account', /Лицевой\s*?счет[\s\S]*?<td[^>]*?value[^>]*?>([\s\S]*?)</i, replaceTagsAndSpaces);
  getParam(html, result, 'phone', /Телефон[\s\S]*?<input[^>]*?phone[^>]*?value\s*?=\s*?['"]([\s\S]*?)['"]/i, replaceTagsAndSpaces);
  getParam(html, result, 'email', /E-mail[\s\S]*?<input[^>]*?email[^>]*?value\s*?=\s*?['"]([\s\S]*?)['"]/i, replaceTagsAndSpaces);

  AnyBalance.setResult(result);
}
