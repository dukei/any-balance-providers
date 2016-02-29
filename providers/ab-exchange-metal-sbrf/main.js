/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает курсы драг металлов с сайта Сбербанка

Сайт: http://data.sberbank.ru/moscow/ru/quotes/metal
*/

var g_headers = {
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
  'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
  'Connection': 'keep-alive',
  'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main(){

  var prefs = AnyBalance.getPreferences();
  var baseurl = "http://data.sberbank.ru/";
  AnyBalance.setDefaultCharset('utf-8');

  var prefs = AnyBalance.getPreferences();
  var region = prefs.region || 'moscow';

  var html = AnyBalance.requestGet(baseurl + region + '/ru/quotes/metal/', g_headers);

  if (!html || AnyBalance.getLastStatusCode() > 400) {
    AnyBalance.trace(html);
    throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
  }

  var result = {success: true};

  getParam(html, result, 'date', /Время\s*?последнего\s*?изменения\s*?котировок\s*?:([\s\S]*?)\s*?</i, replaceTagsAndSpaces, parseDate);

  var tables = getElementsByClassName(html, 'table3_eggs4');
  if (!tables || !tables.length) {
    throw new AnyBalance.Error('Не удается найти котировки. Сайт изменен?.');
  }

  var colsDef = {
    buy: {
      re: /Покупка/i
    },
    sell: {
      re: /Продажа/i
    },
  };

  var info = [];
  processTable(tables[0], info, 'info.', colsDef);
  if (info.length) {
    info[0].name = 'Au';
    info[1].name = 'Ag';
    info[2].name = 'Pt';
    info[3].name = 'Pd';
    info.forEach(function (metal) {
      var name = metal.name;
      var weight = undefined;
      if(AnyBalance.isAvailable(name + '_buy'))
        result[name + '_buy'] = metal.buy;
      if(AnyBalance.isAvailable(name + '_sell'))
        result[name + '_sell'] = metal.sell;
      if(AnyBalance.isAvailable(name + '_weight') && (weight = getWeight(name)))
        result[name + '_weight'] = metal.buy * weight;
    });
  }

  AnyBalance.setResult(result);
}

function getWeight(metal){
	var prefs = AnyBalance.getPreferences();
	if(!prefs.weight)
		return undefined;
	if(/^[\d\s\.,]+$/.test(prefs.weight))
		return parseBalance(prefs.weight);
	var weight = getParam(prefs.weight, null, null, new RegExp(metal + '\s*:([^;a-z]*)', 'i'), null, parseBalance);
	return weight;
}
