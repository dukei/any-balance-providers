
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию о комунальных платежах из системы Единый Расчетный Центр

Operator site: http://www.erc.ur.ru/
Личный кабинет: http://www.erc.ur.ru/client/private_office/mprivate_office.htp
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
  var baseurl = "http://www.erc.ur.ru/";
  AnyBalance.setDefaultCharset('windows-1251');

  AB.checkEmpty(prefs.login, 'Введите логин!');
  AB.checkEmpty(prefs.password, 'Введите пароль!');

  var html = AnyBalance.requestGet(baseurl + 'client/private_office/private_office.htp', g_headers);

  if (!html || AnyBalance.getLastStatusCode() > 400) {
    AnyBalance.trace(html);
    throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
  }

  html = AnyBalance.requestPost(baseurl + 'client/private_office/private_office.htp', {
    'username': prefs.login,
    'password': prefs.password,
    smth: ''
  }, AB.addHeaders({
    Referer: baseurl + 'client/private_office/private_office.htp'
  }));

  if (!/Вы\s+вошли\s+как/i.test(html)) {
    var error = AB.getParam(html, null, null, /<div[^>]*class="[^"]*error[^"]*"[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);
    if (error) {
      throw new AnyBalance.Error(error, null, /логин|парол/i.test(error));
    }
    AnyBalance.trace(html);
    throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
  }

  html = AnyBalance.requestGet(baseurl + '/client/private_office/private_office.htp?ls', g_headers);

  var account = '';

  if (prefs.number) {
    if (!setRegExp(prefs.number).test(html)) {
      AnyBalance.trace('Указанный номер лицевого счёта не обнаружен, будут отображены данные для счёта по умолчанию');
    } else {
      account = AB.getParam(html, null, null, setRegExp(prefs.number, ['<a[^>]*href="[^"]*ls=([^"]*', '[^"]*)"']));
      AnyBalance.trace('поиск информации по указанному лицевому счёту');
    }
  }

  if (!account) {
    account = AB.getParam(html, null, null, /<a[^>]*href="[^"]*ls=([^"]*)"/i);
  }

  AnyBalance.trace('Номер лицевого счёта = ' + account);

  var result = {
    success: true
  };

  try {
    //http://www.erc.ur.ru/client/private_office/private_office.htp?ls=7002440209
    html = AnyBalance.requestGet(baseurl + 'client/private_office/private_office.htp?ls=' + account, g_headers);

    var
      s_Date = AB.getParam(html, null, null, /<input[^>]*class="[^"]*from[^"]*"[^>]*value="([^"]*)"/i),
      e_Date = AB.getParam(html, null, null, /<input[^>]*class="[^"]*to[^"]*"[^>]*value="([^"]*)"/i);

    //http://www.erc.ur.ru/client/private_office/private_office.htp?ls=7002440209
    html = AnyBalance.requestPost(baseurl + 'client/private_office/private_office.htp?ls=' + account, {
      'show': 2,
      's_Date': s_Date,
      'e_Date': e_Date
    }, AB.addHeaders({
      Referer: baseurl + 'client/private_office/private_office.htp?ls=' + account
    }));

    var
      table = html.match(/оплатах[\s\S]*?<\/h4>[\s\S]*?(<table[^>]*>[\s\S]*?<\/table>)/i)[1],
      info = AB.sumParam(table, null, null, /<tr[^>]*>([\s\S]*?)<\/tr>/gi, AB.replaceTagsAndSpaces);

    AB.getParam(info.join(', ').replace(/\n/g, ''), result, 'info');

    AB.getParam(account, result, 'account');

    table = html.match(/оплатах[\s\S]*?<\/h4>[\s\S]*?(<\/table[^>]*>[\s\S]*?<\/table>)/i)[1];

    AB.getParam(table, result, 'timeRange', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);

    AB.getParam(table, result, 'debtBegin', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(table, result, 'accrued', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(table, result, 'recalculation', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);

    AB.getParam(table, result, 'paymentDate', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseDate);

    AB.getParam(table, result, 'payment', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(table, result, 'paymentPenalty', /(?:[\s\S]*?<td[^>]*>){7}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(table, result, 'received', /(?:[\s\S]*?<td[^>]*>){8}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(table, result, 'debtEnd', /(?:[\s\S]*?<td[^>]*>){9}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);


  } catch (e) {
    AnyBalance.trace('Не удалось получить данные по лицевому счёту ' + e);
    console.log(e);
  }

  AnyBalance.setResult(result);
}


function setRegExp(str, arr) {

  if (arr) {
    return new RegExp(arr[0] + str + arr[1], 'i');
  } else {
    return new RegExp(str, 'i');
  }

}
