/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс для провайдера АТК 

Operator site: http://atvc.ru/
Личный кабинет: https://support.atknet.ru/
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

    var baseurl = "https://support.atknet.ru/";

    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + 'login', g_headers);

    var tform = getParam(html, null, null, /<input[^>]+name='csrfmiddlewaretoken'[^>]+value='([^']*)/i, null, html_entity_decode);
    console.log(tform);
    if(!tform) 
        throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');

    html = AnyBalance.requestPost(baseurl + 'login', {
        'csrfmiddlewaretoken':tform,      
        username:prefs.login,
        password:prefs.password,
        next:'http://127.0.0.1:8081/'
    }, addHeaders({Referer: baseurl + 'login'})); 

    if(!/\/logout/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class='login-error'[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

    getParam(html, result, '__tariff', /Тарифный\s*план:\s*<b[^>]*>([\s\S]*?)<\/b>[\s\S]*<a[^>]+>сменить тариф<\/a>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'licenseFee', /Абонентская плата за трафик:\s*([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'externalTraffic', /Внешний трафик по выделенной линии:\s*([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'reservPort', /Резервирование порта абонента: \s*([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance);

    getParam(html, result, 'mailbox', /<h3>Почтовый ящик[\s\S]*-\s*([\s\S]*?)<\/h3>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'mailnumber', /<h3>Почтовый ящик\s*\(([\s\S]*?)\)/i, replaceTagsAndSpaces, html_entity_decode);


    html = AnyBalance.requestGet(baseurl + 'api/base_info', g_headers);

    getParam(html, result, 'number', /"login":\s*"([^"]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'fio', /"name":\s*"([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'contractService', /"contract_service":\s*"([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /"state":\s*"([^"]*)/i, replaceTagsAndSpaces, parseBalance);



    AnyBalance.setResult(result);
}
