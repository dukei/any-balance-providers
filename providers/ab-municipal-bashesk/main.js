
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
  var baseurl = 'https://www.bashesk.ru/';
  var lkUrl = 'user/main/';
  var loginUrl = 'local/templates/bashesk/ajax/login.php?login=';
  AnyBalance.setDefaultCharset('utf-8');

  AB.checkEmpty(prefs.login, 'Введите логин!');
  AB.checkEmpty(prefs.password, 'Введите пароль!');

  var html = AnyBalance.requestGet(baseurl + loginUrl + encodeURIComponent(prefs.login) + '&password=' + encodeURIComponent(prefs.password), g_headers);

  var json = AB.getJson(html);

  if (json.success !== true) {
    AnyBalance.trace(html);
    throw new AnyBalance.Error('Неправильный логин или пароль', null, true);
  }

  if (!json.success) {
    AnyBalance.trace(html);
    throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
  }

  html = AnyBalance.requestGet(baseurl + lkUrl, g_headers);
  if(/check/i.test(AnyBalance.getLastUrl())){
  	AnyBalance.trace('Надо подождать загрузки ЛК');
  	html = AnyBalance.requestPost(baseurl + 'local/templates/bashesk/components/openregion/bashesk.integration.soap/individual.checksoap/ajax/checksoap.php', '', addHeaders({
  		Referer: AnyBalance.getLastUrl(),
  		'X-Requested-With': 'XMLHttpRequest'
  	}));
  	html = AnyBalance.requestGet(baseurl + lkUrl, g_headers);
  }

  var result = {
    success: true
  };

  AB.getParam(html, result, 'fio', /Приветствуем\s+вас,([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);
  AB.getParam(html, result, 'contract', /№\s+договора([^<]*)/i, AB.replaceTagsAndSpaces);
  var balance = AB.getParam(html, null, null, /<div[^>]+pa-balance__value[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
  getParam(balance, result, 'balance');
  var debt = -balance;

  AB.getParam(html, result, 'currentTime', /общая\s+задолженность([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseDate);

  var counters = sumParam(html, null, null, /<input[^>]+pa-value__input[^>]*>/ig);
  for(var i=0; i<counters.length; ++i){
  	var curval = AB.getParam(counters[i], null, null, /value="([^"]*)/i, AB.replaceHtmlEntities, AB.parseBalance);
  	var rate = AB.getParam(counters[i], null, null, /data-rate="([^"]*)/i, AB.replaceHtmlEntities, AB.parseBalance);
  	var oldval = AB.getParam(counters[i], null, null, /data-readings="([^"]*)/i, AB.replaceHtmlEntities, AB.parseBalance);
  	debt += (curval - oldval)*rate;

  	AB.getParam(curval, result, 'counter_' + (i+1));
  	AB.getParam(rate, result, 'counter_' + (i+1) + '_tariff');
  }

  getParam(debt >= 0 ? debt : 0, result, 'currentTime');

  AnyBalance.setResult(result);
}
