
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
  var baseurl = 'http://declaration.belpost.by/searchRu.aspx';
  AnyBalance.setDefaultCharset('utf-8');

  AB.checkEmpty(prefs.cargo, 'Введите номер отправления!');

  var html = AnyBalance.requestGet(baseurl, g_headers);

  if (!html || AnyBalance.getLastStatusCode() > 400) {
    AnyBalance.trace(html);
    throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
  }

  AnyBalance.sleep(1000);

  html = AnyBalance.requestGet(baseurl + '?search=' + prefs.cargo, g_headers);

  if (!/<input[^>]*id="[^"]*Search[^"]*"[^>]*>/i.test(html)) {
    AnyBalance.trace(html);
    throw new AnyBalance.Error('Не удалось найти кнопку поиска. Сайт изменен?');
  }

  if (/не\s+найдено/i.test(html)) {
    throw new AnyBalance.Error('По данному отправлению ничего не найдено', null, /ничего\s+не\s+найдено/i.test(html));
  }

  var result = {
    success: true
  };

  var infoTable = AB.getElement(html, /<table[^>]*id="[^"]*info[^"]*"[^>]*>/i);
  var trArray = AB.sumParam(infoTable, null, null, /<tr[^>]*>([\s\S]*?)<\/tr>/gi);
  var fresh = trArray[trArray.length - 1];

  AB.getParam(fresh, result, 'date', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseDateISO);
  AB.getParam(fresh, result, 'status', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
  AB.getParam(fresh, result, 'post_office', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);

  if (AnyBalance.isAvailable('fulltext')) {
    var
      date, office, status, fullInfo = [];

    for (var i = trArray.length - 1; i > 0; i--) {
      date = AB.getParam(trArray[i], null, null, /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
      status = AB.getParam(trArray[i], null, null, /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
      office = AB.getParam(trArray[i], null, null, /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
      fullInfo.push('Дата: <b>' + date + '</b> ' + 'Cобытие: ' + status + '. ' + 'Офис: ' + office);
    }
    AB.getParam(fullInfo.join('<br/>'), result, 'fulltext');
  }
  AnyBalance.setResult(result);
}
