/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var baseurl = "https://issa.podryad.tv/";
	AnyBalance.setDefaultCharset('utf-8');
	
	var html = AnyBalance.requestGet(baseurl + 'login', g_headers);

	var params = createFormParams(html, function(params, str, name, value) {
		if (/login/i.test(name)) 
			return prefs.login;
		else if (/password/i.test(name))
			return prefs.password;

		return value;
	});
	
	var html = AnyBalance.requestPost(baseurl + 'login', params, addHeaders({Referer: baseurl + 'webexecuter'}));
	
	if (!/new\s+HupoApp\s*\(\s*\{/.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+error_container[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var json = getParam(html, null, null, /new\s+HupoApp\s*\(\s*(\{[\s\S]*?\})(?:\.data)?,\s/i, null, getJson);

	var result = {success: true};
	
	getParam(json.data.personal_accounts[0].n_sum_bal, result, 'balance', null, null, parseBalance);
	getParam(json.data.personal_accounts[0].n_recommended_pay, result, 'recommended_pay', null, null, parseBalance);

	for(var i=0; i<json.data.servs.length; ++i){
		var s = json.data.servs[i];
		sumParam(s.n_good_sum, result, 'licenseFee', null, null, parseBalance, aggregate_sum);
		sumParam(s.vc_name, result, '__tariff', null, null, null, aggregate_join);
	}

	getParam(json.data.personal_accounts[0].vc_account, result, 'licschet');
	getParam(json.data.person.vc_name, result, 'fio');
	
	getParam(json.data.personal_accounts[0].n_last_payment_sum, result, 'last_pay', null, null, parseBalance);
	getParam(json.data.personal_accounts[0].d_last_payment, result, 'last_pay_date', null, null, parseDateISO);
	
	AnyBalance.setResult(result);
}