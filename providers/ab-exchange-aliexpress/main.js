
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

function main(){
  var baseUrl = "http://superdeals.aliexpress.com/en";
  var apiBaseUrl = "http://api.dos.aliexpress.com/aliexpress/";
  AnyBalance.setDefaultCharset('utf-8');

  var html = AnyBalance.requestGet(baseUrl, g_headers);

  if (!html || AnyBalance.getLastStatusCode() > 400) {
    AnyBalance.trace(html);
    throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
  }

  // получаем дату
  html = AnyBalance.requestGet(apiBaseUrl + 'tool/getTime.json?pattern=yyyyMMdd', g_headers);

  var json = getJson(html);
  if (json.hasError) {
    throw new AnyBalance.Error('Ошибка при определении даты на сервере! Попробуйте обновить данные позже.');
  }

  var date = json.content.timeMillis;
  var dataFormatted = json.content.timeFormatted;

  // узнаем "SuperDeals" товары
  var superDealsUrl = apiBaseUrl + 'data/doQuery.json?'
    + '&widgetId=101'
    + '&displayType=STRUCTURE'
    + '&limit=10'
    + '&offset=0';

  html = AnyBalance.requestGet(superDealsUrl, g_headers);
  json = getJson(html);
  if (json.hasError) {
    throw new AnyBalance.Error('Ошибка при получении товаров! Попробуйте обновить данные позже.');
  }

  // получаем текущий "SuperDeals" товар
  var nodeList = json.content.nodeList;
  var category = nodeList.find(function (node) {
    return node.name === dataFormatted;
  });
  var node = category.children.find(function (cat) {
    return cat.name === 'Single';
  });

  // получаем цену в RUB
  var rubUrl = apiBaseUrl + 'data/doQuery.json?'
    + '&widgetId=101'
    + '&displayType=DATA'
    + '&locale=en_US'
    + '&currency=RUB'
    + '&region=RU'
    + '&nodeId=' + node.id
    + '&limit=10'
    + '&offset=0';
  html = AnyBalance.requestGet(rubUrl, g_headers);
  json = getJson(html);
  if (json.hasError) {
    throw new AnyBalance.Error('Ошибка при получении цены товара в рублях! Попробуйте обновить данные позже.');
  }

  if (!json.content.nodeList.length || !json.content.nodeList[0].nodeData.dataList.length) {
    throw new AnyBalance.Error('Ошибка при определении цены товара в рублях! Сайт изменён?');
  }

  var rubPrice = parseBalance(json.content.nodeList[0].nodeData.dataList[0].minPrice);

  // получаем цену в USD
  var usdUrl = apiBaseUrl + 'data/doQuery.json?'
    + '&widgetId=101'
    + '&displayType=DATA'
    + '&locale=en_US'
    + '&currency=USD'
    + '&region=RU'
    + '&nodeId=' + node.id
    + '&limit=10'
    + '&offset=0';
  html = AnyBalance.requestGet(usdUrl, g_headers);
  json = getJson(html);
  if (json.hasError) {
    throw new AnyBalance.Error('Ошибка при получении цены товара в долларах! Попробуйте обновить данные позже.');
  }

  if (!json.content.nodeList.length || !json.content.nodeList[0].nodeData.dataList.length) {
    throw new AnyBalance.Error('Ошибка при определении цены товара в долларах! Сайт изменён?');
  }

  var usdPrice = parseBalance(json.content.nodeList[0].nodeData.dataList[0].minPrice);

  var result = {
    success: true,
    rate: (rubPrice/usdPrice).toFixed(4)
  };

  if(AnyBalance.isAvailable('date')) {
    result.date = date;
  }

  AnyBalance.setResult(result);
}
