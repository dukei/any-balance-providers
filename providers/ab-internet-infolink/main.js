/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'Origin':'https://user.infolink.ru',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.66 Safari/537.36'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://user.infolink.ru/';
    AnyBalance.setDefaultCharset('utf-8');

    checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'login', g_headers);
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'login') 
			return prefs.login;
		else if (name == 'password')
			return prefs.password;
		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'login', params, addHeaders({Referer: baseurl+ 'login'})); 
	
    if(!/\/Logout/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error, false, /логин|парол/i.test(error));
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
    var result = {success: true};
    
    if (AnyBalance.isAvailable('balance')) {
        var balanceParent = AB.getElement(html, /<div[^>]*?panel[^>]*>(?=\s*<div[^>]*?heading[^>]*>\s*Баланс)/i);
        var balanceBody = AB.getElement(balanceParent, /<div[^>]*?body/i);
        getParam(balanceBody, result, 'balance', null, replaceTagsAndSpaces, parseBalance);
    }
	
    //getParam(html, result, 'balance', /'panel-heading'[^>]*>\s*Баланс(?:[^>]*>){10}([\s\d.,]+)руб/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'acc_num', /ID абонента[^]+?(\d+)\s+<span class=['"]caret['"]>/i, replaceTagsAndSpaces);
	getParam(html, result, 'fio', /user\/info[^>]*>([^<]+)/i, replaceTagsAndSpaces);
	getParam(html, result, 'bonuses', /'panel-heading'[^>]*>\s*Бонусный счёт(?:[^>]*>){14}([\s\d.,]+)<\/big/i, replaceTagsAndSpaces);
    
    html = AnyBalance.requestGet(baseurl + 'services/index', g_headers);
    
	getParam(html, result, '__tariff', /Текущий тариф(?:[^>]*>){1}([\s\S]*?)<\/div/i, replaceTagsAndSpaces);
	
    AnyBalance.setResult(result);
}