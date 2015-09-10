/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'*/*',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.66 Safari/537.36',
	'Origin':'https://vg.vainahtelecom.ru'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://vg.vainahtelecom.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 
	
	var html = AnyBalance.requestGet(baseurl + 'ps/scc/login.php?SECONDARY_LOGIN=1');
	var session = getParam(html, null, null, /name="PHPSESSID"[^>]*value="([^"]*)/i);

	var captchaa;
	if(AnyBalance.getLevel() >= 7){
		AnyBalance.trace('Пытаемся ввести капчу');
		var captcha = AnyBalance.requestGet(baseurl+ '/ps/scc/php/cryptographp.php');
		captchaa = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
		AnyBalance.trace('Капча получена: ' + captchaa);
	}else{
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
	}
    
	html = AnyBalance.requestPost(baseurl + 'ps/scc/php/check.php?CHANNEL=WWW', {
        PHPSESSID:session,
        LOGIN:prefs.login,
        PASSWORD:prefs.password,
        CODE:captchaa
    }, addHeaders({Referer: baseurl + 'ps/scc/login.php?SECONDARY_LOGIN=1'})); 
	
	session = getParam(html, null, null, /<SESSION_ID>([\s\S]*?)<\/SESSION_ID>/i);
	
    if(!session){
		var error = getParam(html, null, null, /<ERROR_ID>([\s\S]*?)<\/ERROR_ID>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error == -3)
            throw new AnyBalance.Error('Введите цифры с картинки!');
        else if(error == -6)
            throw new AnyBalance.Error('Вы ввели неверные символы с картинки! Попробуйте еще раз');
       	error = getParam(html, null, null, /<ERROR_MESSAGE>([\s\S]*?)<\/ERROR_MESSAGE>/i, replaceTagsAndSpaces, html_entity_decode);
       	if(error)
       		throw new AnyBalance.Error(error, null, /неправильный пароль/i.test(error));
       	AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	
	html = AnyBalance.requestPost(baseurl + 'SCC/SC_BASE_LOGIN', {
        SESSION_ID:session,
        LOGIN:prefs.login,
        PASSWD:prefs.password,
        CHANNEL:'WWW'
    }, addHeaders({Referer: baseurl + 'ps/scc/login.php?SECONDARY_LOGIN=1'})); 
	
	html = AnyBalance.requestPost(baseurl + 'SCWWW/ACCOUNT_INFO', {
        SESSION_ID:session,
		CHANNEL:'WWW',
        P_USER_LANG_ID:'1',
        find:''
    }, addHeaders({Referer: baseurl + 'SCC/SC_BASE_LOGIN'})); 

    var result = {success: true};
    getParam(html, result, 'fio', /class="group-client"[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'acc_num', /&#1051;&#1080;&#1094;&#1077;&#1074;&#1086;&#1081; &#1089;&#1095;&#1077;&#1090;:(?:[\s\S]*?<div[^>]*>){2}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /&#1041;&#1072;&#1083;&#1072;&#1085;&#1089;(?:[\s\S]*?<div[^>]*>){2}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cred', /&#1050;&#1088;&#1077;&#1076;&#1080;&#1090;&#1085;&#1099;&#1081; &#1083;&#1080;&#1084;&#1080;&#1090;:(?:[\s\S]*?<div[^>]*>){2}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /&#1058;&#1077;&#1082;&#1091;&#1097;&#1080;&#1081; &#1090;&#1072;&#1088;&#1080;&#1092;&#1085;&#1099;&#1081; &#1087;&#1083;&#1072;&#1085;:(?:[\s\S]*?<div[^>]*>){1}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}