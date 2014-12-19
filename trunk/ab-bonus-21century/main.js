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
    var baseurl = "http://bonus.21vek.by/";
    AnyBalance.setDefaultCharset('utf-8'); 
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');

	var pass = '';
	var parts = /(\d{2})(\d{2})(\d{4})/i.exec(prefs.password)
	if(parts)
	{
		pass += parts[1]+' . '+ parts[2] +' . '+ parts[3]
	}
	else
		throw new AnyBalance.Error('Дату рождения не удалось преобразовать в нужный формат, введите дату рождения без пробелов и точек, например 15101988');
        
	html = AnyBalance.requestPost(baseurl + 'balance/', {
        'data[number]': prefs.login,
        'data[birthday]': pass
    }, addHeaders({'X-Requested-With': 'XMLHttpRequest'})); 

	var json = getJson(html);
    
	if(!json.balance){	    
		var error = getParam(json.msg, null, null, null, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /не найдена|проверьте правильность введенных данных/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

    var result = {success: true};
    
    getParam(json.balance, result, 'balance', null, replaceTagsAndSpaces, parseBalance);
    getParam(json.unit, result, 'curr', null, replaceTagsAndSpaces, html_entity_decode);
    getParam(json.number, result, '__tariff', null, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}