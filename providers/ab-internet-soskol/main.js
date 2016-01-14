
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
ab-internet-soskol
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
  var baseurl = 'http://stat.soskol.info/';
  AnyBalance.setDefaultCharset('windows-1251');

  AB.checkEmpty(prefs.login, 'Введите логин!');
  AB.checkEmpty(prefs.password, 'Введите пароль!');

  var html = AnyBalance.requestGet(baseurl + '?mode=auth', g_headers);

  if (!html || AnyBalance.getLastStatusCode() > 400) {
    AnyBalance.trace(html);
    throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
  }

  html = AnyBalance.requestPost(baseurl + '?mode=auth', {
    'user': prefs.login,
    'passw': prefs.password
  }, AB.addHeaders({
    Referer: baseurl + '?mode=auth'
  }));

  if (!/logout/i.test(html)) {
    AnyBalance.trace(html);
    throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
  }

  var result = {
    success: true
  };

  html = AnyBalance.requestGet(baseurl + '?mode=aabonent', g_headers);

  AB.getParam(html, result, 'balance', /СОСТОЯНИЕ\s+СЧЕТА\s+ИНТЕРНЕТ([\s\S]*?<\/div>)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
  AB.getParam(html, result, 'licschet', /НОМЕР ЛИЦЕВОГО СЧЕТА([\s\S]*?<\/div>)/i, AB.replaceTagsAndSpaces);

  html = AnyBalance.requestGet(baseurl + '?mode=state', g_headers);

  var paymentTable = AB.getElement(html, /<div[^>]*id="id3"[^>]*>[\s\S]*?<table>/i);

  AB.getParam(paymentTable, result, 'payDate', /СУММА[\s\S]*?<tr>(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>[\s\S]*?<\/tr>/i, AB.replaceTagsAndSpaces, AB.parseDate);
  AB.getParam(paymentTable, result, 'payComment', /СУММА[\s\S]*?<tr>(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>[\s\S]*?<\/tr>/i,AB.replaceTagsAndSpaces);
  AB.getParam(paymentTable, result, 'payType', /СУММА[\s\S]*?<tr>(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>[\s\S]*?<\/tr>/i, AB.replaceTagsAndSpaces);
  AB.getParam(paymentTable, result, 'payValue', /СУММА[\s\S]*?<tr>(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>[\s\S]*?<\/tr>/i, AB.replaceTagsAndSpaces, AB.parseBalance);


  AnyBalance.setResult(result);
}
