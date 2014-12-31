/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Интернет Ростелеком Камчатский филиал
Сайт оператора: http://disly.dsv.ru/kam
Личный кабинет: http://issa.kamchatka.ru/
*/

function main(){
    try{
        oldIssa();
        return;
    }catch(e){
        AnyBalance.trace('Ошибка входа: ' + e.message);
        if(e.message == 'Нет услуги ИССА' || e.message == 'Изменился адрес личного кабинета!')
            newIssa();
        else
			throw e;
    }
}
   
function newIssa(){
    AnyBalance.trace('Попытка войти в новый кабинет...');

    var prefs = AnyBalance.getPreferences();
    var baseurl = 'http://stat.kamchatka.ru/pls/startip/';
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

    var result = {success: true};

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
        var dt = new Date();
        var month = dt.getMonth() + 1;
        var year = dt.getFullYear();

        html = AnyBalance.requestGet(regionurl + 'www.PageViewer?page_name=S*ADM_DIALUP_REP_INV_FULL' + authorization + '&n1=p_start_month&n2=p_start_year&n3=p_finish_month&n4=p_finish_year&n5=p_adm&v6=Y&n7=p_username&n8=p_row_count&n9=p_page_num&v9=1&n10=p_page_go&v10=S*ADM_DIALUP_REP_INV&v1=' + month + '&v2=' + year + '&v3=' + month + '&v4=' + year + '&v7=-2&v8=100');

        getParam(html, result, 'traffic_local_in', /Зоновый входящий трафик(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTraffic);
        getParam(html, result, 'traffic_global_out', /Внешний исходящий трафик(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTraffic);
        getParam(html, result, 'traffic_global_in', /Внешний входящий трафик(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTraffic);
        sumParam(html, result, 'traffic_kamchatka', /Входящий безлимитный трафик \(прочий\)(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
        sumParam(html, result, 'traffic_kamchatka', /Входящий трафик UnlimCity(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
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

function oldIssa(){
    AnyBalance.trace('Попытка войти в старый кабинет...');

    var prefs = AnyBalance.getPreferences();
    var baseurl = 'http://issa.kamchatka.ru/cgi-bin/cgi.exe?';

    // Заходим на главную страницу
    var html = AnyBalance.requestPost(baseurl + "function=is_login", {
        Lang: 2,
    	mobnum: prefs.login,
        Password: prefs.password
    });

	if(/Внимание, изменился адрес личного кабинета услуги[^<]+Домашний интернет/i.test(html)) {
		throw new AnyBalance.Error('Изменился адрес личного кабинета!');
	}

	if(/В настоящее время система на профилактике/i.test(html))
		throw new AnyBalance.Error('В настоящее время система на профилактике!');
	
    var error = getParam(html, null, null, /<td class=error>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    if(error)
        throw new AnyBalance.Error(error);
		
    var result = {success: true};
    
    html = AnyBalance.requestGet(baseurl + "function=is_account");

    if(!/\?function=is_exit/i.test(html)){
        throw new AnyBalance.Error("Не удалось зайти в личный кабинет. Проблемы на сайте или сайт изменен.");
    }
    var $html = $(html);
    var $tableInfo = $html.find('table.ystyle:has(img[src*="images/issa/person.gif"])');
    AnyBalance.trace("Found info table: " + $tableInfo.length);
    
    if(AnyBalance.isAvailable('username')){
	var val = $tableInfo.find('td:has(img[src*="images/issa/person.gif"])').next().find('b').text();
	if(val)
        	result.username = $.trim(val);
    }
    if(AnyBalance.isAvailable('agreement'))
        result.agreement = $.trim($tableInfo.find('td:has(img[src*="images/issa/account.gif"])').next().find('b').text());
    
    result.__tariff = $.trim($tableInfo.find('td:has(img[src*="images/issa/tariff.gif"])').next().find('b').text());
    
    var $tableBalance = $html.find('p:contains("Информация о лицевом счете")').next();
    AnyBalance.trace("Found balance table: " + $tableBalance.length);
    
    if(AnyBalance.isAvailable('balance')){
        var val = $tableBalance.find('td:contains("Актуальный баланс")').next().text();
        getParam(val, result, 'balance', null, null, parseBalance);
    }
    
    if(AnyBalance.isAvailable('average_speed')){
        var val = $tableBalance.find('td:contains("Средняя скорость расходования средств по лицевому счету в день")').next().text();
        AnyBalance.trace("Speed: " + val);
        getParam(val, result, 'average_speed', null, null, parseBalance);
    }

    if(AnyBalance.isAvailable('time_off')){
        var val = $tableBalance.find('td:contains("Предположительная дата отключения без поступления средств менее")').next().text();
        AnyBalance.trace("Time off: " + val);
        getParam(val, result, 'time_off', null, null, parseBalance);
    }

    var $tableCounters = $html.find('table.ystyle:contains("Название аккумулятора")');
    AnyBalance.trace("Found counters table: " + $tableCounters.length);
    
    $tableCounters.find('tr').each(function(index){
        var str = $('td:nth-child(2)', this).text();
        if(!str)
            return;
        
        //Входящий локальный трафик
        var val = $('td:nth-child(3)', this).text();
        if(matches = str.match(/Входящий локальный трафик/i)){
            getParam(val, result, 'traffic_local_in', null, null, parseTraffic);
        }else if(matches = str.match(/Исходящий внешний трафик/i)){
            getParam(val, result, 'traffic_global_out', null, null, parseTraffic);
        }else if(matches = str.match(/Входящий внешний трафик/i)){
            getParam(val, result, 'traffic_global_in', null, null, parseTraffic);
        }else if(matches = str.match(/Трафик входящий в абонплату/i)){
            getParam(val, result, 'traffic_included', null, null, parseTraffic);
        }else if(matches = str.match(/Безлимитная Камчатка/i)){
            getParam(val, result, 'traffic_kamchatka', null, null, parseTraffic);
        }else if(matches = str.match(/Доп. пакет внеш. трафика \((\d+)\s*Мб\)/i)){
            var used = parseTraffic(val);
            var total = parseTraffic(matches[1]);
            sumParam(matches[1], result, 'traffic_ext_total', /([\s\S]*)/, null, parseTraffic);
            sumParam(val, result, 'traffic_1000', /([\s\S]*)/, null, parseTraffic);
            sumParam('' + (total - used), result, 'traffic_ext_left', /([\s\S]*)/, null, parseTraffic);
        }
    });

    if(AnyBalance.isAvailable('traffic_night_out', 'traffic_night_in')){
        html = AnyBalance.requestGet(baseurl + 'function=is_lastcalls&action=report');
        $html = $(html);
        var now = new Date(), monthBegin = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        $html.find('table.ystyle').find('tr').each(function(index){
            var str = $('td:nth-child(2)', this).text();
            if(!/Ночной безлимит/i.test(str))
                return;
            
            var name;
            if(/Исходящий внешний трафик/i.test(str) && AnyBalance.isAvailable('traffic_night_out'))
                name = 'traffic_night_out';
            if(/Входящий внешний трафик/i.test(str) && AnyBalance.isAvailable('traffic_night_in'))
                name = 'traffic_night_in';
            if(!name)
                return;

            var date = parseDate($('td:nth-child(1)', this).text());
            if(!date || date < monthBegin)
                return;
            
            var val = getParam($('td:nth-child(3)', this).text(), null, null, null, null, parseBalance) || 0;
            result[name] = (typeof(result[name]) == 'undefined' ? 0 : result[name]) + val;
        });

        if(result.traffic_night_out) result.traffic_night_out = Math.round(result.traffic_night_out*100)/100;
        if(result.traffic_night_in) result.traffic_night_in = Math.round(result.traffic_night_in*100)/100;
   }
    
    AnyBalance.setResult(result);
}