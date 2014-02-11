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
	var baseurl = 'https://gw.api.alibaba.com/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Enter login!');
	checkEmpty(prefs.password, 'Enter password!');
	
	var html = AnyBalance.requestPost(baseurl + 'openapi/param2/1/aliexpress.mobile/member.login/6', {
		appkey:'6',
		password:prefs.password,
		name:prefs.login
	}, g_headers);
	
	var json = getJson(html);
	
	if (json.head.code != 200) {
		var error = json.head.message;
		if (error)
			throw new AnyBalance.Error(error, null, /Wrong Member ID or password/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Can`t login, is the site changed?');
	}
	
	var result = {success: true};
	
	html = AnyBalance.requestPost(baseurl + 'openapi/param2/3/aliexpress.mobile/order.countOrderNum/6', {
		isAdmin:'y',
		access_token:json.body.accessToken
	}, g_headers);
	
	json = getJson(html);
	
	getParam(json.body.shipmentRequired + '', result, 'shipmentRequired', null, replaceTagsAndSpaces, parseBalance);
	getParam(json.body.paymentRequired + '', result, 'paymentRequired', null, replaceTagsAndSpaces, parseBalance);
	getParam(json.body.completedOrder + '', result, 'completedOrder', null, replaceTagsAndSpaces, parseBalance);
	getParam(json.body.unconfirmedDelivery + '', result, 'unconfirmedDelivery', null, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}