/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс на бонусной карте сети магазинов Строительный двор

Operator site: http://www.sdvor.com
Личный кабинет: http://www.sdvor.com/checkcards
*/


var g_headers = {
'Accept':'text/plain,*/*;q=0.01',
'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
'Connection':'keep-alive',
'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.22 (KHTML, like Gecko) Chrome/25.0.1364.172 Safari/537.22',
'X-Requested-With':'XMLHttpRequest'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8'); 

    var baseurl = "http://www.sdvor.com/";

    //Теперь, когда секретный параметр есть, можно попытаться войти
    var html = AnyBalance.requestPost(baseurl, {
        catalog:'checkcard',
        card_id:prefs.login,
        card_id_title:'номер',
        card_fio:prefs.password,
        card_fio_title:'фамилия'
    }, addHeaders({Referer: baseurl + 'checkcards'})); 

    if(!/Баланс:/i.test(html)){
        //Если в кабинет войти не получилось, то в первую очередь надо поискать в ответе сервера объяснение ошибки
        var error = getParam(html, null, null, null, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось получить информацию по карте. Сайт изменен?');
    }

    //Раз мы здесь, то мы успешно вошли в кабинет
    //Получаем все счетчики
    var result = {success: true};
    getParam(prefs.login, result, '__tariff', null, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Баланс:\s*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'pct_com', /общестрой:([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'pct_otd', /отделочные материалы:([^<]*)/i, replaceTagsAndSpaces, parseBalance);

    //Возвращаем результат
    AnyBalance.setResult(result);
}
