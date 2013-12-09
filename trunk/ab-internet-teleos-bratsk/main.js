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
    var baseurl = 'https://stat.teleos.ru/';

    checkEmpty(prefs.login, 'Введите логин');
    checkEmpty(prefs.password, 'Введите пароль');

    AnyBalance.setDefaultCharset('utf-8'); 
	
	var html = AnyBalance.requestPost(baseurl + 'login', {
        'LoginForm[username]':prefs.login,
        'LoginForm[password]':prefs.password,
        'LoginForm[rememberMe]':'0',
		'yt0':'Войти'
    }, addHeaders({Referer: baseurl + 'login'})); 

    if(!/logout/i.test(html)){
        var error = getParam(html, null, null, /class="errorMessage">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error, null, /номер лицевого счета или пароль/i.test(error));
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
    var result = {success: true};
    getParam(html, result, 'acc_num', /Лицевой счет[\s\S]{1,100}value">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'abon', /Абонентская плата[\s\S]*?([\s\S]*?)Р./i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balance', /Баланс[\s\S]*?([\s\S]*?)Р./i, [replaceTagsAndSpaces, /−/g, '-'], parseBalance);
	getParam(html, result, '__tariff', /service-item-tariff">([\s\S]*?)<\/span/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'status', /service-item-params-caption service-item-params-cel[\s\S]{1,50}(Интернет[\s\S]*?)\s*<\//i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}