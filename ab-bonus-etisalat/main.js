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
	var baseurl = 'http://www.etisalatrewards.ae/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Please, enter login!');
	checkEmpty(prefs.password, 'Please, enter password!');
	
	var html = AnyBalance.requestGet(baseurl + 'en/logout_member', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'en/login_membership.do', {
		SID:'1',
		service_number_detail: prefs.login,
		password: prefs.password,
		'LoginId': 'Member'
	}, addHeaders({Referer: baseurl + 'en/logout_member'}));
	
	if (!/Card Number\s*:[^>]*>\s*\d{10,}/i.test(html)) {
		var error = getParam(html, null, null, /"color:red"([^>]*>){2}/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /has not been recognised/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Can`t login, is the site changed?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'fio', /Name\s*:([^>]*>){2}/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'cardnum', /Card Number\s*:([^>]*>){2}/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'tier_level', /Tier Level\s*:([^>]*>){2}/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'points', />Points\s*:([^>]*>){2}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'tier_points', />Tier Points\s*:([^>]*>){2}/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}