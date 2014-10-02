/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	// Mobile
	//'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+',
	// Desktop
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://reg.beltoll.by';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + '/Account/Login', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
    var token = getParam(html, null, null, /RequestVerificationToken"[\s\S]type="hidden"[\s\S]value=(?:[^>]){1}([^"]+)/i, replaceTagsAndSpaces, html_entity_decode);
   
    var captchaa = "0000";
    // if(AnyBalance.getLevel() >= 7) {
      // AnyBalance.trace('Пытаемся ввести капчу');
      // var captcha = AnyBalance.requestGet(baseurl+ '/Captcha/CaptchaImage');
      // captchaa = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
      // AnyBalance.trace('Капча получена: ' + captchaa);
     // }else{
      // throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
     // }
   
	html = AnyBalance.requestPost(baseurl + '/Account/Login', {
		UserName: prefs.login,
		Password: prefs.password,
		__RequestVerificationToken: token,
        Captcha: captchaa
	}, addHeaders({Referer: baseurl + '/Account/Login'}));
    
	if (!/Logout/i.test(html)) {
		var error = getParam(html, null, null, /<label[^>]+class="validation-summary-errors-login"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Недействительные права/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
    var balanceHref = getParam(html, null, null, /\/BalanceStatement\/List\?[^"]+/i, replaceTagsAndSpaces, html_entity_decode);
    html = AnyBalance.requestGet(baseurl + balanceHref + '&_=' + new Date().getTime(), g_headers);

	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Остаток[\s\S]баланса:(?:[^>]*>){4}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'number', /(BY\s*-[^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}