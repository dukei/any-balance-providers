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
    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.17 (KHTML, like Gecko) Chrome/24.0.1312.56 Safari/537.17',
    'X-Requested-With':'XMLHttpRequest'
};


function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "http://www.novex-trade.ru/";

    var html = AnyBalance.requestGet(baseurl + 'bonus/card/',  g_headers);
    var url = AnyBalance.getLastUrl();
    var urlPost = url.replace(/login\//i, 'loginPost/');

   	var html = AnyBalance.requestPost(urlPost, {
   		'login[username]': prefs.login,
		'login[password]': prefs.password,
		ajax: 1
   	}, addHeaders({
    	Referer: url
    }));

    var json = getJson(html);

    if(!json.success){
        if(json.message)
            throw new AnyBalance.Error(json.message, null, /парол/i.test(json.message));
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось получить баланс карты. Проблемы на сайте или сайт изменен.');
    }

    html = AnyBalance.requestGet(baseurl + 'bonus/card/',  g_headers);

    var result = {success: true};

    getParam(html, result, '__tariff', /<input[^>]+name="number"[^>]*value="([^"]*)/i, replaceHtmlEntities);
    getParam(html, result, 'balance', /<input[^>]+name="balance"[^>]*value="([^"]*)/i, replaceHtmlEntities, parseBalance);

    AnyBalance.setResult(result);
}
