/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс для московского поставщика электроэнергии мосэнергосбыт

Сайт оператора: http://mosenergosbyt.ru
Личный кабинет: https://lkkbyt.mosenergosbyt.ru
*/

var g_headers = {
    Accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    Connection:'keep-alive',
    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.31 (KHTML, like Gecko) Chrome/26.0.1410.64 Safari/537.31'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = 'https://lkkbyt.mosenergosbyt.ru/';

    if(!/^\d{10}$/.test(prefs.login || ''))
        throw new AnyBalance.Error('Введите 10 цифр лицевого счета без пробелов и разделителей.');

    var parts = /^(\d{5})(\d{3})(\d{2})$/.exec(prefs.login);

    var html = AnyBalance.requestGet(baseurl, g_headers);
    /*var rnd = getParam(html, null, null, /<input[^>]+name="login:fTemplateLogin:rnd"[^>]*value="([^"]*)/i);
    if(!rnd)
        throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');*/
	//17839-078-50

    html = AnyBalance.requestPost(baseurl + 'backLink.xhtml?mode=auth', {
        'book':parts[1],
        'num':parts[2],
        'kr':parts[3],
        'email':'',
        'psw':prefs.password,
        'x':'44',
        'y':'10'
    }, g_headers);

    //Выход из кабинета
    if(!/common\/login\.xhtml\?logout/i.test(html)){
        if(html.length < 5000 && AnyBalance.getLevel() < 5) //Обрезается по '\0'
            //throw new AnyBalance.Error("К сожалению, из-за ошибки в Android 4.0+ этот провайдер не работает. Для исправления, пожалуйста, дождитесь следующей версии AnyBalance.");
            throw new AnyBalance.Error("Ваша версия AnyBalance не может получить информацию для этого провайдера. Пожалуйста, установите последнюю версию AnyBalance.");
        var error = getParam(html, null, null, /<span[^>]+id="login:fTemplateLogin:otLoginError"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /Баланс([\s\S]*?)руб/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'agreement', /ЛС №\s*([\s\S]*?)\s*<\//i, replaceTagsAndSpaces, html_entity_decode);
	
	
    getParam(html, result, 'lastdate', /Информация о последнем платеже[\s\S]*?<tbody[^>]*>(?:[\s\S]*?<td[^>]*>){1}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    getParam(html, result, 'lastcounter', /История показаний счетчика[\s\S]*?<tbody[^>]*>(?:[\s\S]*?<td[^>]*>){3}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'lastcounter1', /История показаний счетчика(?:[\s\S](?!<\/table>))*?<tbody[^>]*>(?:(?:[\s\S](?!<\/table))*?<td[^>]*>){7}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'lastcounter2', /История показаний счетчика(?:[\s\S](?!<\/table>))*?<tbody[^>]*>(?:(?:[\s\S](?!<\/table))*?<td[^>]*>){11}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'lastsum', /Информация о последнем платеже[\s\S]*?<tbody[^>]*>(?:[\s\S]*?<td[^>]*>){2}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    getParam(html, result, '__tariff', /ЛС №\s*([\s\S]*?)\s*<\//i, replaceTagsAndSpaces, html_entity_decode);
    //Величина тарифа:
    getParam(html, result, '__tariff', /&#1042;&#1077;&#1083;&#1080;&#1095;&#1080;&#1085;&#1072; &#1090;&#1072;&#1088;&#1080;&#1092;&#1072;:(?:[\s\S](?!<\/table))*?<table[^>]+RichSubTable[^>]*>([\S\s]*?)<\/table>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}
