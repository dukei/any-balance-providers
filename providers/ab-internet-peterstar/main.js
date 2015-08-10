/**
Провайдер Петерстар (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плате для провайдера Петерстар 

Operator site: http://peterhome.ru/
Личный кабинет: http://bill.peterstar.ru
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

    var baseurl = "http://bill.peterstar.ru",
        originURL = "http://peterhome.ru/";

    AnyBalance.setDefaultCharset('WINDOWS-1251'); 

    var html = AnyBalance.requestPost(baseurl + '/pls/abs/htm_db.callhpage', {
        "p_lang" : "RUS",
        "p_logname" : prefs.login,
        "p_pwd" : prefs.password
    }, addHeaders({})); 

    var error = getParam(html, null, null, /<td[^>]*class=zag>ОШИБКА ДОСТУПА<\/td>(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    if(error)
        throw new AnyBalance.Error(error);

    var newURL = getParam(html, null, null, /<META\s*HTTP-EQUIV=REFRESH[^>]+URL=([\s\S]*?)\">/i, null, html_entity_decode);

    html = AnyBalance.requestGet(baseurl + newURL, g_headers);

    if(!/Изменить\s*пароль/i.test(html)){
        //Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }


    var result = {success: true};
    getParam(html, result, 'balance', /Текущее\s*состояние\s*лицевого\s*счета[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);

    getParam(html, result, 'number', /Номер\s*лицевого\s*счета(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)&/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'fio', /<input[^>]*?name\s*=\s*v2[^>]*value\s*=\s*"([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'login', /<th[^>]*>Логин(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /<th[^>]*>Логин(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    //Возвращаем результат
    AnyBalance.setResult(result);
}
