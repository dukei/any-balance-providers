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
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    var baseurl = "https://easypay.ua/";

    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + 'auth/signin', g_headers);
    var form = getElement(html, /<form[^>]+id="authForm"[^>]*>/i);

    if(!form){
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
    }

    var params = createFormParams(form, function(params, str, name, value) {
        if (/login/.test(name))
            return prefs.login;
        else if (/password/.test(name))
            return prefs.password;

        return value;
    });


    html = AnyBalance.requestPost(baseurl + 'auth/signin', params, addHeaders({Referer: baseurl + 'auth/signin'})); 

	if(!/class="exit/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="error1"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль|Пользователь не найден или email не активирован/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
    var result = {success: true};
	
    getParam(html, result, 'points', /class="points"([^>]*>){2}/i, replaceTagsAndSpaces, parseBalance);
	
	html = AnyBalance.requestGet(baseurl + 'wallets', g_headers);
	// <tr[^>]*>\s*<td(?:[^>]*>){1,2}\s*\d+(?:[^>]*>){10,50}\s*</tr>
	var tr = getParam(html, null, null, new RegExp("<tr[^>]*>\\s*<td(?:[^>]*>){1,2}\\s*" + (prefs.number || '\\d+')+ "(?:[^>]*>){10,50}\\s*</tr>", "i"));
	if(!tr) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти ' + (prefs.number ? 'кошелек с последними цифрами ' + prefs.number : 'ни одного кошелька!'));
	}
	
    getParam(tr, result, 'balance', /([^>]*>){11}/i, replaceTagsAndSpaces, parseBalance);
	
    AnyBalance.setResult(result);
}