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
	
	html = AnyBalance.requestPost(baseurl+'/user/login', {
		username: prefs.login,
		password: prefs.password,
		'Remember': 'false'
	}, addHeaders({Referer: baseurl+ '/mitt-vimla'}));


	var json = getJson(html);
	if(json.location !== '/mitt-vimla')
		throw new AnyBalance.Error("Can`t login to selfcare. Site changed?");

	html = AnyBalance.requestGet(baseurl+'/mitt-vimla', g_headers);
	var result = {success: true};

	getParam(html, result, 'fio', /personal['"][^>]*>[\s\S]*?(<span[^>]*>(\w+)<\/span>[\s\S]*?<span[^>]*>(\w+)<\/span>)/i, replaceTagsAndSpaces);
	getParam(html, result, 'phone', /Mobilnummer[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'premium', /<p[^>]*>Utomlands och betalsamtal[\s\S]*?<em[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode)

	function formatSizeUnits(bytes) {
		if (bytes >= 1073741824) 	{bytes = (bytes / 1073741824).toFixed(2) + ' GB';}
		else if (bytes>=1048576)    {bytes=(bytes/1048576).toFixed(2)+' MB';}
		else if (bytes>=1024)       {bytes=(bytes/1024).toFixed(2)+' KB';}
		else if (bytes>1)           {bytes=bytes+' bytes';}
		else if (bytes==1)          {bytes=bytes+' byte';}
		else                        {bytes='0 byte';}
		return bytes;
	}

	html = AnyBalance.requestGet(baseurl+'/subscription/priceplan',g_headers);
	getParam(html, result, 'BUsed', /"Included":{[^}]*?BUsed[^}]*?(\d+)/i, null, formatSizeUnits);
	getParam(html, result, 'BTotal', /"Included":{[^}]*?BTotal[^}]*?(\d+)/i, null, formatSizeUnits);
	getParam(html, result, 'BLeft', /"Included":{[^}]*?BLeft[^}]*?(\d+)/i, null, formatSizeUnits);
	getParam(html, result, 'extradata', /"Extra":{[^}]*?BLeft[^}]*?(\d+)/i, null, formatSizeUnits);
	getParam(html, result, 'usedMessages', /"Sms":{[^}]*?Used[\s\S]*?(\d+)[^}]*}/i, null, parseBalance);
	getParam(html, result, 'calls', /"Voice":{[^}]*?Used[\s\S]*?(\d+)[^}]*}/i, null, parseBalance);

	html = AnyBalance.requestGet(baseurl+'/invoice/aggregatelines', g_headers);
	getParam(html, result, 'nextPaymentDate', /"invoice":{[^}]*?NextPaymentDate[^}]*?(\d+)/i, null, parseBalance);
	getParam(html,result, 'totalAmount', /"invoice":{[^}]*?TotalAmount[^}]*?(\d+)/i, null, parseBalance);

	AnyBalance.setResult(result);
}