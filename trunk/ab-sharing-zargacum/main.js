/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у провайдера кардшаринга zargacum.net

Сайт оператора: http://www.zargacum.net
Личный кабинет: https://billing.zargacum.net
*/

function getPacket(html, name, result, counter){
    //Регулярное выражение для получения строки таблицы с пакетом с именем name
    var re = new RegExp('(<!-- \\*\\*\\*ccArray(?:[\\s\\S](?!</tr))*?' + name + '[\\s\\S]*?</tr>)', 'i');
    var tr = getParam(html, null, null, re);
    if(tr){
        //Нашли пакет
        getParam(tr, result, counter, /<td[^>]+class="?vtitle[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(tr, result, counter + '_price', /\[b_price\] => (.*)/, null, parseBalance);
        getParam(tr, result, counter + '_till', /\[ActiveTill\] => (.*)/, null, parseDateISO);
    }
}

function main(){
    var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://billing.zargacum.net/";

    var html = AnyBalance.requestPost(baseurl + 'login/', {
        enter_login:prefs.login,
        enter_pwd:prefs.password
    });

    if(!/\/quit\//i.test(html)){
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Неправильный логин-пароль?");
    }
	
    html = AnyBalance.requestGet(baseurl + 'cabinet/');
	
    var result = {success: true};
	
    getParam(html, result, 'balance', /Баланс:([\S\s]*?)[\(\|<]/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /Тип учетки([\S\s]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'bonus', /Бонус\s*<[^>]*>\s*:([\S\s]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);

    //Обязательно надо экранировать служебные символы в названии пакета, потому что оно вставляется в регулярное выражение
    getPacket(html, '.', result, 'packet');

    AnyBalance.setResult(result);
}
