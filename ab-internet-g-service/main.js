/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для интернет провайдера Игра-Сервис

Operator site: http://www.g-service.ru/
Личный кабинет: https://www.g-service.ru/client/
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

    var baseurl = "https://www.g-service.ru/";

    AnyBalance.setDefaultCharset('koi8-r'); 

    AnyBalance.setAuthentication(prefs.login, prefs.password);

    var html = AnyBalance.requestGet(baseurl + 'client/chprice.cgi', g_headers); 

    if(/<title>401 Authorization Required<\/title>/i.test(html)){
        throw new AnyBalance.Error('Не верный логин или пароль.');
    }

    var result = {success: true};
    getParam(html, result, '__tariff', /Текущий<\/th>\s*<td>\s*<b>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'status', /Состояние:\s*<\/b>\s*([\s\S]*?)\s*<\/td>/i, [replaceTagsAndSpaces], html_entity_decode);

    getParam(html, result, 'balance', /Текущий баланс:\s*<\/b>\s*([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    var newBalance = result.balance.split(" ");
    result.balance = newBalance[0] + "." + newBalance[2];

    getParam(html, result, 'number', /Лицевой счет:\s*([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}
