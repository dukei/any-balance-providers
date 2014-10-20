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

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://simpalsid.com/user/login?project_id=5107de83-f208-4ca4-87ed-9b69d58d16e1';
    AnyBalance.setDefaultCharset('utf-8'); 
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'login') 
			return prefs.login;
		else if (name == 'password')
			return prefs.password;

		return value;
	});	
	
	html = AnyBalance.requestPost(baseurl, params, addHeaders({Referer: baseurl}));
	
	var token = getParam(html, null, null, /TOKEN\s*=\s*"([^"]+)/i);
	if(!token)
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	
	html = AnyBalance.requestGet('http://simpalsid.com/wallet/cash?token='+token, g_headers);
	
	var json = getJson(html);
	
    var result = {success: true};
	result.balance = json.response.cash;
    //getParam(json.response.cash+'', result, 'balance', /([\s\S]*)/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}