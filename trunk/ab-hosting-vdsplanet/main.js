/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает остаток дней и информацию о тарифном плане для хостинг провайдера VDSPlanet

Сайт оператора: http://vdsplanet.ru/
Личный кабинет: https://my.vdsplanet.ru/
*/

var g_headers = {
    Accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Cache-Control':'max-age=0',
    Connection:'keep-alive',
    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.60 Safari/537.1'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    if(AnyBalance.getLevel() < 4)
        throw new AnyBalance.Error('Для этого провайдера требуется AnyBalance 2.8+. Пожалуйста, обновите программу.');

    var baseurl = "https://my.vdsplanet.ru/manager/billmgr";
    var html;

    if(!prefs.__dbg){
        AnyBalance.setCookie('my.vdsplanet.ru', 'billmgr4', 'sirius:ru:0');
        
        html = AnyBalance.requestPost(baseurl, {
            username:prefs.login,
            password:prefs.password,
            theme:'sirius',
            lang:'ru',
            func:'auth',
            project:'',
            welcomfunc:'',
            welcomparam:''
        }, g_headers);
        
        var sessval = getParam(html, null, null, /=sirius:ru:(\d+)/i);
        if(!sessval){
            var error = getParam(html, null, null, /<td[^>]*login-error-content[^>]*>([\s\S]*?)<\/td>/, replaceTagsAndSpaces);
            if(error)
                throw new AnyBalance.Error(error);
            throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
        }
        
        AnyBalance.setCookie('my.vdsplanet.ru', 'billmgr4', 'sirius:ru:' + sessval);
    }

    html = AnyBalance.requestGet(baseurl + '?func=accountinfo', g_headers);

    var result = {success: true};

    getParam(html, result, '__tariff', /<tbody[^>]+mainBody[^>]*>(?:[\S\s]*?<td[^>]*>){2}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /<tbody[^>]+mainBody[^>]*>(?:[\S\s]*?<td[^>]*>){3}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, function(str){
        var v = parseBalance(str);
        if(v) v = Math.round(v*100)/100;
        return v;
    });
    getParam(html, result, 'currency', /<tbody[^>]+mainBody[^>]*>(?:[\S\s]*?<td[^>]*>){4}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'forecast', /<tbody[^>]+mainBody[^>]*>(?:[\S\s]*?<td[^>]*>){5}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}
