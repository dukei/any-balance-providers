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
    AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    var baseurl = 'https://my.lanet.ua/';
	var html = AnyBalance.requestGet(baseurl + 'login.php', g_headers);
	
    html = AnyBalance.requestPost(baseurl + 'login.php?api', {
		'method':'login',
		'parameters':'["'+prefs.login+'","'+prefs.password+'"]',
		'id':'3'
	}, addHeaders({'Referer': baseurl + 'login.php'}));
	
	var json = getJson(html);
	
    if(!json.status) {
        var error = getParam(html, null, null, /<td[^>]+class="form_error"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
			
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }
	
	html = AnyBalance.requestGet(baseurl + 'client_info.php', g_headers);
	
	var token = getParam(html, null, null, /"\?api"\s*,\s*"([^"]+)/i);
	checkEmpty(token, 'Не удалось найти токен авторизации, сайт изменен?', true);
	
    html = AnyBalance.requestPost(baseurl + 'login.php?api', {
		'method':'login',
		'parameters':'["'+prefs.login+'","'+prefs.password+'"]',
		'id':'3'
	}, addHeaders({'Referer': baseurl + 'login.php'}));
	
    html = AnyBalance.requestPost(baseurl + 'client_info.php?api', {
		'batch':'[["getContract"],["getDeposit"],["getBonus"],["getName"], ["getPeriodInfo"], ["getMiss"]]',
		'id':'1',
		'token':token
	}, addHeaders({'Referer': baseurl + 'client_info.php'}));
	
	json = getJson(html);
	
	var result = {success: true};
	
	for(var i = 0; i < json.result.length; i++) {
		var current = json.result[i];
		if(current.name == 'getContract') {
			getParam(current.result + '', result, 'agreement');
		} else if(current.name == 'getDeposit') {
			getParam(current.result + '', result, 'balance', null, replaceTagsAndSpaces, parseBalanceMy);
		} else if(current.name == 'getMiss') {
			getParam(current.result + '', result, 'pay', null, replaceTagsAndSpaces, parseBalanceMy);
		} else if(current.name == 'getBonus') {
			getParam(current.result + '', result, 'bonus', null, replaceTagsAndSpaces, parseBalanceMy);
		} else if(current.name == 'getName') {
			getParam(current.result.last_name + ' ' + current.result.first_name, result, 'userName', null, replaceTagsAndSpaces);
		} else if(current.name == 'getPeriodInfo') {
			getParam(current.result.period_end, result, 'paytill', null, replaceTagsAndSpaces, parseFloat);
			getParam(current.result.connection_type.name, result, '__tariff', null, replaceTagsAndSpaces, html_entity_decode);
		}
	}
	
	function parseBalanceMy(str) {
		return parseBalance(str)/100;
	}
	
    AnyBalance.setResult(result);
}