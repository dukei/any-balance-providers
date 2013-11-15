/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Интернет Ростелеком Камчатский филиал
Сайт оператора: http://disly.dsv.ru/kam
Личный кабинет: http://issa.kamchatka.ru/
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'http://85.28.194.62/pls/startip/';
    var regionurl = baseurl + '';
    AnyBalance.setDefaultCharset('utf-8');

    checkEmpty(prefs.login, 'Введите логин');    
    checkEmpty(prefs.password, 'Введите пароль');    
	
    // Заходим на главную страницу
    var htmlFrmset = AnyBalance.requestPost(regionurl + "www.GetHomePage", {
        p_logname: prefs.login,
        p_pwd: prefs.password,
        p_lang:'RUS'
    });

    var next = getParam(htmlFrmset, null, null, /<META[^>]+REFRESH[^>]+URL=([^"]*)/i, null, html_entity_decode);
    if(!next){
        var error = getParam(htmlFrmset, null, null, /<td[^>]+class="?zag[^>]*>\s*Сообщение об ошибке[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error("Не удалось зайти в личный кабинет. Сайт изменен?");
    }

    var authorization = getParam(next, null, null, /(&logname.*)/i);
    var html = AnyBalance.requestGet(regionurl + 'www.PageViewer?page_name=S*ADM_DIALUP_INFO' + authorization);

    var result = {
        success: true
    };

    // Тариф
    getParam(html, result, 'balance', /Текущее состояние лицевого счета[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance); //Почему-то отсутствует в лк
    if(AnyBalance.isAvailable('balance') && !isset(result.balance)){
        //Если баланс не найден, присваиваем ему доходы - расходы
        var income = getParam(html, null, null, /Платежи в текущем месяце[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance) || 0;
        var expences = getParam(html, null, null, /Расходы в текущем месяце[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance) || 0;
        var corrections = getParam(html, null, null, /Корректировки лицевого счета[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance) || 0;
        result.balance = income - expences + corrections;
    }
    getParam(html, result, 'agreement', /Номер лицевого счета[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /<td[^>]*>\s*Тариф[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'username', /<td[^>]*>\s*ФИО[\s\S]*?<td[^>]*>\s*<input[^>]+value\s*=\s*"([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);

    if (AnyBalance.isAvailable ('lastpaysum','lastpaydata','lastpaydesc')) {

        AnyBalance.trace("Fetching payment...");
        var urlreppay=regionurl+"www.PageViewer?page_name=S*CLI_DIALUP_REP_PAY"+authorization;

        var htmlpay,urlpay;
        var curmonth = new Date();
        curmonth.setDate(1); // Начало текущего месяца
        for(var i=0; i<3; i++) { // смотрим макс. на 3 месяца назад
            urlpay = urlreppay+"&"+getPeriodMonth(curmonth, i);
            AnyBalance.trace("Checking "+(i+1)+"th month...");
            htmlpay = AnyBalance.requestGet(urlpay);
            var count = getParam(htmlpay, null, null, /Всего записей\s*:\s*([^<]*)/i, replaceTagsAndSpaces, parseBalance);
            if(count > 0){
                //Выбираем запись с максимальной датой
                AnyBalance.trace("... bingo! We're find the last payment.");
                getParam(htmlpay, result, 'lastpaydata', /Дата платежа(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
                getParam(htmlpay, result, 'lastpaydesc', /Дата платежа(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
                getParam(htmlpay, result, 'lastpaysum', /Дата платежа(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
                break;
            }
        }
    }

    if(AnyBalance.isAvailable('traffic_local_in','traffic_global_out','traffic_global_in','traffic_included','traffic_kamchatka','traffic_ext_left')){
        html = AnyBalance.requestGet(regionurl + 'www.PageViewer?page_name=S*ADM_DIALUP_REP_INV_FULL' + authorization + '&n1=p_start_month&n2=p_start_year&n3=p_finish_month&n4=p_finish_year&n5=p_adm&v6=Y&n7=p_username&n8=p_row_count&n9=p_page_num&v9=1&n10=p_page_go&v10=S*ADM_DIALUP_REP_INV&v1=11&v2=2013&v3=11&v4=2013&v7=-2&v8=100');

        getParam(html, result, 'traffic_local_in', /Зоновый входящий трафик(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTraffic);
        getParam(html, result, 'traffic_global_out', /Внешний исходящий трафик(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTraffic);
        getParam(html, result, 'traffic_global_in', /Внешний входящий трафик(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTraffic);
        getParam(html, result, 'traffic_included', /Входящий безлимитный трафик \(прочий\)(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTraffic);
        getParam(html, result, 'traffic_kamchatka', /Входящий трафик UnlimCity(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTraffic);
        getParam(html, result, 'traffic_ext_left', /Пакет трафика \(байты\)(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTraffic);
    }
    
    AnyBalance.setResult(result);
}

String.prototype.right = function(num){
    return this.substr(this.length-num,num);
}

function getPeriodParams(begin,end){
    return [
    'n1=p_start_day',	'v1='+('0'+begin.getDate()).right(2),
    'n2=p_start_month',	'v2='+('0'+(begin.getMonth()+1)).right(2),
    'n3=p_start_year',	'v3='+begin.getFullYear(),
    'n4=p_finish_day',	'v4='+('0'+end.getDate()).right(2),
    'n5=p_finish_month','v5='+('0'+(end.getMonth()+1)).right(2),
    'n6=p_finish_year',	'v6='+end.getFullYear(),
    'n7=p_page_num','v7=1',
    'n8=p_row_count','v8=100',
    'n9=p_username',
    'n10=p_logname_detail',	'v10=N',
    ].join('&');
}

function getPeriodMonth(date, monthsago){
    var begin = new Date(date.getFullYear(),date.getMonth()-(monthsago || 0),1); // начало месяца
    var end = new Date(date.getFullYear(),date.getMonth()+1-(monthsago || 0),0); // конец месяца
    return getPeriodParams(begin,end);
}

