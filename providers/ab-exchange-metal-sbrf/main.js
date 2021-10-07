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
	A33: 'Pd',
	A76: 'Pt',
	A98: 'Au',
	A99: 'Ag'
};

function main(){
  var prefs = AnyBalance.getPreferences();
  AnyBalance.setDefaultCharset('utf-8');

  var region = findRegion(prefs.region).TRBANK_CODE;
  
  if (/office/.test(prefs.type)) {
        var segType = '&segType=TRADITIONAL';
        var requestID = 'c169d176feee11568f0ed90b07e5cada';
		var sourceType = 'Офисы банка';
	} else {
        var segType = '';
        var requestID = '1e65ab9578777362383f525a74b7268f';
		var sourceType = 'СберБанк Онлайн';
    }	

  var html = AnyBalance.requestGet('https://www.sberbank.ru/proxy/services/rates/public/actual?rateType=PMR-3&isoCodes[]=A98&isoCodes[]=A99&isoCodes[]=A76&isoCodes[]=A33&regionId=' + region + segType,
  	addHeaders({
  		'X-Requested-With': 'XMLHttpRequest',
  		'X-Request-ID': requestID,
  		Referer: 'https://www.sberbank.ru/ru/quotes/metalbeznal/'
  	}));

  var json = getJson(html);

  var result = {success: true};

  for(var key in json){
  	  var metal = json[key];
  	  var name = g_iso_to2letters[key];
	  AnyBalance.trace(name + ': ' + JSON.stringify(metal));
      if(AnyBalance.isAvailable(name + '_buy'))
        result[name + '_buy'] = metal.rateList[0].rateBuy;
      if(AnyBalance.isAvailable(name + '_sell'))
        result[name + '_sell'] = metal.rateList[0].rateSell;
      if(AnyBalance.isAvailable(name + '_weight') && (weight = getWeight(name)))
        result[name + '_weight'] = metal.rateList[0].rateBuy * weight;
	  if(AnyBalance.isAvailable('date'))
        sumParam(metal.startDateTime, result, 'date', null, null, null, aggregate_max);
	  if(AnyBalance.isAvailable('source'))
        getParam(sourceType, result, 'source');
	  getParam(getFormattedDate(null, new Date(metal.startDateTime)), result, '__tariff');
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
