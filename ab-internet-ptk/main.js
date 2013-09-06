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
    var baseurl = 'https://stat.p-t-k.net/';
    AnyBalance.setDefaultCharset('utf-8'); 

	var html = AnyBalance.requestGet(baseurl + 'StatSrv/start.php');
	var session = getParam(html, null, null, /<form[^>]*action="login\.php\?PHPSESSID=([^"]*)/i);

	var captchaa;
	if(AnyBalance.getLevel() >= 7){
		AnyBalance.trace('Пытаемся ввести капчу');
		var captcha = AnyBalance.requestGet(baseurl+ 'StatSrv/capt/?PHPSESSID='+session);
		captchaa = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
		AnyBalance.trace('Капча получена: ' + captchaa);
	}else{
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
	}
    
	html = AnyBalance.requestPost(baseurl + 'StatSrv/login.php?PHPSESSID='+session, {
        PHPSESSID:session,
        uname:prefs.login,
        passwd:prefs.password,
        keystring:captchaa,
		submit:'вход',
    }, addHeaders({Referer: baseurl + 'StatSrv/start.php'})); 
	
    if(!/exit\.php/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    getParam(html, result, 'fio', /<table(?:[\s\S]*?<td[^>]*align="left"[^>]*bgcolor="#eeeeee"[^>]*>){1}\s*<[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'acc_num', /<table(?:[\s\S]*?<td[^>]*align="left"[^>]*bgcolor="#eeeeee"[^>]*>){2}\s*<[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /<table(?:[\s\S]*?<td[^>]*align="left"[^>]*bgcolor="#eeeeee"[^>]*>){3}\s*<[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}