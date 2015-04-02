/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Origin':'http://www.kuzesc.ru:7777',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/28.0.1500.95 Safari/537.36',
	'Cache-Control':'max-age=0'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'http://www.kuzesc.ru:7777/pls/apex/';
    AnyBalance.setDefaultCharset('utf-8'); 

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    var html = AnyBalance.requestGet(baseurl + 'f?p=100:1', g_headers);

    var tform = getParam(html, null, null, /<form[^>]+name="wwv_flow"[^>]*>[\s\S]*?<\/form>/i);
    if(!tform)
        throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');

    var params = createFormParams(tform, function(params, str, name, value){
		if(/id="P101_USERNAME"/i.test(str))
			return prefs.login;
        if(/id="P101_PASSWORD"/i.test(str))
			return prefs.password;
		if(name == 'p_request')
			return 'LOGIN';
		return value;
	}, true);

    html = AnyBalance.requestPost(baseurl + 'wwv_flow.accept', params, addHeaders({Referer: baseurl + 'f?p=100:1'}));

    if(!/exit\.gif/i.test(html)){
        var error = getParam(html, null, null, /<table class="tbl-body"[\s\S]*?<H2>([\s\S]*?)<\/H2>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error, null, /Вы ввели несуществующий номер лицевого счёта|Неверный пароль/i.test(error));

		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

	getParam(html, result, 'balance', /[переплата|задолженность][\s]*?составляет[\s\S]*?руб/i, [replaceTagsAndSpaces, /Задолженность по услуге:/, '-'], parseBalance);
	
    AnyBalance.setResult(result);
}