var MEGA_FILIAL_MOSCOW = 1;
var MEGA_FILIAL_SIBIR = 2;
var MEGA_FILIAL_NW = 3;
var MEGA_FILIAL_FAREAST = 4;
var MEGA_FILIAL_VOLGA = 5;
var MEGA_FILIAL_KAVKAZ = 6;
var MEGA_FILIAL_CENTRAL = 7;
var MEGA_FILIAL_URAL = 8;

//http://ru.wikipedia.org/wiki/%D0%9C%D0%B5%D0%B3%D0%B0%D0%A4%D0%BE%D0%BD#.D0.A4.D0.B8.D0.BB.D0.B8.D0.B0.D0.BB.D1.8B_.D0.BA.D0.BE.D0.BC.D0.BF.D0.B0.D0.BD.D0.B8.D0.B8
var filial_info = {
	moscowsg: MEGA_FILIAL_MOSCOW,
	sibsg1: MEGA_FILIAL_SIBIR,
	sibsg: MEGA_FILIAL_SIBIR,
	szfsg: MEGA_FILIAL_NW,
	dvsg: MEGA_FILIAL_FAREAST,
	volgasg: MEGA_FILIAL_VOLGA,
	kavkazsg: MEGA_FILIAL_KAVKAZ,
	centersg: MEGA_FILIAL_CENTRAL,
	uralsg: MEGA_FILIAL_URAL
};

filial_info[MEGA_FILIAL_MOSCOW] = {
  name: 'Столичный филиал',
  func: megafonServiceGuide,
  site: 	"https://moscowsg.megafon.ru/",
  widget:	'https://moscowsg.megafon.ru/WIDGET_INFO/GET_INFO?X_Username=%LOGIN%&X_Password=%PASSWORD%&CHANNEL=WYANDEX&LANG_ID=1&P_RATE_PLAN_POS=1&P_PAYMENT_POS=2&P_ADD_SERV_POS=4&P_DISCOUNT_POS=3',
  tray: 	"https://moscowsg.megafon.ru/TRAY_INFO/TRAY_INFO?LOGIN=%LOGIN%&PASSWORD=%PASSWORD%",
  internet:       "http://user.moscow.megafon.ru/",
  internetRobot:       "https://moscowsg.megafon.ru/MEGAFON_BALANCE/MGFSTF_GET_QOS_PACK_STATUS?MSISDN=%LOGIN%&PASSWORD=%PASSWORD%"
};
filial_info[MEGA_FILIAL_SIBIR] = {
  name: 'Сибирский филиал',
  site: "https://sibsg.megafon.ru/ROBOTS/SC_TRAY_INFO?X_Username=%LOGIN%&X_Password=%PASSWORD%",
  widget: 'https://sibsg.megafon.ru/WIDGET_INFO/GET_INFO?X_Username=%LOGIN%&X_Password=%PASSWORD%&CHANNEL=WYANDEX&LANG_ID=1&P_RATE_PLAN_POS=1&P_PAYMENT_POS=2&P_ADD_SERV_POS=4&P_DISCOUNT_POS=3',
  func: megafonTrayInfo
};
filial_info[MEGA_FILIAL_NW] = {
  name: 'Северо-западный филиал',
  site: 'https://szfsg.megafon.ru/ROBOTS/SC_TRAY_INFO?X_Username=%LOGIN%&X_Password=%PASSWORD%',
  widget: 'https://szfsg.megafon.ru/WIDGET_INFO/GET_INFO?X_Username=%LOGIN%&X_Password=%PASSWORD%&CHANNEL=WYANDEX&LANG_ID=1&P_RATE_PLAN_POS=1&P_PAYMENT_POS=2&P_ADD_SERV_POS=4&P_DISCOUNT_POS=3',
  func: megafonTrayInfo,
};
filial_info[MEGA_FILIAL_FAREAST] = {
  name: 'Дальневосточный филиал',
  site: 'https://dvsg.megafon.ru/ROBOTS/SC_TRAY_INFO?X_Username=%LOGIN%&X_Password=%PASSWORD%',
  widget: 'https://dvsg.megafon.ru/WIDGET_INFO/GET_INFO?X_Username=%LOGIN%&X_Password=%PASSWORD%&CHANNEL=WYANDEX&LANG_ID=1&P_RATE_PLAN_POS=1&P_PAYMENT_POS=2&P_ADD_SERV_POS=4&P_DISCOUNT_POS=3',
  func: megafonTrayInfo
};
filial_info[MEGA_FILIAL_VOLGA] = {
  name: 'Поволжский филиал',
//  site: "https://volgasg.megafon.ru/",
//  func: megafonServiceGuide,
  func: megafonTrayInfo,
  widget: 'https://volgasg.megafon.ru/WIDGET_INFO/GET_INFO?X_Username=%LOGIN%&X_Password=%PASSWORD%&CHANNEL=WYANDEX&LANG_ID=1&P_RATE_PLAN_POS=1&P_PAYMENT_POS=2&P_ADD_SERV_POS=4&P_DISCOUNT_POS=3',
  site: 'https://volgasg.megafon.ru/ROBOTS/SC_TRAY_INFO?X_Username=%LOGIN%&X_Password=%PASSWORD%'
};
filial_info[MEGA_FILIAL_KAVKAZ] = {
  name: 'Кавказский филиал',
  site: "https://kavkazsg.megafon.ru/ROBOTS/SC_TRAY_INFO?X_Username=%LOGIN%&X_Password=%PASSWORD%",
  widget: 'https://kavkazsg.megafon.ru/WIDGET_INFO/GET_INFO?X_Username=%LOGIN%&X_Password=%PASSWORD%&CHANNEL=WYANDEX&LANG_ID=1&P_RATE_PLAN_POS=1&P_PAYMENT_POS=2&P_ADD_SERV_POS=4&P_DISCOUNT_POS=3',
  func: megafonTrayInfo
};
filial_info[MEGA_FILIAL_CENTRAL] = {
  name: 'Центральный филиал',
  site: 'https://centersg.megafon.ru/ROBOTS/SC_TRAY_INFO?X_Username=%LOGIN%&X_Password=%PASSWORD%',
  widget: 'https://centersg.megafon.ru/WIDGET_INFO/GET_INFO?X_Username=%LOGIN%&X_Password=%PASSWORD%&CHANNEL=WYANDEX&LANG_ID=1&P_RATE_PLAN_POS=1&P_PAYMENT_POS=2&P_ADD_SERV_POS=4&P_DISCOUNT_POS=3',
  func: megafonTrayInfo
};
filial_info[MEGA_FILIAL_URAL] = {
  name: 'Уральский филиал',
  site: 'https://uralsg.megafon.ru/ROBOTS/SC_TRAY_INFO?X_Username=%LOGIN%&X_Password=%PASSWORD%',
  widget: 'https://uralsg.megafon.ru/WIDGET_INFO/GET_INFO?X_Username=%LOGIN%&X_Password=%PASSWORD%&CHANNEL=WYANDEX&LANG_ID=1&P_RATE_PLAN_POS=1&P_PAYMENT_POS=2&P_ADD_SERV_POS=4&P_DISCOUNT_POS=3',
  func: megafonTrayInfo
};

var g_login_errors = {
  error_1:"Введите логин!",
  error_2:"Введите пароль!",
  error_3:"Введите защитный код!",
  error_4:"Неверный префикс.",
  error_5:"Защитный код устарел.",
  error_6:"Введен неверный защитный код.",
  error_7:"Выберите контрольный вопрос.",
  error_8:"Введите ответ на контрольный вопрос.",
  error_9:"Вам недоступен список контрольных вопросов.",
  error_10:"Передан неизвестный параметр.",
  error_11:"Ваш ответ слишком короткий.",
  error_12:"Не заполнено поле со старым паролем.",
  error_13:"Не заполнено поле с новым паролем.",
  error_14:"Не заполнено поле подтверждения пароля.",
  error_15:"Пользователь не найден.",
  error_100:"Вход в систему самообслуживания. Пожалуйста, подождите.",
  error_200:"Ошибка запроса на сервер. Обратитесь, пожалуйста, в службу поддержки.",
  error_0:"Ошибка. Сервис недоступен. Обратитесь, пожалуйста, в службу поддержки."
};

//http://www.mtt.ru/mtt/def
var def_table = {
    p920: [
        [0000000,  999999, MEGA_FILIAL_CENTRAL],
        [1000000, 1109999, MEGA_FILIAL_NW],
        [1110000, 1119999, MEGA_FILIAL_CENTRAL],
        [1120000, 1999999, MEGA_FILIAL_NW],
        [2000000, 2499999, MEGA_FILIAL_KAVKAZ],
        [2500000, 2999999, MEGA_FILIAL_CENTRAL],
        [3000000, 3999999, MEGA_FILIAL_NW],
        [4000000, 5999999, MEGA_FILIAL_KAVKAZ],
        [6000000, 6399999, MEGA_FILIAL_CENTRAL],
        [6400000, 6999999, MEGA_FILIAL_NW],
        [7000000, 9999999, MEGA_FILIAL_CENTRAL],
    ],
    p921: MEGA_FILIAL_NW,
    p922: [
        [5300000, 5599999, MEGA_FILIAL_VOLGA],
        [6200000, 6299999, MEGA_FILIAL_VOLGA],
        [8000000, 8999999, MEGA_FILIAL_VOLGA],
        [0000000, 9999999, MEGA_FILIAL_URAL],
    ],    
    p923: MEGA_FILIAL_SIBIR,
    p924: MEGA_FILIAL_FAREAST,
    p925: MEGA_FILIAL_MOSCOW,
    p926: MEGA_FILIAL_MOSCOW,
    p927: MEGA_FILIAL_VOLGA,
    p928: MEGA_FILIAL_KAVKAZ,
    p929: [ 
        [0000000,  209999, MEGA_FILIAL_KAVKAZ],
        [ 210000,  749999, MEGA_FILIAL_CENTRAL],
        [ 750000, 1999999, MEGA_FILIAL_NW],
        [2000000, 2009999, MEGA_FILIAL_URAL],
        [2010000, 2019999, MEGA_FILIAL_VOLGA],
        [2020000, 2799999, MEGA_FILIAL_URAL],
        [2800000, 2849999, MEGA_FILIAL_VOLGA],
        [2850000, 2999999, MEGA_FILIAL_URAL],
        [3000000, 3999999, MEGA_FILIAL_SIBIR],
        [4000000, 4999999, MEGA_FILIAL_FAREAST],
        [5000000, 6999999, MEGA_FILIAL_MOSCOW],
        [7000000, 7999999, MEGA_FILIAL_VOLGA],
        [8000000, 8999999, MEGA_FILIAL_KAVKAZ],
        [9000000, 9999999, MEGA_FILIAL_MOSCOW],
    ],
    p930: [
        [0000000,   59999, MEGA_FILIAL_NW],
        [ 110000,  119999, MEGA_FILIAL_KAVKAZ],
        [ 140000,  149999, MEGA_FILIAL_KAVKAZ],
        [ 310000,  749999, MEGA_FILIAL_CENTRAL],
        [ 760000,  769999, MEGA_FILIAL_NW],
        [ 860000,  869999, MEGA_FILIAL_KAVKAZ],
        [ 910000, 3999999, MEGA_FILIAL_NW],
        [7000000, 8999999, MEGA_FILIAL_CENTRAL],
    ],
    p931: MEGA_FILIAL_NW,
    p932: [
        [2010000, 2019999, MEGA_FILIAL_VOLGA],
        [5300000, 5599999, MEGA_FILIAL_VOLGA],
        [8400000, 8699999, MEGA_FILIAL_VOLGA],
        [0000000, 9999999, MEGA_FILIAL_URAL],
    ],    
    p933: MEGA_FILIAL_SIBIR,
    p934: MEGA_FILIAL_FAREAST,
    p936: MEGA_FILIAL_MOSCOW,
    p937: MEGA_FILIAL_VOLGA,
    p938: MEGA_FILIAL_KAVKAZ,
    p939: MEGA_FILIAL_VOLGA
}

/**
 * Ищет филиал для переданного в виде строки номера
 */
function getFilial(number) {
	if (typeof(number) != 'string')
		throw new AnyBalance.Error('Телефон должен быть строкой из 10 цифр!', null, true);
	if (!/^\d{10}$/.test(number)) 
		throw new AnyBalance.Error('Телефон должен быть строкой из 10 цифр без пробелов и разделителей!', null, true);
		
	var html = AnyBalance.requestPost("https://sg.megafon.ru/ps/scc/php/route.php", {
		CHANNEL: 'WWW',
		ULOGIN: number
	});
	//    Мегафон сделал сервис для определения филиала, так что попытаемся обойтись им    
	var region = getParam(html, null, null, /<URL>https?:\/\/(\w+)\./i);
	if (region && filial_info[region]) {
		return filial_info[region];
	} else {
		//Филиал не определился, попробуем по префиксу понять
		var prefix = parseInt(number.substr(0, 3));
		var num = parseInt(number.substr(3).replace(/^0+(\d+)$/, '$1')); //Не должно начинаться с 0, иначе воспринимается как восьмеричное число
		return getFilialByPrefixAndNumber(prefix, num);
	}
}
/**
 * Ищет филиал для переданного префикса и номера в таблице def_table
 */
function getFilialByPrefixAndNumber(prefix, number){
    var prefkey = 'p'+prefix;
    var filinfo = def_table[prefkey];
    if(!filinfo)
        throw new AnyBalance.Error('Префикс ' + prefix + ' не принадлежит Мегафону!');
    
    if(typeof(filinfo) == 'number')
        return filinfo;
    
    for(var i=0; i<filinfo.length; ++i){
        var info = filinfo[i];
        if(!info) continue;
        if(info[0] <= number && number <= info[1])
            return info[2];
    }

    throw new AnyBalance.Error('Номер '+ number + ' с префиксом ' + prefix + ' не принадлежит Мегафону!');
}

function main(){
    var prefs = AnyBalance.getPreferences();
    var filial = getFilial(prefs.login);
    if(!filial)
        throw new AnyBalance.Error('Неизвестен филиал Мегафона для номера ' + prefs.login);
    
    var filinfo = filial_info[filial];
    if(!filinfo)
        throw new AnyBalance.Error('Unknown filial ' + filial);
    
    if(!filinfo.func)
        throw new AnyBalance.Error(filinfo.name + ' Мегафона ещё не поддерживается. Пожалуйста, помогите его поддержать. Информация на сайте программы http://any-balance-providers.googlecode.com .');
    
    (filinfo.func)(filial);
}

var g_headers = {
    Accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Cache-Control':'max-age=0',
    Connection:'keep-alive',
    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.60 Safari/537.1'
};

function getTrayXmlText(filial, address){
    var prefs = AnyBalance.getPreferences();
    var filinfo = filial_info[filial];
    
    AnyBalance.trace('Connecting to trayinfo for ' + filinfo.name);
    
    AnyBalance.setDefaultCharset('utf-8');
    var info;
    if(prefs.__dbg_html)
        info = prefs.__dbg_html;
    else
        info = AnyBalance.requestGet(address.replace(/%LOGIN%/g, prefs.login).replace(/%PASSWORD%/g, encodeURIComponent(prefs.password)), g_headers);
        
    if(/<title>Not Found<\/title>/.test(info)){
      //AnyBalance.trace("Server returned: " + info);
      throw new AnyBalance.Error('Похоже, автоматический вход временно отсутствует на сервере Мегафона. Попробуйте позднее.');
    }
    if(/<h1>Locked<\/h1>/.test(info)){
      AnyBalance.trace("Server returned: " + info);
      throw new AnyBalance.Error('Вы ввели неправильный пароль или доступ автоматическим системам заблокирован.\n\
Для разблокировки необходимо зайти в Сервис-Гид и включить настройку Настройки Сервис-Гида/Автоматический доступ системам/Доступ открыт пользователям и автоматизированным системам, а также нажать кнопку "разблокировать".');
    }
        
    if(/SCC-ROBOT-PASSWORD-INCORRECT/.test(info)){
      AnyBalance.trace("Server returned: " + info);
      throw new AnyBalance.Error('Вы ввели неправильный пароль.');
    }

    if(/ROBOTS-DENY|SCC-ROBOT-LOGIN-DENY/.test(info)){
      AnyBalance.trace("Server returned: " + info);
      throw new AnyBalance.Error('Доступ автоматическим системам заблокирован.\n\
Для разблокировки необходимо зайти в Сервис-Гид и включить настройку Настройки Сервис-Гида/Автоматический доступ системам/Доступ открыт пользователям и автоматизированным системам, а также нажать кнопку "разблокировать".');
    }

    if(/SCC-ROBOTS-ERROR/.test(info)){
      AnyBalance.trace("Server returned: " + info);
      throw new AnyBalance.Error('Сервис гид временно находится на техобслуживании. Зайдите позже.');
    }

    var matches;
    if(matches = /<h1>([^<]*)<\/h1>\s*<p>([^<]*)<\/p>/.exec(info)){
      AnyBalance.trace("Server returned: " + info);
      throw new AnyBalance.Error(matches[1] + ": " + matches[2]); //Случился какой-то глючный бред
    }

    if(!/<BALANCE>[^<]*<\/BALANCE>/i.test(info)){
      AnyBalance.trace("Server returned: " + info);
      throw new AnyBalance.Error('Сервис гид вернул XML без баланса. Похоже, тут что-то не так!'); //Случился какой-то глючный бред, пришел xml без баланса
    }
	
    //Проверяем на ошибку
    var error = getParam(info, null, null, /<ERROR_MESSAGE[^>]*>([\s\S]*?)<\/ERROR_MESSAGE>/, replaceTagsAndSpaces, html_entity_decode);
    if(error){
        AnyBalance.trace("Server returned: " + info);
        if(/Robot login is not allowed|does not have permissions/.test(error))
            throw new AnyBalance.Error('Пожалуйста, разрешите в Сервис-Гиде доступ автоматизированным системам.\n\
Для этого зайдите в Сервис-Гид и включите настройку Настройки Сервис-Гида/Автоматический доступ системам/Доступ открыт пользователям и автоматизированным системам.');
        else
            throw new AnyBalance.Error(error);
    }

    error = getParam(info, null, null, /<ERROR\b[^>]*>([\s\S]*?)<\/ERROR>/, replaceTagsAndSpaces, html_entity_decode);;
    if(error){
        AnyBalance.trace("Server returned: " + info);
        throw new AnyBalance.Error(error + ' Возможно, вам надо зайти в Сервис-Гид и включить настройку Настройки Сервис-Гида/Автоматический доступ системам/Доступ открыт пользователям и автоматизированным системам, а также нажать кнопку "разблокировать".');
    }

    return info;
}

function isAvailableButUnset(result, params){
    for(var i=0; i<params.length; ++i){
        if(isAvailable(params[i]) && !isset(result[params[i]]))
            return true;
    }
    return false;
}

function megafonTrayInfo(filial){
    var filinfo = filial_info[filial], errorInTray;

    var internet_totals_was = {};
    var mins_totals_was = {};
    
    var result = {success: true};
    try{
        var xml = getTrayXmlText(filial, filinfo.tray || filinfo.site), val;
        getParam(xml, result, '__tariff', /<RATE_PLAN>([\s\S]*?)<\/RATE_PLAN>/i, replaceTagsAndSpaces, html_entity_decode);

        getParam(xml, result, 'balance', /<BALANCE>([\s\S]*?)<\/BALANCE>/i, replaceTagsAndSpaces, parseBalance);
        getParam(xml, result, 'phone', /<NUMBER>([\s\S]*?)<\/NUMBER>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(xml, result, 'prsnl_balance', /<PRSNL_BALANCE>([\s\S]*?)<\/PRSNL_BALANCE>/i, replaceTagsAndSpaces, parseBalance);

        var discounts = sumParam(xml, null, null, /<DISCOUNT>([\s\S]*?)<\/DISCOUNT>/ig);
        AnyBalance.trace('Found discounts: ' + discounts.length);

        for(var i=0; i<discounts.length; ++i){
            var d = discounts[i];
            var name = getParam(d, null, null, /<NAME>([\s\S]*?)<\/NAME>/i) || '';
            var plan_name = getParam(d, null, null, /<PLAN_NAME>([\s\S]*?)<\/PLAN_NAME>/i) || '';
            var plan_si = getParam(d, null, null, /<PLAN_SI>([\s\S]*?)<\/PLAN_SI>/i) || '';
            var name_service = getParam(d, null, null, /<NAME_SERVICE>([\s\S]*?)<\/NAME_SERVICE>/i) || '';
            var names = name + ',' + plan_name;
            if(/sms|смс/i.test(names)){
                AnyBalance.trace('Найдены SMS: ' + names);
                sumParam(d, result, 'sms_left', /<VOLUME_AVAILABLE>([\s\S]*?)<\/VOLUME_AVAILABLE>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
                sumParam(d, result, 'sms_total', /<VOLUME_TOTAL>([\s\S]*?)<\/VOLUME_TOTAL>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
            }else if(/mms|ммс/i.test(names)){
                AnyBalance.trace('Найдены MMS: ' + names);
                sumParam(d, result, 'mms_left', /<VOLUME_AVAILABLE>([\s\S]*?)<\/VOLUME_AVAILABLE>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
                sumParam(d, result, 'mms_total', /<VOLUME_TOTAL>([\s\S]*?)<\/VOLUME_TOTAL>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
            }else if(/GPRS| Байт|интернет|мб|Пакетная передача данных/i.test(names) || /Пакетная передача данных/i.test(name_service) || /Байт|Тар.ед./i.test(plan_si)){
                AnyBalance.trace('Найден интернет: ' + names + ', ' + plan_si);
                var valAvailable = getParam(d, null, null, /<VOLUME_AVAILABLE>([\s\S]*?)<\/VOLUME_AVAILABLE>/i, replaceTagsAndSpaces, parseBalance);
                var valTotal = getParam(d, null, null, /<VOLUME_TOTAL>([\s\S]*?)<\/VOLUME_TOTAL>/i, replaceTagsAndSpaces, parseBalance);
                var units = plan_si;
                if(units == 'мин'){
                    //Надо попытаться исправить ошибку мегафона с единицами измерения трафика
                    if(/[GM]B/i.test(plan_name)) units = 'мб';
                    else if(/GPRS-Internet трафик/i.test(plan_name)) units='мб'; //Вот ещё такое исключение. Надеюсь, на всём будет работать, хотя сообщили из поволжского филиала
		    else if(/100\s*мб/i.test(plan_name)) units='тар.ед.';
		    else if(/Все включено/i.test(plan_name)) units='мб'; //Из дальневосточного филиала сообщили
                    else units = 'тар.ед.'; //измеряется в 100кб интервалах
                }
                
                if(isset(valTotal)){ //Отметим, что этот пакет мы уже посчитали
                    var _valTotal = parseTrafficMy(valTotal + units);
                    internet_totals_was[_valTotal] = true;
                }

                if(AnyBalance.isAvailable('internet_left') && isset(valAvailable)){
                    result.internet_left = (result.internet_left || 0) + parseTrafficMy(valAvailable + units);
                }
                if(AnyBalance.isAvailable('internet_total') && isset(_valTotal)){
                    result.internet_total = (result.internet_total || 0) + _valTotal;
                }
                if(AnyBalance.isAvailable('internet_cur') && isset(valAvailable) && isset(valTotal)){
                    result.internet_cur = (result.internet_cur || 0) + parseTrafficMy((valTotal - valAvailable) + units);
                }
	    }else if(/Зона "Магнитогорск"/i.test(names)){
                AnyBalance.trace('Зону магнитогорск пропускаем. Похоже, она никому не нужна: ' + d);
            }else if(/вызовы внутри спг/i.test(names) && /мин/i.test(plan_si)){
                AnyBalance.trace('Найдены минуты внутри группы: ' + names + ', ' + plan_si);
		var total = getParam(d, null, null, /<VOLUME_TOTAL>([\s\S]*?)<\/VOLUME_TOTAL>/i, replaceTagsAndSpaces, parseMinutes);
		mins_totals_was[''+total] = true;
                sumParam(d, result, 'mins_net_left', /<VOLUME_AVAILABLE>([\s\S]*?)<\/VOLUME_AVAILABLE>/i, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
            }else if(/телефония исходящая|исходящая телефония| мин|Переходи на ноль/i.test(names) || /мин/i.test(plan_si)){
                AnyBalance.trace('Найдены минуты: ' + names + ', ' + plan_si);
		// Это такой, армянский фикс :)
		if(/шт/i.test(plan_si)) {
			AnyBalance.trace('Найдены смс которые прикидываются минутами: ' + names + ', ' + plan_si);
		        sumParam(d, result, 'sms_left', /<VOLUME_AVAILABLE>([\s\S]*?)<\/VOLUME_AVAILABLE>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
			sumParam(d, result, 'sms_total', /<VOLUME_TOTAL>([\s\S]*?)<\/VOLUME_TOTAL>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
		} else {
			// Если нашли эти минуты, то суммировать их не надо
			var total = getParam(d, null, null, /<VOLUME_TOTAL>([\s\S]*?)<\/VOLUME_TOTAL>/i, replaceTagsAndSpaces, parseMinutes);
			mins_totals_was[''+total] = true;
			if(/РЯ/.test(names)) {
				// Минуты РЯ
				sumParam(d, result, 'mins_rya_left', /<VOLUME_AVAILABLE>([\s\S]*?)<\/VOLUME_AVAILABLE>/i, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
				sumParam(d, result, 'mins_rya_total', /<VOLUME_TOTAL>([\s\S]*?)<\/VOLUME_TOTAL>/i, replaceTagsAndSpaces, parseMinutes, aggregate_sum);					
			} else {
				sumParam(d, result, 'mins_left', /<VOLUME_AVAILABLE>([\s\S]*?)<\/VOLUME_AVAILABLE>/i, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
				sumParam(d, result, 'mins_total', /<VOLUME_TOTAL>([\s\S]*?)<\/VOLUME_TOTAL>/i, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
			}
		}
            }else{
                AnyBalance.trace('Неизвестный discount: ' + d);
            }
        }
       
        AnyBalance.trace('Ищем агрегированные параметры...');
        read_sum_parameters_text(result, xml);
    }catch(e){
        //Не удалось получить инфу из хмл. Но не станем сразу унывать, получим что-нить из виджета
        AnyBalance.trace('Не удалось получить данные из входа для автоматических систем: ' + e.message);
        errorInTray = e.message || "Unknown error";
    }

    if(AnyBalance.isAvailable('internet_cost', 'bonus_balance', 'last_pay_sum', 'last_pay_date', 'mins_left', 'mins_net_left', 'mins_total', 'internet_left', 'internet_total', 'internet_cur') 
		|| errorInTray 
		|| isAvailableButUnset(result, ['balance','phone','sub_smit','sub_smio','sub_scl','sub_scr','sub_soi','sms_left','sms_total','mins_left','mins_total','gb_with_you'])){

        //Некоторую инфу можно получить из яндекс виджета. Давайте попробуем.
        var prefs = AnyBalance.getPreferences();
        AnyBalance.setDefaultCharset('utf-8');
        AnyBalance.trace('Попытаемся получить данные из яндекс виджета');
        var html = AnyBalance.getPreferences().__dbg_widget || AnyBalance.requestGet(filinfo.widget.replace(/%LOGIN%/g, prefs.login).replace(/%PASSWORD%/g, encodeURIComponent(prefs.password)), g_headers);
        try{
           var json = getParam(html, null, null, /^[^({]*\((\{[\s\S]*?\})\);?\s*$/);
           if(!json){
               AnyBalance.trace('Неверный ответ сервера: ' + html);
               throw new AnyBalance.Error('Неверный ответ сервера.');
           }
           json = getJsonEval(json);
           if(!json.ok)
               throw new AnyBalance.Error(json.error.text2);
           getParam(json.ok.html, result, 'bonus_balance', /<div[^>]*class="bonus"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
           getParam(json.ok.html, result, 'last_pay_sum', /<div[^>]*class="payment_amount"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
           getParam(json.ok.html, result, 'last_pay_date', /<div>([^<]*)<\/div>\s*<div[^>]+class="payment_source"/i, replaceTagsAndSpaces, parseDate);
           
           var need_int_cur = isAvailableButUnset(result, ['internet_cur']);

           if(errorInTray || 
			isAvailableButUnset(result, ['internet_cost', 'balance','phone','sub_smit','sub_smio','sub_scl','sub_scr','sub_soi']) || 
			AnyBalance.isAvailable('mins_left', 'mins_net_left', 'mins_total', 'internet_left', 'internet_total', 'internet_cur')){

               getParam(json.ok.html, result, 'balance', /<div[^>]+class="subs_balance[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
               if(isAvailableButUnset(result, ['balance'])){
                   var e = new AnyBalance.Error(errorInTray);
                   e.skip = true;
                   throw e; //Яндекс виджет не дал баланс. Значит, во всём дальнейшем смысла нет.
               }
               getParam(json.ok.html, result, 'sub_smio', /(?:Начислено абонентской платы|Абонентская плата)\s*<\/td>(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
               getParam(json.ok.html, result, 'sub_soi', /(?:Исходящие SMS\/MMS|Начислено за услуги)\s*<\/td>(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
               getParam(json.ok.html, result, 'sub_scl', /(?:Исходящие вызовы|Начислено за звонки)\s*<\/td>(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
               getParam(json.ok.html, result, 'sub_scr', /Роуминг\s*<\/td>(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
			   // 																										Заменяем строку вида $[widgets.current.user($msisdn)]
               getParam(json.ok.html, result, 'phone', /<span[^>]*class="login"[^>]*>([\s\S]*?)<\/span>/i, [/\uFFFD/g, ' ', replaceTagsAndSpaces, /\$\[[\s\S]*?\]/i, ''], html_entity_decode);
               if(need_int_cur)
                   getParam(json.ok.html, result, 'internet_cur', /Интернет-траффик \(GPRS\)\s*<\/td>(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTraffic);
               getParam(json.ok.html, result, 'internet_cost', /Интернет-траффик \(GPRS\)\s*<\/td>(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
               
               var table = getParam(json.ok.html, null, null, /<table[^>]*class="[^>]*rate-plans[^>][\s\S]*?<\/table>/i);
               if(table){
                   if(isAvailableButUnset(result, ['__tariff']))
                       sumParam(table, result, '__tariff', /<tr[^>]*>\s*<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
               }else{
                   AnyBalance.trace('Не удалось найти список тарифных планов в яндекс.виджете');
               }
           }

           if(errorInTray || isAvailableButUnset(result, ['mms_left','mms_total','sms_left','sms_total','gb_with_you'])
			|| AnyBalance.isAvailable('mins_left', 'mins_net_left', 'mins_total', 'internet_left', 'internet_total', 'internet_cur')){
               var need_mms_left = isAvailableButUnset(result, ['mms_left']),
                   need_mms_total = isAvailableButUnset(result, ['mms_total']),
                   need_sms_left = isAvailableButUnset(result, ['sms_left']),
                   need_sms_total = isAvailableButUnset(result, ['sms_total']),
                   need_gb_with_you = isAvailableButUnset(result, ['gb_with_you']);
     
               var new_internet_totals_was = {};
               var new_mins_totals_was = {};

               //Минуты и прочее получаем только в случае ошибки в сервисгиде, чтобы случайно два раза не сложить
               var discounts = sumParam(json.ok.html, null, null, /<td[^>]*class="cc_discount_row"[^>]*>([\s\S]*?)<\/td>/ig);
               var wasSM = false;
               for(var i=0; i<discounts.length; ++i){
                   var discount = discounts[i];
                   var name = getParam(discount, null, null, /<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
                   var val = getParam(discount, null, null, /<div[^>]*class="discount_volume"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
                   if(!isset(val)){
                       AnyBalance.trace('Опция без значений: ' + discount);
                       continue;
                   }
                   if(/MMS|ММС/i.test(name)){
                       getLeftAndTotal(val, result, need_mms_left, need_mms_total, 'mms_left', 'mms_total', parseBalance);
                   }else if(/SMS|СМС|сообщен/i.test(name) && !/минут/i.test(name)){
                       getLeftAndTotal(val, result, need_sms_left, need_sms_total, 'sms_left', 'sms_total', parseBalance);
                   }else if(/Бизнес Микс/i.test(name) && /шт/i.test(val)){
                       getLeftAndTotal(val, result, need_sms_left, need_sms_total, 'sms_left', 'sms_total', parseBalance);
                   }else if(/Исходящие SM/i.test(name)){
                       if(!wasSM){
                           getLeftAndTotal(val, result, need_sms_left, need_sms_total, 'sms_left', 'sms_total', parseBalance);
                           wasSM = true;
                       }else{
                           AnyBalance.trace('Пропускаем дублированные смс до сниженной цены: ' + val);
                       }
		   }else if(/Зона "Магнитогорск"/i.test(name)){
                       AnyBalance.trace('Зону магнитогорск пропускаем. Похоже, она никому не нужна: ' + discount);
                   }else if(/мин на номера МегаФон/i.test(name)){
                       var mins = getLeftAndTotal(val, result, false, false, 'mins_net_left', null, parseMinutes);
                       if(!isset(mins.left) || mins.left < 1000000){ //Большие значения, считай, безлимит. Че его показывать...
			   if(isset(mins.total) && !isset(mins_totals_was[mins.total])){
                               addLeftAndTotal(mins, result, AnyBalance.isAvailable('mins_net_left'), false, 'mins_net_left');
                               new_mins_totals_was[mins.total] = true;
			   }
                       }else{
                           AnyBalance.trace('Пропускаем безлимитные внутрисетевые минуты: ' + val);
                       }
                   }else if(/мин/i.test(val) || /минут/i.test(name)){
                       var mins = getLeftAndTotal(val, result, false, false, 'mins_left', 'mins_total', parseMinutes);
                       if(!isset(mins.left) || mins.left < 1000000){ //Большие значения, считай, безлимит. Че его показывать...
			   if(isset(mins.total) && !isset(mins_totals_was[mins.total])){
                               addLeftAndTotal(mins, result, AnyBalance.isAvailable('mins_left'), AnyBalance.isAvailable('mins_total'), 'mins_left', 'mins_total');
                               new_mins_totals_was[mins.total] = true;
			   }
                       }else{
                           AnyBalance.trace('Пропускаем безлимитные минуты: ' + val);
                       }
                   }else if(/Гигабайт в дорогу/i.test(name)){
                       getLeftAndTotal(val, result, need_gb_with_you, false, 'gb_with_you', null, parseTrafficMy);
                   }else if(/[кгмkgm][бb]|тар\.\s*ед/i.test(val)){
                       var traf = getLeftAndTotal(val, result, false, false, null, null, parseTrafficMy);
		       if(isset(traf.total) && !isset(internet_totals_was[traf.total])){ //Проверяем, что на предыдущем этапе этот трафик ещё не был учтен
                           new_internet_totals_was[traf.total] = true;
                           if(AnyBalance.isAvailable('internet_cur'))
                       	       result.internet_cur = (result.internet_cur||0) + (traf.total - (traf.left||0));
                           if(AnyBalance.isAvailable('internet_left'))
                       	       result.internet_left = (result.internet_left||0) + (traf.left||0);
                           if(AnyBalance.isAvailable('internet_total'))
                       	       result.internet_total = (result.internet_total||0) + traf.total;
                       }
                   }else{
                       AnyBalance.trace('Неизвестная опция ' + name + ': ' + val);
                   }
               }

               internet_totals_was = joinObjects(internet_totals_was, new_internet_totals_was); //Запоминаем весь учтенный на этом этапе трафик
               mins_totals_was = joinObjects(mins_totals_was, new_mins_totals_was); //Запоминаем весь учтенный на этом этапе трафик
           }

        }catch(e){
           if(e.skip)
               throw e;
           if(!errorInTray){
               AnyBalance.trace('Не удалось получить доп. счетчики из Яндекс.виджета: ' + e.message);
           }else{ 
               var matches;
               if(e.message && (matches = e.message.match(/login:(\d+).*wrong_cnt:(\d+)/i)))
                   throw new AnyBalance.Error('Неправильный номер телефона или пароль. Неудачных входов подряд: ' + matches[2]);
               throw new AnyBalance.Error(errorInTray + '. Яндекс.Виджет: ' + e.message);
           }
        }
    }

    getInternetInfo(filial, result, internet_totals_was);
    
    AnyBalance.setResult(result);
    
}

function getInternetInfo(filial, result, internet_totals_was){
    var filinfo = filial_info[filial];
    if(!filinfo.internetRobot)
         return; //Нет ссылки на инфу по интернету

    var prefs = AnyBalance.getPreferences();
    var xml = AnyBalance.requestGet(filinfo.internetRobot
	.replace(/%LOGIN%/g, encodeURIComponent(prefs.login))
	.replace(/%PASSWORD%/g, encodeURIComponent(prefs.password)));

    var total = getParam(xml, null, null, /<ALL_VOLUME>([\s\S]*?)<\/ALL_VOLUME>/i, replaceTagsAndSpaces, parseTrafficMyMb);
    if(isset(total)){
        var need_traffic = !internet_totals_was[total];
        
        if(!need_traffic){
            AnyBalance.trace('Трафик ' + total + ' уже есть, поэтому не будем его дополнительно искать');
        }
        
        if(need_traffic){
            sumParam(xml, result, 'internet_cur', /<CUR_VOLUME>([\s\S]*?)<\/CUR_VOLUME>/i, replaceTagsAndSpaces, parseTrafficMyMb, aggregate_sum);
            sumParam(xml, result, 'internet_left', /<LOST_VOLUME>([\s\S]*?)<\/LOST_VOLUME>/i, replaceTagsAndSpaces, parseTrafficMyMb, aggregate_sum);
            sumParam(xml, result, 'internet_total', /<ALL_VOLUME>([\s\S]*?)<\/ALL_VOLUME>/i, replaceTagsAndSpaces, parseTrafficMyMb, aggregate_sum);
        }
    }else{
        var error = getParam(xml, null, null, /<ERROR>([\s\S]*?)<\/ERROR>/i, replaceTagsAndSpaces, html_entity_decode);
        AnyBalance.trace('Пакет трафика не найден: ' + error);
    }
}

/*
//Эта функция получает данные из мобильного кабинета. Но это ненадежно, потому что работает только через соответствующий мобильный интернет.

function getInternetInfo(filial, result){
    var filinfo = filial_info[filial];
    if(!filinfo.internet)
         return; //Нет ссылки на инфу по интернету

    var prefs = AnyBalance.getPreferences();
    var html = AnyBalance.requestGet(filinfo.internet);

    AnyBalance.trace('Попытаемся получить трафик из интернет-кабинета (но это возможно только с мобильного интернета Мегафона)');
    var counters = ['internet_left', 'internet_total', 'internet_cur', 'gb_with_you', 'balance', '__tariff'];

    var need_int_left = isAvailableButUnset(result, ['internet_left']),
        need_int_total = isAvailableButUnset(result, ['internet_total']),
        need_int_cur = isAvailableButUnset(result, ['internet_cur']),
        need_gb_with_you = isAvailableButUnset(result, ['gb_with_you']);

    var num = getParam(html, null, null, /<p[^>]+class="phone"[^>]*>([\s\S]*?)<\/p>/i, [replaceTagsAndSpaces, /\D/g, '']);
    if(!num){
        var error = getParam(html, null, null, /<article[^>]+class="warr?ning error"[^>]*>([\s\S]*?)<\/article>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error){
            AnyBalance.trace(error);
        }else{  
            AnyBalance.trace('Не удаётся найти номер телефона. Заход не с мобильного интернета?');
            AnyBalance.trace(html);
        }
        ensureNullOrSet(result, counters);
        return; 
    }

    if(!endsWith(num, prefs.login)){
        AnyBalance.trace('Мобильный интернет от другого телефона: ' + num + ', а требуется ' + prefs.login);
        ensureNullOrSet(result, counters);
        return; 
    }
    
    AnyBalance.trace('Интернет-кабинет: ' + html);

    if(isAvailableButUnset(result, ['__tariff']))
        getParam(html, result, '__tariff', /Ваш тарифный план([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
    if(isAvailableButUnset(result, ['balance']))
        getParam(html, result, 'balance', /<p[^>]+class="balance"[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseBalance);

    var internets = sumParam(html, null, null, /<h5[^>]*>(?:[\s\S](?!<\/h5>))*.<\/h5>\s*<table[^>]+class="details"[^>]*>[\s\S]*?<\/table>/ig);
    for(var i=0; i<internets.length; ++i){
        var internet = internets[i];
        var name = getParam(internet, null, null, /<h5[^>]*>[\s\S]*?<\/h5>/i, replaceTagsAndSpaces, html_entity_decode);
        if(/Гигабайт в дорогу/i.test(name)){
            if(need_gb_with_you)
            	sumParam(internet, result, 'gb_with_you', /<td[^>]+class="traffic-by"[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
        }else{
            var int_left = sumParam(internet, null, null, /<td[^>]+class="traffic-by"[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
            var int_total = getParam(internet, null, null, /<td[^>]+class="traffic"[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
            var int_cur;

            if(isset(int_left) && isset(int_total))
                int_cur = int_total - int_left;
            if(need_int_left && isset(int_left)){
                result.internet_left = (result.internet_left || 0) + int_left;
            }
            if(need_int_total && isset(int_total)){
                result.internet_total = (result.internet_total || 0) + int_total;
            }
            if(need_int_cur && isset(int_cur)){
                result.internet_cur = (result.internet_cur || 0) + int_cur;
            }
        }
    }

    ensureNullOrSet(result, counters);

}
*/
function ensureNullOrSet(result, names){
    for(var i=0; i<names.length; ++i){
        var name = names[i];
        if(isAvailableButUnset(result, [name]))
            result[name] = null;
    }
}

function getLeftAndTotal(text, result, needleft, needtotal, left, total, parseFunc){
    var reDiscount3Value = /^[^\/]*\/([^\/]*)\/[^\/]*$/;
    var reDiscount3Total = /[^\/]*\/[^\/]*\/([^\/]*)/;
    var reDiscount2Value = /^[^\/]*\/([^\/]*)$/;
    var reDiscount2Total = /^([^\/]*)\/[^\/]*$/;

    var _left = getParam(text, null, null, [reDiscount3Value, reDiscount2Value], null, parseFunc);
    var _total = getParam(text, null, null, [reDiscount3Total, reDiscount2Total], null, parseFunc);
    if(isset(_left) && isset(_total) && _total < _left){
        //Всего меньше, чем осталось. Значит, надо наоборот
        var tmp = _total; _total = _left; _left = tmp;
    }

    var ret = {left: _left, total: _total};
    addLeftAndTotal(ret, result, needleft, needtotal, left, total);

    return ret;
}

function addLeftAndTotal(val, result, needleft, needtotal, left, total){
    if(needleft && isset(val.left)) result[left] = (result[left] || 0) + val.left;
    if(needtotal && isset(val.total)) result[total] = (result[total] || 0) + val.total;
}


function read_sum_parameters_text(result, xml){
    getParam(xml, result, 'sub_smit', /<SMIT>([\s\S]*?)<\/SMIT>/i, null, parseBalance);
    getParam(xml, result, 'sub_smio', /<SMIO>([\s\S]*?)<\/SMIO>/i, null, parseBalance);
    getParam(xml, result, 'sub_scl', /<SCL>([\s\S]*?)<\/SCL>/i, null, parseBalance);
    getParam(xml, result, 'sub_scr', /<SCR>([\s\S]*?)<\/SCR>/i, null, parseBalance);
    getParam(xml, result, 'sub_soi', /<SOI>([\s\S]*?)<\/SOI>/i, null, parseBalance);
}

/**
 * Получаем данные из обычного сервис-гида для столичного филиала
 */
function megafonServiceGuide(filial){
    var filinfo = filial_info[filial];
    var baseurl = filinfo.site;
    
    var prefs = AnyBalance.getPreferences();
    AnyBalance.trace('Connecting to service guide ' + filinfo.name);

    var session;
    if(filial == MEGA_FILIAL_MOSCOW){
        if(prefs.corporate){
            session = AnyBalance.requestGet('http://moscow.megafon.ru/ext/sg_gate.phtml?MSISDN=CP_' + prefs.login + '&PASS=' + encodeURIComponent(prefs.password) + '&CHANNEL=WWW');
        }else{
            //Влад, ну что же ты всё подглядываешь-то??? Впрочем, пользуйся, не жалко :)
            session = AnyBalance.requestGet(baseurl + 'SESSION/GET_SESSION?MSISDN=' + ((prefs.corporate ? 'CP_' : '') + prefs.login) + '&PASS=' + encodeURIComponent(prefs.password) + '&CHANNEL=WWW');
			var code = AnyBalance.getLastStatusCode();
			if(code > 400){
				AnyBalance.trace('Невозможно зайти в сервис гид, придется получать данные из виджета');
				megafonTrayInfo(filial);
				return;
			}
        }
    }else{
	session = AnyBalance.requestPost(baseurl + 'ps/scc/php/check.php?CHANNEL=WWW', {
            LOGIN: (prefs.corporate ? 'CP_' : '') + prefs.login, 
            PASSWORD: prefs.password
        });
    }
	
    AnyBalance.trace('Got result from service guide: ' + session);

    var matches;
    if(matches = session.match(/<ERROR_ID>(.*?)<\/ERROR_ID>/i)){
        var errid = matches[1];
        AnyBalance.trace('Got error from sg: ' + errid);

        if(errid == '60020011')
            throw new AnyBalance.Error('Пользователь заблокирован. Для разблокировки наберите команду *105*00# и нажмите клавишу вызова, новый пароль будет отправлен Вам в SMS.');

        //Случилась ошибка, может быть мы можем даже увидеть её описание
        if(matches = session.match(/<ERROR_MESSAGE>(.*?)<\/ERROR_MESSAGE>/i)){
            AnyBalance.trace('Got error message from sg: ' + matches[1]);
            throw new AnyBalance.Error(matches[1]);
        }

        errid = "error_" + Math.abs(parseInt(errid));
        if(g_login_errors[errid])
            throw new AnyBalance.Error(g_login_errors[errid]);

        AnyBalance.trace('Got unknown error from sg');
        throw new AnyBalance.Error(g_login_errors.error_0);
    }

    if(!(matches = session.match(/<SESSION_ID>(.*?)<\/SESSION_ID>/i))){
        throw new AnyBalance.Error('Не удалось получить сессию'); //Странный ответ, может, можно переконнектиться потом
    }

    var sessionid = matches[1];
/*
    //Зачем-то мегафон вставил ещё один шаг авторизации...
    var html = AnyBalance.requestPost(baseurl + 'SCC/SC_BASE_LOGIN',
    {
	SESSION_ID:sessionid,
	CHANNEL:'WWW',
        LOGIN: (prefs.corporate ? 'CP_' : '') + prefs.login, 
        PASSWD: prefs.password
    });
*/

    //Мегафон завершается с ошибкой, если делать без таймаута.
    //Странно
//    sleep(5000);

    if(prefs.corporate)
        megafonServiceGuideCorporate(filial, sessionid);
    else
        megafonServiceGuidePhysical(filial, sessionid);
}

function megafonServiceGuideCorporate(filial, sessionid){
    var filinfo = filial_info[filial];
    var baseurl = filinfo.site;
    var prefs = AnyBalance.getPreferences();

    var result = {
        success: true
    };

    var html = AnyBalance.requestPost(baseurl + 'CPWWW/SC_CP_ASSC_CHARGES_FORM', {
        find: '',
        CHANNEL:'WWW',
        SESSION_ID:sessionid,
        P_USER_LANG_ID:1        
    });

    if(/SESSION_TIMEOUT_REDIRECT/.test(html))
        throw new AnyBalance.Error('Мегафон не желает пускать в корпоративный портал, возможно, из-за того, что введена капча (ввод цифр с картинки) на входе. Если вы знаете способ войти в корпоративный портал без капчи, обращайтесь к автору провайдера по е-мейл.');

    //Получим объединение:
    var asscid = getParam(html, null, null, /<select[^>]+id="P_START_ASSC_ID"[^>]*>[\s\S]*?<option[^>]+value="([^"]*)"/i);
    getParam(html, result, '__tariff', /<select[^>]+id="P_START_ASSC_ID"[^>]*>[\s\S]*?<option[^>]+title="([^"]*)"/i, null, html_entity_decode);

    html = AnyBalance.requestPost(baseurl + 'CPWWW/SC_CP_ACCOUNT_ASSC_AJAX', {
        P_ACCOUNT:'',
        P_START_ASSC_ID:asscid,
        P_ACCOUNT_PREV_FORM:'SC_CP_ASSC_CHARGES_FORM',
        P_ASSC_ACCOUNT_LOADED:'onLoadedAccount()',
        P_ASSC_ACCOUNT_RADIO_CLICK:'onClickRadioAccount()',
        CHANNEL:'WWW',
        SESSION_ID:sessionid,
        P_USER_LANG_ID:1
    });

    //Теперь получим баланс
    getParam(html, result, 'balance', /<div class="balance_[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}

function checkTextForError(text){
    //Произошла ошибка при работе с системой.
    var error = getParam(text, null, null, /&#1055;&#1088;&#1086;&#1080;&#1079;&#1086;&#1096;&#1083;&#1072; &#1086;&#1096;&#1080;&#1073;&#1082;&#1072; &#1087;&#1088;&#1080; &#1088;&#1072;&#1073;&#1086;&#1090;&#1077; &#1089; &#1089;&#1080;&#1089;&#1090;&#1077;&#1084;&#1086;&#1081;[\s\S]*?<[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    if(error)
        throw new AnyBalance.Error(error);
}

function sleep(delay) {
   if(AnyBalance.getLevel() < 6){
      var startTime = new Date();
      var endTime = null;
      do {
          endTime = new Date();
      } while (endTime.getTime() - startTime.getTime() < delay);
   }else{
      AnyBalance.sleep(delay);
   }
} 

function megafonServiceGuidePhysical(filial, sessionid){
    var filinfo = filial_info[filial];
    var baseurl = filinfo.site;
    var prefs = AnyBalance.getPreferences(), matches;
    
    var result = {success: true};

    var phone = prefs.phone || prefs.login;

    var text = AnyBalance.requestPost(baseurl + 'SCWWW/ACCOUNT_INFO',
    {
        SUBSCRIBER_MSISDN:phone,
        CHANNEL: 'WWW', 
        SESSION_ID: sessionid,
        P_USER_LANG_ID: 1,
        CUR_SUBS_MSISDN:phone
    });

    checkTextForError(text);
	
    //Теперь получим баланс
    getParam(text, result, 'balance', /&#1041;&#1072;&#1083;&#1072;&#1085;&#1089;[\s\S]*?<div class="balance_[^>]*>([\S\s]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    //Теперь получим телефон
    getParam(text, result, 'phone', /<select[^>]*name="SUBSCRIBER_MSISDN"[\s\S]*?<option[^>]+value="([^"]*)[^>]*selected/i, replaceTagsAndSpaces, html_entity_decode);
    //Теперь получим персональный баланс
    getParam(text, result, 'prsnl_balance', /&#1055;&#1077;&#1088;&#1089;&#1086;&#1085;&#1072;&#1083;&#1100;&#1085;&#1099;&#1081; &#1073;&#1072;&#1083;&#1072;&#1085;&#1089;[\s\S]*?<div class="balance_[^>]*>([\S\s]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);

    //Начислено абонентской платы по тарифному плану:
    getPropValFloat(text, '&#1053;&#1072;&#1095;&#1080;&#1089;&#1083;&#1077;&#1085;&#1086; &#1072;&#1073;&#1086;&#1085;&#1077;&#1085;&#1090;&#1089;&#1082;&#1086;&#1081; &#1087;&#1083;&#1072;&#1090;&#1099; &#1087;&#1086; &#1090;&#1072;&#1088;&#1080;&#1092;&#1085;&#1086;&#1084;&#1091; &#1087;&#1083;&#1072;&#1085;&#1091;:',
        result, 'sub_smit');
    //Начислено абонентской платы за услуги:
    getPropValFloat(text, '&#1053;&#1072;&#1095;&#1080;&#1089;&#1083;&#1077;&#1085;&#1086; &#1072;&#1073;&#1086;&#1085;&#1077;&#1085;&#1090;&#1089;&#1082;&#1086;&#1081; &#1087;&#1083;&#1072;&#1090;&#1099; &#1079;&#1072; &#1091;&#1089;&#1083;&#1091;&#1075;&#1080;:',
        result, 'sub_smio');
    //Начислено за услуги:
    getPropValFloat(text, '&#1053;&#1072;&#1095;&#1080;&#1089;&#1083;&#1077;&#1085;&#1086; &#1079;&#1072; &#1091;&#1089;&#1083;&#1091;&#1075;&#1080;:',
        result, 'sub_soi');
    //Начислено за звонки:
    getPropValFloat(text, '&#1053;&#1072;&#1095;&#1080;&#1089;&#1083;&#1077;&#1085;&#1086; &#1079;&#1072; &#1079;&#1074;&#1086;&#1085;&#1082;&#1080;:',
        result, 'sub_scl');
    //Расходование средств по абоненту ... Роуминг:
    getPropValFloat(text, '&#1056;&#1072;&#1089;&#1093;&#1086;&#1076;&#1086;&#1074;&#1072;&#1085;&#1080;&#1077; &#1089;&#1088;&#1077;&#1076;&#1089;&#1090;&#1074; &#1087;&#1086; &#1072;&#1073;&#1086;&#1085;&#1077;&#1085;&#1090;&#1091;[\\s\\S]*?&#1056;&#1086;&#1091;&#1084;&#1080;&#1085;&#1075;:',
        result, 'sub_scr');
	
    //Текущий тарифный план
    var tariff = getPropValText(text, '&#1058;&#1077;&#1082;&#1091;&#1097;&#1080;&#1081; &#1090;&#1072;&#1088;&#1080;&#1092;&#1085;&#1099;&#1081; &#1087;&#1083;&#1072;&#1085;:');
    if(tariff)
        result.__tariff = tariff; //Special variable, not counter
    
    //Бонусный баланс
    getPropValFloat(text, '&#1041;&#1086;&#1085;&#1091;&#1089;&#1085;&#1099;&#1081; &#1073;&#1072;&#1083;&#1072;&#1085;&#1089;:', result, 'bonus_balance');
    
    //Между Текущие скидки и пакеты услуг: и Текущие услуги:
    //matches = text.match(/<div сlass="heading">&#1058;&#1077;&#1082;&#1091;&#1097;&#1080;&#1077; &#1089;&#1082;&#1080;&#1076;&#1082;&#1080; &#1080; &#1087;&#1072;&#1082;&#1077;&#1090;&#1099; &#1091;&#1089;&#1083;&#1091;&#1075;:<\/div>([\s\S]*?)<div class="heading">&#1058;&#1077;&#1082;&#1091;&#1097;&#1080;&#1077; &#1091;&#1089;&#1083;&#1091;&#1075;&#1080;:<\/div>/); 
    var text = getParam(text, null, null, /<table(?:[\s\S](?!<\/table>))*?(?:colname="SUBS_VOLUME"|head_grid_template_name="DISCOUNTS")(?:[\s\S]*?<\/table>){2}/i);
    if(text){//Таблица скидок
        var colnum = /colname="OWNER"/.test(text) ? 2 : 1; //Новая колонка в некоторых кабинетах - владелец скидки
    
        //Должны точно ловиться:
        //Бонус 1 - полчаса бесплатно (Москва)
        //10 мин на МТС, Билайн, Скай Линк
        
        var reOption = /(<tr[^>]*>(?:(?:[\s\S](?!<\/tr>))*?<td[^>]*>\s*<div[^>]+class="td_def"[^>]*>){3}[\s\S]*?<\/tr>)/ig;
        while(matches = reOption.exec(text)){
            var name = getParam(matches[1], null, null, /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
            //Ищем в таблице скидок строки вида: 39:00 мин   39:00, что означает Всего, Остаток
            var p = /<div class="td_def">\s*(\d+)(?::(\d+))?[^<]*(?:&#1052;|&#1084;)&#1080;&#1085;[^<]*<[^&#;\d]*<div class="td_def">(\d+)(?::(\d+))?/i.exec(matches[1]);
            if(p){ //Это минуты, надо бы их рассортировать
                 if(/мин на МТС Билайн Скай Линк/i.test(name))
                     sumOption(colnum, matches[1], result, 'mins_compet_total', 'mins_compet_left', '.', parseMinutes);
                 else if(/мин на номера СНГ/i.test(name))
                     sumOption(colnum, matches[1], result, 'mins_sng_total', 'mins_sng_left', '.', parseMinutes);
                 else if(/мин по России/i.test(name))
                     sumOption(colnum, matches[1], result, 'mins_country_total', 'mins_country_left', '.', parseMinutes);
                 else if(/внутри сети/i.test(name))
                     sumOption(colnum, matches[1], result, 'mins_net_total', 'mins_net_left', '.', parseMinutes);
                 else
                     sumOption(colnum, matches[1], result, 'mins_total', 'mins_left', '.', parseMinutes);
            }else if(/GPRS|Интернет|Internet|\d+\s+[гмкgmk][бb]/i.test(name)){
                 sumOption(colnum, matches[1], result, 'internet_total', 'internet_left', '.', parseTrafficMy);
                 if(AnyBalance.isAvailable('internet_cur')){
                     var total = getParam(matches[1], null, null, /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficMy);
                     var left = getParam(matches[1], null, null, /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficMy);
                     if(isset(total) && isset(left))
                         result.internet_cur = (result.internet_cur || 0) + total - left;
                 }
            }
        }
          
        // Карманный интернет теперь покрывается циклом выше
        
        //200 SMS MegaVIP 0
        //Пакет SMS за бонусы (SMS &#1079;&#1072; &#1073;&#1086;&#1085;&#1091;&#1089;&#1099;)
        //Пакет SMS-сообщений (Поволжье) (&#1055;&#1072;&#1082;&#1077;&#1090; SMS-&#1089;&#1086;&#1086;&#1073;&#1097;&#1077;&#1085;&#1080;&#1081;)
        //SMS на номера России (SMS &#1085;&#1072; &#1085;&#1086;&#1084;&#1077;&#1088;&#1072; &#1056;&#1086;&#1089;&#1089;&#1080;&#1080;)
        //(SMS)
        sumOption(colnum, text, result, 'sms_total', 'sms_left', 'SMS');
        sumOption(colnum, text, result, 'sms_total', 'sms_left', 'СМС');
        
        //Исходящие SM (ОХард, Москва)
        sumOption(colnum, text, result, 'sms_total', 'sms_left', '&#1048;&#1089;&#1093;&#1086;&#1076;&#1103;&#1097;&#1080;&#1077; SM\\s*<');
            
        //MMS
        sumOption(colnum, text, result, 'mms_total', 'mms_left', 'MMS');
        sumOption(colnum, text, result, 'mms_total', 'mms_left', 'ММС');
        
        //Нужный подарок (Поволжье)
        sumOption(colnum, text, result, 'handygift_total', 'handygift_left', '&#1053;&#1091;&#1078;&#1085;&#1099;&#1081; &#1087;&#1086;&#1076;&#1072;&#1088;&#1086;&#1082;');
        
        //Гигабайт в дорогу
        sumOption(colnum, text, result, null, 'gb_with_you', '&#1043;&#1080;&#1075;&#1072;&#1073;&#1072;&#1081;&#1090; &#1074; &#1076;&#1086;&#1088;&#1086;&#1075;&#1091;');
    }

    //Пакет Интернет 24 теперь покрывается циклом выше

    if(AnyBalance.isAvailable('last_pay_sum', 'last_pay_date')){
        text = AnyBalance.requestPost(baseurl + 'SCWWW/PAYMENTS_INFO',
                    {
                        CHANNEL: 'WWW', 
                        SESSION_ID: sessionid,
                        CUR_SUBS_MSISDN: phone,
                        SUBSCRIBER_MSISDN: phone
                    });
        getParam(text, result, 'last_pay_sum', /idHiddenSum[^>]*>\s*<table(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(text, result, 'last_pay_date', /idHiddenSum[^>]*>\s*<table(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    }
	
    // Бонусный баланс (здесь более точно указано)
    if(AnyBalance.isAvailable('bonus_balance', 'bonus_balance_burn')){
        text = AnyBalance.requestPost(baseurl + 'SCWWW/BONUS_FORM',
                {
                    CHANNEL: 'WWW', 
                    SESSION_ID: sessionid,
                    CUR_SUBS_MSISDN: phone,
                    SUBSCRIBER_MSISDN: phone
                });
                
        if(matches = text.match(/&#1041;&#1086;&#1085;&#1091;&#1089;&#1085;&#1099;&#1081; &#1073;&#1072;&#1083;&#1072;&#1085;&#1089;:[\s\S]*?<td class="td_right">[\s\S]*?<div>([\d\.]+)/i)){
            result.bonus_balance = parseFloat(matches[1]);
        }

        //Сгорают в текущем месяце
        getParam(text, result, 'bonus_burn', /<colgroup[^>]+grid_template_name="DEAD_BONUSES"(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    }


    if(filial == MEGA_FILIAL_MOSCOW){
        // Продли скорость (Москва)
        if(AnyBalance.isAvailable(['internet_total','internet_cur', 'internet_left'])){
            text = AnyBalance.requestGet(baseurl + 'SCCEXTSYS/EXT_SYSTEM_PROXY_FORM?CHANNEL=WWW&SESSION_ID=' + sessionid + '&URI=3.');
            var href = getParam(text, null, null, /"gupscc_href"[^>]*href="([^"]*)"/i, [/&amp;/g, '&']);
            if(href){
                text = AnyBalance.requestGet(baseurl + 'SCCEXTSYS/' + href);
                var obj = getParam(text, null, null, /setXMLEntities\s*\(\s*(\{[\s\S]*?\})\s*\)/);
                if(obj){
                     //Сначала попытаемся получить из надписи, почему-то там точнее написано.
                     //Периодический объем. Расходуется. Осталось 3036.96 Мб из 3072.00 Мб. Срок действия до 07.12.2012 23:59:59
                     var i_t = getParam(obj, null, null, /Периодический объем.\s*Расходуется.\s*Осталось[^'"]*из([^'"]*)Срок/i, replaceTagsAndSpaces, parseTrafficMy);
                     if(!isset(i_t))
                         i_t = getParam(obj, null, null, /ALL_VOLUME[\s\S]*?value:\s*'([^']*)'/, replaceTagsAndSpaces, parseBalance);

                     var i_c = getParam(obj, null, null, /CUR_VOLUME[\s\S]*?value:\s*'([^']*)'/, replaceTagsAndSpaces, parseBalance);

                     var i_l = getParam(obj, null, null, /Периодический объем.\s*Расходуется.\s*Осталось([^'"]*)из/i, replaceTagsAndSpaces, parseTrafficMy);
                     if(!isset(i_l))
                         i_l = getParam(obj, null, null, /LAST_VOLUME[\s\S]*?value:\s*'([^']*)'/, replaceTagsAndSpaces, parseBalance);

                     if(i_t && AnyBalance.isAvailable('internet_total'))
                         result.internet_total = (result.internet_total || 0) + i_t;
                     if(isset(i_c) && AnyBalance.isAvailable('internet_cur'))
                         if(i_t || i_c) //Если всё по нулям, это может быть просто глюк мегафона
                             result.internet_cur = (result.internet_cur || 0) + i_c;
                     if(isset(i_l) && AnyBalance.isAvailable('internet_left'))
                         if(i_t || i_l) //Если всё по нулям, это может быть просто глюк мегафона
                             result.internet_left = (result.internet_left || 0) + i_l;

                     getParam(obj, result, 'internet_till', /Срок действия до ([^'"]*)/i, replaceTagsAndSpaces, parseDate);
                }else{
                    AnyBalance.trace("Не удаётся найти информацию по услугам GPRS...");
                }
            }else{
                AnyBalance.trace("Не удаётся найти ссылку на Услуги GPRS...");
            }
			AnyBalance.trace('Пробуем получить данные из "Изменение тарифных опций"');
			// Еще один интернет
			text = AnyBalance.requestPost(baseurl + 'SCWWW/PACKS_FORM', {
				'P_GRID_LEFT':'0',
				'P_GRID_WIDTH':'740',
				'find':'',
				'CHANNEL':'WWW',
				'SESSION_ID':sessionid,
				'P_USER_LANG_ID':'1',
				'CUR_SUBS_MSISDN':phone,
				'SUBSCRIBER_MSISDN':phone
			});
			var tbody = getParam(text, null, null, /(?:Опции группы|&#1054;&#1087;&#1094;&#1080;&#1080; &#1075;&#1088;&#1091;&#1087;&#1087;&#1099;)[\s\S]*?(<tbody>[\s\S]*?<\/tbody>)/i, null, html_entity_decode);
			if(tbody)
			{
				AnyBalance.trace('Получили таблицу услуг...');
				//AnyBalance.trace(tbody);
				
				var enabledTrs = sumParam(tbody, null, null, /<tr[^>]*class="grid-row"[^>]*>(?:[\s\S](?!<tr[^>]*class="grid-row"[^>]*>))*/ig);
				AnyBalance.trace('Нашли ' + enabledTrs.length + ' элементов в таблице');
				
				for(var i = 0; i < enabledTrs.length; i++)
				{
					var checkedLen = 0;
					var tr = enabledTrs[i];
					if(/checked/i.test(tr))
					{
						AnyBalance.trace('Нашли ' + ++checkedLen + ' отмеченных элементов в таблице');
						var optName = getParam(tr, null, null, /<TMP_PACK_NAME>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
						AnyBalance.trace('Опция ' + optName);
						if(optName == 'Интернет XS')
						{
							AnyBalance.trace('Опция ' + optName+ ' нам известна, разбираем...');
							sumParam(tr, result, 'internet_total', /Включённый объём:(?:[\s\S]*?<div[^>]*>){3}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
							sumParam(tr, result, 'internet_left', /Включённый объём:(?:[\s\S]*?<div[^>]*>){4}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseTraffic, aggregate_sum);

							if(isAvailable('internet_cur'))
								result.internet_cur = (result.internet_cur||0) + (result.internet_total - (result.internet_left||0));
						}
						else
							AnyBalance.trace('Опция ' + optName+ ' не известна, свяжитесь с автором провайдера для добавления данной опции.');
					}
				}
			}
			else
				AnyBalance.trace("Не удаётся найти таблицу услуг, свяжиетсь с автором провайдера");
        }
    }
    
    if(filial == MEGA_FILIAL_VOLGA){
        if(AnyBalance.isAvailable('internet_left')) {
            text = AnyBalance.requestGet(baseurl + 'SCCEXTSYS/EXT_SYSTEM_PROXY_FORM?CHANNEL=WWW&SESSION_ID=' + sessionid + '&URI=5.');
            sumParam(text, result, 'internet_left', /<volume>([^<]*)<\/volume>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
            sumParam(text, result, 'internet_left', /осталось ([^<]*(?:[kmgкмг][бb]|байт|bytes))/i, replaceTagsAndSpaces, parseTrafficMy, aggregate_sum);
        }
    }
    
    AnyBalance.setResult(result);
}

//Получает значение из таблиц на странице аккаунта по фрагменту названия строки
function getPropVal(html, text){
  var r = new RegExp(text + "[\\s\\S]*?<div class=\"td_def\">(?:<nobr>)?([\\s\\S]*?)(?:<\\/nobr>)?<\\/div>", "i");
  var matches = html.match(r);
  return matches;
}

function parseMinutes(str){
    var _str = html_entity_decode(str);
    var matches = /([\d.]+)\s*мин\w*\s*([\d.]+)\s*сек/i.exec(_str), val;
    if(!matches || matches[0]=='')
        matches = /(\d+):(\d+)/i.exec(_str);
    if(!matches)
        matches = /([\d.]+)\s*мин/i.exec(_str);
    if(!matches)
        matches = /()([\d.]+)\s*сек/i.exec(_str);
    if(!matches)
        matches = /([\d.]+)/i.exec(_str);
    if(matches)
        val = (matches[1] ? +matches[1] : 0)*60 + (matches[2] ? +matches[2] : 0);
    if(isset(val))
        AnyBalance.trace('Parsed ' + val + ' seconds from ' + str + ' (' + _str + ')');
    else
        AnyBalance.trace('Failed to parse seconds from ' + str + ' (' + _str + ')');
    return val;
}

function sumOption(num, text, result, totalName, leftName, optionName, parseFunc){
    if(!parseFunc) parseFunc = parseBalance;

    if(totalName){
        var aggregate = /^mins_/.test(totalName) ? aggregate_sum_minutes : aggregate_sum;
        var re1 = new RegExp('<tr[^>]*>\\s*<td[^>]*>\\s*<div[^>]+class="td_def"[^>]*>(?:<div[^>]*>|[^<]|<nobr[^>]*>)*' + optionName + '(?:(?:[\\s\\S](?!<tr))*?<td[^>]*>){' + num + '}([\\s\\S]*?)</td>', 'ig');
        sumParam(text, result, totalName, re1, replaceTagsAndSpaces, parseFunc, aggregate);
    }
    if(leftName){
        var aggregate = /^mins_/.test(leftName) ? aggregate_sum_minutes : aggregate_sum;
        var re2 = new RegExp('<tr[^>]*>\\s*<td[^>]*>\\s*<div[^>]+class="td_def"[^>]*>(?:<div[^>]*>|[^<]|<nobr[^>]*>)*' + optionName + '(?:(?:[\\s\\S](?!<tr))*?<td[^>]*>){' + (num+1) + '}([\\s\\S]*?)</td>', 'ig');
        sumParam(text, result, leftName, re2, replaceTagsAndSpaces, parseFunc, aggregate);
    }
}

function getPropValText(html, text){
  var matches = getPropVal(html, text);
  if(!matches)
    return null;
  
  return html_entity_decode(strip_tags(matches[1])).replace(/&nbsp;/g, ' ').replace(/^\s+|\s+$/g, '');
}

function getPropValInt(html, text){
  var matches = getPropVal(html, text);
  if(!matches)
    return null;
  
  matches = matches[1].match(/(\d+)/);
  if(!matches)
    return null;
  
  return parseInt(matches[1]);
}

function getPropValFloat(html, text, result, counter){
  if(result && AnyBalance.isAvailable(counter)){
    var matches = getPropVal(html, text);
    if(!matches)
      return null;
    
    matches = matches[1].match(/([\d\.,]+)/);
    if(!matches)
      return null;
    
    var val = parseFloat(matches[1].replace(/,/g, '.'));
    if(result)
        result[counter] = val;
    
    return val;
  }
}

//Получает две цифры (всего и остаток) из таблицы опций по тексту названия опции
function getOptionDigits(html, text){
  var r = new RegExp(text + "[\\s\\S]*?<div class=\"td_def\">([\\d+\\.,:]+)[\\s\\S]*?<div class=\"td_def\">([\\d+\\.,:]+)", "i");
  var matches = html.match(r);
  return matches;
}

//Получает время в секундах из строки вида 10:05
function getSeconds(mincolonseconds){
  var matches = mincolonseconds.match(/(\d+):(\d+)/);
  if(!matches)
    return 0;
  
  return parseInt(matches[1])*60 + parseInt(matches[2]);
}

function getOptionTimeIntervals(html, text){
  var matches = getOptionDigits(html, text);
  if(!matches)
    return null;
  
  return [getSeconds(matches[1]), getSeconds(matches[2])];
}

function getOptionInt(html, text){
  var matches = getOptionDigits(html, text);
  if(!matches)
    return null;
  
  return [parseInt(matches[1]), parseInt(matches[2])];
}

function getOptionFloat(html, text){
  var matches = getOptionDigits(html, text);
  if(!matches)
    return null;
  
  return [parseFloat(matches[1].replace(/,/g, '.')), parseFloat(matches[2].replace(/,/g, '.'))];
}

function strip_tags(str){
  return str.replace(/<[^>]*>/g, '');
}

function parseTrafficMy(str){
  return parseTrafficExMega(str, 1024, 2, 'b');
}

function parseTrafficMyMb(str){
  return parseTrafficExMega(str, 1024, 2, 'mb');
}

function aggregate_sum_minutes(values){
    if(values.length == 0)
        return;
    var total_value = 0;
    for(var i=0; i<values.length; ++i){
        if(values[i] < 24*60*31*60) //Большие значения это безлимит, они нам неинтересны
            total_value += values[i];
    }
    return total_value;
}

/**
 * Вычисляет трафик в нужных единицах из переданной строки.
 */
function parseTrafficExMega(text, thousand, order, defaultUnits){
    var _text = html_entity_decode(text.replace(/\s+/g, ''));
    var val = getParam(_text, null, null, /(-?\.?\d[\d\.,]*)/, replaceFloat, parseFloat);
    if(!isset(val)){
        AnyBalance.trace("Could not parse traffic value from " + text);
        return;
    }
    var units = getParam(_text, null, null, /([kmgкмгт][бb]?|[бb](?![\wа-я])|байт|bytes)/i);
    if(!units && !defaultUnits){
        AnyBalance.trace("Could not parse traffic units from " + text);
        return;
    }
    if(!units) units = defaultUnits;
    switch(units.substr(0,1).toLowerCase()){
      case 'b':
      case 'б':
        val = Math.round(val/Math.pow(thousand, order)*100)/100;
        break;
      case 'k':
      case 'к':
        val = Math.round(val/Math.pow(thousand, order-1)*100)/100;
        break;
      case 'm':
      case 'м':
        val = Math.round(val/Math.pow(thousand, order-2)*100)/100;
        break;
      case 't': //100кб интервалы
      case 'т':
        val = Math.round(val*100/Math.pow(thousand, order-1)*100)/100;
        break;
      case 'g':
      case 'г':
        val = Math.round(val/Math.pow(thousand, order-3)*100)/100;
        break;
    }
    var textval = ''+val;
    if(textval.length > 6)
      val = Math.round(val);
    else if(textval.length > 5)
      val = Math.round(val*10)/10;
    var dbg_units = {0: 'b', 1: 'kb', 2: 'mb', 3: 'gb'};
    AnyBalance.trace('Parsing traffic (' + val + dbg_units[order] + ') from: ' + text);
    return val;
}

