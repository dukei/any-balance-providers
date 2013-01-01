/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у пензенского интернет-провайдера Пенза Телеком

Сайт оператора: http://www.ptcomm.ru/
Личный кабинет: https://billing.ptcomm.ru
*/

function main(){
    var prefs = AnyBalance.getPreferences();

    AnyBalance.setDefaultCharset('koi8-r');

    var baseurl = "https://billing.ptcomm.ru/cgi-bin/";

    var html = AnyBalance.requestPost(baseurl + 'net/login', {
        action:'validate',
        login:prefs.login,
        password:prefs.password
    });

    //AnyBalance.trace(html);

    if(!/logout/i.test(html)){
        var error = getParam(html, null, null, /<p[^>]+color:\s*red[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Личный кабинет изменился или проблемы на сайте.");
    }

    var result = {success: true};

    getParam(html, result, 'balance', /Сумма на счету[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /<th[^>]*>\s*Тариф(?:[\s\S]*?<td[^>]*>){4}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'status', /Статус счёта[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'licschet', /Аккаунт[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'agreement', /Номер вашего договора &#0171;([\S\s]*?)&#0187;/i, replaceTagsAndSpaces, html_entity_decode);

    if(AnyBalance.isAvailable('trafficIn','trafficOut','trafficInNight','trafficOutNight')){
        var servicepart = getParam(html, null, null, /(deal_service\?session_id=[^&]+&service_id=\d+)/i, null, html_entity_decode);
        if(!servicepart){
            AnyBalance.trace('Не удалось найти ссылку на услугу интернет');
        }else{
            var now = new Date();
            html = AnyBalance.requestGet(baseurl + "net/" + servicepart + '&start_y=' + now.getFullYear() + '&start_m=' + (now.getMonth()+1) + '&leased=%F0%D2%CF%D3%CD%CF%D4%D2%C5%D4%D8+%D4%D2%C1%C6%C9%CB-%D3%C5%D3%D3%C9%C9');
            getParam(html, result, 'trafficIn', /Суммарный трафик[\s\S]*?Входящий внешний трафик\s*<(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
            getParam(html, result, 'trafficOut', /Суммарный трафик[\s\S]*?Исходящий внешний трафик\s*<(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
            getParam(html, result, 'trafficInNight', /Суммарный трафик[\s\S]*?Входящий внешний трафик \(ночной\)(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
            getParam(html, result, 'trafficOutNight', /Суммарный трафик[\s\S]*?Исходящий внешний трафик \(ночной\)(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        }
    }

    AnyBalance.setResult(result);
}
