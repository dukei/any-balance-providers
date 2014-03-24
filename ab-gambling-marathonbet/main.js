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
    AnyBalance.setDefaultCharset('utf-8');
    var baseurl = 'https://www.marathonbet.com/';
	
    if (!/^(?:[0-9]{6,7}|[a-z0-9\-_\.\%\+]+@([a-z0-9\-_]+\.)+[a-z]{2,4})$/i.test(prefs.login)) {
        throw new AnyBalance.Error("В логине должно быть от 6 до 7 цифр. Можно также ввести Ваш электронный адрес, указанный при регистрации.");        
    }
    if (!/^.{6,}$/i.test(prefs.password)) {
        throw new AnyBalance.Error("В пароле должно быть от 6 до 100 символов.");        
    }
	
	var html = AnyBalance.requestGet(baseurl + 'su/loginpage.htm', g_headers);
	
	var captchaa;
	if(AnyBalance.getLevel() >= 7){
		AnyBalance.trace('Пытаемся ввести капчу');
		AnyBalance.setOptions({forceCharset: 'base64'});
		var captcha = AnyBalance.requestGet(baseurl+ 'su/jcaptcha.htm');
		AnyBalance.setDefaultCharset('utf-8');
		captchaa = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
		AnyBalance.trace('Капча получена: ' + captchaa);
	}else{
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
	}
	
	try {
		html = AnyBalance.requestPost(baseurl + 'su/loginpage.htm', {
			'form_name':'form',
			username:prefs.login, 
			password:prefs.password,
			captcha:captchaa
		}, addHeaders({Referer: baseurl + 'su/loginpage.htm'})); 	
	} catch(e) {}
	
	html = AnyBalance.requestGet(baseurl + 'su/', g_headers);
	
	if (!/AuthHelper\.logout\(event\)/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
/*
    var errorHtm = AnyBalance.requestGet(baseurl + 'ru/pagemessages.htm', g_headers);

    if(/showMessage\(\"errorMessage\"/i.test(errorHtm)){
        var error = getParam(errorHtm, null, null, /,\s*\"([\s\S]*?)\"\)/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
*/
    var result = {success: true};
    getParam(html, result, 'fio', /<div[^>]+class="auth"[^>]*>[\s\S]*?,\s*([\s\S]*?)!/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /id='balance'[^>]*>([\s\S]*?)</i, [/,/g, '', replaceTagsAndSpaces], parseBalance);
    getParam(html, result, ['currency', 'balance'], /id='balance'[^>]*>([\s\S]*?)</i, replaceTagsAndSpaces, parseMyCurrency);
	
    if(isAvailable(['ns', 'out'])){
        html = AnyBalance.requestGet(baseurl + 'su/myaccount/myaccount.htm', g_headers);
        //Нерассчитанные ставки
        getParam(html, result, 'ns', /Нерассчитанные ставки:(?:[^>]*>){8}([^<]*)/i, [/,/g, '', replaceTagsAndSpaces], parseBalance);
        //Запрошено на выплату
        getParam(html, result, 'out', /Запрошено на выплату:(?:[^>]*>){9}([^<]*)/i, [/,/g, '', replaceTagsAndSpaces], parseBalance);
    }

    AnyBalance.setResult(result);
}

function parseMyCurrency(text){
    var val = getParam(html_entity_decode(text), null, null, null, [/\s+/g, '', /[\d\.,\-]/g, '']);
    AnyBalance.trace('Parsing currency (' + val + ') from: ' + text);
    return val;
}