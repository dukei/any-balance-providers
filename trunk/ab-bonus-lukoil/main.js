/**             
 Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
 
 Получает текущий баланс бонусных баллов, статус карты, регион участия программы.
 
 Сайт оператора: http://club-lukoil.ru/
 Личный кабинет: http://club-lukoil.ru/cabinet/
 Личный кабинет (информация о владельце): http://club-lukoil.ru/cabinet/personal
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
    var baseurl = "http://club-lukoil.ru/";
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + 'login', g_headers);
    var sid = getParam(html, null, null, /bitrix_sessid':'([^']*)/i, replaceSlashes);
    if(!sid) //Если параметр не найден, то это, скорее всего, свидетельствует об изменении сайта или о проблемах с ним
        throw new AnyBalance.Error('Не удалось найти идентификатор сессии. Сайт изменен?');

    html = AnyBalance.requestPost(baseurl + 'login/', {
        sessid:sid,
        LOGIN:prefs.login,
        PASS:prefs.password
    }, addHeaders({Referer: baseurl})); 

    //После входа обязательно проверяем маркер успешного входа
    //Обычно это ссылка на выход, хотя иногда приходится искать что-то ещё
    if(!/\?ACTION=logout/i.test(html)){
        //Если в кабинет войти не получилось, то в первую очередь надо поискать в ответе сервера объяснение ошибки
        var error = getParam(html, null, null, /<p[^>]+class="err"[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        //Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    //Раз мы здесь, то мы успешно вошли в кабинет
    //Получаем все счетчики
    var result = {success: true};
    getParam(html, result, '__tariff', /Номер Вашей Карты:([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'cardnum', /Номер Вашей Карты:([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'region', /Регион Программы:([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Баланс Ваших Баллов:([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance);

    if(AnyBalance.isAvailable('username', 'phonenumber')){
        html = AnyBalance.requestGet(baseurl + 'cabinet/personal/');
        getParam(html, result, 'username', /ФИО:([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, 'phonenumber', /Мобильный телефон:([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, html_entity_decode);
    }

    //Возвращаем результат
    AnyBalance.setResult(result);
}
