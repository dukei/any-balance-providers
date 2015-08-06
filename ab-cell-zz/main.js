/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у оператора zelta zivtina (Латвия).

Сайт оператора: http://zeltazivtina.lv
Личный кабинет: https://mana.zeltazivtina.lv/
*/


function main(){
    var langMap = {
        auto: 'auto',
        ru: 'ru',
        lv: 'lv'
    };

    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://mana.zeltazivtina.lv/";

    AnyBalance.setDefaultCharset('utf-8');

    AnyBalance.trace("Trying to enter ics at address: " + baseurl);
    var lang = prefs.lang || 'auto';
    lang = langMap[lang] || lang; //Переведем старые настройки в новые.

    if(lang != 'auto')
        AnyBalance.requestGet(baseurl + lang);
    
    var html = AnyBalance.requestPost(baseurl, {
        PhoneNumber:prefs.login,
        Password:prefs.password,
        submit:'Войти'
    }, {'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/536.11 (KHTML, like Gecko) Chrome/20.0.1132.57 Safari/536.11'});

//    AnyBalance.trace(html);
    
    if(!/\/Login\/Logout/i.test(html)){
       var error = getParam(html, null, null, /<div[^>]*class="[^"]*msgError[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
       if(error)
            throw new AnyBalance.Error(error);
       throw new AnyBalance.Error("Не удалось зайти в личный кабинет. Если вы уверены, что правильно ввели логин-пароль, то это может быть из-за проблем на сервере или изменения личного кабинета.");
    }
    
    var result = {success: true};
    //(?:Теңгерім|Баланс):
    getParam(html, result, 'balance', /(?:Кредит|Kredīts):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'incoming', /(?:Бонус за входящий звонок|Ienākošā zvana bonuss):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'till', /(?:Срок действия карты|Kartes derīguma termiņš):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    getParam(html, result, '__tariff', /(?:Тарифный план|Tarifu plāns):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'phone', /(?:Номер телефона|Telefona numurs)[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'traffic', /(?:Пакет данных|Datu paka):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTraffic);
    getParam(html, result, 'traffic_till', /(?:Пакет данных|Datu paka):(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);

    AnyBalance.setResult(result);
}
