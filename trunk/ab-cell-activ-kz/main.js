/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у оператора Актив (Казахстан).

Сайт оператора: http://activ.kz
Личный кабинет: http://ics.activ.kz
*/


function main(){
    var langMap = {
        rus: 'ru',
        kaz: 'kk'
    };

    var prefs = AnyBalance.getPreferences();

    var baseurl = "http://ics.activ.kz";

    AnyBalance.setDefaultCharset('utf-8');

    AnyBalance.trace("Trying to enter ics at address: " + baseurl);
    var lang = prefs.lang || 'ru';
    lang = langMap[lang] || lang; //Переведем старые настройки в новые.
    
    var html = AnyBalance.requestPost(baseurl + "/" + lang + "/ics.security/authenticate/false", {
        'msisdn':'+7' + prefs.login,
        'password': prefs.password
    }, {'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/536.11 (KHTML, like Gecko) Chrome/20.0.1132.57 Safari/536.11'});

//    AnyBalance.trace(html);
    
    if(!/\/logout\//i.test(html)){
       //Хм, он нас почему-то не довел до счета. Попытаемся явно перейти
       var error = getParam(html, null, null, /<div[^>]*class="[^"]*alert[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
       if(error)
            throw new AnyBalance.Error(error);
       if(/icons\/503\.png/i.test(html))
            throw new AnyBalance.Error("Проблемы на сервере или, возможно, вы ввели неправильный номер телефона.");
       throw new AnyBalance.Error("Не удалось зайти в личный кабинет. Если вы уверены, что правильно ввели логин-пароль, то это может быть из-за проблем на сервере или изменения личного кабинета.");
    }
    
    var result = {success: true};
    //(?:Теңгерім|Баланс|Balance):
    getParam(html, result, 'balance', /(?:Ваш баланс|Сіздің теңгеріміңіз|Your balance is)([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    //(?:интернет плюс|internet plus)
    getParam(html, result, 'internet_plus', /(?:Ваш баланс|Сіздің теңгеріміңіз|Your balance is)[^<]*?\+([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    //(?:Шот қалпы|Статус номера|Account status):
    getParam(html, result, 'status', /(?:Статус|Қалпы|Status):[\s\S]*?<font[^>]*>([\s\S]*?)<\/font>/i, replaceTagsAndSpaces, html_entity_decode);
    //Тариф:
    getParam(html, result, '__tariff', /(?:Тарифный план|Тариф|Tariff):[\s\S]*?<font[^>]*>([\s\S]*?)<\/font>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}
