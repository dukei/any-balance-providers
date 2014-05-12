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
	
    var baseurl = "https://seopult.ru/";
    AnyBalance.setDefaultCharset('utf-8');

	var html = AnyBalance.requestGet(baseurl + 'user.html', g_headers);
	
    html = AnyBalance.requestPost(baseurl + 'user.html', {
        uname:prefs.login,
        pass:prefs.password,
		pass_hash:'',
        op:'login'
    }, addHeaders({Referer: baseurl + 'user.html'}));
	
	// при успешном логине сайт нас редиректит
    if(!/Спасибо за визит на наш сайт/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]*background-color:\s*#999999[^>]*>\s*<h4[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		if(error && /Неверный логин или пароль/i.test(error))
			throw new AnyBalance.Error(error, null, true);
		if(error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	// идем по 302...
	var href = getParam(html, null, null, /"Refresh"[^>]*url=\/([^"]+)/i);
	checkEmpty(href, 'Не удалось найти ссылку для входа в кабинет, сайт изменен?', true);
	
	html = AnyBalance.requestGet(baseurl + href, addHeaders({Referer: baseurl + 'user.html'}));
    //Раз мы здесь, то мы успешно вошли в кабинет
    var result = {success: true};
	
    getParam(html, result, 'balance', /id=['"]balance['"][^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'monthly', /текущий ежемесячный расход[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'daily', /текущий ежедневный расход[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'monthly_income', /ежемесячный реферальный[^>]*доход[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	
    //Возвращаем результат
    AnyBalance.setResult(result);
}
