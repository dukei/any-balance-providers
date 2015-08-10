/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у севастопольского интернет-провайдера Super Sky

Сайт оператора: http://supersky.ua
Личный кабинет: https://stat.supersky.ua
*/

function parseTrafficGb(str){
  return parseFloat((parseFloat(str)/1024).toFixed(2));
}

function main(){
    var prefs = AnyBalance.getPreferences();

    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://stat.supersky.ua/";

    var html = AnyBalance.requestPost(baseurl + 'info.php', {
        login:prefs.login,
        password:prefs.password,
        logon:'OK'
    });

    //AnyBalance.trace(html);

    if(!/logout=yes/i.test(html)){
        var error = getParam(html, null, null, /<form[^>]+id="first_form"[^>]*>([\s\S]*?)<\/form>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Личный кабинет изменился или проблемы на сайте.");
    }

    var result = {success: true};

    getParam(html, result, 'balance', /Балaнс[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'bonus', /Количество бонусов[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'status', /Статус Интернета[\s\S]*?<td[^>]*>([\S\s]*?)(?:<a|<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'licschet', /Основной счет[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'fio', /Абонент[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    html = AnyBalance.requestGet(baseurl + "edit_tariff_start.php");
    getParam(html, result, '__tariff', /Текущий тарифный план(?:[\s\S]*?<td[^>]*tab_1[^>]*>){1}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    if(AnyBalance.isAvailable('traffic','trafficCost')){
        var now = new Date();
        html = AnyBalance.requestPost(baseurl + "traff.php", {
            s_date:'01-' + (now.getMonth()+1) + '-' + now.getFullYear(),
            e_date:now.getDate() + '-' + (now.getMonth()+1) + '-' + now.getFullYear(),
            group:'month'
        });

        getParam(html, result, 'trafficCost', /Итого:([\s\S]*?)грн/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'traffic', /Итого:[\s\S]*?<br[^>]*>([^<]*)Мбайт/i, replaceTagsAndSpaces, parseTrafficGb);
    }

    AnyBalance.setResult(result);
}
