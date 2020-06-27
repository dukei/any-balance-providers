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

function table2object(json){
	var out = [];
	for(var i=0; i<json.data.length; ++i){
		var o = {};
		for(var c=0; c<json.columns.length; ++c){
			o[json.columns[c]] = json.data[i][c];
		}
		out.push(o);
	}	
	return out;
}

function main() {
	var baseurl = 'https://iss.moex.com/';
	AnyBalance.setDefaultCharset('utf-8');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	var result = {success: true};

	var secs = [
		'USD000UTSTOM', 'EUR_RUB__TOM', 'EURUSD000TOM'
	];
	secs = 'CETS:' + secs.join(',CETS:');

	if(AnyBalance.isAvailable('USDRUB_TOM', 'EURRUB_TOM', 'EURUSD_TOM')){
		html = AnyBalance.requestGet(baseurl + 'iss/engines/currency/markets/selt/securities.jsonp?callback=iss_jsonp_04102e9523437737843fb4a857c3bd67dc626508&iss.meta=off&iss.only=securities%2Cmarketdata&securities=' + encodeURIComponent(secs) + '&lang=ru&_=' + (+new Date()),
			addHeaders({Referer: baseurl}));
		var json = getJsonObject(html);
	    
		var secid2name = {};
		var securities = table2object(json.securities); 
		for(var i=0; i<securities.length; ++i){
			secid2name[securities[i].SECID] = securities[i].SHORTNAME;
		}
	    
		var data = table2object(json.marketdata); 
		for(var i=0; i<data.length; ++i){
			secid2name[securities[i].SECID] = securities[i].SHORTNAME;
			getParam(data[i].LAST, result, secid2name[data[i].SECID]);
		}
	}

	if(AnyBalance.isAvailable('mmvb')){
		html = AnyBalance.requestGet(baseurl + 'iss/engines/stock/markets/index/securities.jsonp?callback=iss_jsonp_c2d0522cd13ff6516bd29effe6d36b6d4807dd6d&iss.meta=off&iss.only=securities%2Cmarketdata&securities=SNDX%3AIMOEX&lang=ru&_=' + (+new Date()), 
			addHeaders({Referer: baseurl}));

		var json = getJsonObject(html);
	    
		var data = table2object(json.marketdata); 
		getParam(data[0].CURRENTVALUE, result, 'mmvb');
	}

	if(AnyBalance.isAvailable('USD', 'EUR')){
		html = AnyBalance.requestGet('https://www.cbr.ru/', g_headers);
		var elem = getElement(html, /<div[^>]+mobile-indicator_courses/i);

		getParam(elem, result, 'USD', /Доллар США(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		getParam(elem, result, 'EUR', /Евро(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	}
	
	AnyBalance.setResult(result);
}