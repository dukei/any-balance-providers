/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс для белорусского провайдера Infolan

Сайт оператора: http://infolan.by/
Личный кабинет: http://balance.infolan.by/balance_by.php
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "http://balance.infolan.by/balance_by.php";

    var html = AnyBalance.requestPost(baseurl, {
        id:prefs.login,
	auth:prefs.password
    });

    if(!/<Response>\s*<Main>/i.test(html)){
    	var error = getParam(html, null, null, /<ErrorDesc>([\s\S]*?)<\/ErrorDesc>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось получить баланс. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    //Последняя строчка. Что-то вроде Переплата на 27.01.2013	73.33 руб. или Задолжность на 31.12.2012  83.09 руб.
    getParam(html, result, 'balance', /<Main>(?:[\s\S](?!<\/Main>))*?<Balance>([\s\S]*?)<\/Balance>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'daysleft', /<Main>(?:[\s\S](?!<\/Main>))*?<DaysLeft>([\s\S]*?)<\/DaysLeft>/i, replaceTagsAndSpaces, parseBalance);

    var re = new RegExp('<Inet>(?:[\\s\\S](?!</Inet>))*?<Name>\\s*' + (prefs.inet ? prefs.inet : '[\\s\\S]*?') + '</Name>[\\s\\S]*?</Inet>', 'i');
    var inet = getParam(html, null, null, re);

    if(!inet){
        if(prefs.inet)
            throw new AnyBalance.Error('Не найдена учетная запись VPN доступа ' + prefs.inet);
        AnyBalance.trace('Не найдено ни одной учетной записи VPN');
    }else{
        getParam(inet, result, 'inet_name', /<Name>([\s\S]*?)<\/Name>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(inet, result, 'inet_balance', /<Balance>([\s\S]*?)руб\s*<\/Balance>/i, replaceTagsAndSpaces, parseBalance);
        getParam(inet, result, 'inet_traffic', /<Balance>([\s\S]*?)Мб\s*<\/Balance>/i, replaceTagsAndSpaces, parseBalance);
        getParam(inet, result, 'inet_daysleft', /<Expiry>([\s\S]*?)<\/Expiry>/i, replaceTagsAndSpaces, parseBalance);
    }
    
    AnyBalance.setResult(result);
}
