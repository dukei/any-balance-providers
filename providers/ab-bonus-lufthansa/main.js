
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию по бонусной программе Lufthansa Miles and More

Сайт оператора: https://mobile.lufthansa.com/
Личный кабинет: https://mobile.lufthansa.com/mma/account.do
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
  var baseurl = 'https://mobile.lufthansa.com/';
  AnyBalance.setDefaultCharset('utf-8');

  AB.checkEmpty(prefs.login, 'Введите логин!');
  AB.checkEmpty(prefs.password, 'Введите пароль!');
  //Need to enter a country
  var html = AnyBalance.requestGet(baseurl + 'hpg/cor.do?l=en', g_headers);

  if (!html || AnyBalance.getLastStatusCode() > 400) {
    AnyBalance.trace(html);
    throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
  }
  //return makeCountries(html);
  var country = prefs.country || 'DE';
  var action = AB.getParam(html, null, null, /action="(\/hpg\/cor.do[^"]*)/i, AB.replaceTagsAndSpaces);
  if (!action) {
    throw new AnyBalance.Error('Can not find country form!');
  }

  html = AnyBalance.requestPost(baseurl + action, {
    country: country,
    timezone: jstz.determine_timezone().name()
  }, g_headers);

  html = AnyBalance.requestPost(baseurl + "hpg/login.do?l=en", {
    user: prefs.login,
    pass: prefs.password,
    step: 'search'
  }, g_headers);

  if (!/step=logout|\/logout\?/.test(html)) {
    var error = AB.getParam(html, null, null,
      /class="[^"]*error[^"]*">[\s\S]*?class="[^"]*error[^"]*"[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);
    if (error) {
      throw new AnyBalance.Error(error, null, /id/i.test(error));
    }
    AnyBalance.trace(html);
    throw new AnyBalance.Error('Could not enter miles&more site. Is the site changed?');
  }

  var result = {
    success: true
  };

  AnyBalance.trace(AnyBalance.getLastUrl());
  html = AnyBalance.requestGet(baseurl + 'rs/account-statement?l=en', g_headers);
  AnyBalance.trace(AnyBalance.getLastUrl());

  AB.getParam(html, result, 'balance', /Award\s+miles([\s\S]*?)<\/li>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
  AB.getParam(html, result, 'qbalance', /Award\s+miles[\s\S]*?Status\s+miles([\s\S]*?)<\/li>/i, AB.replaceTagsAndSpaces,
    AB.parseBalance);
  AB.getParam(html, result, 'cardnum', /Account\s+balance[\s\S]*?<p[^>]*>[\s\S]*?<\/b>([\s\S]*?)<span/i, AB.replaceTagsAndSpaces);
  AB.getParam(html, result, 'nextstatus', /To\s+achieve([\s\S]*?)status/i, AB.replaceTagsAndSpaces);
  AB.getParam(html, result, 'nextstatusmiles', /To\s+achieve[\s\S]*?status([\s\S]*?)status\s+miles/i, AB.replaceTagsAndSpaces,
    AB.parseBalance);
  AB.getParam(html, result, 'nextfs', /To\s+achieve[\s\S]*?status\s+miles([\s\S]*?)flight/i, AB.replaceTagsAndSpaces,
    AB.parseBalance);

  AB.getParam(html, result, 'dateRange', /To\s+achieve[\s\S]*?flight\s+segments([\s\S]*?)<\/p>/i, AB.replaceTagsAndSpaces);

  AnyBalance.setResult(result);
}

function makeCountries(html) {
  var result = {
    success: true
  };

  var countries = AB.sumParam(html, null, null, /(<option[^>]+value="\w+"[^>]*>[^<]*<\/option>)/ig);
  var codes = [],
    names = [];
  for (var i = 0; i < countries.length; ++i) {
    codes[codes.length] = AB.getParam(countries[i], null, null, /value="([^"]*)/i, AB.replaceTagsAndSpaces);
    names[names.length] = AB.getParam(countries[i], null, null, /<option[^>]*>([^<]*)<\/option>/i, AB.replaceTagsAndSpaces);
  }

  result.codes = codes.join('|');
  result.names = names.join('|');
  AnyBalance.setResult(result);
}
