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
  site: "https://moscowsg.megafon.ru/"
};
filial_info[MEGA_FILIAL_SIBIR] = {
  name: 'Сибирский филиал',
  site: "https://sibsg1.megafon.ru/ROBOTS/SC_TRAY_INFO?X_Username=%LOGIN%&X_Password=%PASSWORD%",
  func: megafonTrayInfo
};
filial_info[MEGA_FILIAL_NW] = {
  name: 'Северо-западный филиал',
  site: 'https://serviceguide.megafonnw.ru/ROBOTS/SC_TRAY_INFO?X_Username=%LOGIN%&X_Password=%PASSWORD%',
  func: megafonTrayInfo
};
filial_info[MEGA_FILIAL_FAREAST] = {
  name: 'Дальневосточный филиал',
  site: 'https://dvsg.megafon.ru/ROBOTS/SC_TRAY_INFO?X_Username=%LOGIN%&X_Password=%PASSWORD%',
  func: megafonTrayInfo
};
filial_info[MEGA_FILIAL_VOLGA] = {
  name: 'Поволжский филиал',
  site: "https://volgasg.megafon.ru/",
  func: megafonServiceGuide
};
filial_info[MEGA_FILIAL_KAVKAZ] = {
  name: 'Кавказский филиал',
  site: "https://kavkazsg.megafon.ru/ROBOTS/SC_TRAY_INFO?X_Username=%LOGIN%&X_Password=%PASSWORD%",
  func: megafonTrayInfo
};
filial_info[MEGA_FILIAL_CENTRAL] = {
  name: 'Центральный филиал',
  site: 'https://centersg.megafon.ru/ROBOTS/SC_TRAY_INFO?X_Username=%LOGIN%&X_Password=%PASSWORD%',
  func: megafonTrayInfo
};
filial_info[MEGA_FILIAL_URAL] = {
  name: 'Уральский филиал',
  site: 'https://uralsg.megafon.ru/ROBOTS/SC_TRAY_INFO?X_Username=%LOGIN%&X_Password=%PASSWORD%',
  func: megafonTrayInfo
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
function getFilial(number){
    if(typeof(number) != 'string')
        throw new AnyBalance.Error('Телефон должен быть строкой из 10 цифр!');
    if(!/^\d{10}$/.test(number))
        throw new AnyBalance.Error('Телефон должен быть строкой из 10 цифр без пробелов и разделителей!');

    var html = AnyBalance.requestPost("https://sg.megafon.ru/ps/scc/php/route.php", {
	CHANNEL:'WWW',
	ULOGIN:number
    });

//    Мегафон сделал сервис для определения филиала, так что попытаемся обойтись им    
    var region = getParam(html, null, null, /<URL>https:\/\/(\w+)\./i);
    if(region && filial_info[region]){
	return filial_info[region];
    }else{
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

function megafonTrayInfo(filial){
    var filinfo = filial_info[filial];
    var prefs = AnyBalance.getPreferences();
    
    AnyBalance.trace('Connecting to trayinfo for ' + filinfo.name);
    
    AnyBalance.setDefaultCharset('utf-8');
    var info = AnyBalance.requestGet(filinfo.site
        .replace(/%LOGIN%/g, prefs.login)
        .replace(/%PASSWORD%/g, prefs.password)
    );
        
    if(/<h1>Locked<\/h1>/.test(info))
      throw new AnyBalance.Error('Вы ввели неправильный пароль или доступ автоматическим системам заблокирован.\n\
Для разблокировки необходимо зайти в Сервис-Гид и включить настройку Настройки Сервис-Гида/Автоматический доступ системам/Доступ открыт пользователям и автоматизированным системам, а также нажать кнопку "разблокировать".');
        
    var matches;
    if(matches = /<h1>([^<]*)<\/h1>\s*<p>([^<]*)<\/p>/.exec(info))
      throw new AnyBalance.Error(matches[1] + ": " + matches[2]); //Случился какой-то глючный бред
        
    var xmlDoc = $.parseXML(info),
      $xml = $(xmlDoc);
	
    //Проверяем на ошибку
    var error = $xml.find('SC_TRAY_INFO>ERROR>ERROR_MESSAGE, TRAY_INFO>ERROR>ERROR_MESSAGE').text();
    if(error){
        if(/Robot login is not allowed|does not have permissions/.test(error))
            throw new AnyBalance.Error('Пожалуйста, разрешите в Сервис-Гиде доступ автоматизированным системам.\n\
Для этого зайдите в Сервис-Гид и включите настройку Настройки Сервис-Гида/Автоматический доступ системам/Доступ открыт пользователям и автоматизированным системам.');
        else
            throw new AnyBalance.Error(error);
    }

    error = $xml.find('SELFCARE>ERROR').text();
    if(error){
        throw new AnyBalance.Error(error + ' Возможно, вам надо зайти в Сервис-Гид и включить настройку Настройки Сервис-Гида/Автоматический доступ системам/Доступ открыт пользователям и автоматизированным системам, а также нажать кнопку "разблокировать".');
    }

    var result = {success: true, __tariff: $xml.find('RATE_PLAN').text()};
    
    if(AnyBalance.isAvailable('balance'))
        result.balance = parseFloat($xml.find('BALANCE').text());
    
    
    var $threads = $xml.find('RP_DISCOUNTS>DISCOUNT>THREAD');
    AnyBalance.trace('Found discounts: ' + $threads.length);
    
    if(AnyBalance.isAvailable('sms_left','sms_total')){
        var $sms = $threads.filter(':has(NAME:contains("SMS"))');
        AnyBalance.trace('Found SMS discounts: ' + $sms.length);
        if($sms.length){
            if(AnyBalance.isAvailable('sms_left')){
                result.sms_left = parseInt($sms.first().find('VOLUME_AVAILABLE').text());
            }
            if(AnyBalance.isAvailable('sms_total')){
                result.sms_left = parseInt($sms.first().find('VOLUME_TOTAL').text());
            }
        }
        
    }
    
    if(AnyBalance.isAvailable('mins_left','mins_total')){
        var $sms = $threads.filter(':has(NAME:contains(" мин"))');
        AnyBalance.trace('Found minutes discounts: ' + $sms.length);
        if($sms.length){
            if(AnyBalance.isAvailable('mins_left')){
                result.mins_left = parseInt($sms.first().find('VOLUME_AVAILABLE').text())*60;
            }
            if(AnyBalance.isAvailable('mins_total')){
                result.mins_left = parseInt($sms.first().find('VOLUME_TOTAL').text())*60;
            }
        }
    }
    
    AnyBalance.setResult(result);
    
}

/**
 * Получаем данные из обычного сервис-гида для столичного филиала
 */
function megafonServiceGuide(filial){
    var filinfo = filial_info[filial];
    var baseurl = filinfo.site;
    
    var prefs = AnyBalance.getPreferences();
    AnyBalance.trace('Connecting to service guide ' + filinfo.name);
	
    var session = AnyBalance.requestPost(baseurl + 'ps/scc/php/check.php?CHANNEL=WWW',
    {
        LOGIN: (prefs.corporate ? 'CP_' : '') + prefs.login, 
        PASSWORD: prefs.password
        });
	
    AnyBalance.trace('Got result from service guide: ' + session);

    var matches;
    if(matches = session.match(/<ERROR_ID>(.*?)<\/ERROR_ID>/i)){
        AnyBalance.trace('Got error from sg: ' + matches[1]);
        //Случилась ошибка, может быть мы можем даже увидеть её описание
        if(matches = session.match(/<ERROR_MESSAGE>(.*?)<\/ERROR_MESSAGE>/i)){
            AnyBalance.trace('Got error message from sg: ' + matches[1]);
            throw new AnyBalance.Error(matches[1]);
        }
        AnyBalance.trace('Got unknown error from sg');
        throw new AnyBalance.Error('Неизвестная ошибка');
    }
    if(!(matches = session.match(/<SESSION_ID>(.*?)<\/SESSION_ID>/i))){
        throw new AnyBalance.Error('Не удалось получить сессию'); //Странный ответ, может, можно переконнектиться потом
    }
	
    var sessionid = matches[1];

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
    getParam(html, result, 'balance', /<div class="balance_[^>]*>([-\d\.]+)/i, null, parseFloat);

    AnyBalance.setResult(result);
}

function megafonServiceGuidePhysical(filial, sessionid){
    var filinfo = filial_info[filial];
    var baseurl = filinfo.site;
    var prefs = AnyBalance.getPreferences(), matches;
    
    var result = {
        success: true
    };
	
    var text = AnyBalance.requestPost(baseurl + 'SCWWW/ACCOUNT_INFO',
    {
        CHANNEL: 'WWW', 
        SESSION_ID: sessionid
    });
	
    if(AnyBalance.isAvailable('balance')){
        if(matches = text.match(/<div class="balance_[^>]*>([-\d\.]+)[^<]*<\/div>/i)){
            var balance = parseFloat(matches[1]);
            result.balance = balance;
        }
    }
	
    //Текущий тарифный план
    var tariff = getPropValText(text, '&#1058;&#1077;&#1082;&#1091;&#1097;&#1080;&#1081; &#1090;&#1072;&#1088;&#1080;&#1092;&#1085;&#1099;&#1081; &#1087;&#1083;&#1072;&#1085;:');
    if(tariff)
        result.__tariff = tariff; //Special variable, not counter
    
    //Бонусный баланс
    if(AnyBalance.isAvailable('bonus_balance')){
        var val = getPropValFloat(text, '&#1041;&#1086;&#1085;&#1091;&#1089;&#1085;&#1099;&#1081; &#1073;&#1072;&#1083;&#1072;&#1085;&#1089;:');
        if(val)
            result.bonus_balance = val;
    }
    
    //Между Текущие скидки и пакеты услуг: и Текущие услуги:
    matches = text.match(/<div class="heading">&#1058;&#1077;&#1082;&#1091;&#1097;&#1080;&#1077; &#1089;&#1082;&#1080;&#1076;&#1082;&#1080; &#1080; &#1087;&#1072;&#1082;&#1077;&#1090;&#1099; &#1091;&#1089;&#1083;&#1091;&#1075;:<\/div>([\s\S]*?)<div class="heading">&#1058;&#1077;&#1082;&#1091;&#1097;&#1080;&#1077; &#1091;&#1089;&#1083;&#1091;&#1075;&#1080;:<\/div>/); 
    if(matches)
      text = matches[1]; //Таблица скидок
    
    //Должны точно ловиться:
    //Бонус 1 - полчаса бесплатно (Москва)
    //10 мин на МТС, Билайн, Скай Линк
    
    if(AnyBalance.isAvailable('mins_total','mins_left')){
      var mins_left = 0, mins_total = 0;
      
      //Ищем в таблице скидок строки вида: 39:00 мин   39:00, что означает Всего, Остаток
      text.replace(/<div class="td_def">\s*(\d+)(?::(\d+))?[^<]*&#1084;&#1080;&#1085;[^<]*<[^&#;\d]*<div class="td_def">(\d+)(?::(\d+))?/g, function(str, p1, p2, p3, p4){
        if(AnyBalance.isAvailable('mins_total'))
            mins_total += p1*60 + (p2 ? +p2 : 0);
        if(AnyBalance.isAvailable('mins_left'))
            mins_left += p3*60 + (p4 ? +p4 : 0);
        return str;
      });
      
      if(mins_total)
          result.mins_total = mins_total;
      if(mins_left)
          result.mins_left = mins_left;
    }
      
    var internet_total = 0,
        internet_cur = 0,
        internet_left = 0;
        
    // Карманный интернет
    if(AnyBalance.isAvailable('internet_total','internet_cur', 'internet_left')){
        var vals = getOptionFloat(text, "&#1050;&#1072;&#1088;&#1084;&#1072;&#1085;&#1085;&#1099;&#1081; &#1048;&#1085;&#1090;&#1077;&#1088;&#1085;&#1077;&#1090;");
        if(vals){
            if(AnyBalance.isAvailable('internet_total'))
                internet_total += vals[0];
            if(AnyBalance.isAvailable('internet_cur'))
                internet_cur += vals[0]-vals[1];
            if(AnyBalance.isAvailable('internet_left'))
                internet_left += vals[1];
        }
    }
    
    //Исходящие SM (ОХард, Москва)
    var sms_total = 0,
        sms_left = 0;
        
    if(AnyBalance.isAvailable('sms_total', 'sms_left')){
        var vals = getOptionInt(text, "&#1048;&#1089;&#1093;&#1086;&#1076;&#1103;&#1097;&#1080;&#1077; SM");
        if(vals){
            if(AnyBalance.isAvailable('sms_total'))
                sms_total += vals[0];
            if(AnyBalance.isAvailable('sms_left'))
                sms_left += vals[1];
        }
    }
    
    //Пакет SMS-сообщений (Поволжье)
    if(AnyBalance.isAvailable('sms_total', 'sms_left')){
        var vals = getOptionInt(text, "&#1055;&#1072;&#1082;&#1077;&#1090; SMS-&#1089;&#1086;&#1086;&#1073;&#1097;&#1077;&#1085;&#1080;&#1081;");
        if(vals){
            if(AnyBalance.isAvailable('sms_total'))
                sms_total += vals[0];
            if(AnyBalance.isAvailable('sms_left'))
                sms_left += vals[1];
        }
    }

    //Нужный подарок (Поволжье)
    if(AnyBalance.isAvailable('handygift_total', 'handygift_left')){
        var vals = getOptionFloat(text, "&#1053;&#1091;&#1078;&#1085;&#1099;&#1081; &#1087;&#1086;&#1076;&#1072;&#1088;&#1086;&#1082;");
        if(vals){
            if(AnyBalance.isAvailable('handygift_total'))
                result.handygift_total = vals[0];
            if(AnyBalance.isAvailable('handygift_left'))
                result.handygift_left = vals[1];
        }
    }
	
    if(filial == MEGA_FILIAL_MOSCOW){
        // Бонусный баланс (здесь более точно указано)
        if(AnyBalance.isAvailable('bonus_balance')){
            text = AnyBalance.requestPost(baseurl + 'SCWWW/BONUS_FORM',
                    {
                        CHANNEL: 'WWW', 
                        SESSION_ID: sessionid,
                        CUR_SUBS_MSISDN: prefs.login,
                        SUBSCRIBER_MSISDN: prefs.login
                    });
                    
            if(matches = text.match(/&#1041;&#1086;&#1085;&#1091;&#1089;&#1085;&#1099;&#1081; &#1073;&#1072;&#1083;&#1072;&#1085;&#1089;:[\s\S]*?<td class="td_right">[\s\S]*?<div>([\d\.]+)/i)){
                result.bonus_balance = parseFloat(matches[1]);
            }
        }


        // Продли скорость (Москва)
        if(AnyBalance.isAvailable(['internet_total','internet_cur', 'internet_left'])){
            text = AnyBalance.requestGet(baseurl + 'SCCEXTSYS/EXT_SYSTEM_PROXY_FORM?CHANNEL=WWW&SESSION_ID=' + sessionid + '&URI=3.');
            if(matches = text.match(/<a class="gupLink" href="EXT_SYSTEM_PROXY_FORM\?([^"]*)"/i)){
                text = AnyBalance.requestGet(baseurl + 'SCCEXTSYS/EXT_SYSTEM_PROXY_FORM?' + matches[1].replace(/&amp;/g, '&'));

                if(AnyBalance.isAvailable('internet_total'))
                    if(matches = text.match(/title="ALL_VOLUME">([\d\.\-]+)</i))
                        internet_total += parseFloat(matches[1]);
                if(AnyBalance.isAvailable('internet_cur'))
                    if(matches = text.match(/title="CUR_VOLUME">([\d\.\-]+)</i))
                        internet_cur += parseFloat(matches[1]);
                if(AnyBalance.isAvailable('internet_left'))
                    if(matches = text.match(/title="LAST_VOLUME">([\d\.\-]+)</i))
                        internet_left += parseFloat(matches[1]);
            }
        }
    }
    
    if(filial == MEGA_FILIAL_VOLGA){
        if(AnyBalance.isAvailable('internet_left')) {
            text = AnyBalance.requestGet(baseurl + 'SCCEXTSYS/EXT_SYSTEM_PROXY_FORM?CHANNEL=WWW&SESSION_ID=' + sessionid + '&URI=5.');
            if(matches = text.match(/<volume>([^<]*)<\/volume>/i)){
                internet_left += parseFloat(matches[1]);
            }
        }
    }
    
    if(internet_total)
        result.internet_total = internet_total;
    if(internet_cur)
        result.internet_cur = internet_cur;
    if(internet_left)
        result.internet_left = internet_left;
    if(sms_total)
        result.sms_total = sms_total;
    if(sms_left)
        result.sms_left = sms_left;
	
    AnyBalance.setResult(result);
}

//Получает значение из таблиц на странице аккаунта по фрагменту названия строки
function getPropVal(html, text){
  var r = new RegExp(text + "[\\s\\S]*?<div class=\"td_def\">(?:<nobr>)?([\\s\\S]*?)(?:<\\/nobr>)?<\\/div>", "i");
  var matches = html.match(r);
  return matches;
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

function getPropValFloat(html, text){
  var matches = getPropVal(html, text);
  if(!matches)
    return null;
  
  matches = matches[1].match(/([\d\.,]+)/);
  if(!matches)
    return null;
  
  return parseFloat(matches[1].replace(/,/g, '.'));
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

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

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

