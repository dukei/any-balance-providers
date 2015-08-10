/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'application/json, text/plain, */*',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
	'Origin': 'http://corporate.7cont.ru',
	'Content-Type': 'application/json;charset=UTF-8'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://corporate.7cont.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'loyal_cabinet/auth/', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
    html = AnyBalance.requestPost(baseurl + 'loyal_cabinet/api/login_user/', JSON.stringify({
		card_number: prefs.login,
		password: prefs.password
	}), addHeaders({Referer: baseurl + 'loyal_cabinet/auth/'}));
	
    var json = getJson(html);
    
	if (!json.status_ok) {
        var error = json.response;
		if (error)
			throw new AnyBalance.Error(error, null, /Ошибка входа/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
    
	html = AnyBalance.requestPost(baseurl + 'loyal_cabinet/api/balance/', {}, addHeaders({Referer: baseurl + 'loyal_cabinet/'}));
    
    json = getJson(html);
	
	var result = {success: true};
    
    getParam(json.balance + '', result, 'balance', null, replaceTagsAndSpaces, parseBalance);
    
    getParam(json.active_balance + '', result, 'active_balance', null, replaceTagsAndSpaces, parseBalance);
    getParam(json.discount + '', result, 'discount', null, replaceTagsAndSpaces, parseBalance);
    getParam(json.debet + '', result, 'debet', null, replaceTagsAndSpaces, parseBalance);
    getParam(json.credit + '', result, 'credit', null, replaceTagsAndSpaces, parseBalance);
    
    if(json.card_list && json.card_list[0]) {
        getParam(json.card_list[0].cardNumber + '', result, 'number', null, replaceTagsAndSpaces);
        getParam(json.card_list[0].cardNumber + '', result, '__tariff', null, replaceTagsAndSpaces);
    }
    
    getParam(json.fio + '', result, 'fio', null, replaceTagsAndSpaces);
	
	AnyBalance.setResult(result);
}