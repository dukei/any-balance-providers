/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Life:) — GSM оператор мобильной связи.
Сайт оператора: http://www.life.com.ua/
Система Самообслуживания: https://my.life.com.ua/web/login.jsp?locale=ua
*/

function parseBalanceLeft(str){
    var val = parseBalance(str);
    if(isset(val)){
        val = 180000 + val; //По условиям тарифного плана Life 25 и Свободный Life западный
    }
    return val;
}

function parseTrafficMbLeftIK(str){
    var val = parseTrafficMb(str);
    if(isset(val)){
        val = 50 + val; //По условиям Интернета за копейку для Востока
    }
    return val;
}

function parseTrafficMbLeftIE(str){
    var val = parseTrafficMb(str);
    if(isset(val)){
        val = 30 + val; //По условиям Интернет + Россия для Востока
    }
    return val;
}

function createParams(params){
    var str = '';
    for(var param in params){
        str += str ? '&' : '?';
        str += encodeURIComponent(param);
        str += '=';
        str += encodeURIComponent(params[param]);
    }
    return str;
}

function createSignedUrl(method, params){
    var str = createParams(params);
    str = method + str + '&signature=';
    var hash = CryptoJS.HmacSHA1(str, "E6j_$4UnR_)0b");
    hash = hash.toString(CryptoJS.enc.Base64);
    str += encodeURIComponent(hash);
    return 'https://api.life.com.ua/mobile/' + str;
}

var g_errors = {
    SUCCESSFULY_PERFORMED: 0,
    METHOD_INVOCATION_TIMEOUT: -1,
    INTERNAL_ERROR: -2,
    INVALID_PARAMETERS_LIST: -3,
    VENDOR_AUTHORIZATION_FAILED: -4,
    VENDOR_ACCESS_KEY_EXPIRED: -5,
    VENDOR_AUTHENTICATION_FAILED: -6,
    SUPERPASS_CHECKING_FAILED: -7,
    INCORRECT_SUBSCRIBER_ID: -8,
    INCORRECT_SUBSRIBER_STATE: -9,
    SUPERPASS_BLOCKED: -10,
    SUBSCRIBER_ID_NOT_FOUND: -11,
    TOKEN_EXPIRED: -12,
    CHANGE_TARIFF_FAILED: -13,
    SERVICE_ACTIVATION_FAILED: -14,
    OFFER_ACTIVATION_FAILED: -15,
    GET_TARIFFS_FAILED: -16,
    GET_SERVICES_FAILED: -17,
    REMOVE_SERVICE_FROM_PREPROCESSING_FAILED: -18,
    LOGIC_IS_BLOCKING: -19,
    TOO_MANY_REQUESTS: -20,
    PAYMENTS_OR_EXPENSES_MISSED: -40,
    INTERNAL_APPLICATION_ERROR: 0x80000000
};

var g_errorDescription = {};
g_errorDescription[g_errors.SUCCESSFULY_PERFORMED] = "Успешное выполнение запроса";
g_errorDescription[g_errors.METHOD_INVOCATION_TIMEOUT] = "Вызываемый метод не ответил за разумное время";
g_errorDescription[g_errors.INTERNAL_ERROR] = "Внутренняя ошибка";
g_errorDescription[g_errors.INVALID_PARAMETERS_LIST] = "Один из обязательных параметров отсутствует или задан неверно.";
g_errorDescription[g_errors.VENDOR_AUTHORIZATION_FAILED] = "Авторизация не удалась";
g_errorDescription[g_errors.VENDOR_ACCESS_KEY_EXPIRED] = "Ключ доступа устарел";
g_errorDescription[g_errors.VENDOR_AUTHENTICATION_FAILED] = "Аутентификация не удалась";
g_errorDescription[g_errors.SUPERPASS_CHECKING_FAILED] = "Неправильный суперпароль";
g_errorDescription[g_errors.INCORRECT_SUBSCRIBER_ID] = "Неправильный идентификатор пользователя";
g_errorDescription[g_errors.INCORRECT_SUBSRIBER_STATE] = "Неправильный статус пользователя";
g_errorDescription[g_errors.SUPERPASS_BLOCKED] = "Суперпароль заблокирован. Получите новый суперпароль.";
g_errorDescription[g_errors.SUBSCRIBER_ID_NOT_FOUND] = "Пользователь не найден";
g_errorDescription[g_errors.TOKEN_EXPIRED] = "Токен устарел";
g_errorDescription[g_errors.CHANGE_TARIFF_FAILED] = "Смена тарифа не удалась";
g_errorDescription[g_errors.SERVICE_ACTIVATION_FAILED] = "Активация услуги не удалась";
g_errorDescription[g_errors.OFFER_ACTIVATION_FAILED] = "Активация предложения не удалась";
g_errorDescription[g_errors.GET_TARIFFS_FAILED] = "Получение тарифов не удалось";
g_errorDescription[g_errors.GET_SERVICES_FAILED] = "Получение услуг не удалось";
g_errorDescription[g_errors.REMOVE_SERVICE_FROM_PREPROCESSING_FAILED] = "Удаление сервиса из предобрабоки не удалось";
g_errorDescription[g_errors.LOGIC_IS_BLOCKING] = "Логика заблокирована другим запросом";
g_errorDescription[g_errors.TOO_MANY_REQUESTS] = "Слишком много запросов";
g_errorDescription[g_errors.PAYMENTS_OR_EXPENSES_MISSED] = "Какая-то проблема с платежами или тратами";
g_errorDescription[g_errors.INTERNAL_APPLICATION_ERROR] = "Внутренняя ошибка приложения";

function lifeGet(method, params){
    if(!isset(params.accessKeyCode))
        params.accessKeyCode = '7';
    var url = createSignedUrl(method, params);
    var xml = AnyBalance.requestGet(url);
    var code = getParam(xml, null, null, /<responseCode>([\s\S]*?)<\/responseCode>/i, replaceTagsAndSpaces);
    if(!g_errorDescription[code]){
        AnyBalance.trace('Неожиданный ответ сервера (' + method + '): ' + xml);
        throw new AnyBalance.Error('Неожиданный ответ сервера!');
    }
    if(code < 0)
        throw new AnyBalance.Error(method + ': ' + g_errorDescription[code]);
    return xml;
}

function parseTrafficMb(str){
    var val = parseBalance(str);
    if(isset(val))
        val = Math.round(val/1024/1024*100)/100;
    return val;
}

function main(){
    var prefs = AnyBalance.getPreferences();
    if(!prefs.prefph || !/^\d{3}$/.test(prefs.prefph))
        throw new AnyBalance.Error('Введите префикс для вашего номера телефона (3 цифры)');
    if(!prefs.phone || !/^\d{7}$/.test(prefs.phone))
        throw new AnyBalance.Error('Введите номер вашего телефона (7 цифр)');

    var prefs = AnyBalance.getPreferences();
    var msisdn = '38'+prefs.prefph+prefs.phone;
    var lang = prefs.lang || 'ru';

    AnyBalance.setDefaultCharset('utf-8');

    var xml = lifeGet('signIn', {msisdn: msisdn, superPassword: prefs.pass});
    var token = getParam(xml, null, null, /<token>([\s\S]*?)<\/token>/i, replaceTagsAndSpaces);
    
    if(!token)
        throw new AnyBalance.Error('He удалось авторизоваться в Life API!');

    var result = {success: true};

    xml = lifeGet('getSummaryData', {msisdn: msisdn, languageId: lang, osType: 'ANDROID', token: token});
    
    //Основной счет
    sumParam(xml, result, 'Mbalance', /<balance[^>]+code="Line_Main"[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    //Бонусный счет
    getParam(xml, result, 'Bbalance', /<balance[^>]+code="Line_Bonus"[^>]*amount="([^"]*)/i, replaceTagsAndSpaces, parseBalance);
    //Долг
    sumParam(xml, result, 'Mbalance', /<balance[^>]+code="Line_Debt"[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    //Срок действия
    getParam(xml, result, 'till', /<attribute[^>]+name="LINE_SUSPEND_DATE"[^>]*>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/attribute>/i, replaceTagsAndSpaces, parseDateISO);
    //Тариф
    getParam(xml, result, '__tariff', /<tariff[^>]*>[\s\S]*?<name[^>]*>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/name>/i, replaceTagsAndSpaces, html_entity_decode);

    if(AnyBalance.isAvailable('gprs', 'mms_uk', 'mms_life', 'sms_uk', 'sms_life', 'mins_family', 'mins_life', 'mins_fixed', 'mins_uk', 'mins_mob')){
        xml = lifeGet('getBalances', {msisdn: msisdn, languageId: lang, osType: 'ANDROID', token: token});
        
	//Подарочный трафик
        sumParam(xml, result, 'gprs', /<balance[^>]+code="FreeGprs[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseTrafficMb, aggregate_sum);
	//Трафик бывший подарочный
	sumParam(xml, result, 'gprs', /<balance[^>]+code="Bundle_Gprs_Internet"[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseTrafficMb, aggregate_sum);
	//Трафик пакетный
	sumParam(xml, result, 'gprs', /<balance[^>]+code="Bundle_Gprs_All[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseTrafficMb, aggregate_sum);
	//Трафик в Безумном дне
	sumParam(xml, result, 'gprs', /<balance[^>]+code="Bundle_Gprs_Internet_Youth"[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseTrafficMb, aggregate_sum);
	//Трафик Интернет за копейку для Востока
	sumParam(xml, result, 'gprs', /<balance[^>]+code="Bundle_Gprs_Internet_Kopiyka"[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseTrafficMbLeftIK, aggregate_sum);
	//Трафик Интернет+Россия для Востока
	sumParam(xml, result, 'gprs', /<balance[^>]+code="Bundle_Gprs_Internet_East"[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseTrafficMbLeftIE, aggregate_sum);
	//Подарочные MMS в сети Life:)
        sumParam(xml, result, 'mms_life', /<balance[^>]+code="FreeMms[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	//MMS в сети Life:)
	sumParam(xml, result, 'mms_life', /<balance[^>]+code="Bundle_Mms_Onnet[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	//MMS по Украине
	sumParam(xml, result, 'mms_uk', /<balance[^>]+code="Bundle_Mms_Ukraine[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	//Подарочные SMS в сети Life:)
	sumParam(xml, result, 'sms_life', /<balance[^>]+code="FreeSms[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	//SMS в сети Life:)
        sumParam(xml, result, 'sms_life', /<balance[^>]+code="Bundle_Sms_Onnet[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	//SMS по Украине
	sumParam(xml, result, 'sms_uk', /<balance[^>]+code="Bundle_Sms_Ukraine[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	//Минуты на родные номера в старом варианте Свободного Лайфа
	sumParam(xml, result, 'mins_family', /<balance[^>]+code="Bundle_UsageN_FF_FREE[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	//Минуты по сети Life:)
        sumParam(xml, result, 'mins_life', /<balance[^>]+code="Bundle_Voice_Onnet"[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	//Минуты по сети Life:) западных тарифов
	sumParam(xml, result, 'mins_life', /<balance[^>]+code="Bundle_Voice_Onnet_West"[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseBalanceLeft, aggregate_sum);
	//Минуты на номера фиксированной связи Украины
	sumParam(xml, result, 'mins_fixed', /<balance[^>]+code="Bundle_Voice_Pstn[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	//Минуты на номера других операторов и фиксированной связи Украины
	sumParam(xml, result, 'mins_uk', /<balance[^>]+code="Bundle_Voice_Offnet[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	//Мин. услуги "life:) 5 копеек"
	sumParam(xml, result, 'mins_uk', /<balance[^>]+code="Counter_Voice_Offnet_Lviv"[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	//Минуты на номера мобильных операторов Украины (Безумный день Bundle_Youth_Voice_Omo_Pstn)
	sumParam(xml, result, 'mins_mob', /<balance[^>]+code="Bundle_Youth_Voice[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	//Минуты на номера мобильных операторов Украины (Снова дешевле Bundle_Voice_Omo_ReCheaper)
	sumParam(xml, result, 'mins_mob', /<balance[^>]+code="Bundle_Voice_Omo[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);

    }
        
    if(AnyBalance.isAvailable('phone')){
        result.phone = '+'+msisdn;
    }

    AnyBalance.setResult(result);
}