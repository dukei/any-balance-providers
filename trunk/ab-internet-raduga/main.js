/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у спутникового оператора интернет Радуга интернет

Сайт оператора: http://radugainternet.ru/
Личный кабинет: https://cabinet.radugainternet.ru
*/

function parseTrafficGbMy(str){
    return parseTrafficGb(str, 'mb');
}

function parseDateMomentMSK(str){
    var mom = moment(str.replace(/i/ig, 'і'), ['D MMM YYYY, HH:mm', 'DD MMM YYYY']);
    if(!mom.isValid()){
        AnyBalance.trace('Failed to parse date from ' + str);
    }else{
        var val = mom.toDate();
        val = new Date(val.getTime() + val.getTimezoneOffset()*60000 - 4*3600*1000); //Приводим ко времени по Москве
        AnyBalance.trace('Parsed date ' + val + ' from ' + str);
        return val.getTime();
    }
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    moment.lang('ru');

    var baseurl = "https://cabinet.radugainternet.ru/";

    var html = AnyBalance.requestPost(baseurl + 'login', {
        salt:'439426',
        password_hash:'',
        login:prefs.login,
        password:prefs.password,
        rememberme:0,
        'login-button':'Войти'
    });

    if(!/\/logout\//i.test(html)){
        var error = sumParam(html, null, null, /<label[^>]+class="error"[^>]*>([\s\S]*?)<\/label>/i, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

    getParam(html, result, 'fio', /<div[^>]+id="balance-block"[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /<th[^>]*>Тариф:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /<span[^>]+id="header-balance"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'agreement', /<p[^>]*>\s*Договор\s*<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'limit_traffic', /<h2[^>]*>Ограничение трафика[\s\S]*<th[^>]*>Статус:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'add_traffic', /<th[^>]*>Использовать доп. трафик после окончания включенного[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'autoactive', /<th[^>]*>Автоактивация:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'till', /<th[^>]*>Списание аб.платы за следующий период[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDateMomentMSK);
    getParam(html, result, 'traffic_total', /<th[^>]*>Трафик, включенный в абонентскую плату:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTraffic);
    getParam(html, result, 'traffic_left', /<th[^>]*>Оставшийся трафик:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTraffic);
    getParam(html, result, 'abon', /<th[^>]*>Абонентская плата:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'add_traffic_cost', /<th[^>]*>Стоимость доп. трафика:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    if(AnyBalance.isAvailable('traffic')){
        html = AnyBalance.requestGet(baseurl + 'kasat/statistics/');
        getParam(html, result, 'traffic', /Итого:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    }

    AnyBalance.setResult(result);
}
