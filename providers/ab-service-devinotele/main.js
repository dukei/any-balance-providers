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
	var baseurl = 'https://my.devinotele.com/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'Account/LogOn', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
    html = AnyBalance.requestGet('https://integrationapi.net/rest/user/sessionid?login=' + prefs.login +'&password=' + prefs.password, g_headers);
    var json = getJson(html);
  
	if (json.Code) {
		var error = json.Desc;
		if (error)
			throw new AnyBalance.Error(error, null, /Invalid user login or password/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
    
    html = AnyBalance.requestGet('https://integrationapi.net/rest/User/Balance?SessionID=' + json, g_headers);
    var jsonResp = getJson(html); 
    
	var result = {success: true};	
    getParam(jsonResp.toFixed(2), result, 'balance', null, replaceTagsAndSpaces);
	
	AnyBalance.setResult(result);
}