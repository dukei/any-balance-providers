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

var g_iso_to2letters = {
	palladium: 'Pl',
	platinum: 'Pt',
	Gold: 'Au',
	Silver: 'Ag'
};

function main(){
  var prefs = AnyBalance.getPreferences();
  AnyBalance.setDefaultCharset('utf-8');

  var region = findRegion(prefs.region).REGION_ID;

  var html = AnyBalance.requestGet('https://www.sberbank.ru/portalserver/proxy/?pipe=shortCachePipe&url=http%3A%2F%2Flocalhost%2Frates-web%2FrateService%2Frate%2Fcurrent%3FregionId%3D' + region + '%26rateCategory%3Dbase%26currencyCode%3DA33%26currencyCode%3DA76%26currencyCode%3DA98%26currencyCode%3DA99',
  	addHeaders({
  		'X-Requested-With': 'XMLHttpRequest',
  		'X-Request-ID': 'cf0e71d3-a5e5-4a48-b4d3-7464c0ffb773',
  		Referer: 'https://www.sberbank.ru/ru/quotes/metal/'
  	}));

  var json = getJson(html);

  var result = {success: true};

  for(var key in json.base){
  	  var metal = json.base[key][0];
  	  var name = g_iso_to2letters[metal.isoCur];
      if(AnyBalance.isAvailable(name + '_buy'))
        result[name + '_buy'] = metal.buyValue;
      if(AnyBalance.isAvailable(name + '_sell'))
        result[name + '_sell'] = metal.sellValue;
      if(AnyBalance.isAvailable(name + '_weight') && (weight = getWeight(name)))
        result[name + '_weight'] = metal.buyValue * weight;
      sumParam(metal.activeFrom, result, 'date', null, null, null, aggregate_max);
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
