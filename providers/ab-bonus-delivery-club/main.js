
var g_headers = {
  'Accept': 'application/json, text/javascript, */*; q=0.01',
  'Origin': 'http://www.delivery-club.ru',
  'X-Requested-With': 'XMLHttpRequest',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.111 Safari/537.36',
  'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
  'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
  'X-NewRelic-ID': 'UgQBUlBUGwADV1FbBAc='
};

function main() {
  var prefs = AnyBalance.getPreferences();
  var baseurl = 'http://www.delivery-club.ru/';
  AnyBalance.setDefaultCharset('utf-8');

  AB.checkEmpty(prefs.login, 'Введите логин!');
  AB.checkEmpty(prefs.password, 'Введите пароль!');

  var html = AnyBalance.requestGet(baseurl, g_headers);

  if (!html || AnyBalance.getLastStatusCode() > 400) {
    AnyBalance.trace(html);
    throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
  }

  AnyBalance.sleep(3000);

  html = AnyBalance.requestPost(baseurl + 'ajax/login/', {
    c_l: prefs.login,
    c_p: prefs.password
  }, AB.addHeaders({
    Referer: baseurl + 'ajax/login/'
  }));

  if (!/success/i.test(html)) {
    var json = AB.getJson(html);
    if (json.error)
      throw new AnyBalance.Error(json.error.log_in_failed, null, /пароль/i.test(json.error.log_in_failed));
    AnyBalance.trace(json);
    throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
  }

  html = AnyBalance.requestGet(baseurl, g_headers);
  var result = {
    success: true
  };

  AB.getParam(html, result, 'fio', /id="user-profile"[^>]*>([\s\S]*?)<ul/i, AB.replaceTagsAndSpaces);
  AB.getParam(html, result, 'balance', /id="user-points"[^>]*>([\s\S]*?)<\/a>/i, AB.replaceTagsAndSpaces, AB.parseBalance);

  AnyBalance.setResult(result);
}
