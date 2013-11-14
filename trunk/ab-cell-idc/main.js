/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.66 Safari/537.36',
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://my.idc.md/';
	// Это не ошибка, смена кодировок между запросами реализована на сайте, уже не знаю зачем.
	AnyBalance.setOptions({forceCharset: 'UTF-8'});
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	var captchaa;
	if(AnyBalance.getLevel() >= 7){
		AnyBalance.trace('Пытаемся ввести капчу');
		// Это не ошибка, смена кодировок между запросами реализована на сайте, уже не знаю зачем.
		AnyBalance.setOptions({forceCharset: 'base64'});
		var captcha = AnyBalance.requestGet(baseurl+ 'keypic.php?r=' + Math.random(), g_headers);
		captchaa = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
		AnyBalance.trace('Капча получена: ' + captchaa);
	}else{
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
	}
	// Это не ошибка, смена кодировок между запросами реализована на сайте, уже не знаю зачем.
	AnyBalance.setOptions({forceCharset: 'UTF-8'});
	
	
	html = AnyBalance.requestPost(baseurl, {
        user:prefs.login,
        pass:prefs.password,
        secretkey:captchaa
    }, addHeaders({Referer: baseurl})); 
	
	if (!/Мы рады приветствовать Вас в Личном кабинете/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error && /Неверный логин или пароль/i.test(error))
			throw new AnyBalance.Error(error, null, true);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
    var result = {success: true};
	
	getParam(html, result, 'balance', /<b>[^\|]*Руб/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balance_usd', /<b>[^\|]*Руб/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'account_id', /\?acc=(\d+)/i, replaceTagsAndSpaces);
	
    AnyBalance.setResult(result);
}