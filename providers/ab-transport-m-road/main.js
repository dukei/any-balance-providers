
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

function getParamByName(html, name) {
  return getParam(html, null, null, new RegExp('name="' + name + '"[^>]*value="([^"]+)', 'i'));
}

function main() {
  var prefs = AnyBalance.getPreferences();
  var baseurl = 'https://lk.m-road.ru/';
  AnyBalance.setDefaultCharset('utf-8');

  AB.checkEmpty(prefs.login, 'Введите логин!');
  AB.checkEmpty(prefs.password, 'Введите пароль!');

  var html = AnyBalance.requestGet(baseurl + 'Login.aspx', g_headers);

  html = AnyBalance.requestPost(baseurl + 'Login.aspx', {
    '__EVENTTARGET': '',
    '__EVENTARGUMENT': '',
    '__VIEWSTATE': getParamByName(html, '__VIEWSTATE'),
    '__EVENTVALIDATION': getParamByName(html, '__EVENTVALIDATION'),
    'ctl00$contentContent$txtUsername': prefs.login,
    'ctl00$contentContent$txtPassword': prefs.password,
    'ctl00$contentContent$btnLogin': 'Войти!',
    'ctl00$contentFooter$hideLoginError': ''
  }, addHeaders({
    Referer: baseurl + 'Login.aspx'
  }));

  if (!/>\s*добро\s+пожаловать[^<]*</i.test(html)) {
    var error = getParam(html, null, null, /id="[^"]*error[^"]*"[\s\S]*?(<span[\s\S]*?)<\/span>/i, AB.replaceTagsAndSpaces);
    AnyBalance.trace(error);
    if (error) {
      throw new AnyBalance.Error(error, null, /пароль/i.test(error));
    }
    AnyBalance.trace(html);
    throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
  }

  var result = {
    success: true
  };

  AB.getParam(html, result, 'balance', />\s*Баланс Вашего лицевого счета составляет([^>]*>){3}/i, AB.replaceTagsAndSpaces, AB.parseBalance);
  AB.getParam(html, result, 'travels', />\s*За текущий месяц совершено поездок([^>]*>){3}/i, AB.replaceTagsAndSpaces, AB.parseBalance);
  AB.getParam(html, result, 'travels_cost', />\s*Общая стоимость поездок, совершенных в текущем месяце([^>]*>){3}/i, AB.replaceTagsAndSpaces, AB.parseBalance);
  AB.getParam(html, result, 'agreement', />\s*Договор №([^>]*>){3}/i, AB.replaceTagsAndSpaces);

  AnyBalance.setResult(result);
}
