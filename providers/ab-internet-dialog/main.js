/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
Диалог (Калининград)
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
  var baseurl = "https://stats.tis-dialog.ru/";
  AnyBalance.setDefaultCharset('windows-1251');

  AB.checkEmpty(prefs.login, 'Введите логин!');
  AB.checkEmpty(prefs.password, 'Введите пароль!');

  var html = AnyBalance.requestGet(baseurl, g_headers);

  if (!html || AnyBalance.getLastStatusCode() > 400) {
    AnyBalance.trace(html);
    throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
  }

  html = AnyBalance.requestPost(baseurl + 'index.php', {
    'login': prefs.login,
    'passv': prefs.password,
  }, AB.addHeaders({
    Referer: baseurl + 'index.php'
  }));

  if (!/выход/i.test(html)) {
    var error = AB.getParam(html, null, null, /loginLinks[^"]*"[^>]*>([\s\S]*?)<\/span>/i, AB.replaceTagsAndSpaces);
    if (error) {
      throw new AnyBalance.Error(error, null, /пароль/i.test(error));
    }
    AnyBalance.trace(html);
    throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
  }

  var result = {
    success: true
  };

  AB.getParam(html, result, 'licschet', /Лицевой счет[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
  AB.getParam(html, result, '__tariff', /Тарифный план[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
  AB.getParam(html, result, 'balance', /Баланс[\s\S]*?<td[^>]*>(-?\d[\d\.,\s]*)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
  AB.getParam(html, result, 'userName', /Ф\.И\.О\.[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
  AB.getParam(html, result, 'status', /Состояние[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
  AB.getParam(html, result, 'online',
    /Online\ ([0-9]{1,2}\.[0-9]{1,2}\.[0-9]{4}\ [0-9]{1,2}:[0-9]{1,2}:[0-9]{1,2})\ IP:/i, AB.replaceTagsAndSpaces);
  AB.getParam(html, result, 'ip', /IP:([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})/i, AB.replaceTagsAndSpaces);
  AB.getParam(html, result, 'user_address', /Адрес подключения[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i,
    AB.replaceTagsAndSpaces);
  AB.getParam(html, result, 'speed', /Скорость подключения[\s\S]*?<td[^>]*>([\s\S]*?\/с)/i, AB.replaceTagsAndSpaces);
  AB.getParam(html, result, 'trafficExtIn', /внешний(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
  AB.getParam(html, result, 'trafficExtOut', /внешний(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
  AB.getParam(html, result, 'trafficCityIn', /внешний(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
  AB.getParam(html, result, 'trafficCityOut', /внешний(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);


  AnyBalance.setResult(result);

}