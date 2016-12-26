/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у оператора интернет ТТК-Сибирь.

Сайт оператора: http://myttk.ru
Личный кабинет: https://stat.myttk.ru/
*/

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://stat.myttk.ru/";

    var headers = {
        Accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
        Referer:baseurl + 'login.php?backurl=%2Findex.php',
        'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.83 Safari/537.1'
    };
    
    var html = AnyBalance.requestPost(baseurl + 'login.php?backurl=%2Findex.php', {
        user_login:prefs.login,
        user_pass:prefs.password,
        enter:'',   
        testbil:''
    }, headers);
 
    if(!/\?action=logout/i.test(html)){
        var error = getElement(html, /<div[^>]*login_error/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error, null, /парол/i.test(error));
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

    getParam(html, result, 'userName', /<h2>Здравствуйте,([^<!]*)/i, replaceTagsAndSpaces);
    getParam(html, result, 'daysleft', /Интернета вам хватит примерно[\s\S]*?<span[^>]*>\s*на([^<]*)д/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'licschet', /<span[^>]*>\s*Лицевой счет\s*<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, 'balance', /<td[^>]*class="value"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'agreement', />\s*Договор\s*<[\s\S]*?<td[^>]*>([\s\S]*?)(?:от|<\/td>)/i, replaceTagsAndSpaces);
    getParam(html, result, '__tariff', />\s*Тариф\s*<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

    if(AnyBalance.isAvailable('bonus')){
        var json = AnyBalance.requestGet(baseurl + 'ajax/bonus.php');
        json = JSON.parse(json);
        if(json.error){
            AnyBalance.trace('Не удалось получить бонусный баланс, ошибка ' + json.error);
        }else{
            result.bonus = parseBalance(json.data.BALANCE);
        }
    }

    AnyBalance.setResult(result);
}
