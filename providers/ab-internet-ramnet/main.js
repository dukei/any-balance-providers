/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};
function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://client.ramnet.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	if(!prefs.login)
		throw new AnyBalance.Error('Введите логин!');
	if(!prefs.password)
		throw new AnyBalance.Error('Введите пароль!');
		
	var html = AnyBalance.requestGet(baseurl + 'login', g_headers);
	
	var params = createFormParams(html, function(params, str, name, value){
		if(name == 'user[login]')
			return prefs.login;
		else if(name == 'user[password]')
			return prefs.password;
		return value;
	});

	html = AnyBalance.requestPost(baseurl + 'login', params, addHeaders({Referer: baseurl + 'login'}));
	
	var info = getParam(html, null, null, /new HupoApp\(([\s\S]*?\}),\s*\{logLevel/i, replaceTagsAndSpaces, html_entity_decode);
	
	if(!info) {
		var error = getParam(html, null, null, /class="error_container"[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
		if(error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	//var json = getJson(info);
    var result = {success: true};

	getParam(html, result, 'balance', /n_sum_bal":"([^"]*)"/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'acc_num', /vc_account":"([^"]*)"/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}