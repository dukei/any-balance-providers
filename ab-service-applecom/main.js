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
	var baseurl = 'https://selfsolve.apple.com/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Enter serila number, please.');

	var html = AnyBalance.requestGet(baseurl + 'agreementWarrantyDynamic.do', g_headers);

	html = AnyBalance.requestPost(baseurl + 'wcResults.do', {
		sn:prefs.login,
		cn:'',
		locale:'',
		caller:'',
		num:'236543',
	}, addHeaders({Referer: baseurl + 'agreementWarrantyDynamic.do'}));

	if (/showErrors\(errorMsg\)/i.test(html)) {
		var error = getParam(html, null, null, /var errorMsg(?:[^"']*'){1}([^"']*)/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Can`t find device by serial number ('+prefs.login+'), is the site changed?');
	}
	var result = {success: true};
	
	var activated  = /hideRow[^']*'iphonenotactivated'/i.test(html);
	getParam(activated ? 'Activated' : 'Not activated', result, 'status');
	
	getParam(html, result, 'device', /displayProductInfo(?:[^"']*'){3}([^"']*)/i, replaceTagsAndSpaces, html_entity_decode);
	
	getParam(html, result, 'support', /Telephone Technical Support:([^<']+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'support_till', /Telephone Technical Support:(?:[^>]+>)\s*Estimated Expiration Date:([^<]+)/i, [/(\D+)(\d+),\s*(\d{4})/i, '$2 $1 $3'], parseDateWord);
	
	getParam(html, result, 'repair', /Repairs and Service Coverage:([^<']+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'repair_till', /Repairs and Service Coverage:(?:[^>]+>)\s*Estimated Expiration Date:([^<]+)/i, [/(\D+)(\d+),\s*(\d{4})/i, '$2 $1 $3'], parseDateWord);

	AnyBalance.setResult(result);
}