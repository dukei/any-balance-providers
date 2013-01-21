/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Баланс в букмекерской конторе FonBet
Сайт оператора: http://fonbet.com
Личный кабинет: https://account.fonbet.com
*/

var g_headers = {
'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
'Cache-Control':'max-age=0',
'Connection':'keep-alive',
'Origin':'https://account.fonbet.com',
'Referer':'https://account.fonbet.com/MyAccount/faces/login.xhtml',
'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.17 (KHTML, like Gecko) Chrome/24.0.1312.52 Safari/537.17'
};

function main(){
	var prefs = AnyBalance.getPreferences();
	var domain = prefs.region;

	var baseurl = 'https://account.fonbet.com/MyAccount/faces/';
	AnyBalance.setDefaultCharset('utf-8');

    // Заходим на главную страницу
        var info = AnyBalance.requestGet(baseurl + 'login.xhtml', g_headers);

	info = AnyBalance.requestPost(baseurl + 'login.xhtml', {
		'login:loginForm':'login:loginForm',
                'login:loginForm:loginField':prefs.login,
                'login:loginForm:passwordField':prefs.password,
                'login:loginForm:submitButton':'Войти',
                'javax.faces.ViewState':getParam(info, null, null, /<input[^>]+name="javax.faces.ViewState"[^>]*value="([^"]*)/i, null, html_entity_decode)
	}, g_headers);
    
        //Выход|Logout
        if(!/(?:&#1042;&#1099;&#1093;&#1086;&#1076;|Logout)\s*<\/a>/i.test(info)){
           var error = getParam(info, null, null, /<li[^>]+class="messagesError"[^>]*>([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, html_entity_decode);
           if(error)
               throw new AnyBalance.Error(error);
           throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
        }
    
        var result = {success: true};

        //Баланс|Balance
        getParam(info, result, 'balance', /(?:&#1041;&#1072;&#1083;&#1072;&#1085;&#1089;|Balance)[\s\S]*?<span[^>]+class="fontBold"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
        getParam(info, result, 'pin', /<span[^>]+id="header:accountInfo:pinOutput"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(info, result, '__tariff', /<table(?:[\s\S](?!<\/?table))*?<tr[^>]*>((?:[\s\S](?!<\/?table))*?)<\/tr>(?:[\s\S](?!<\/?table))*?header:accountInfo:pinOutput/i, replaceTagsAndSpaces, html_entity_decode);

	AnyBalance.setResult(result);
};






