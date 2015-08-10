/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс баллов для бонусной программы Проспект

Operator site: http://www.prospect74.ru
Личный кабинет: http://www.prospect74.ru/buyers/bonus/
*/

var g_headers = {
'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
'Connection':'keep-alive',
'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

var myReplaceTagsAndSpaces = [/,/g, '', replaceTagsAndSpaces];

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "http://www.prospect74.ru/buyers/bonus/";
    AnyBalance.setDefaultCharset('windows-1251'); 

    var bd = '', psw = prefs.password;
    if(!prefs.password)
        throw new AnyBalance.Error('Введите пароль или свой день рождения в формате дд.мм.гггг');
    if(/^\d{2}\.\d{2}\.\d{4}$/.test(prefs.password)){
        AnyBalance.trace('Входим по дню рождения....');
        bd = prefs.password, psw = '';
    }

    var html = AnyBalance.requestGet(baseurl + '?pan=' + encodeURIComponent(prefs.login) + '&birth_day=' + encodeURIComponent(bd) + '&psw=' + encodeURIComponent(psw), addHeaders({Referer: baseurl})); 

    //Проверяем, что есть поле для смены пароля
    if(!/id="chpsw"/i.test(html)){
        //Если в кабинет войти не получилось, то в первую очередь надо поискать в ответе сервера объяснение ошибки
        var error = getParam(html, null, null, /<span[^>]+style="color:\s*rgb\(0,\s*166,\s*80\);?"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        //Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    getParam(html, result, 'fio', /<h1[^>]*>Ваш личный кабинет[\s\S]*?<b[^>]*>([\s\S]*?)(?:\(|<\/b>)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /Информация о карте([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Общее количество бонусных баллов:([^<]*)/i, myReplaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'available', /Доступные бонусные баллы:([^<]*)/i, myReplaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'delayed', /Отложенные бонусные баллы:([^<]*)/i, myReplaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'total', /Общая сумма накоплений:([^<]*)/i, myReplaceTagsAndSpaces, parseBalance);

    //Возвращаем результат
    AnyBalance.setResult(result);
}
