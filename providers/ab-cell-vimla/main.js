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

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://vimla.se';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Enter login');
	checkEmpty(prefs.password, 'Enter password');
	
	var html = AnyBalance.requestGet(baseurl+'/mitt-vimla', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Error connecting to the site! Try to refresh the data later.');
	}
	
	var postHTML = AnyBalance.requestPost(baseurl+'/user/login', {
		username: prefs.login,
		password: prefs.password,
		'Remember': 'false'
	}, addHeaders({Referer: baseurl+ '/mitt-vimla'}));


	var json = getJson(postHTML);
	if(!json.success)
	{
		var error = getParam(html, null, null, /"loginFailed":"([\s\S]*?)"/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Oj, något gick snett/i.test(error));
		throw new AnyBalance.Error("Can`t login to selfcare. Site changed?");
	}

	var result = {success: true};

	html = AnyBalance.requestGet(baseurl+json.location, g_headers);
	getParam(html, result, 'fio', /personal['"][^>]*>[\s\S]*?(<span[^>]*>(\w+)<\/span>[\s\S]*?<span[^>]*>(\w+)<\/span>)/i, replaceTagsAndSpaces);
	getParam(html, result, 'phone', /Mobilnummer[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'premium', /<p[^>]*>Utomlands och betalsamtal[\s\S]*?<em[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);

	html = AnyBalance.requestGet(baseurl+'/invoice/aggregatelines', g_headers);
	json=getJson(html);
	getParam(json.invoice.NextPaymentDate, result, 'nextPaymentDate', null, null, parseBalance);
	getParam(json.invoice.TotalAmount, result, 'totalAmount', null, null, null);

	html = AnyBalance.requestGet(baseurl+'/subscription/priceplan',g_headers);
	json=getJson(html);
	getParam(json.pricePlan.Usage.Included.BUsed+'b', result, 'BUsed', null, null, parseTraffic);
	getParam(json.pricePlan.Usage.Included.BTotal+'b', result, 'BTotal', null, null, parseTraffic);
	getParam(json.pricePlan.Usage.Included.BLeft+'b', result, 'BLeft', null, null, parseTraffic);
	getParam(json.pricePlan.Usage.Extra.BLeft+'b', result, 'extradata', null, null, parseTraffic);
	getParam(json.pricePlan.Usage.Sms.Used, result, 'usedMessages', null, null, null);
	getParam(json.pricePlan.Usage.Voice.Used, result, 'calls', null, null, null);

	AnyBalance.setResult(result);
}