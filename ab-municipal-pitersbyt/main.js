/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает задолженность у Петербургской сбытовой компании

Сайт оператора: http://pesc.ru/
Личный кабинет: http://ikus.pesc.ru:8080/IKUSUser/
*/

function gwtEscape(str){
    return str.replace(/\\/g, '\\\\').replace(/\|/g, '\!');
}

function gwtGetStrongName(js, cfg){
    var varName = getParam(js, null, null, /(\w+)='safari'/);
    if(!varName)
        throw new AnyBalance.Error('Не удаётся найти $strongName: ссылку на браузер.');
    var re = new RegExp(cfg.strong_name.replace(/%VARNAME%/g, varName));
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
        throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
    }

    var json = getParam(str, null, null, /\/\/OK(.*)/);
    if(!json)
        throw new AnyBalance.Error('Ошибка получения ответа: ' + str);
    return getJson(json);
}

var g_lks = {
    pesc: {
	url: 'http://ikus.pesc.ru:8080/IKUSUser/',
	uid: 'E85D8BB4C101FFBB462908DEC5BC61A6',
	auth_uid: 'AE742241A0A8AD76E4877D96DE250A42',
	strong_name: '\\b%VARNAME%,\\w+\\],(\\w+)\\)',
	auth_url: 'userAuth/',
	auth_nocache: 'userAuth/userAuth.nocache.js',
	auth_file: 'com.sigma.personal.client.auth.AuthService.gxt',
	auth_class: 'com.sigma.personal.client.auth.AuthService',
	auth_data: "7|0|8|%url%%auth_url%|%uid%|%auth_class%|login|java.lang.String/2004016611|%LOGIN%|%PASSWORD%|mozilla/5.0 (windows nt 6.1; wow64) applewebkit/537.36 (khtml, like gecko) chrome/35.0.1916.114 safari/537.36|1|2|3|4|4|5|5|5|5|6|7|0|8|",
	user_url: 'userPhysical/',
	user_nocache: 'userPhysical/userPhysical.nocache.js',
	user_file: 'com.sigma.personal.client.physical.ClientService.gwt',
	user_class: 'com.sigma.personal.client.physical.ClientService',
	user_data: "7|0|4|%url%%user_url%|%auth_uid%|%user_class%|getAbonsList|1|2|3|4|0|",
	re_balance: /-?(\d+\.\d+),\d+,'\w+'/g,
	re_account: /electric.model.AbonentModel[^"]*","([^"]*)/,
	re_address: /electric.model.AbonentModel[^"]*","[^"]*","([^"]*)/,
    },
    pes: {
	url: 'https://ikus.pes.spb.ru/IKUSUser/',
	uid: 'D71455428F33C019BC5C4C1707CA205C',
	auth_uid: 'AE742241A0A8AD76E4877D96DE250A42',
	strong_name: '\\b%VARNAME%,\\w+\\],(\\w+)\\)',
	auth_url: 'userAuth/',
	auth_nocache: 'userAuth/userAuth.nocache.js',
	auth_file: 'com.sigma.personal.client.auth.AuthService.gxt',
	auth_class: 'com.sigma.personal.client.auth.AuthService',
	auth_data: "7|0|8|%url%%auth_url%|%uid%|%auth_class%|login|java.lang.String/2004016611|%LOGIN%|%PASSWORD%|mozilla/5.0 (windows nt 6.1; wow64) applewebkit/537.36 (khtml, like gecko) chrome/35.0.1916.114 safari/537.36|1|2|3|4|4|5|5|5|5|6|7|0|8|",
	user_url: 'userPhysical/',
	user_nocache: 'userPhysical/userPhysical.nocache.js',
	user_file: 'com.sigma.personal.client.physical.ClientService.gwt',
	user_class: 'com.sigma.personal.client.physical.ClientService',
	user_data: "7|0|4|%url%%user_url%|%auth_uid%|%user_class%|getAbonsList|1|2|3|4|0|",
	re_balance: /-?(\d+\.\d+),\d+,\d+,'\w+'/g,
	re_account: /"account","([^"]*)/,
	re_address: /"address","([^"]*)/,
    }
}

function makeReplaces(str, cfg){
    for(var i in cfg){
        str = str.replace(new RegExp('%' + i + '%', 'g'), cfg[i]);
    }
    return str;
}

function main(){
    var prefs = AnyBalance.getPreferences();

    checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(prefs.password, 'Введите пароль!');

    var cfg = !prefs.type || !g_lks[prefs.type] ? g_lks.pesc : g_lks[prefs.type];

    var baseurl = cfg.url;
    var uid = cfg.uid;
    var auth_uid = cfg.auth_uid;
    AnyBalance.trace('Используем личный кабинет ' + baseurl);

    AnyBalance.setDefaultCharset('utf-8');    
	
    //Скачиваем скрипт для поиска $strongName
    var html = AnyBalance.requestGet(baseurl + cfg.auth_nocache);

    //Авторизируемся
    html = AnyBalance.requestPost(baseurl + cfg.auth_file, 
	makeReplaces(cfg.auth_data, cfg).replace(/%LOGIN%/g, gwtEscape(prefs.login)).replace(/%PASSWORD%/g, gwtEscape(prefs.password)),
        { 
          'Content-Type': 'text/x-gwt-rpc; charset=UTF-8', 
          'X-GWT-Module-Base':baseurl + cfg.auth_url,
          'X-GWT-Permutation':gwtGetStrongName(html, cfg),
        }
    );

    //Тут получаем что-то вроде //OK[[],0,6]
    var auth = gwtGetJSON(html);
    if(!auth[0])
        throw new AnyBalance.Error("error");

    //Скачиваем новый скрипт для поиска $strongName
    html = AnyBalance.requestGet(baseurl + cfg.user_nocache);
    var permut = gwtGetStrongName(html, cfg);

    //Получаем баланс
    ////OK[8.65,36,55,'BuQ',54,53,52,10,51,50,10,12,40,10,9,2,3,1,2,49,10,12,48,10,9,2,3,1,2,47,10,12,46,10,9,2,3,1,2,45,10,12,44,10,9,2,3,1,2,43,10,12,33,10,9,2,3,1,2,42,10,12,40,10,9,2,3,1,2,41,10,12,40,10,9,2,3,1,2,7,1,39,38,10,37,0.0,36,35,34,10,12,33,10,9,2,3,1,2,32,10,12,0,9,2,3,1,2,31,10,12,30,10,9,2,3,1,2,29,10,12,28,10,9,2,3,1,2,27,10,12,26,10,9,2,3,1,2,25,10,12,24,10,9,2,3,1,2,23,10,12,22,10,9,2,3,1,2,21,10,12,20,10,9,2,3,1,2,19,10,12,18,10,9,2,3,1,2,17,10,12,16,10,9,2,3,1,2,15,10,12,14,10,9,2,3,1,2,13,10,12,11,10,9,2,3,1,2,12,1,8,5,5,7,0,6,1,5,4,10,3,1,2,1,1,["java.util.ArrayList/3821976829","com.sigma.gxt.client.BeanModel/1927856426","com.extjs.gxt.ui.client.data.RpcMap/3441186752","meter_plan","java.lang.Integer/3438268394","id","meter_capacity","meter","value","java.lang.String/2004016611","21.04.2009","key","Дата установки","062591708","Номер","В ДОМЕ","Место установки","Сбытовая","Владелец","Исправный","Состояние","Однотарифный","План прибора учета","СОЛО 1S-В","Тип","220","Вольтаж","5-60","Ток","5","Разрядность","Класс точности","0","Межповерочный интервал","peni","java.lang.Double/858496421","address","ПОДБОРЬЕ ДЕР. (ИЛЬИНСКАЯ) ПОДБОРЬЕ ДЕР., д.30 , кв.0","flat","1","Комнат","Потребителей","Льготников","Сельское население","Тариф","Газ.","Плита","","Площадь кв.м.","Прописанных","account","021\\00066029","payment_id","java.lang.Long/4227064769","energy"],0,6]
    html = AnyBalance.requestPost(baseurl + cfg.user_file,
	makeReplaces(cfg.user_data, cfg),
        { 
          'Content-Type': 'text/x-gwt-rpc; charset=UTF-8', 
          'X-GWT-Module-Base':baseurl + cfg.user_url,
          'X-GWT-Permutation':permut
        }
    );

    var result = { success: true };

    var balances = sumParam(html, null, null, cfg.re_balance, null, parseBalance);
    for(var i=0; i<balances.length; ++i){
	var counter = 'balance' + (i==0 ? '' : i);
        if(AnyBalance.isAvailable(counter))
		result[counter] = balances[i];
    }

    getParam(html, result, 'licschet', cfg.re_account, replaceSlashes);
    getParam(html, result, '__tariff', cfg.re_address, replaceSlashes);

    AnyBalance.setResult(result); 
}