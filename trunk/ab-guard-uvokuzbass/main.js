/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс для управления вневедомственной охраны УВО Кузбасс

Operator site: http://www.uvokuzbass.ru/
Личный кабинет: http://www.uvokuzbass.ru/dolg.html
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
    var baseurl = "http://www.uvokuzbass.ru/";
    AnyBalance.setDefaultCharset('utf-8'); 

//    AnyBalance.requestGet(baseurl + 'dolg.html', g_headers);

    var html = AnyBalance.requestPost(baseurl + 'check_balance.php', {
        dataset:1, //По лицевому счету
	cities:prefs.city,
	dogovor_number:prefs.login,
	dog_number:'',
	last_name:''
    }, addHeaders({Referer: baseurl + 'dolg.html', 'X-Requested-With':'XMLHttpRequest'})); 

    if(!/По состоянию на/i.test(html)){
        //Если в кабинет войти не получилось, то в первую очередь надо поискать в ответе сервера объяснение ошибки
        var error = getParam(html, null, null, /<p[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        //Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
        throw new AnyBalance.Error('Не удалось получить баланс счета. Сайт изменен?');
    }

    //Раз мы здесь, то мы успешно вошли в кабинет
    //Получаем все счетчики
    var result = {success: true};
    getParam(html, result, 'licschet', /(?:Переплата|Задолженность) по счету\s*<strong[^>]*>([\s\S]*?)<\/strong>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /(?:Переплата|Задолженность) по счету[\s\S]*?(<span[^>]*>[\s\S]*?)<\/span>/i, [/<span[^>]+color:\s*red[^>]*>/g, '-', replaceTagsAndSpaces], parseBalance);

//    makeCities(result);

    //Возвращаем результат
    AnyBalance.setResult(result);
}

function makeCities(result){
    var html = AnyBalance.requestGet('http://www.uvokuzbass.ru/dolg.html', g_headers);
    var citieshtml = getParam(html, null, null, /<select[^>]+name="cities"[^>]*>([\s\S]*?)<\/select>/i);
    var cities = sumParam(citieshtml, null, null, /<option[^>]*>[\s\S]*?<\/option>/ig);
    var joinfunc = create_aggregate_join('|');
    for(var i=0; i<cities.length; ++i){
        sumParam(cities[i], result, 'entries', null, replaceTagsAndSpaces, html_entity_decode, joinfunc);
        sumParam(cities[i], result, 'entryValues', /value="([^"]*)/i, null, html_entity_decode, joinfunc);
    }
}
