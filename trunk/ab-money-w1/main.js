/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс из Единого Кошелька W1(http://www.w1.ru/)

Operator site: http://www.w1.ru/
Личный кабинет: https://www.walletone.com/client/
*/

var g_headers = {
'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
'JS-Framework':'Basis',
'Connection':'keep-alive',
'Content-type':'text/xml;charset=utf-8',
Referer: 'https://www.walletone.com/client/',
'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){

    AnyBalance.setDefaultCharset('utf-8'); 
    var prefs = AnyBalance.getPreferences(),
        params = '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema"><soap:Header><ParamsHeader xmlns="Wallet.Security.WebService"><Params><Param Name="CultureId" Value="ru-RU"/></Params></ParamsHeader></soap:Header><soap:Body><GetSessionTicket xmlns="Wallet.Security.WebService"><Login>%login%</Login><Password>%password%</Password><LoginType>Auto</LoginType><ClientId>w1_web</ClientId><Params><Param Name="UserAgent" Value="Chrome 26.0.1410.64"/><Param Name="ClientResolutionX" Value="1440"/><Param Name="ClientResolutionY" Value="900"/><Param Name="AppVersion" Value="%appversion%"/></Params></GetSessionTicket></soap:Body></soap:Envelope>',
        pass = Basis.Crypt(prefs.password).sha1(!0).base64().toString(),
        baseurl = "https://www.walletone.com/",
        html;
    
    html = AnyBalance.requestGet(baseurl + 'client/' , g_headers);

    var appversion = getParam(html, null, null, /<meta[^>]+name="build"[^>]+content="([^"]*?)"[^>]*\/>/i, replaceTagsAndSpaces, html_entity_decode); 

    params = params.replace("%login%", prefs.login).replace("%password%", pass).replace("%appversion%", appversion);

    html = AnyBalance.requestPost(baseurl + 'w1service/SecurityService.asmx', params, addHeaders({'SOAPAction':'Wallet.Security.WebService/GetSessionTicket'})); 

    if(/<faultstring>/i.test(html)){
        var error = getParam(html, null, null, /<faultstring>[\s\S]*:\s*([\s\S]*?)<\/faultstring>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }    

    var sessionKey = getParam(html, null, null, /<SessionKey>([\s\S]*?)<\/SessionKey>/i, replaceTagsAndSpaces, html_entity_decode);
    
    params = '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema"><soap:Header><SecurityHeader xmlns="Wallet.Processing.WebService"><SessionKey>%</SessionKey></SecurityHeader><ParamsHeader xmlns="Wallet.Processing.WebService"><Params><Param Name="CultureId" Value="ru-RU"/></Params></ParamsHeader></soap:Header><soap:Body><GetUserBalance xmlns="Wallet.Processing.WebService"/></soap:Body></soap:Envelope>',
    params = params.replace("%", sessionKey);

    html = AnyBalance.requestPost(baseurl + 'w1service11/ProcessingService.asmx', params, addHeaders({'SOAPAction':'Wallet.Processing.WebService/GetUserBalance'})); 

    var result = {success: true};
    
    getParam(html, result, 'balance', /<CurrencyId>643<\/CurrencyId>(?:<Amount>){1}([\s\S]*?)<\/Amount>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'SafeAmount', /<CurrencyId>643<\/CurrencyId>[\s\S]*(?:<SafeAmount>){1}([\s\S]*?)<\/SafeAmount>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'HoldAmount', /<CurrencyId>643<\/CurrencyId>[\s\S]*(?:<HoldAmount>){1}([\s\S]*?)<\/HoldAmount>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'Overdraft', /<CurrencyId>643<\/CurrencyId>[\s\S]*(?:<Overdraft>){1}([\s\S]*?)<\/Overdraft>/i, replaceTagsAndSpaces, parseBalance);
 
    // //Возвращаем результат
    AnyBalance.setResult(result);
}
