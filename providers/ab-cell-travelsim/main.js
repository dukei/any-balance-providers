/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

 Получает баланс для оператора TravelSIM

Operator site: http://travelsim.ua/
Личный кабинет: http://my.travelsim.ua/billing_old/
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

    var baseurl = "http://my.travelsim.ua/";

    AnyBalance.setDefaultCharset('CP1251'); 

    var html = AnyBalance.requestPost(baseurl + 'billing_old/start.php', {
        login:prefs.login,
        pwd:prefs.password
    }, addHeaders({Referer: baseurl + 'billing_old/'}));
    
    if (!html || AnyBalance.getLastStatusCode() >= 400) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    if(!/src="images\/btn_logout.png"/i.test(html)){
        var error = getParam(html, null, null, /<table[^>]+class="login"[^>]*>(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
        if(error) {
            throw new AnyBalance.Error(error, false, /парол/i.test(error));
        }
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
    var result = {success: true};
    
    getParam(html, result, 'name', /<div[^>]*?logout[^>]*>\s*Доброго\s+дня,\s*([^!<]+)!/i, replaceTagsAndSpaces);
    
    html = AnyBalance.requestGet(baseurl + 'billing_old/mynums.php', g_headers);

    if (prefs.number) {
        prefs.number = prefs.number.replace("+", "");
    }
    
    var numberReg = new RegExp('title="Управління послугами"[^>]*>\\+{0,1}\\d*' + (prefs.number ? prefs.number : '\\d*') + '<\/a>(?:[\\s\\S]*?<td[^>]+>){1}([\\s\\S]*?)<\/td>', "i"),
        emailReg = new RegExp('title="Управління послугами"[^>]*>\\+{0,1}\\d*' + (prefs.number ? prefs.number : '\\d*') + '<\/a>(?:[\\s\\S]*?<td[^>]+>){2}([\\s\\S]*?)<br>', "i");
        
    getParam(html, result, 'balance', numberReg, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'email', emailReg, replaceTagsAndSpaces);
    

    AnyBalance.setResult(result);
}
