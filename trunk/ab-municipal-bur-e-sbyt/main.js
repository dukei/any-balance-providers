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
	var baseurl = 'http://bur.e-sbyt.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'index.php/component/users/', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'username') 
			return prefs.login;
		else if (name == 'password')
			return prefs.password;

		return value;
	});
    
	html = AnyBalance.requestPost(baseurl + 'index.php/component/users/?task=user.login', params, addHeaders({Referer: baseurl + 'index.php/component/users/'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /Предупреждение[^>]*>([\s\S]*?)<\/div/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Имя пользователя и пароль не совпадают/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
    html = AnyBalance.requestGet(baseurl + 'index.php/lichnyj-kabinet', g_headers);
    
    var accnum = prefs.accnum || '';    
    
    if (!prefs.accnum) {
        var acc_table = getParam(html, null, null, /Лицевые счета([\s\S]*?)<\/table>/i);
        AnyBalance.trace(acc_table);
        accnum = getParam(acc_table, null, null, /<a href="[^"]+[^>]*>[\s\S]*?([\d]+)<\/a>/i);
        AnyBalance.trace(accnum);        
    }
        
    if(!accnum)
		throw new AnyBalance.Error("Не удалось найти " + (prefs.accnum ? ' счет ' + prefs.accnum : 'ни одного счета!'));
    
    html = AnyBalance.requestPost(baseurl + 'index.php/lichnyj-kabinet/lkefrm/index.php?option=com_lke&view=ajax&format=raw&soa=getlsinfo', {
        nls: accnum,
        srv: 'MR'
    }, addHeaders({Referer: baseurl + 'index.php/'}));
        
    var json = getJson(html);
    if(json.error) {
        AnyBalance.trace(html);
		throw new AnyBalance.Error(json.errmsg);
    }   
        
	var result = {success: true};
	
	sumParam(json.balans, result, 'balance', /([^\|]+)/g, null, parseBalance, aggregate_sum);
	getParam(json.balans, result, 'electric', /([^\|]+)/i, null, null, parseBalance);
	getParam(json.balans, result, 'debt', /\|([^\|]+)/i, null, null, parseBalance);
	getParam(json.balans, result, 'needs', /\|([^]+){2}/i, null, null, parseBalance);
	getParam(accnum, result, 'accnum', null, null);
	getParam(json.tarif, result, '__tariff', null, null);
	
	AnyBalance.setResult(result);
}