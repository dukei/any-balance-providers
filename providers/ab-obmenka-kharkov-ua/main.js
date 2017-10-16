/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
https://kharkov.obmenka.ua/
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
  var baseUrl = 'https://kharkov.obmenka.ua/USD-UAH';
  AnyBalance.setDefaultCharset('utf-8');

  var html = AnyBalance.requestGet(baseUrl, g_headers);

  if (!html || AnyBalance.getLastStatusCode() > 400) {
    AnyBalance.trace(html);
    throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
  }

  var result = {
    success: true
  };

  if (prefs.type == 'retail') {
    getExchangeRate(html, result, 'amountRetailFrom', 'amountRetailTo');
    AB.getParam('РОЗНИЦА', result, 'rate');
  } else {
    getExchangeRate(html, result, 'amountWholesaleFrom', 'amountWholesaleTo');
    AB.getParam('ОПТОМ', result, 'rate');
  }

  AnyBalance.setResult(result);
}


function getExchangeRate(html, result, buy, sale) {
  try {
    AB.getParam(html, result, 'USDpok', getRateReg('CASHUSD', buy), AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'USDpro', getRateReg('CASHUSD', sale), AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'EURpok', getRateReg('CASHEUR', buy), AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'EURpro', getRateReg('CASHEUR', sale), AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'RUBpok', getRateReg('CASHRUB', buy), AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'RUBpro', getRateReg('CASHRUB', sale), AB.replaceTagsAndSpaces, AB.parseBalance);
  } catch (e) {
    AnyBalance.trace('Ошибка при получении курса обмена валют: ' + e);
  }

}

function getRateReg(currensyStr, type) {
  return new RegExp('"' + currensyStr + '"[\\s\\S]*?"CASHUAH"[\\s\\S]*?"' + type + '":([\\s\\S]*?)' + '[}{,"}]', 'i');
}
