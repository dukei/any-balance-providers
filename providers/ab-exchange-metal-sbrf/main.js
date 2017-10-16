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

  var body = '{"currencyData":[{"currencyCode":"A98","rangesAmountFrom":[0]},{"currencyCode":"A99","rangesAmountFrom":[0]},{"currencyCode":"A33","rangesAmountFrom":[0]},{"currencyCode":"A76","rangesAmountFrom":[0]}],"categoryCode":"base"}';

  var html = AnyBalance.requestPost('http://www.sberbank.ru/portalserver/proxy/?pipe=shortCachePipe&url=http%3A%2F%2Flocalhost%2Frates-web%2FrateService%2Frate%3FregionId%3D' + region + '%26fromDate%3D' + getFormattedDate({offsetDay: 7}) + '%26toDate%3D' + getFormattedDate() + '%26hash%3D' + computeHash(body),

  	body, 
  	addHeaders({
  		'X-Requested-With': 'XMLHttpRequest',
  		'Content-Type': 'application/json',
  		Referer: 'http://www.sberbank.ru/ru/quotes/metal/'
  	}));

  var json = getJson(html);

  var result = {success: true};

  for(var key in json){
  	  var metal = json[key];
  	  var name = g_iso_to2letters[metal.isoCur];
      if(AnyBalance.isAvailable(name + '_buy'))
        result[name + '_buy'] = metal.rates[0].buyValue;
      if(AnyBalance.isAvailable(name + '_sell'))
        result[name + '_sell'] = metal.rates[0].sellValue;
      if(AnyBalance.isAvailable(name + '_weight') && (weight = getWeight(name)))
        result[name + '_weight'] = metal.rates[0].buyValue * weight;
      sumParam(metal.rates[0].activeFrom, result, 'date', null, null, null, aggregate_max);
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
