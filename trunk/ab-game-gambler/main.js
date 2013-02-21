/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и другую информацию о балансе на сайте Gambler.ru 

Operator site: http://gambler.ru
Личный кабинет: https://gambler.ru/login
*/

var g_headers = {
'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
'Connection':'keep-alive',
'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function parseTimeInterval(str){
    var matches = str.match(/(\d+)\s*час\.?\s*(\d+)\s*мин/i);
    if(matches){
        var val = matches[1]*3600 + matches[2]*60;
        AnyBalance.trace('Parsed ' + val + ' secs from ' + str);
        return val;
    }else{
        AnyBalance.trace('Failed to parse seconds from ' + str);
    }
}

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "https://www.gambler.ru/";

    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestPost(baseurl + 'login', {
        'return':'login',
        return_https:1,
        gloginname:prefs.login,
        gloginpsw:prefs.password,
        save_session:1,
        glogin:'Войти'
    }, addHeaders({Referer: baseurl + 'login'})); 

    var userid = getParam(html, null, null, /\/user\/info\?uin=(\d+)/i);

    if(!userid){
        //Если в кабинет войти не получилось, то в первую очередь надо поискать в ответе сервера объяснение ошибки
        var error = getParam(html, null, null, /<td[^>]+color:\s*red[^>]*>[\s\S]*?<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        //Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    html = AnyBalance.requestGet(baseurl + 'user/info?uin=' + userid, g_headers);

    var result = {success: true};
    getParam(html, result, 'fio', /<td[^>]+class="?info"?[^>]*>Имя[\s\S]*?<td[^>]*>([\s\S]*?)(?:<a|<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);
    var tariff = getParam(html, null, null, /<td[^>]+class="?info"?[^>]*>Лицевой счет[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i) || '';
    getParam(tariff, result, '__tariff', /Тариф\s*<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tariff, result, 'balance', /баланс л\/с:([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'uin', /<td[^>]+class="?info"?[^>]*>UIN[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'played', /<td[^>]+class="?info"?[^>]*>Наиграл[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTimeInterval);

    //Возвращаем результат
    AnyBalance.setResult(result);
}
