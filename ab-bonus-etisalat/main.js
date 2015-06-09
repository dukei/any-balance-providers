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
	var baseurl = 'https://www.etisalatrewards.ae/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Please, enter login!');
	checkEmpty(prefs.password, 'Please, enter password!');
	
	var html = AnyBalance.requestGet(baseurl + 'en/logout_member', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'rest/service/login', {
		channelId: 'CUST_PORTAL',
		systemid: 'CUST_PORTAL',
		systempassword: 'CUST_PoRtal##22',
		customerauthtype: 'USER',
		customertype: 'USER',
		customersecret: prefs.password,
		customervalue: prefs.login,
		action: '',
	}, addHeaders({Referer: baseurl + 'Etisalat-End-User-Portal-1.0.0/logout.html'}));
	
	if (!/Successfull/i.test(html)) {
		var error = getParam(html, null, null, /"color:red"([^>]*>){2}/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /has not been recognised/i.test(error));

		if(/wrong password|user name and password to login/.test(html))
			throw new AnyBalance.Error('Wrong login or password, please try again.', null, true);			
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Can`t login, is the site changed?');
	}

	var json = getJson(html);
	var token = json.token;

	html = AnyBalance.requestPost(baseurl + 'rest/service/searchmember', {
		channelId: 'CUST_PORTAL',
		systemid: 'CUST_PORTAL',
		systempassword: 'CUST_PoRtal##22',
		token:token,
		accountNumber: '',
		email: '',
		emiratesId: '',
		membershipId: '',
		e4meUsername: ''
	}, addHeaders({Referer: baseurl + 'Etisalat-End-User-Portal-1.0.0/logout.html'}));

	var member = getJson(html).customers[0];

	if(!member)
		throw new AnyBalance.Error('User not found.');
	
	html = AnyBalance.requestPost(baseurl + 'rest/service/getAccountsByMember', {
		channelId: 'CUST_PORTAL',
		systemid: 'CUST_PORTAL',
		systempassword: 'CUST_PoRtal##22',
		membershipId: member.membershipId,
		token: token,
		additionalParameters: ''
	});

	var account = getJson(html).accounts[0];

	if(!account)
		throw new AnyBalance.Error('Account not found.');
	
	var result = {success: true};
	
	getParam(member.fullname, result, 'fio');
	getParam(account.accountNumber, result, 'cardnum');
	getParam(member.tier, result, 'tier_level');
	getParam(member.points, result, 'points');
	getParam(member.tierPoints, result, 'tier_points');
	
	AnyBalance.setResult(result);
}