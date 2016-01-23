
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
Филиал ГУП РК «Крымтеплокоммунэнерго» в г.Ялта
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
  var baseurl = 'http://yaltateplo.ru/';
  AnyBalance.setDefaultCharset('utf-8');

  AB.checkEmpty(/\d{2}\/\d{5}/i.test(prefs.login), 'Введите номер лицевой счет в формате 02/04545!');

  var html = AnyBalance.requestGet(baseurl, g_headers);

  if (!html || AnyBalance.getLastStatusCode() > 400) {
    AnyBalance.trace(html);
    throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
  }

  html = AnyBalance.requestPost(baseurl, {
    'DOGOVOR': prefs.login,
    'mode': 'Показать выписку',
    'action': 'form'
  }, g_headers);

  if (!/выписка\s+из/i.test(html)) {
    var error = AB.getParam(html, null, null, /error_ins[^"]*"[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);
    if (error) {
      throw new AnyBalance.Error(error, null, /не\s+найдена/i.test(error));
    }
    throw new AnyBalance.Error('Не удалось найти информацию по счету. Сайт изменен?');
  }

  var currentUrl = AnyBalance.getLastUrl();

  if (/GUP/i.test(currentUrl)) {
    html = AnyBalance.requestGet(baseurl + 'abonent/' + prefs.login + '/GUPlight/', g_headers);
  } else {
    if (/full/i.test(currentUrl)) {
      html = AnyBalance.requestGet(baseurl + 'abonent/' + prefs.login + '/light/', g_headers);
    }
  }

  var result = {
    success: true
  };

  var balance = AB.getParam(html, null, null, /У вас([\s\S]*?)руб/i, null, null);
  var val = 0;
  if (balance) {
    if (/долг/i.test(balance))
      val = parseBalance(balance) * -1;
    else
      val = parseBalance(balance);
  }

  result.balance = val;
  AB.getParam(prefs.login, result, 'acc', null, null, null);
  AB.getParam(html, result, 'nachisleno', /<td>\s*Начислено\s*<\/td>(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
  AB.getParam(html, result, 'oplacheno', /<td>\s*Оплачено\s*<\/td>(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
  AB.getParam(html, result, 'dolg', /<td>\s*Долг\s*<\/td>(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);

  AnyBalance.setResult(result);
}
