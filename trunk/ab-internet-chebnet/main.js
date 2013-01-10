/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток и другие параметры у провайдера IP Callbacker

Сайт оператора: http://callbacker.com
Личный кабинет: https://customer.callbacker.com/cabinet/
*/

function parseTrafficGb(str){
    var val = parseBalance(str);
    if(isset(val))
        val = Math.round(val/1024*100)/100;
    AnyBalance.trace('Parsed traffic ' + val + ' gb from ' + str);
    return val;
}

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "http://ds.chebnet.com/";
    AnyBalance.setDefaultCharset('utf-8');

    var html = AnyBalance.requestPost(baseurl + 'index.php', {
        login_login:prefs.login,
        free:'пароль',
        login_pass:prefs.password,
        submit:'Войти'
    }, {
        Accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
        'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
        'Cache-Control':'max-age=0',
        Connection:'keep-alive',
        Origin:'http://chebnet.com',
        Referer:'http://chebnet.com/',
        'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.97 Safari/537.11'
    });

    if(!/index.php\?logout=1/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+style=['"][^"']*color:\s*red[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /<td[^>]*>Баланс[\s\S]*?<td[^>]*>([\s\S]*?)(?:<\/td>|<td|<tr|<\/table)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'credit', /Сумма "кредита"[\s\S]*?<td[^>]*>([\s\S]*?)(?:<\/td>|<td|<tr|<\/table)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'status', /<td[^>]*>Состояние счета[\s\S]*?<td[^>]*>([\s\S]*?)(?:<\/td>|<td|<tr|<\/table)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /Текущий тарифный план[\s\S]*?<td[^>]*>([\s\S]*?)(?:<\/td>|<td|<tr|<\/table)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'traffic', /суммарно[\s\S]*?<td[^>]*>([\s\S]*?)(?:<\/td>|<td|<tr|<\/table)/i, replaceTagsAndSpaces, parseTrafficGb);
    getParam(html, result, 'trafficCost', /суммарно(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)(?:<\/td>|<td|<tr|<\/table)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'periodTill', /<td[^>]*>Дата окончания[\s\S]*?<td[^>]*>([\s\S]*?)(?:<\/td>|<td|<tr|<\/table)/i, replaceTagsAndSpaces, parseDateJS);

    AnyBalance.setResult(result);
}
