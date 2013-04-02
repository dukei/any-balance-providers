/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс на бонусной карте Тюменской транспортной системы

Operator site: http://oao-tts.ru
Личный кабинет: http://oao-tts.ru/index.php/proverka-balansa-karty
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

    var baseurl = "http://oao-tts.ru/index.php/proverka-balansa-karty";

    //Теперь, когда секретный параметр есть, можно попытаться войти
    var html = AnyBalance.requestGet(baseurl + '?numbCard=' + prefs.login, addHeaders({Referer: baseurl})); 

    if(!/<h4[^>]*>Информация по карте:/i.test(html)){
        throw new AnyBalance.Error('Не удалось получить информацию по карте. Введен неверный номер карты?');
    }

    //Раз мы здесь, то мы успешно вошли в кабинет
    //Получаем все счетчики
    var result = {success: true};
    getParam(html, result, '__tariff', /<li[^>]*>Номер Карты:([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /<li[^>]*>Остаток средств:([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'lgotleft', /<li[^>]*>Остаток льготных поездок:([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'lgotnum', /<li[^>]*>Число льготных поездок за месяц:([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'lgotlast', /<li[^>]*>Дата последней поездки:([\s\S]*?)<\/?li>/i, replaceTagsAndSpaces, parseDate);

    //Возвращаем результат
    AnyBalance.setResult(result);
}
