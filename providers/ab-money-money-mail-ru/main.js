/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    if(!prefs.login)
         throw new AnyBalance.Error('Введите е-мейл для входа в личный кабинет money.mail.ru');

    var parts = prefs.login.match(/^([\s\S]*?)@((?:mail|inbox|list|bk)\.ru)$/i);
    if(!parts)
         throw new AnyBalance.Error('Вы ввели неправильный е-мейл для входа на money.mail.ru.');
	
	var baseurlLogin = "https://auth.mail.ru/cgi-bin/auth";
    var baseurl = "https://money.mail.ru/";
	
    AnyBalance.setDefaultCharset('utf-8');
	
    var html = AnyBalance.requestPost(baseurlLogin, {
		FailPage:'https://money.mail.ru/nologin',
        Page:baseurl,
        Login:parts[1],
        Domain:parts[2].toLowerCase(),
        Password:prefs.password,
    });
    if(!/url=https:\/\/money.mail.ru/i.test(html))
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Неправильный логин-пароль?');

    html = AnyBalance.requestGet(baseurl); 

    if(!/\/cgi-bin\/logout/i.test(html))
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Неправильный логин-пароль?');

	var result = {success: true};
    getParam(prefs.login, result, 'login');
	
	getParam(html, result, '__tariff', /Ваш счет[^>]*>№((?:[^>]*>){9})/i, [/\D/g, '', /(\d{4})\d{8}(\d{4})/i, '$1 **** **** $2']);
    getParam(html, result, 'balance', /AccountBalanceInfo">[\s\S]*?([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balance_used', /Всего израсходовано с начала месяца(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    
    AnyBalance.setResult(result);
}
