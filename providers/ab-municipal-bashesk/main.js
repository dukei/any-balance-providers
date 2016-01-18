
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
РУСГИДРО Башкортостан
*/

var g_headers = {
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
  'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
  'Connection': 'keep-alive',
  // Mobile
  //'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+',
  // Desktop
  'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
  var prefs = AnyBalance.getPreferences();
  // var baseurl = 'https://www.bashesk.ru/';
  var baseurl = 'https://www.bashesk.ru/user/account/debt/';
  // var loginUrl = 'https://www.bashesk.ru/bitrix/templates/bashesk/ajax/login.php?login=127042102420&password=050155';
  var loginUrl = 'https://www.bashesk.ru/bitrix/templates/bashesk/ajax/login.php?login=';
  AnyBalance.setDefaultCharset('utf-8');

  AB.checkEmpty(prefs.login, 'Введите логин!');
  AB.checkEmpty(prefs.password, 'Введите пароль!');

  var html = AnyBalance.requestGet(loginUrl + prefs.login + '&password=' + prefs.password, g_headers);

  var json = AB.getJson(html);

  if (json.success !== true) {
    AnyBalance.trace(html);
    throw new AnyBalance.Error('не правильеый логин или пароль');
  }

  if (!json.success) {
    AnyBalance.trace(html);
    throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
  }

  html = AnyBalance.requestGet(baseurl, g_headers);

  var result = {
    success: true
  };

  AB.getParam(html, result, 'fio', /Приветствуем\s+вас,([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);
  AB.getParam(html, result, 'contract', /№\s+договора([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);
  AB.getParam(html, result, 'currentTime', /общая\s+задолженность([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseDate);
  AB.getParam(html, result, 'balance', /общая\s+задолженность[\s\S]*?<\/td>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);

  var dataTable = AB.getElement(html, /<div[^>]*class="[^"]*debt-list[^>]*>/i);

  AB.getParam(dataTable, result, 'counter_1', /показания[\s\S]*?<\/td>([\s\S]*?<\/td>)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
  AB.getParam(dataTable, result, 'counter_2', /показания[\s\S]*?показания[\s\S]*?<\/td>([\s\S]*?<\/td>)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
  AB.getParam(dataTable, result, 'counter_1_tariff', /точка\s+уч[её]та([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
  AB.getParam(dataTable, result, 'counter_2_tariff', /уч[её]та[\s\S]*?уч[её]та([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);

  AnyBalance.setResult(result);
}
