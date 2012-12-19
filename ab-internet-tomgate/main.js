/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у томского интернет-провайдера Tomgate

Сайт оператора: https://tomgate.net
Личный кабинет: https://tomgate.net
*/

/**
 *  Получает JSON из переданного текста, кидает ошибку, если не парсится
 */
function getJson(html){
   try{
       var json = new Function("return " + html)();
       return json;
   }catch(e){
       AnyBalance.trace('Bad json (' + e.message + '): ' + html);
       throw new AnyBalance.Error('Сервер вернул ошибочные данные: ' + e.message);
   }
}

function main(){
    var prefs = AnyBalance.getPreferences();

    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://tomgate.net/";

    var html = AnyBalance.requestGet(baseurl);
    var form_build_id = getParam(html, null, null, /<input[^>]+name="form_build_id"[^>]*value="([^"]*)/i, null, html_entity_decode);

    var html = AnyBalance.requestPost(baseurl + 'user', {
        name:prefs.login,
        pass:prefs.password,
        'op.x':45,
        'op.y':8,
        op:'Вход в систему',
        form_build_id:form_build_id,
        form_id:'utm5user_login'
    });
        
    //AnyBalance.trace(html);

    if(!/\/logout/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]*class="[^"]*error[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Личный кабинет изменился или проблемы на сайте.");
    }

    var result = {success: true};

    getParam(html, result, 'balance', /Баланс[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'credit', /Кредит[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'licschet', /Основной лицевой счёт[\s\S]*?<td[^>]*>([\S\s]*?)(?:\(|<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'fio', /ФИО \(наименование\)[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'status', /Состояние[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    html = AnyBalance.requestGet(baseurl + "my/services");
    //Тарифный план в последней строчке таблицы
    getParam(html, result, '__tariff', /Текущий тариф(?:[\s\S]*?<td[^>]*>){2}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    var dt = new Date();

    if(AnyBalance.isAvailable('trafficIn','trafficOut')){
        html = AnyBalance.requestGet(baseurl + "my/reports");
        var form_build_id = getParam(html, null, null, /<input[^>]+name="form_build_id"[^>]*value="([^"]*)/i, null, html_entity_decode);
        var form_token = getParam(html, null, null, /<input[^>]+name="form_token"[^>]*value="([^"]*)/i, null, html_entity_decode);
        var dt = new Date(), dtNew = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()+1);

        html = AnyBalance.requestPost(baseurl + 'my/reports', {
            report_type:1,
            utm5reports_date_select:2,
            'date_from[day]':1,
            'date_from[month]':dt.getMonth()+1,
            'date_from[year]':dt.getFullYear(),
            'date_to[day]':dtNew.getDate(),
            'date_to[month]':dtNew.getMonth()+1,
            'date_to[year]':dtNew.getFullYear(),
            form_build_id:form_build_id,
            form_token:form_token,
            form_id:'utm5user_reports_javascript_form',
            op:'Отправить',
            drupal_ajax:1
        }, {Accept:'application/json, text/javascript, */*', 'X-Requested-With':'XMLHttpRequest'});

        var json = getJson(html);
        var thtml = json.options.mydata;
        if(!thtml){
            AnyBalance.trace('Не найдена информация о трафике: ' + html);
        }else{
            var head = sumParam(thtml, null, null, /<th[^>]*>((?:[\S\s](?!<th))*)<\/th>/ig, replaceTagsAndSpaces, html_entity_decode);
            for(var i=0; i<head.length; ++i){
                var h = head[i];
                if(/Исходящий/i.test(h))
                    sumParam(thtml, result, 'trafficOut', new RegExp('<strong>\\s*Итого(?:[\\s\\S]*?<td[^>]*>){' + (i) + '}([\\s\\S]*?)</td>', 'i'), replaceTagsAndSpaces, parseTraffic, aggregate_sum);
                if(/Входящий/i.test(h))
                    sumParam(thtml, result, 'trafficIn', new RegExp('<strong>\\s*Итого(?:[\\s\\S]*?<td[^>]*>){' + (i) + '}([\\s\\S]*?)</td>', 'i'), replaceTagsAndSpaces, parseTraffic, aggregate_sum);
                if(/Итого/i.test(h))
                    sumParam(thtml, result, 'trafficCost', new RegExp('<strong>\\s*Итого(?:[\\s\\S]*?<td[^>]*>){' + (i) + '}([\\s\\S]*?)</td>', 'i'), replaceTagsAndSpaces, parseBalance, aggregate_sum);
            }
        }
    }

    AnyBalance.setResult(result);
}
