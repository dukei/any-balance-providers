/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает задолженность у Петербургской сбытовой компании

Сайт оператора: http://pesc.ru/
Личный кабинет: http://ikus.pesc.ru:8080/IKUSUser/
*/

function gwtEscape(str){
    return str.replace(/\\/g, '\\\\').replace(/\|/g, '\!');
}

function gwtGetStrongName(js){
    var varName = getParam(js, null, null, /(\w+)='safari'/);
    if(!varName)
        throw new AnyBalance.Error('Не удаётся найти $strongName: ссылку на браузер.');
    var re = new RegExp('\\b'+varName+'\\],(\\w+)\\)');
    var varNameStrong = getParam(js, null, null, re);
    if(!varNameStrong)
        throw new AnyBalance.Error('Не удаётся найти $strongName: имя переменной.');
    re = new RegExp('\\b'+varNameStrong+'=\'([^\']*)');
    var val = getParam(js, null, null, re);
    if(!val)
        throw new AnyBalance.Error('Не удаётся найти $strongName: значение переменной.');
    return val;
}

function gwtGetJSON(str){
    if(/^\/\/EX/i.test(str)){
        var error = getParam(str, null, null, /Exception.*?","([^"]*)/);
        throw new AnyBalance.Error(error);
    }

    var json = getParam(str, null, null, /\/\/OK(.*)/);
    if(!json)
        throw new AnyBalance.Error('Ошибка получения ответа: ' + str);
    return getJson(json);
}

var g_lks = {
    pesc: {
       url: 'http://ikus.pesc.ru:8080/IKUSUser/',
       uid: 'BA2D39EE78C67FD4DE935035CA67FEC0'
    },
    pes: {
       url: 'https://ikus.pes.spb.ru/IKUSUser/',
       uid: 'BA2D39EE78C67FD4DE935035CA67FEC0'
//       uid: '82133025EC649C66FFD6B00CF20FDAA9'
    }
}

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = !prefs.type || !g_lks[prefs.type] ? g_lks.pesc.url : g_lks[prefs.type].url;
    var uid = !prefs.type || !g_lks[prefs.type] ? g_lks.pesc.uid : g_lks[prefs.type].uid;
    AnyBalance.trace('Используем личный кабинет ' + baseurl);

    AnyBalance.setDefaultCharset('utf-8');    
	
    //Скачиваем скрипт для поиска $strongName
    var html = AnyBalance.requestGet(baseurl + 'gwt/personalAccountAuth/personalAccountAuth.nocache.js');

    //Авторизируемся
    html = AnyBalance.requestPost(baseurl + "application.auth", 
        "6|0|7|" + baseurl + "gwt/personalAccountAuth/|"+uid+"|com.sigma.personal.auth.AuthService|login|java.lang.String/2004016611|" + gwtEscape(prefs.login) + "|" + gwtEscape(prefs.password) + "|1|2|3|4|2|5|5|6|7|",
        { 
          'Content-Type': 'text/x-gwt-rpc; charset=UTF-8', 
          'X-GWT-Module-Base':baseurl + 'gwt/personalAccountAuth/',
          'X-GWT-Permutation':gwtGetStrongName(html),
//          'Origin': 'http://ikus.pesc.ru:8080',
//          'Referer':baseurl,
//          'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.17 (KHTML, like Gecko) Chrome/24.0.1312.57 Safari/537.17',
//          'Accept': '*/*',
//          'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
//          'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3'

        }
    );

    //Тут получаем что-то вроде //OK[[],0,6]
    var auth = gwtGetJSON(html);
    if(!auth[0] || typeof(auth[0]) != 'object' || auth[0].length != 0)
        throw new AnyBalance.Error("error");

    //Скачиваем новый скрипт для поиска $strongName
    html = AnyBalance.requestGet(baseurl + 'gwt/personalAccount/personalAccount.nocache.js');
    var permut = gwtGetStrongName(html);

    //Получаем баланс
    ////OK[8.65,36,55,'BuQ',54,53,52,10,51,50,10,12,40,10,9,2,3,1,2,49,10,12,48,10,9,2,3,1,2,47,10,12,46,10,9,2,3,1,2,45,10,12,44,10,9,2,3,1,2,43,10,12,33,10,9,2,3,1,2,42,10,12,40,10,9,2,3,1,2,41,10,12,40,10,9,2,3,1,2,7,1,39,38,10,37,0.0,36,35,34,10,12,33,10,9,2,3,1,2,32,10,12,0,9,2,3,1,2,31,10,12,30,10,9,2,3,1,2,29,10,12,28,10,9,2,3,1,2,27,10,12,26,10,9,2,3,1,2,25,10,12,24,10,9,2,3,1,2,23,10,12,22,10,9,2,3,1,2,21,10,12,20,10,9,2,3,1,2,19,10,12,18,10,9,2,3,1,2,17,10,12,16,10,9,2,3,1,2,15,10,12,14,10,9,2,3,1,2,13,10,12,11,10,9,2,3,1,2,12,1,8,5,5,7,0,6,1,5,4,10,3,1,2,1,1,["java.util.ArrayList/3821976829","com.sigma.gxt.client.BeanModel/1927856426","com.extjs.gxt.ui.client.data.RpcMap/3441186752","meter_plan","java.lang.Integer/3438268394","id","meter_capacity","meter","value","java.lang.String/2004016611","21.04.2009","key","Дата установки","062591708","Номер","В ДОМЕ","Место установки","Сбытовая","Владелец","Исправный","Состояние","Однотарифный","План прибора учета","СОЛО 1S-В","Тип","220","Вольтаж","5-60","Ток","5","Разрядность","Класс точности","0","Межповерочный интервал","peni","java.lang.Double/858496421","address","ПОДБОРЬЕ ДЕР. (ИЛЬИНСКАЯ) ПОДБОРЬЕ ДЕР., д.30 , кв.0","flat","1","Комнат","Потребителей","Льготников","Сельское население","Тариф","Газ.","Плита","","Площадь кв.м.","Прописанных","account","021\\00066029","payment_id","java.lang.Long/4227064769","energy"],0,6]
    html = AnyBalance.requestPost(baseurl + 'com.sigma.personal.client.ClientService.gwt',
        "6|0|4|" + baseurl + "gwt/personalAccount/|"+uid+"|com.sigma.personal.client.ClientService|getAbonsList|1|2|3|4|0|",
        { 
          'Content-Type': 'text/x-gwt-rpc; charset=UTF-8', 
          'X-GWT-Module-Base':baseurl + 'gwt/personalAccount/',
          'X-GWT-Permutation':permut
        }
    );

    var result = { success: true };

    getParam(html, result, 'balance', /\/\/OK\[(.*?),/, null, parseBalance);
    getParam(html, result, 'licschet', /"account","([^"]*)/, replaceSlashes);
    getParam(html, result, '__tariff', /"address","([^"]*)/, replaceSlashes);

    AnyBalance.setResult(result); 
}