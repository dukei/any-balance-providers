/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у белорусского интернет провайдера Деловая сеть

Сайт оператора: http://bn.by
Личный кабинет: http://ui.bn.by
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('windows-1251');

    var baseurl = "http://ui.bn.by/index.php?";

    var html = AnyBalance.requestPost(baseurl + 'locale=ru', {
        login:prefs.login,
        passwd:prefs.password
    });

    if(!/mode=logout/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]*class=['"]alarma[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error("Не удалось зайти в личный кабинет. Сайт изменен?");
    }

    var result = {success: true};

    getParam(html, result, 'agreement', /(?:Номер лицевого счета|НУМАР АСАБОВАГА РАХУНКУ|PERSONAL ACCOUNT №):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'fio', /(?:Ф.И.О.|ПРОЗВІШЧА,ІМЯ, ІМЯ ПА БАЦЬКУ|FULL NAME):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /(?:ТАРИФ|ТАРЫФ|TARIFF PLAN):[\s\S]*?<td[^>]*>([\s\S]*?)(?:<\/td>|\()/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /(?:ТЕКУЩИЙ БАЛАНС|БЯГУЧЫ БАЛАНС|CURRENT BALANCE):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'traffic', /(?:ОСТАТОК ТРАФИКА|РЭШТА ТРАФІКУ|REST OF TRAFFIC PREPAID):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficGb);
    getParam(html, result, 'till', /(?:Окончание контракта|Заканчэнне кантракту|Contract Expiry Date)([^<)]*)/i, replaceTagsAndSpaces, parseDateISO);

    if(AnyBalance.isAvailable('trafficIn', 'trafficOut')){
        var now = new Date();
        html = AnyBalance.requestPost(baseurl + 'mode=connect', {
            from_mn:now.getMonth()+1,
            from_y:now.getFullYear(),
            to_mn:now.getMonth()+1,
            to_y:now.getFullYear()
       });

       getParam(html, result, 'trafficIn', /(?:Всего за период|Усяго ў перыяд|Total for the period):(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficGb);
       getParam(html, result, 'trafficOut', /(?:Всего за период|Усяго ў перыяд|Total for the period):(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficGb);
    }

    AnyBalance.setResult(result);
}
