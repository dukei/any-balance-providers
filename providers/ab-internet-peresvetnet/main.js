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
  var baseurl = 'https://lc.peresvetnet.ru/';
  AnyBalance.setDefaultCharset('utf-8');

  checkEmpty(prefs.login, 'Введите логин!');
  checkEmpty(prefs.password, 'Введите пароль!');

  var html = AnyBalance.requestGet(baseurl, g_headers);

  if (!html || AnyBalance.getLastStatusCode() > 400) {
    AnyBalance.trace(html);
    throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
  }

  var params = createFormParams(html, function(params, str, name, value) {
    if (name == 'username') {
      return prefs.login;
    } else if (name == 'password') {
      return prefs.password;
    }
    return value;
  });

  html = AnyBalance.requestPost(baseurl, params, g_headers);
  if (!html || AnyBalance.getLastStatusCode() > 400) {
    AnyBalance.trace(html);
    throw new AnyBalance.Error('Ошибка при входе в личный кабинет! Попробуйте обновить данные позже.');
  }

  if (!/logout/i.test(html)) {
    // определяем ошибку
    var error = getElementsByClassName(html, 'alert alert-block', replaceTagsAndSpaces);
    if (error && error.length) {
      // substring(1) - удаляет 'x' от кнопки закрытия сообщения
      throw new AnyBalance.Error(error[0].substring(1), null, /Ошибка авторизации/i.test(error[0]));
    } else {
      // если не смогли определить ошибку, то показываем дефолтное сообщение
      AnyBalance.trace(html);
      throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
  }

  var result = {success: true};

  getParam(html, result, 'balance', /Баланс[\s\S]*?<td[^>]*?>([\s\S]*?)<\/td/i, replaceTagsAndSpaces, parseBalance);

  var tables = getElementsByClassName(html, 'table table-striped');
  if (tables && tables.length && AnyBalance.isAvailable('next_tariff', 'begin_time', 'end_time')) {
    tables.forEach(function(table) {
      if (/Название\s*?тарифа/i.test(table)) {
        var colsDef = {
          __tariff: {
            re: /Название\s*?тарифа/i,
            result_func: null
          },
          next_tariff: {
            re: /Следующий\s*?ТП/i,
            result_func: null
          },
          begin_time: {
            re: /Начало\s*?расчётного\s*?периода/i,
            result_func: parseDate
          },
          end_time: {
            re: /Конец\s*?расчетного\s*?периода/i,
            result_func: parseDate
          }
        };

        var info = [];
        processTable(table, info, 'info.', colsDef);
        if (info.length) {
          result.__tariff = info[0].__tariff;
          if (AnyBalance.isAvailable('next_tariff')) {
            result.next_tariff = info[0].next_tariff;
          }
          if (AnyBalance.isAvailable('begin_time')) {
            result.begin_time = info[0].begin_time;
          }
          if (AnyBalance.isAvailable('end_time')) {
            result.end_time = info[0].end_time;
          }
        }
      }
    });
  }

  getParam(html, result, 'internet_status', /Статус\s*?интернета[\s\S]*?<td[^>]*?>\s*?<span[^>]*?>([\s\S]*?)<\/span/i, replaceTagsAndSpaces);
  getParam(html, result, 'blocking_status', /Состояние\s*?блокировки[\s\S]*?<td[^>]*?>\s*?<span[^>]*?>([\s\S]*?)<\/span/i, replaceTagsAndSpaces);
  getParam(html, result, 'fio', /<div[^>]*?id=\s*?['"]content['"][^>]*?>\s*?<div[^>]*?well[^>]*?>([\s\S]*?)<\/div/i, replaceTagsAndSpaces);
  getParam(html, result, 'account', /Основной\s*?лицевой\s*?счёт[\s\S]*?<td[^>]*?>([\s\S]*?)<\/td/i, replaceTagsAndSpaces);
  getParam(html, result, 'address', /Адрес[\s\S]*?<td[^>]*?>([\s\S]*?)<\/td/i, replaceTagsAndSpaces);
  getParam(html, result, 'connect_time', /Дата\s*?подключения[\s\S]*?<td[^>]*?>([\s\S]*?)<\/td/i, replaceTagsAndSpaces, parseDate);
  getParam(html, result, 'home_phone', /Домашний\s*?телефон[\s\S]*?<td[^>]*?>([\s\S]*?)<\/td/i, replaceTagsAndSpaces);
  getParam(html, result, 'mobile_phone', /Мобильный\s*?телефон[\s\S]*?<td[^>]*?>([\s\S]*?)<\/td/i, replaceTagsAndSpaces);
  getParam(html, result, 'email', /Email[\s\S]*?<td[^>]*?>([\s\S]*?)<\/td/i, replaceTagsAndSpaces);

  AnyBalance.setResult(result);
}
