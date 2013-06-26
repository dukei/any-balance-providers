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

    var baseurl = "http://seopult.ru/";
    AnyBalance.setDefaultCharset('utf-8');

    var html = AnyBalance.requestPost(baseurl + 'user.html', {
        uname:prefs.login,
        pass:prefs.password,
        op:'login'
    }, addHeaders({Referer: baseurl + 'login'}));
	// при успешном логине сайт нас редиректит
    if(!/Refresh[\s\S]*?http:\/\/seopult.ru\/items.html/i.test(html))
		// ничего вразумительного сайт не сообщает...
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Проверьте Ваш логин или пароль');
	// идем по 302...
	html = AnyBalance.requestGet('http://seopult.ru/items.html');
    //Раз мы здесь, то мы успешно вошли в кабинет
    var result = {success: true};
    getParam(html, result, 'balance', /Баланс[\s\S]*?([\s\S]*?)\s*руб/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'monthly', /Расход[\s\S]*?([\s\S]*?)\s*руб.\/мес/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'daily', /ежедневный расход[\s\S]*?([\s\S]*?)\s*руб.\/день/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'monthly_income', /доход[\s\S]*?>([\s\S]*?)\s*руб./i, replaceTagsAndSpaces, parseBalance);
	
    //Возвращаем результат
    AnyBalance.setResult(result);
}
