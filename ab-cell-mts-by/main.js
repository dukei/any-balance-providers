/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у сотового оператора МТС (Белоруссия). Вход через PDA-версию.
Вдохновение почерпано у http://mtsoft.ru

Сайт оператора: http://mts.by/
Личный кабинет: https://ip.mts.by/SELFCAREPDA/
*/

var g_baseurlOrdinary = 'https://ihelper.mts.by/SelfCare/';

var g_headers = {
    Accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Cache-Control':'max-age=0',
    Connection:'keep-alive',
    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.60 Safari/537.1'
};

function getViewState(html){
    return getParam(html, null, null, /name="__VIEWSTATE".*?value="([^"]*)"/);
}

function mainOrdinary(){
    var prefs = AnyBalance.getPreferences();
    var retVals = {};
    var html = enterOrdinary();
    fetchOrdinary(html);
}

function fetchOrdinary(html){
    var prefs = AnyBalance.getPreferences();
    var result = {success: true};
    var baseurl = g_baseurlOrdinary;

    if(prefs.phone && prefs.phone != prefs.login){
        AnyBalance.trace('Требуется другой номер. Пытаемся переключиться...');
        html = AnyBalance.requestGet(baseurl + "my-phone-numbers.aspx", g_headers);
        html = AnyBalance.requestPost(baseurl + "my-phone-numbers.aspx", {
            ctl00_sm_HiddenField:'',
            __EVENTTARGET:'ctl00$MainContent$transitionLink',
            __EVENTARGUMENT:'375' + prefs.phone,
            __VIEWSTATE: getViewState(html)
        }, g_headers);
        if(!html)
	    throw new AnyBalance.Error(prefs.phone + ": номер, возможно, неправильный или у вас нет к нему доступа"); 
        var error = getParam(html, null, null, /(<h1>Мои номера<\/h1>)/i);
        if(error)
	    throw new AnyBalance.Error(prefs.phone + ": номер, возможно, неправильный или у вас нет к нему доступа"); 
    }
	AnyBalance.trace('Пытаемся выяснить почему нет баланса?...');
	AnyBalance.trace(html);
    // Тарифный план
    getParam(html, result, '__tariff', /Тарифный план.*?>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);

    // Баланс
    getParam (html, result, 'balance', /<span[^>]*id="customer-info-balance[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);

    // Телефон
    getParam (html, result, 'phone', /Номер:.*?>([^<]*)</i, replaceTagsAndSpaces, html_entity_decode);

    if (isAvailableStatus()) {

        AnyBalance.trace("Fetching status...");

        if(!/<h1>Состояние сч[её]та<\/h1>/i.test(html)){
            AnyBalance.trace('Не нашли заголовка "состояние счета". Заходим на account-status.aspx');
            html = AnyBalance.requestGet(baseurl + "account-status.aspx", g_headers);
        }

        fetchAccountStatus(html, result);
    }

    if(AnyBalance.isAvailable('bonus')){
        html = AnyBalance.requestGet(baseurl + "bonus.aspx", g_headers);
        getParam(html, result, 'bonus', /Ваш бонусный счёт:([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    }

    if (AnyBalance.isAvailable ('monthlypay')) {

        AnyBalance.trace("Fetching abon info...");

        html = AnyBalance.requestGet (baseurl + 'tariff-change.aspx');

        AnyBalance.trace("Parsing abon info...");

        var abonhtml = getParam(html, null, null, /<div[^>]+ctl00_AboveMainContent_LegalInformation[^>]*>([\s\S]*?)<\/div>/i);
        if(abonhtml)
          // Ежемесячная плата
          getParam (abonhtml, result, 'monthlypay', /(?:Ежемесячная плата|Абонентская плата:)([\s\S]*)/i, replaceTagsAndSpaces, parseBalance);
    }



    AnyBalance.setResult(result);
}

function isInOrdinary(html){
    return /logoff.aspx/i.test(html); 
}

function enterOrdinary(){
    AnyBalance.trace("Entering ordinary internet helper...");
    
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = g_baseurlOrdinary;

    AnyBalance.trace("Trying to enter selfcare at address: " + baseurl);
    var html = AnyBalance.requestPost(baseurl + 'logon.aspx', {
            phoneNumber: '375' + prefs.login,
            password: prefs.password,
            submit: 'Go'
    }, g_headers);
    
    if(!isInOrdinary(html)){
        //Не вошли. Надо сначала попытаться выдать вразумительную ошибку, а только потом уже сдаться

        var error = getParam(html, null, null, /<div class="b_error">([\s\S]*?)<\/div>/, replaceTagsAndSpaces);
        if (error){
            throw new AnyBalance.Error(error);
        }
        
        var regexp=/<title>Произошла ошибка<\/title>/;
        if(regexp.exec(html)){
            throw new AnyBalance.Error("Обычный интернет-помощник временно недоступен." + (prefs.region == 'auto' ? ' Попробуйте установить ваш Регион вручную в настройках провайдера.' : ''));
        }
        
        var error = getParam(html, null, null, /<h1>\s*Ошибка\s*<\/h1>\s*<p>(.*?)<\/p>/i);
        if(error){
            throw new AnyBalance.Error(error);
        }
    
        AnyBalance.trace("Have not found logOff... Unknown other error. Please contact author.");
        AnyBalance.trace(html);
        throw new AnyBalance.Error("Не удаётся войти в обычный интернет помощник. Возможно, проблемы на сайте.");
    }

    AnyBalance.trace("It looks like we are in selfcare (found logOff)...");

    return html;
}

function mainMobile(allowRetry){
    try{
        var prefs = AnyBalance.getPreferences();
        
        if(prefs.phone && !/^\d+$/.test(prefs.phone)){
		throw new AnyBalance.Error('В качестве номера необходимо ввести 9 цифр номера, например, 251234567, или не вводить ничего, чтобы получить информацию по основному номеру.', false);
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
		throw new AnyBalance.Error(prefs.phone + ": номер, возможно, неправильный или у вас нет к нему доступа", false); 
	var error = getParam(html, null, null, /<ul class="operation-results-error">([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
	if(error)
		throw new AnyBalance.Error(prefs.phone + ": " + error, allowRetry); 
        }
        
        var regexp=/<ul class="operation-results-error"><li>(.*?)<\/li>/;
        if (res=regexp.exec(html)){
            throw new AnyBalance.Error(res[1], allowRetry);
        }
        
        regexp=/<title>Произошла ошибка<\/title>/;
        if(regexp.exec(html)){
            throw new AnyBalance.Error("Интернет-помощник временно недоступен", allowRetry);
        }
        
        
        var result = {success: true};
        
        regexp = /Security\.mvc\/LogOff/;
        if(regexp.exec(html))
        	AnyBalance.trace("It looks like we are in selfcare (found logOff)...");
        else{
            var error = getParam(html, null, null, /<h1>\s*Ошибка\s*<\/h1>\s*<p>(.*?)<\/p>/i);
            if(error){
                throw new AnyBalance.Error(error, allowRetry);
            }
        	AnyBalance.trace("Have not found logOff... Wrong login and password or other error. Please contact author.");
            throw new AnyBalance.Error('Не удалось войти в интернет-помощник. Проблемы на сайте или сайт изменен.', allowRetry);
        }
        
        // Тарифный план
        regexp=/Тарифный план.*?>(.*?)</;
        if (res=regexp.exec(html)){
            result.__tariff=res[1];
        }
		AnyBalance.trace('Пытаемся выяснить почему нет баланса?...');
		AnyBalance.trace(html);
        // Баланс
        getParam (html, result, 'balance', /Баланс.*?>([-\d\.,\s]+)/, replaceTagsAndSpaces, parseBalance);
        // Телефон
        getParam (html, result, 'phone', /Ваш телефон:.*?>([^<]*)</i, replaceTagsAndSpaces, html_entity_decode);
        
        if (isAvailableStatus()) {
        
            AnyBalance.trace("Fetching status...");
        
            html = AnyBalance.requestGet(baseurl + "Account.mvc/Status");
        
            fetchAccountStatus(html, result);
        }

    /*  Тормозит и не работает
        if (AnyBalance.isAvailable ('usedinprevmonth')) {
    
            AnyBalance.trace("Fetching history...");
    
            html = AnyBalance.requestPost (baseurl + 'Account.mvc/History', {periodIndex: 0});
    
            AnyBalance.trace("Parsing history...");
    
            // Расход за прошлый месяц
            getParam (html, result, 'usedinprevmonth', /За период израсходовано .*?([\d\.,]+)/i, replaceTagsAndSpaces, parseBalance);
        }
    */
        
        if (AnyBalance.isAvailable ('monthlypay')) {
    
            AnyBalance.trace("Fetching abon info...");
    
            html = AnyBalance.requestGet (baseurl + 'TariffChange.mvc');
    
            AnyBalance.trace("Parsing abon info...");
    
            // Ежемесячная плата
            getParam (html, result, 'monthlypay', /(?:Ежемесячная плата|Абонентская плата:)[^\d]*([\d\.,]+)/i, replaceTagsAndSpaces, parseBalance);
        }
    
        AnyBalance.setResult(result);
    }catch(e){
        //Если не установлено требование другой попытки, устанавливаем его в переданное в функцию значение
        if(!isset(e.allow_retry))
            e.allow_retry = allowRetry;
        throw e; 
    }

}

function isAvailableStatus(){
    return AnyBalance.isAvailable ('min_left','min_local','min_love','sms_left','mms_left','traffic_left',
        'license','statuslock','credit','usedinthismonth', 'bonus_balance', 'min_left_mts', 'min_used_mts', 'min_used', 'debt',
        'pay_till');
}

function fetchAccountStatus(html, result){
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

    // Компания: 63,4 мин. до
    html = sumParam (html, result, 'min_left', /:\s*([\d\.,]+)\s*мин\.?\s+до/ig, replaceTagsAndSpaces, parseBalance, true, aggregate_sum);

    // Использовано: 0 минут местных и мобильных вызовов.
    html = sumParam (html, result, 'min_local', /Использовано:\s*([\d\.,]+).*?мин[^\s]* местных/ig, replaceTagsAndSpaces, parseBalance, true, aggregate_sum);

    // Использовано: 0 минут на любимые номера
    html = sumParam (html, result, 'min_love', /Использовано:\s*([\d\.,]+).*?мин[^\s]* на любимые/ig, replaceTagsAndSpaces, parseBalance, true, aggregate_sum);

    // Остаток СМС
    getParam (html, result, 'sms_left', /(?:Осталось|Остаток)[^\d]*(\d*).*?(sms|смс)/i, [], parseBalance);

    // Остаток ММС
    getParam (html, result, 'mms_left', /(?:Осталось|Остаток)[^\d]*(\d*).*?(mms|ммс)/i, [], parseBalance);

    // Накоплено 54 мин. в текущем месяце
    getParam (html, result, 'min_used', /Накоплено.*?(\d+).*?мин[^\s]*/, replaceFloat, parseBalance);

    // Сумма по неоплаченным счетам: 786.02 руб. (оплатить до 24.03.2012)
    getParam (html, result, 'debt', /Сумма по неоплаченным счетам.*?([-\d\.,]+)/i, replaceFloat, parseBalance);

    // Сумма по неоплаченным счетам: 786.02 руб. (оплатить до 24.03.2012)
    getParam (html, result, 'pay_till', /оплатить до.*?([\d\.,\/]+)/i, replaceFloat, parseDate);
    
    //Для обычного помощника чуть по другому долг получать
    getParam (html, result, 'debt', /оплатить до(?:[\s\S](?!<\/td>))*?<strong[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	// Ночной трафик
	html = sumParam (html, result, 'traffic_night', /Интернет\s*ночной:([\s\S]*?(?:[Мkmgкмг][Ббb]|байт|byte))/ig, replaceTagsAndSpaces, parseTraffic, true, aggregate_sum);	
	
    // Остаток трафика (для впн надо в любом случае получать, иначе может наложиться на обычный трафик)
    html = sumParam (html, result, ['traffic_left_vpn', 'traffic_left'], /VPN Counter[^<]*?:[^<]*?(\d+[,.]?\d*\s*([kmgкмг][бb]|байт|byte))/ig, replaceTagsAndSpaces, parseTraffic, true, aggregate_sum);

    html = sumParam (html, result, 'traffic_left', /(?:Осталось|Остаток)[^<]*?(\d+[.,]?\d*\s*([kmgкмг][бb]|байт|byte))/ig, replaceTagsAndSpaces, parseTraffic, true, aggregate_sum);
    html = sumParam (html, result, 'traffic_left', /:[^<]*?(\d+[,.]?\d*\s*([kmgкмг][бb]|байт|byte))/ig, replaceTagsAndSpaces, parseTraffic, true, aggregate_sum);

    // Лицевой счет
    getParam (html, result, 'license', /№ ([^<]*?)(?:<|:)/, replaceTagsAndSpaces, html_entity_decode);

    // Блокировка
    getParam (html, result, 'statuslock', /class="account-status-lock".*>(Номер [^<]*)</i, replaceTagsAndSpaces, html_entity_decode);

    // Сумма кредитного лимита
    getParam (html, result, 'credit', /(?:Сумма кредитного лимита|Кредитный лимит)[\s\S]*?(-?\d+[\d\.,]*)/i, replaceTagsAndSpaces, parseBalance);

    // Расход за этот месяц
    getParam (html, result, 'usedinthismonth', /Израсходовано по номеру[^<]*?(?:<strong>|:)([\s\S]*?)(?:<\/strong>|<\/p>|<\/td>)/i, replaceTagsAndSpaces, parseBalance);
}

function main(){
    var prefs = AnyBalance.getPreferences();
    if(prefs.phone && !/^\d+$/.test(prefs.phone)){
		throw new AnyBalance.Error('В качестве номера необходимо ввести 9 цифр номера, например, 291234567, или не вводить ничего, чтобы получить информацию по основному номеру.');
    }
	
	checkEmpty(prefs.login, 'Введите телефон (логин)!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    if(prefs.type == 'mobile'){
        mainMobile();
    }else if(prefs.type == 'ordinary'){
        mainOrdinary();
    }else{
        try{
           if(!AnyBalance.isAvailable('bonus')){
                //Мобильный помощник, только если не нужны бонусные баллы
				mainMobile(true);
				return;
           }else{
                AnyBalance.trace('Требуются бонусные баллы, мобильный помощник не подходит...');
           }
        }catch(e){
           if(!e.allow_retry)
               throw e;
           AnyBalance.trace('С мобильным помощником проблема: ' + e.message + " Пробуем обычный...");
        }
        mainOrdinary();
    }
}