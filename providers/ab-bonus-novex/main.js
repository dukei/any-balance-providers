/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию по бонусной карте Новэкс

Сайт оператора: http://ulmart.ru
Личный кабинет: http://www.ulmart.ru/cabinet/
*/

var g_headers = {
    Accept:'application/json, text/javascript, */*; q=0.01',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Referer':'http://www.novex-trade.ru/bonus-card-program/',
    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.17 (KHTML, like Gecko) Chrome/24.0.1312.56 Safari/537.17'
};


function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "http://www.novex-trade.ru/";
	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');
	AB.checkEmpty(/^\+?\d{11}$/.test(prefs.login), 'Введите логин в формате +79001234567');

    var html = AnyBalance.requestGet(baseurl,  g_headers);

   	var html = AnyBalance.requestPost(baseurl, {
		return_url:	'bonuscard.html',
		redirect_url:	'bonuscard.html',
		user_login:	prefs.login.replace(/^\+?7(\d{3})(\d{3})(\d\d)(\d\d)$/, '+7 ($1) $2-$3-$4'),
		password:	prefs.password,
		'dispatch[auth.login]' : ''
   	}, addHeaders({
    	Referer: baseurl
    }));

    if(!/logout/i.test(html)){
    	var error = getElement(html, /<div[^>]+alert-error/i, [replaceTagsAndSpaces, /\s+/g, ' ']);
        if(error)
            throw new AnyBalance.Error(error, null, /парол/i.test(error));
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось получить баланс карты. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    getParam(html, result, '__tariff', /<input[^>]+name="number"[^>]*value="([^"]*)/i, replaceHtmlEntities);
    getParam(html, result, 'balance', /<input[^>]+name="balance"[^>]*value="([^"]*)/i, replaceHtmlEntities, parseBalance);

    AnyBalance.setResult(result);
}
