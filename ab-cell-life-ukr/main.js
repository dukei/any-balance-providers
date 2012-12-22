/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Life:) — GSM оператор мобильной связи.
Сайт оператора: http://www.life.com.ua/
Система Самообслуживания: https://my.life.com.ua/web/login.jsp?locale=ua
*/

function getParam (html, result, param, regexp, replaces, parser) {
	if (param && (param != '__tariff' && !AnyBalance.isAvailable (param)))
		return;

	var value = regexp.exec (html);
	if (value) {
		value = value[1];
		if (replaces) {
			for (var i = 0; i < replaces.length; i += 2) {
				value = value.replace (replaces[i], replaces[i+1]);
			}
		}
		if (parser)
			value = parser (value);

    if(param)
      result[param] = value;
    else
      return value
	}
}

var replaceTagsAndSpaces = [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

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

function aggregate_traffic(values){
    var sum = aggregate_sum(values);
    if(sum){
        return Math.round(sum/1024/1024);
    }
    return sum;
}

function main(){
    var prefs = AnyBalance.getPreferences();
    if(!prefs.prefph || !/^\d{3}$/.test(prefs.prefph))
        throw new AnyBalance.Error('Введите префикс для вашего номера телефона (3 цифры)');
    if(!prefs.phone || !/^\d{7}$/.test(prefs.phone))
        throw new AnyBalance.Error('Введите номер вашего телефона (7 цифр)');

    if(prefs.lk_type == 'wap')
        mainWap();
    else
        mainApi();
}

function mainApi(){
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
    
    getParam(xml, result, 'Mbalance', /<balance[^>]+code="Line_Main"[^>]*amount="([^"]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(xml, result, 'Bbalance', /<balance[^>]+code="Line_Bonus"[^>]*amount="([^"]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(xml, result, 'debt', /<balance[^>]+code="Line_Debt"[^>]*amount="([^"]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(xml, result, 'till', /<attribute[^>]+name="LINE_SUSPEND_DATE"[^>]*>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/attribute>/i, replaceTagsAndSpaces, parseDateISO);
    getParam(xml, result, '__tariff', /<tariff[^>]*>[\s\S]*?<name[^>]*>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/name>/i, replaceTagsAndSpaces, html_entity_decode);

    if(AnyBalance.isAvailable('gprs', 'mms', 'sms_uk', 'sms_life', 'mins_family', 'mins_life')){
        xml = lifeGet('getBalances', {msisdn: msisdn, languageId: lang, osType: 'ANDROID', token: token});
        
        sumParam(xml, result, 'gprs', /<balance[^>]+code="FreeGprs[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseBalance, aggregate_traffic);
        sumParam(xml, result, 'mms', /<balance[^>]+code="FreeMms[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
        sumParam(xml, result, 'sms_uk', /<balance[^>]+code="Bundle_Sms_Ukraine[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
        sumParam(xml, result, 'mins_family', /<balance[^>]+code="Bundle_UsageN_FF_FREE[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
        sumParam(xml, result, 'mins_life', /<balance[^>]+code="Bundle_Voice_Onnet[^>]*amount="([^"]*)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    }
        
    AnyBalance.setResult(result);
}

function mainWap(){
	var prefs = AnyBalance.getPreferences();
        var html=AnyBalance.requestGet("https://my.life.com.ua/wap/jsps/myAccount.jsp?language=uk&srcpage=/wap/home.jsp");
        var frompage=getParam(html, null,null, /name="frompage" value="([^"]*)"/i);
	var html = AnyBalance.requestPost('https://my.life.com.ua/wap/servlet/aus?language=uk&srcpage=/wap/home.jsp', {
		frompage: frompage,
		topage: "/wap/jsps/balanceCheck/index.jsp",
		prefix: prefs.prefph,
		msisdn: prefs.phone,
		password: prefs.pass
	});
        var error = getParam(html, null, null, /.>([^>]*?):?\s*<form action="\/wap\/servlet\/aus/i, replaceTagsAndSpaces);
	if(error)
		throw new AnyBalance.Error(error);

	var result = {success: true};
	getParam(html, result, 'Mbalance', /(?:Ви маєте|у Вас есть) (-?\d[\d\.,\s]*) грн. (?:на основному та|на основном и)/i, replaceFloat, parseFloat);
	getParam(html, result, 'Bbalance', /грн. на (?:основному та|основном и) (-?\d[\d\.,\s]*) грн. на/i, replaceFloat, parseFloat);

        html = AnyBalance.requestGet("https://my.life.com.ua/wap/jsps/tariffs/index.jsp?language=uk&srcpage=/wap/jsps/myAccount.jsp");
	getParam(html, result, '__tariff', /(?:Ваш поточний тарифний план|Ваш текущий тарифный план): (.*)/i, replaceTagsAndSpaces);

	if(typeof(result.__tariff) == 'undefined'){
           result.__tariff = '+38'+prefs.prefph+prefs.phone;
        }
        
        AnyBalance.setResult(result);
}