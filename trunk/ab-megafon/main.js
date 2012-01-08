var MEGA_FILIAL_MOSCOW = 1;
var MEGA_FILIAL_SIBIR = 2;
var MEGA_FILIAL_NW = 3;
var MEGA_FILIAL_FAREAST = 4;
var MEGA_FILIAL_VOLGA = 5;
var MEGA_FILIAL_KAVKAZ = 6;
var MEGA_FILIAL_CENTRAL = 7;
var MEGA_FILIAL_URAL = 8;

//http://ru.wikipedia.org/wiki/%D0%9C%D0%B5%D0%B3%D0%B0%D0%A4%D0%BE%D0%BD#.D0.A4.D0.B8.D0.BB.D0.B8.D0.B0.D0.BB.D1.8B_.D0.BA.D0.BE.D0.BC.D0.BF.D0.B0.D0.BD.D0.B8.D0.B8
var filial_info = {};
filial_info[MEGA_FILIAL_MOSCOW] = {
  name: 'Столичный филиал',
  func: megafonMoscow
};
filial_info[MEGA_FILIAL_SIBIR] = {
  name: 'Сибирский филиал',
  func: null
};
filial_info[MEGA_FILIAL_NW] = {
  name: 'Северо-западный филиал',
  site: 'https://serviceguide.megafonnw.ru/ROBOTS/SC_TRAY_INFO?X_Username=%LOGIN%&X_Password=%PASSWORD%',
  func: megafonNw
};
filial_info[MEGA_FILIAL_FAREAST] = {
  name: 'Дальневосточный филиал',
  func: null
};
filial_info[MEGA_FILIAL_VOLGA] = {
  name: 'Поволжский филиал',
  func: null
};
filial_info[MEGA_FILIAL_KAVKAZ] = {
  name: 'Кавказский филиал',
  func: null
};
filial_info[MEGA_FILIAL_CENTRAL] = {
  name: 'Центральный филиал',
  func: null
};
filial_info[MEGA_FILIAL_URAL] = {
  name: 'Уральский филиал',
  func: null
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
    
    var prefix = parseInt(number.substr(0, 3));
    var num = parseInt(number.substr(3));
    return getFilialByPrefixAndNumber(prefix, number);
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

function megafonNw(filial){
    var filinfo = filial_info[filial];
    var prefs = AnyBalance.getPreferences();
    
    AnyBalance.trace('Connecting to service guide for ' + filinfo.name);
    
    AnyBalance.setDefaultCharset('utf-8');
    var info = AnyBalance.requestGet(filinfo.site
        .replace(/%LOGIN%/g, prefs.login)
        .replace(/%PASSWORD%/g, prefs.password)
    );
        
    var xmlDoc = $.parseXML(info),
      $xml = $(xmlDoc);
	
    //Проверяем на ошибку
    var error = $xml.find('SC_TRAY_INFO>ERROR>ERROR_MESSAGE').text();
    if(error){
        if(/Robot login is not allowed/.test(error))
            throw new AnyBalance.Error('Пожалуйста, разрешите в Сервис-Гиде доступ автоматизированным системам.\n\
Для этого зайдите в Сервис-Гид и включите настройку Настройки Сервис-Гида/Автоматический доступ системам/Доступ открыт пользователям и автоматизированным системам.');
        else
            throw new AnyBalance.Error(error);
    }
    
    var result = {success: true, __tariff: $xml.find('RATE_PLAN').text()};
    
    if(AnyBalance.isAvailable('balance'))
        result.balance = parseFloat($xml.find('BALANCE').text());
    
    
    var $threads = $xml.find('RP_DISCOUNTS>DISCOUNT>THREAD');
    AnyBalance.trace('Found discounts: ' + $threads.length);
    
    if(AnyBalance.isAvailable('sms_left','sms_total')){
        var $sms = $threads.filter(':has(NAME:contains("SMS"))');
        AnyBalance.trace('Found SMS discounts: ' + $sms.length);
        if(AnyBalance.isAvailable('sms_left')){
            result.sms_left = parseInt($sms.first().find('VOLUME_AVAILABLE').text());
        }
        if(AnyBalance.isAvailable('sms_total')){
            result.sms_left = parseInt($sms.first().find('VOLUME_TOTAL').text());
        }
    }
    
    if(AnyBalance.isAvailable('mins_left','mins_total')){
        var $sms = $threads.filter(':has(NAME:contains(" мин"))');
        AnyBalance.trace('Found minutes discounts: ' + $sms.length);
        if(AnyBalance.isAvailable('mins_left')){
            result.mins_left = parseInt($sms.first().find('VOLUME_AVAILABLE').text())*60;
        }
        if(AnyBalance.isAvailable('mins_total')){
            result.mins_left = parseInt($sms.first().find('VOLUME_TOTAL').text())*60;
        }
    }
    
    AnyBalance.setResult(result);
    
}

/**
 * Получаем данные из обычного сервис-гида для столичного филиала
 */
function megafonMoscow(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.trace('Connecting to moscow service guide...');
	
    var session = AnyBalance.requestPost('https://moscowsg.megafon.ru/ps/scc/php/check.php?CHANNEL=WWW',
    {
        LOGIN: prefs.login, 
        PASSWORD: prefs.password
        });
	
    AnyBalance.trace('Got result from service guide: ' + session);
	
    var result = {
        success: true
    };
	
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
        throw new AnyBalance.Error('Не удалось получить сессию', true); //Странный ответ, может, можно переконнектиться потом
    }
	
    var sessionid = matches[1];
    var text = AnyBalance.requestPost('https://moscowsg.megafon.ru/SCWWW/ACCOUNT_INFO',
    {
        CHANNEL: 'WWW', 
        SESSION_ID: sessionid
    });
	
    if(AnyBalance.isAvailable('balance')){
        if(matches = text.match(/<div class="balance_[\w_]*good td_def">([-\d\.]+)[^<]*<\/div>/i)){
            var balance = parseFloat(matches[1]);
            result.balance = balance;
        }
    }
	
	
    //Текущий тарифный план
    if(matches = text.match(/&#1058;&#1077;&#1082;&#1091;&#1097;&#1080;&#1081; &#1090;&#1072;&#1088;&#1080;&#1092;&#1085;&#1099;&#1081; &#1087;&#1083;&#1072;&#1085;:[\s\S]*?<nobr>(.*?)<\/nobr>/i)){
        var tariff = html_entity_decode(matches[1]);
        result.__tariff = tariff; //Special variable, not counter
    }
	
	
    //Бонус 1 - полчаса бесплатно
    if(AnyBalance.isAvailable(['mins_total','mins_left'])){
        if(matches = text.match(
            /&#1041;&#1086;&#1085;&#1091;&#1089; 1 \- &#1087;&#1086;&#1083;&#1095;&#1072;&#1089;&#1072; &#1074; &#1087;&#1086;&#1076;&#1072;&#1088;&#1086;&#1082;[\s\S]*?<tr[\s\S]*?<div class="td_def">(\d+):(\d+)&nbsp;[\s\S]*?<div class="td_def">(\d+):(\d+)&nbsp;/i)){
            var mins_total = parseInt(matches[1])*60 + parseInt(matches[2]);
            var mins_left = parseInt(matches[3])*60 + parseInt(matches[4]);
			
            if(AnyBalance.isAvailable('mins_total'))
                result.mins_total = mins_total;
            if(AnyBalance.isAvailable('mins_left'))
                result.mins_left = mins_left;
        }
    }
	
    if(AnyBalance.isAvailable(['internet_total','internet_cur', 'internet_left'])){
        text = AnyBalance.requestGet('https://moscowsg.megafon.ru/SCCEXTSYS/EXT_SYSTEM_PROXY_FORM?CHANNEL=WWW&SESSION_ID=' + sessionid + '&URI=3.');
        if(matches = text.match(/<a class="gupLink" href="EXT_SYSTEM_PROXY_FORM\?([^"]*)"/i)){
            text = AnyBalance.requestGet('https://moscowsg.megafon.ru/SCCEXTSYS/EXT_SYSTEM_PROXY_FORM?' + matches[1].replace(/&amp;/g, '&'));
			
            if(AnyBalance.isAvailable('internet_total'))
                if(matches = text.match(/title="ALL_VOLUME">([\d\.\-]+)</i))
                    result.internet_total = parseFloat(matches[1]);
            if(AnyBalance.isAvailable('internet_cur'))
                if(matches = text.match(/title="CUR_VOLUME">([\d\.\-]+)</i))
                    result.internet_cur = parseFloat(matches[1]);
            if(AnyBalance.isAvailable('internet_left'))
                if(matches = text.match(/title="LAST_VOLUME">([\d\.\-]+)</i))
                    result.internet_left = parseFloat(matches[1]);
        }
    }
	
    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}
