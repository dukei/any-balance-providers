
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
  var baseurl = 'https://www.mega-billing.ru/ru/';
  AnyBalance.setDefaultCharset('utf-8');

  AB.checkEmpty(prefs.login, 'Введите логин!');
  AB.checkEmpty(prefs.password, 'Введите пароль!');
  AB.checkEmpty(prefs.personalAccount, 'Введите номер лицевого счёта!');

  var
    currency = 'руб',
    balance,
    result;

  var html = AnyBalance.requestGet(baseurl, g_headers);

  var params = AB.createFormParams(html, function(params, str, name, value) {
    if (name == 'username') {
      return prefs.login;
    } else if (name == 'password') {
      return prefs.password;
    }
    return value;
  });

  html = AnyBalance.requestPost(baseurl + 'login', params, AB.addHeaders({
    Referer: baseurl + 'login'
  }));

  if (!/logout/i.test(html)) {
    var error = AB.getParam(html, null, null, /class="page-error"[^>]*>([^<]*)/i, AB.replaceTagsAndSpaces);
    if (error) {
      throw new AnyBalance.Error(error, null, /парол/i.test(error));
    }
    AnyBalance.trace(html);
    throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
  }


  //иногда переходит сразу к счёту
  if (/Потребитель/i.test(html) && setPaRegExp(prefs.personalAccount).test(html)) {
    AnyBalance.trace('blank page');
  } else {
    html = AnyBalance.requestGet(baseurl + 'accounts');
  }

  if (setPaRegExp(prefs.personalAccount).test(html) && !/Потребитель/i.test(html)) {
    var yetRegExp = setPaRegExp(prefs.personalAccount, ['value="[^"]*№\\s+', '[\\s\\S]*?dac_([^"]*)"']);
    var urlPart = AB.getParam(html, null, null, yetRegExp, AB.replaceTagsAndSpaces);
    html = AnyBalance.requestGet(baseurl + 'accounts/' + urlPart);
  } else {
    throw new AnyBalance.Error('Указанный лицевой счёт не найден, проверьте правильность ввода', null, true);
  }

  result = {
    success: true
  };

  balance = {};

  balance.value = AB.getParam(html, null, null, /<div[^>]*id="[^"]*saldo[^"]*"[^"]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
  balance.debt = AB.getParam(html, null, null, /<div[^>]*id="[^"]*saldo[^"]*"[^"]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);

  if (/нет/i.test(balance.debt)) {
    AB.getParam(balance.value, result, 'balance');
  } else {
    AB.getParam(balance.value * -1, result, 'balance');
  }

  AB.getParam(currency, result, 'currency');
  AB.getParam(html, result, 'acc', /Лицевой\s+сч[её]т\s*№\s*(\d+)/i, AB.replaceTagsAndSpaces);
  AB.getParam(html, result, 'fio', /Потребитель[\s\S]*?">([\s\S]*?)<\//i, AB.replaceTagsAndSpaces);
  AB.getParam(html, result, 'lastpay', /Последняя оплата[\s\S]*?>([\s\S]*?)<\//i, AB.replaceTagsAndSpaces);
  AB.getParam(html, result, 'lastcounter', /Последние показания счетчика[\s\S]*?>([\s\S]*?)г\./i, AB.replaceTagsAndSpaces);

  AnyBalance.setResult(result);
}



//help func
function setPaRegExp(str, array) {
  if (!array || array.length < 2) {
    return new RegExp(str, 'i');
  } else {
    return new RegExp(array[0] + str + array[1], 'i');
  }
}
