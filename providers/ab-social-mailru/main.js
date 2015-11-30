/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+',
};

// Универсальная функция логина в mail.ru
function loginMailRu(baseurl, prefs) {
	var baseurlLogin = "https://auth.mail.ru/cgi-bin/auth";
	
    var parts = prefs.login.match(/^([\s\S]*?)@((?:mail|inbox|list|bk)\.ru)$/i);
	if(!parts)
		throw new AnyBalance.Error('Вы ввели неправильный е-мейл для входа в mail.ru.');
	
	var html = AnyBalance.requestPost(baseurlLogin, {
		FailPage: '',
        Page:baseurl,
        Login:parts[1],
        Domain:parts[2].toLowerCase(),
        Password:prefs.password,
    });
	// Проверим, вернули нам редирект?
	var href = getParam(html, null, null, /url=([^"]+)"/i);
	checkEmpty(href, 'Не удалось найти ссылку на переадресацию, сайт изменен?', true);
	
	html = AnyBalance.requestGet(href);
	
	if(!new RegExp('входящие - ' + prefs.login, 'i').test(html)) {
		var error = getParam(html, null, null, /class="[^"]*login-page[^"]*error([^>]*>){2}/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверное имя пользователя или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	return html;
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');
	
    var baseurl = "https://e.mail.ru/cgi-bin/msglist";
	
	var html = loginMailRu(baseurl, prefs);
	
	var result = {success: true};
	
    getParam(prefs.login, result, 'login');
    getParam(html, result, 'mails', /mail_events"([^>]*>){2}/i, replaceTagsAndSpaces, parseBalance);
    
    AnyBalance.setResult(result);
}