/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у сотового оператора МТС (Белоруссия). Вход через PDA-версию.
Вдохновение почерпано у http://mtsoft.ru

Сайт оператора: http://mts.by/
Личный кабинет: https://ip.mts.by/SELFCAREPDA/
*/

function main(){
    var prefs = AnyBalance.getPreferences();

    if(prefs.phone && !/^\d+$/.test(prefs.phone)){
	throw new AnyBalance.Error('В качестве номера необходимо ввести 9 цифр номера, например, 251234567, или не вводить ничего, чтобы получить информацию по основному номеру.');
    }

    var baseurl = 'https://ihelper.mts.by/SelfCarePda/';

    AnyBalance.trace("Trying to enter selfcare at address: " + baseurl);
    var html = AnyBalance.requestPost(baseurl + "Security.mvc/LogOn", {
    	username: prefs.login,
        password: prefs.password
    });
    
    if(prefs.phone && prefs.phone != prefs.login){
        html = AnyBalance.requestGet(baseurl + "MyPhoneNumbers.mvc");
        html = AnyBalance.requestGet(baseurl + "MyPhoneNumbers.mvc/Change?phoneNumber=375"+prefs.phone);
	if(!html)
		throw new AnyBalance.Error(prefs.phone + ": номер, возможно, неправильный или у вас нет к нему доступа"); 
	var error = getParam(html, null, null, /<ul class="operation-results-error">([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
	if(error)
		throw new AnyBalance.Error(prefs.phone + ": " + error); 
    }

    var regexp=/<ul class="operation-results-error"><li>(.*?)<\/li>/;
    if (res=regexp.exec(html)){
        throw new AnyBalance.Error(res[1]);
    }
    
    regexp=/<title>Произошла ошибка<\/title>/;
    if(regexp.exec(html)){
        throw new AnyBalance.Error("Интернет-помощник временно недоступен");
    }


    var result = {success: true};

    regexp = /Security\.mvc\/LogOff/;
    if(regexp.exec(html))
    	AnyBalance.trace("It looks like we are in selfcare (found logOff)...");
    else{
        var error = getParam(html, null, null, /<h1>\s*Ошибка\s*<\/h1>\s*<p>(.*?)<\/p>/i);
        if(error){
            throw new AnyBalance.Error(error);
        }
    	AnyBalance.trace("Have not found logOff... Wrong login and password or other error. Please contact author.");
        throw new AnyBalance.Error('Не удалось войти в интернет-помощник. Проблемы на сайте или сайт изменен.');
    }

    // Тарифный план
    regexp=/Тарифный план.*?>(.*?)</;
    if (res=regexp.exec(html)){
        result.__tariff=res[1];
    }

    // Баланс
    getParam (html, result, 'balance', /Баланс.*?>([-\d\.,\s]+)/, replaceFloat, parseFloat);
    // Телефон
    getParam (html, result, 'phone', /Ваш телефон:.*?>([^<]*)</i, replaceTagsAndSpaces, html_entity_decode);

    if (AnyBalance.isAvailable ('min_left') ||
        AnyBalance.isAvailable ('min_local') ||
        AnyBalance.isAvailable ('min_love') ||
        AnyBalance.isAvailable ('sms_left') ||
        AnyBalance.isAvailable ('mms_left') ||
        AnyBalance.isAvailable ('traffic_left') ||
        AnyBalance.isAvailable ('license') ||
        AnyBalance.isAvailable ('statuslock') ||
        AnyBalance.isAvailable ('credit') ||
        AnyBalance.isAvailable ('usedinthismonth')) {

        AnyBalance.trace("Fetching status...");

        html = AnyBalance.requestGet(baseurl + "Account.mvc/Status");

        AnyBalance.trace("Parsing status...");
    
        // Пакет минут
        html = sumParam (html, result, 'min_left', /Остаток пакета минут:.*?([\d\.,]+)\./ig, replaceTagsAndSpaces, parseBalance, true, aggregate_sum);
    
        // Остаток бонуса
        html = sumParam (html, result, 'min_left', /Остаток бонуса:.*?([\d\.,]+?)\s*мин/ig, replaceTagsAndSpaces, parseBalance, true, aggregate_sum);

        // Остаток минут
        html = sumParam (html, result, 'min_left', /Осталось\s*([\d\.,]+)\s*мин/ig, replaceTagsAndSpaces, parseBalance, true, aggregate_sum);
        
        // Остаток: минут
        html = sumParam (html, result, 'min_left', /Остаток:\s*([\d\.,]+)\s*мин/ig, replaceTagsAndSpaces, parseBalance, true, aggregate_sum);

        // Остаток минут по тарифу "Готовый офис" - 194 минут
        html = sumParam (html, result, 'min_left', /Остаток мин.*?([\d\.,]+)\s*мин/ig, replaceTagsAndSpaces, parseBalance, true, aggregate_sum);

        // Р300 мин: 899.8 мин. до 31.12.9999 23:59:59
        html = sumParam (html, result, 'min_left', /\s+мин:[^<]*?([\d\.,]+)\s*мин/ig, replaceTagsAndSpaces, parseBalance, true, aggregate_sum);

        // Использовано: 0 минут местных и мобильных вызовов.
        html = sumParam (html, result, 'min_local', /Использовано:\s*([\d\.,]+).*?мин[^\s]* местных/ig, replaceTagsAndSpaces, parseBalance, true, aggregate_sum);

        // Использовано: 0 минут на любимые номера
        html = sumParam (html, result, 'min_love', /Использовано:\s*([\d\.,]+).*?мин[^\s]* на любимые/ig, replaceTagsAndSpaces, parseBalance, true, aggregate_sum);

        // Остаток СМС
        getParam (html, result, 'sms_left', /(?:Осталось|Остаток)[^\d]*(\d*).*?(sms|смс)/i, [], parseInt);

        // Остаток ММС
        getParam (html, result, 'mms_left', /(?:Осталось|Остаток)[^\d]*(\d*).*?(mms|ммс)/i, [], parseInt);

        // Накоплено 54 мин. в текущем месяце
        getParam (html, result, 'min_used', /Накоплено.*?(\d+).*?мин[^\s]*/, replaceFloat, parseInt);

        // Сумма по неоплаченным счетам: 786.02 руб. (оплатить до 24.03.2012)
        getParam (html, result, 'debt', /Сумма по неоплаченным счетам.*?([-\d\.,]+)/i, replaceFloat, parseFloat);

        // Сумма по неоплаченным счетам: 786.02 руб. (оплатить до 24.03.2012)
        getParam (html, result, 'pay_till', /оплатить до.*?([\d\.,\/]+)/i, replaceFloat, parseTime);

        // Остаток трафика
        sumParam (html, result, 'traffic_left', /(?:Осталось|Остаток)[^<]*?(\d+[.,]?\d*\s*([kmgкмг][бb]|байт|byte))/i, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
        sumParam (html, result, 'traffic_left', /:[^<]*?(\d+[,.]?\d*\s*([kmgкмг][бb]|байт|byte))/i, replaceTagsAndSpaces, parseTraffic, aggregate_sum);

        // Лицевой счет
        getParam (html, result, 'license', /№ (.*?):/);

        // Блокировка
        getParam (html, result, 'statuslock', /class="account-status-lock".*>(Номер [^<]*)</i);

        // Сумма кредитного лимита
        getParam (html, result, 'credit', /Сумма кредитного лимита.*?([-\d\.,]+)/i, [",", "."], parseFloat);

        // Расход за этот месяц
        getParam (html, result, 'usedinthismonth', /Израсходовано .*?([\d\.,]+).*?руб/i, [",", "."], parseFloat);
    }


    if (AnyBalance.isAvailable ('usedinprevmonth')) {

        AnyBalance.trace("Fetching history...");

        html = AnyBalance.requestPost (baseurl + 'Account.mvc/History', {periodIndex: 0});

        AnyBalance.trace("Parsing history...");

        // Расход за прошлый месяц
        getParam (html, result, 'usedinprevmonth', /За период израсходовано .*?([\d\.,]+)/i, [",", "."], parseFloat);
    }


    if (AnyBalance.isAvailable ('monthlypay')) {

        AnyBalance.trace("Fetching abon info...");

        html = AnyBalance.requestGet (baseurl + 'TariffChange.mvc');

        AnyBalance.trace("Parsing abon info...");

        // Ежемесячная плата
        getParam (html, result, 'monthlypay', /(?:Ежемесячная плата|Абонентская плата:)[^\d]*([\d\.,]+)/i, [",", "."], parseFloat);
    }

    AnyBalance.setResult(result);

}

function parseTime(date){
    AnyBalance.trace("Trying to parse date from " + date);
    var dateParts = date.split(/[\.\/]/);
    var d = new Date(dateParts[2], (dateParts[1] - 1), dateParts[0]);
    return d.getTime();
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

