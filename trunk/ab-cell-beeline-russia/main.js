/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у сотового оператора Билайн (Россия).

Сайт оператора: http://beeline.ru/        
Личный кабинет: https://uslugi.beeline.ru/
*/

var g_currency = {
      ru: "р",
      kz: "〒",
      uz: " сўм"
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurls = {
      ru: "https://uslugi.beeline.ru/",
      kz: "https://uslugi.beeline.kz/",
      uz: "https://uslugi.beeline.uz/"
    };

    if(!prefs.country || !baseurls[prefs.country]){
      AnyBalance.trace("Unknown country: " + prefs.country + ", defaulting to ru");
      prefs.country = 'ru';
    }

    if(prefs.phone && !/\d{10}/.test(prefs.phone))
	throw new AnyBalance.Error('Прикрепленный номер должен содержать 10 цифр или быть пустым, если вы хотите получить информацию по номеру логина');

    var baseurl = baseurls[prefs.country];

    var headers = {
        Accept:	'text/html, application/xhtml+xml, */*',
        Referer: 'https://uslugi.beeline.ru/vip/loginPage.jsp',
        'Accept-Language': 'ru-RU',
	 //Internet Explorer пускает охотнее, как ни странно.
        'User-Agent':	'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; WOW64; Trident/5.0)',
        'Connection':	'Keep-Alive',
        'Cache-Control': 'no-cache'
    };

    var html = AnyBalance.requestGet(baseurl, headers); //Хз, помогает, или нет. Но куку какую-то она ставит. Пусть будет.

    if(/<h1[^>]*>[^<]*Gateway Time-out/i.test(html))
	throw new AnyBalance.Error('Сайт личного кабинета Билайн временно не работает. Пожалуйста, попробуйте позже.');

    var unavailable = getParam(html, null, null, /<font[^>]+color\s*=\s*['"]?#666666[^>]*>\s*(Система временно недоступна[\s\S]*?)<\/font>/i, replaceTagsAndSpaces, html_entity_decode);
    if(unavailable)
        throw new AnyBalance.Error(unavailable);
    if(/РџРѕР¶Р°Р»СѓР№СЃС‚Р°, РїРѕРІС‚РѕСЂРёС‚Рµ РїРѕРїС‹С‚РєСѓ РїРѕР·РґРЅРµРµ/.test(html)){
        //Система временно недоступна на UTF-8. Почему-то заглушка в UTF-8
        throw new AnyBalance.Error('Сайт личного кабинета Билайн временно недоступен. Билайн приносит извинения за временные неудобства.');
    }

    AnyBalance.trace("Trying to enter selfcare at address: " + baseurl);
    var html = AnyBalance.requestPost(baseurl + "loginPage.do", {
        _stateParam:'eCareLocale.currentLocale=ru_RU__Russian',
        _forwardName:'',
        _resetBreadCrumbs:'',
        _expandStatus:'',
        userName:prefs.login,
        password:prefs.password,
        x:31,
        y:12,
        ecareAction:'login'
    }, headers);

    if(!/\/logout.do/i.test(html)){
        var regexp=/<span class="warn">[\s]*([\s\S]*?)[\s]*<\/span>/, res, tmp;
        if (res=regexp.exec(html)){
            //Ошибка какая-то случилась... Может, пароль неправильный
          	throw new AnyBalance.Error(res[1].replace(/<[^<>]+\/?>/g, ''));
        }
        
        if (getParam(html, null, null, /("EcareLoginForm")/i))
            //Ошибка какая-то случилась... Билайн глючит. Надо попробовать ещё раз зайти.
            throw new AnyBalance.Error('Билайн не пускает в кабинет даже без сообщения ошибки. Возможно, проблемы на сайте.', true);

        if(/В целях безопасности предлагаем Вам сменить пароль/i.test(html))
            throw new AnyBalance.Error('Билайн требует сменить пароль. Пожалуйста, зайдите в личный кабинет Билайн (' + baseurl + ') с вашим текущим паролем и выполните инструкции по его смене. После этого введите в настройки этого провайдера новый пароль.');

     	throw new AnyBalance.Error('Не удаётся войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }
    
    var corporate = /<title>[^<>]*Управление профилем[^<>]*<\/title>/i.test(html);
    if(!corporate)
        parsePersonal(baseurl, html);
    else
        parseCorporate(baseurl, html);
}

//Преобразование в число
var alltransformations = [/&nbsp;/g, '', /[\s\xA0]/g, "", ",", ".", /[^\d\-\.]+/g, ''];

function parsePersonal(baseurl, html){
    var result = {success: true};

    if(AnyBalance.isAvailable('balance')){
      result.balance = null; //Баланс должен быть всегда, даже если его не удаётся получить. 
      //Если его не удалось получить, то передаём null, чтобы значение взялось из предыдущего запроса
      if(AnyBalance.isAvailable('balance','bonus_balance','bonus_survey','expences','billsum','billpay','expencesTraffic','expencesAbon','expencesInstant'))
          result.currency = g_currency[AnyBalance.getPreferences().country || 'ru'];
    }

    AnyBalance.trace("It looks like we are in PERSONAL selfcare...");
    
    // ФИО
    getParam (html, result, 'userName', /Владелец договора[\s\S]*?<td[^>]*>(.*?)</);

    // Состояние номера
    getParam (html, result, 'BlockStatus', /Состояние номера[\s\S]*?<td[^>]*>(.*?)</);

    // Номер договора
    getParam (html, result, 'license', /Номер договора[\s\S]*?<td[^>]*>(.*?)</);
    
    // Тарифный план
    getParam (html, result, '__tariff', /Тарифный план:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.trace("Fetching finantial info...");

    html = AnyBalance.requestPost(baseurl + "VIPLoadPrepaidCtnFinancialInfoAction.do", '');

    AnyBalance.trace("Parsing finantial info...");

    // Тарифный план
//    getParam (html, result, '__tariff', /Текущий тарифный план[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/, replaceTagsAndSpaces, html_entity_decode);
    
    parseBalanceList(html, result);

    AnyBalance.setResult(result);
}

function getBalanceValue(html, text, parseFunc, result, counter){
    var regexp = new RegExp(text + '[\\s\\S]*?<td[\\s\\S]*?<td[^>]*>([^<]+)<', 'i');
    return getParam(html, result, counter, regexp, alltransformations, parseFunc);
}

function getBalanceValueExpirationDate(html, text, parseFunc, result, counter){
    var regexp = new RegExp(text + '[\\s\\S]*?<td[\\s\\S]*?<td[\\s\\S]*?<td[^>]*>([^<]+)<', 'i');
    return getParam(html, result, counter, regexp, alltransformations, parseDate);
}

function parseBalanceList(html, result){
    //Уменьшим область поиска для скорости и (надеюсь) для надежности
    var _html = getParam(html, null, null, /'prePaid(?:Ctn)?Balances?List'([\s\S]*?)'prePaid(?:Ctn)?Balances?List'/i);
    if(!_html){
        var error = getParam(html, null, null, /<span[^>]+class="warn"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
        throw new AnyBalance.Error('Не найден список балансов. ' + (error || 'Обратитесь к автору провайдера для исправления.'));
    }
    html = _html;

    // Баланс
    getBalanceValue (html, 'Основной баланс', parseBalance, result, 'balance');
    var curr = getParam(html, null, null, /<td[^>]*>Основной баланс[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    if(AnyBalance.isAvailable('balance','bonus_balance','bonus_survey','expences','billsum','billpay','expencesTraffic','expencesAbon','expencesInstant') && curr && /Доллар|\$/i.test(curr)) //Если в долларах, то надо перезаписать уже инициализированную валюту
        result.currency = '$';
    
    // Бонус-баланс
    if(AnyBalance.isAvailable('bonus_balance')){
      sumParam(html, result, 'bonus_balance', /Бонус-баланс[\s\S]*?<td[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
      //Узбекистан
      sumParam(html, result, 'bonus_balance', /BEE_CLUB[\s\S]*?<td[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    }
    
    // Бонус за опрос
    getBalanceValue (html, 'Бонус за опрос', parseBalance, result, 'bonus_survey');
    
    if(AnyBalance.isAvailable('sms_left')){
      result.sms_left = 0;
      
      // SMS-баланс
      sumParam(html, result, 'sms_left', /SMS-баланс[\s\S]*?<td[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
      // SMS в подарок
      sumParam(html, result, 'sms_left', /SMS в подарок[\s\S]*?<td[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
      // Бесплатные SMS
      sumParam(html, result, 'sms_left', /Бесплатные SMS[\s\S]*?<td[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
      // SMS Бонус  //Узбекистан
      sumParam(html, result, 'sms_left', /SMS Бонус[\s\S]*?<td[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
      // Баланс SMS  //Узбекистан
      sumParam(html, result, 'sms_left', /Баланс SMS[\s\S]*?<td[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
      // Пакет МН SMS  //Узбекистан
      sumParam(html, result, 'sms_left', /Пакет МН SMS[\s\S]*?<td[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
      // Дополнительный SMS баланс  //Узбекистан
      sumParam(html, result, 'sms_left', /Дополнительный SMS баланс[\s\S]*?<td[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    }
	
	if(AnyBalance.isAvailable('sms_expiration')){
	  result.sms_expiration = getBalanceValueExpirationDate (html, 'SMS-баланс');  
    }
    
    // MMS в подарок
    getBalanceValue (html, 'MMS в подарок', parseInt, result, 'mms_left');

    if(AnyBalance.isAvailable('min_left')){
      // Бесплатные секунды
      sumParam(html, result, 'min_left', /Бесплатные секунды(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
      // Время в подарок
      sumParam(html, result, 'min_left', /Время в подарок(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
      // БОНУС_СЕКУНДЫ
      sumParam(html, result, 'min_left', /БОНУС_СЕКУНДЫ(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
      // Бонус секунды //Узбекистан
      sumParam(html, result, 'min_left', /БОНУС СЕКУНДЫ(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
      // Час в подарок //Узбекистан
      sumParam(html, result, 'min_left', /Час в подарок(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
      // Баланс исходящих минут //Узбекистан
      sumParam(html, result, 'min_left', /Баланс исходящих минут(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    }

    if(AnyBalance.isAvailable('min_left_till')){
      // Бесплатные секунды
      sumParam(html, result, 'min_left_till', /Бесплатные секунды(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate, aggregate_min);
      // Время в подарок
      sumParam(html, result, 'min_left_till', /Время в подарок(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate, aggregate_min);
      // БОНУС_СЕКУНДЫ
      sumParam(html, result, 'min_left_till', /БОНУС_СЕКУНДЫ(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate, aggregate_min);
      // Бонус секунды //Узбекистан
      sumParam(html, result, 'min_left_till', /БОНУС СЕКУНДЫ(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate, aggregate_min);
      // Час в подарок //Узбекистан
      sumParam(html, result, 'min_left_till', /Час в подарок(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate, aggregate_min);
      // Баланс исходящих минут //Узбекистан
      sumParam(html, result, 'min_left_till', /Баланс исходящих минут(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate, aggregate_min);
    }

    if(AnyBalance.isAvailable('traffic')){
         //Интернет-пакет - счетчик из казахстанского ЛK
        var val = getBalanceValue(html, 'Интернет-пакет', parseBalance);
        if(val)
            result.traffic = (result.traffic || 0) + val/1024;

        //Интернет баланс - добавлен позже, видимо из другого ЛК
        var val = getBalanceValue(html, 'Интернет баланс', parseBalance);
        if(val)
            result.traffic = (result.traffic || 0) + val/1024;
          
        //Для узбекистана актуально
        var val = getBalanceValue(html, 'GPRS_PACK', parseBalance);
        if(val)
            result.traffic = (result.traffic || 0) + val/1024;

        if(result.traffic)
            result.traffic = Math.round(result.traffic*100)/100;
    }
}

function parseMinutes(str){
    return parseBalance(str)*60; //Переводим в секунды
}

//Билайн показывает старый расчетый период.
//Надо сделать новый, это ближайшее прошедшее число месяца
function parsePeriod(str){
    var time = parseDate(str);
    if(!time)
      return 0;

    var now = new Date();
    var endDay = new Date(time).getDate(); //Число конца прошлого периода
    var startDate = new Date(time + 86400*1000); //Число начала текущего периода
    var day = startDate.getDate();
    var curStart = new Date(now.getFullYear(), now.getMonth(), day);
    //Если перешли через границу месяца, то надо на первое число сбросить
    if(curStart.getDate() < endDay) surStart = new Date(now.getFullYear(), now.getMonth(), 1);
    if(curStart > now) //Если перепрыгнули текущую дату, откатываемся на месяц назад
        curStart = new Date(now.getFullYear(), now.getMonth()-1, day);
    //Если снова перешли через границу месяца, то надо на первое число сбросить
    if(curStart.getDate() < endDay) surStart = new Date(now.getFullYear(), now.getMonth(), day);

    AnyBalance.trace("Computing period start from last period end: " + curStart + ' from ' + str);
    return curStart.getTime();
}

function getStateParam(html){
   return getParam(html, null, null, /<form name="ecareSubmitForm"[\s\S]*?name="_stateParam" value="([^"]*)"/i);
}

function getPhone(html){
    return getParam(html, null, null, /<input[^>]*name=["']subscriberNumber["'][^>]*value=["']([^'"]*)["']/i) ||
    	getParam(html, null, null, /subscriberListExt=CellClick=viewLinkStr=(\d+)/i);
}

function addParamsFromStr(params, str){
    if(!str)
        return params;
    var pairs = str.split(/&/ig);
    for(var i=0; i<pairs.length; ++i){
        var pos = pairs[i].indexOf('=');
        if(pos >= 0)
            params[pairs[i].substr(0, pos)] = pairs[i].substr(pos + 1);
        else
            params[pairs[i]] = '';
    }
    return params;
}

function ensureItemHierarchyIsSelected(baseurl, curdoc, html){
    //Проверим, выбрана ли сейчас группа счетов, или папка
    var tr = getParam(html, null, null, /(<tr[^>]*>(?:[\s\S](?!<tr))*<td[^>]+class=['"]?tis["']?[^>]*>[\s\S]*?<\/tr>)/i);
    if(!tr)
        AnyBalance.trace('Не удаётся найти выбранный уровень иерархии...');
    if(tr){
        if(!/15\/item\.gif/i.test(tr)){
            AnyBalance.trace('Текущий уровень иерархии - не группа счетов. Надо найти группу счетов.');
            var trClosed, tries = 0;
            do{
                if(++tries > 5){
                    AnyBalance.trace('Сделано слишком много итераций ' + tries + ': оставляем как есть');
                    break;
                }
                tr = getParam(html, null, null, /(<tr[^>]*>(?:[\s\S](?!<tr))*15\/item\.gif[\s\S]*?<\/tr>)/i);
                trClosed = getParam(html, null, null, /(<tr[^>]*>(?:[\s\S](?!<tr))*15\/folderClosed\.gif[\s\S]*?<\/tr>)/i);
                if(tr){
                    AnyBalance.trace('Переходим в группу счетов ' + getParam(tr, null, null, /(.*)/, replaceTagsAndSpaces));
                    var product_params = getParam(tr, null, null, /hierarchyTreeAction.do\?([^'"]*Drilldown[^'"]*)/i);
                    var xHierarchy = getParam(tr, null, null, /doTreeSubmit\s*\(\s*'([^']*)/i);
                    var params = {
                        _stateParam:getStateParam(html),
                        _forwardName:'',
                        _resetBreadCrumbs:true,
                        _expandStatus:'',
                    };
                    addParamsFromStr(params, product_params);
                    params[xHierarchy] = params.products_param;
                    html = AnyBalance.requestPost(baseurl + "hierarchyTreeAction.do", params);
                }else if(trClosed){
                    AnyBalance.trace('Найден закрытый фолдер ' + getParam(trClosed, null, null, /(.*)/, replaceTagsAndSpaces) + '. Открываем...');
                    var prevParams = getParam(html, null, null, /prevRequestParameters\s*=\s*'([^']*)/i);
                    var product_params = getParam(trClosed, null, null, /hierarchyTreeAction.do\?([^'"]*Expand[^'"]*)/i);
                    if(!product_params)
                        throw new AnyBalance.Error('Не найдены параметры для открытия фолдера!');
                    var params = {};
                    addParamsFromStr(params, prevParams);
                    addParamsFromStr(params, product_params);
                    html = AnyBalance.requestPost(baseurl + curdoc, params);
                }else{
                    AnyBalance.trace('Не удалось найти ни одной группы счетов, оставляем как есть...');
                }
            }while(trClosed);
        }else{
            AnyBalance.trace('Отлично, уже выбрана группа счетов ' + getParam(tr, null, null, /(.*)/i, replaceTagsAndSpaces));
        }
    }
    //На этом этапе должано быть выбрана уже группа счетов
    return html;
}

function parseCorporate(baseurl, html){
    var result = {success: true};

    if(AnyBalance.isAvailable('balance')){
      result.balance = null; //Баланс должен быть всегда, даже если его не удаётся получить. 
      //Если его не удалось получить, то передаём null, чтобы значение взялось из предыдущего запроса
      if(AnyBalance.isAvailable('balance','bonus_balance','bonus_survey','expences','billsum','billpay','expencesTraffic','expencesAbon','expencesInstant'))
          result.currency = g_currency[AnyBalance.getPreferences().country || 'ru'];
    }

    AnyBalance.trace("It looks like we are in CORPORATE selfcare...");
    
    // ФИО
    getParam (html, result, 'userName', /Название Договора[\s\S]*?<td[^>]*>\s*(.*?)\s*</, null, html_entity_decode);

    // Номер договора
    getParam (html, result, 'license', /Номер Договора[\s\S]*?<td[^>]*>\s*(.*?)\s*</, null, html_entity_decode);

    // 	Дата окончания расчетного периода:
    getParam (html, result, 'period_till', /Дата окончания расчетного периода:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);


    AnyBalance.trace("Fetching number info...");
    
    //Меню "пользователи"
    html = AnyBalance.requestPost(baseurl + "OnLoadSubscriberProfileFilterAction.do", {
        _stateParam:getStateParam(html),
        _expandStatus:'',
        '_navigation_thirdMenu':'services.profileManagement.subscribers',
        resetBreadCrumbs:'true'
    });

    var phone = AnyBalance.getPreferences().phone || getPhone(html) || AnyBalance.getPreferences().login;
    
    var rTariff = new RegExp("<td>"+phone+"\\s*</td><td>.*?</td><td>(.*?)</td><td>.*?</td><td>.*?</td><td>(?:.*?)</td>");
    var rStatus = new RegExp("<td>"+phone+"\\s*</td><td>.*?</td><td>(?:.*?)</td><td>.*?</td><td>.*?</td><td>(.*?)</td>");

    // Тарифный план
    getParam (html, result, '__tariff', rTariff, [/&nbsp;/g, ' ' , /^\s+|\s+$/g, ''], html_entity_decode);

    // Состояние номера
    getParam (html, result, 'BlockStatus', rStatus, [/&nbsp;/g, ' ' , /^\s+|\s+$/g, '']);
    
    var stateParam = getStateParam(html);

    //А теперь давайте получим это более надёжно
    html = AnyBalance.requestPost(baseurl + "SubscriberProfileFilterSwitchingAction.do", {
        _stateParam:stateParam,
        _forwardName:'',
        _resetBreadCrumbs:'',
        _expandStatus:'',
        'status.code':'G',
        subscriberNumber:phone,
        pricePlan:'',
        subscriberListExtExportVar:'',
        ctrla:'subscriberListExt=CellClick=viewLinkStr='+phone+' '
    });

    // Тарифный план
    getParam (html, result, '__tariff', /Название тарифного плана[\s\S]*?<td[^>]*>\s*(?:<a[^>]*>.*?<\/a>)[\s\-]*([\s\S]*?)\s*</, [/&nbsp;/g, ' ' , /^\s+|\s+$/g, ''], html_entity_decode);

    // Состояние номера
    getParam (html, result, 'BlockStatus', /Статус номера[\s\S]*?<td[^>]*>([\s\S]*?)</, [/&nbsp;/g, ' ' , /^\s+|\s+$/g, '']);
    
    if(/'prePaid(?:Ctn)?Balances?List'/i.test(html)){
      AnyBalance.trace("Balance list found!");
      parseBalanceList(html, result); //в корпоративных предоплаченных тарифных планах похоже на персональные
    }else{
      AnyBalance.trace("Balance list not found, is it credit tariff plan?");
    }

    //Ссылка на финансовую информацию, похоже, только в кредитных корпоративных тарифных планах
    if(/'_navigation_primaryMenu=billing'/.test(html)){
      AnyBalance.trace("Found financial info link, trying to fetch balance and expences");

      if(AnyBalance.isAvailable('balance', 'period_begin')){
        AnyBalance.trace("Fetching balance and period info...");

        // Финансовая информация - платежи
        html = AnyBalance.requestPost(baseurl + "navigateMenu.do", {
          _stateParam: getStateParam(html),
          _navigation_secondaryMenu:'billing.payment',
          _resetBreadCrumbs:true
        });

        html = ensureItemHierarchyIsSelected(baseurl, "navigateMenu.do", html);

        // Баланс
        getParam (html, result, 'balance', /Текущий баланс[\s\S]*?<td[^>]*>\s*([\s\S]*?)\s*</i, alltransformations, parseBalance);
        // Начало расчетного периода
        getParam (html, result, 'period_begin', /<select[^>]*name="dateList\.code"[^>]*>\s*<option[^>]*>([^<]*)/i, null, parsePeriod);
      }

      if(AnyBalance.isAvailable('billsum', 'billpay', 'billpaytill')){
        AnyBalance.trace("Fetching bills info...");

        // Финансовая информация - счета
        html = AnyBalance.requestPost(baseurl + "navigateMenu.do", {
          _stateParam: getStateParam(html),
          _expandStatus:'',
          _navigation_secondaryMenu:'billing.benLevelBills',
          _resetBreadCrumbs:true
        });

        html = ensureItemHierarchyIsSelected(baseurl, "navigateMenu.do", html);

        getParam (html, result, 'billpaytill', /Оплатить до:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
        getParam (html, result, 'billsum', /Всего по счету:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam (html, result, 'billpay', /Всего к оплате:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
      }

      if(AnyBalance.isAvailable('expences','expencesTraffic','expencesAbon','expencesInstant')){
        AnyBalance.trace("Fetching current period calls for expences...");
        // Финансовая информация - звонки текущего периода
        html = AnyBalance.requestPost(baseurl + "navigateMenu.do", {
          _stateParam: getStateParam(html),
          _navigation_secondaryMenu:'billing.unbilledCalls',
          _resetBreadCrumbs:true
        });

        html = ensureItemHierarchyIsSelected(baseurl, "navigateMenu.do", html);

        //Возьмем все номера
        var phones = [];
        html.replace(/<input[^>]+value=['"]([^'"]*)[^>]*name=["']ctrlvcol%3Dradio%3Bctrl%3DsubscriberListExt%3Btype%3Drd["']/ig, function(str, num){
            if(num){
                if(phones.length < 10){
                    phones[phones.length] = num;
                }else{
                    AnyBalance.trace('Пропускаем номер телефона ' + num + ', потому что номеров больше 10...');
                }
            }
        });
        AnyBalance.trace('Попытаемся получить начисления для телефонов: ' + phones.join(', '));

        for(var j=0; j<phones.length; ++j){
            for(var i=0; i<3; i++){
                var num = phones[j];
                // Финансовая информация - звонки текущего периода - Начисления
                AnyBalance.trace("Fetching expences info (" + (i+1) + "/3)...");
                html = AnyBalance.requestPost(baseurl + "VIPUnbilledSubscribersSwitchingAction.do", {
                  _stateParam: getStateParam(html),
                  _forwardName:'unbilledCharge',
                  _resetBreadCrumbs:true,
                  "ctrlvcol%3Dradio%3Bctrl%3DsubscriberListExt%3Btype%3Drd":num
                });
            
                var error = getParam(html, null, null, /<LI[^>]*class="errorMessage"[^>]*>([\S\s]*?)<\/LI>/i, replaceTagsAndSpaces, html_entity_decode);
                // Тут иногда выдаёт <LI class="errorMessage">Обслуживание в настоящее время невозможно. Повторите, пожалуйста, запрос позже.</LI>
                if(!error)
                    break;
                AnyBalance.trace("Ошибка получения расходов: " + error)
            }
            
            AnyBalance.trace("Получаем расходы для номера: " + num)
            // Сколько использовано
            sumParam (html, result, 'expences', /Общая сумма начислений[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
            sumParam (html, result, 'expencesTraffic', /Начисления за трафик[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
            sumParam (html, result, 'expencesAbon', /Абонентская плата[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
            sumParam (html, result, 'expencesInstant', /Разовые начисления[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
        }
          
      }

      if(AnyBalance.isAvailable('sms_left', 'min_left')){
          AnyBalance.trace("Fetching current period calls for minutes...");
          // Финансовая информация - звонки текущего периода
          html = AnyBalance.requestPost(baseurl + "navigateMenu.do", {
            _stateParam: getStateParam(html),
            _navigation_secondaryMenu:'billing.unbilledCalls',
            _resetBreadCrumbs:true
          });
          
          html = ensureItemHierarchyIsSelected(baseurl, "navigateMenu.do", html);
          
          // Финансовая информация - звонки текущего периода - включенные минуты
          var stateParam = getStateParam(html);
          html = AnyBalance.requestPost(baseurl + "VIPUnbilledSubscribersSwitchingAction.do", {
            _stateParam: stateParam,
            _forwardName:'unusedInclusive',
            _resetBreadCrumbs:true,
            "ctrlvcol%3Dradio%3Bctrl%3DsubscriberListExt%3Btype%3Drd":phone
          });
          
          // Сколько использовано минут
          //<td>Всё включено L (фед.)         </td><td>26.02.2012</td><td>10.03.2012</td><td>252,00</td><td>мин.</td>
          getParam (html, result, 'min_left', /<td>(-?\d[^<]*)<\/td><td>мин[^<]*<\/td>/i, replaceTagsAndSpaces, parseMinutes);
          // Сколько использовано смс
          //<td>(0/0) СМС (прием/передача)    </td><td>26.02.2012</td><td>10.03.2012</td><td>2 984,00</td><td>шт.</td>
          //Странно /(-\d[\d\.,\s]*) не матчит число с пробелом в андроиде. Точнее, матчит только 2. Что за хрень такая?
          getParam (html, result, 'sms_left', /<td>[^<]*(?:СМС|SMS)(?:[^<]*<\/td><td>){3}(-?\d[^<]*)/i, replaceTagsAndSpaces, parseBalance);
      }

    }
    
    AnyBalance.setResult(result);
}
