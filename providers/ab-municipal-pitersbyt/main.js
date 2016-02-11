/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает задолженность у Петербургской сбытовой компании

Сайт оператора: http://pesc.ru/
Личный кабинет: http://ikus.pesc.ru:8080/IKUSUser/
*/

var g_userAgent = 'mozilla/5.0 (windows nt 10.0; win64; x64) applewebkit/537.36 (khtml, like gecko) chrome/46.0.2490.86 safari';

var g_lks = {
    pesc: {
    protocols: ['TLSv1.2'],
	url: 'https://ikus.pesc.ru/IKUSUser/',
	uid: 'E85D8BB4C101FFBB462908DEC5BC61A6',
	auth_uid: 'AE742241A0A8AD76E4877D96DE250A42',
	strong_name: '\\b%VARNAME_BROWSER%,\\w+\\],(\\w+)\\)',
	auth_url: 'userAuth/',
	auth_nocache: 'userAuth/userAuth.nocache.js',
	auth_file: 'com.sigma.personal.client.auth.AuthService.gxt',
	auth_class: 'com.sigma.personal.client.auth.AuthService',
	auth_data: "7|0|8|%url%%auth_url%|%uid%|%auth_class%|login|java.lang.String/2004016611|%LOGIN%|%PASSWORD%|%USER_AGENT%|1|2|3|4|4|5|5|5|5|6|7|0|8|",
	auth_data_captcha: "7|0|9|%url%%auth_url%|%uid%|%auth_class%|login|java.lang.String/2004016611|%LOGIN%|%PASSWORD%|%CAPTCHA%|%USER_AGENT%|1|2|3|4|4|5|5|5|5|6|7|8|9|",
	user_url: 'userPhysical/',
	user_nocache: 'userPhysical/userPhysical.nocache.js',
	user_file: 'com.sigma.personal.client.physical.ClientService.gwt',
	user_class: 'com.sigma.personal.client.physical.ClientService',
	user_data: "7|0|4|%url%%user_url%|%auth_uid%|%user_class%|getAbonsList|1|2|3|4|0|",
	re_account: /electric.model.AbonentModel[^"]*","([^"]*)/,
	re_address: /electric.model.AbonentModel[^"]*"(?:,"[^"]*"){2},"([^"]*)/,
	counters: ['peni', 'balance'],
    },
    pes: {
	url: 'https://ikus.pes.spb.ru/IKUSUser/',
	uid: 'E85D8BB4C101FFBB462908DEC5BC61A6',
	auth_uid: 'AE742241A0A8AD76E4877D96DE250A42',
	strong_name: '\\b%VARNAME_BROWSER%,\\w+\\],(\\w+)\\)',
	auth_url: 'userAuth/',
	auth_nocache: 'userAuth/userAuth.nocache.js',
	auth_file: 'com.sigma.personal.client.auth.AuthService.gxt',
	auth_class: 'com.sigma.personal.client.auth.AuthService',
	auth_data: "7|0|8|%url%%auth_url%|%uid%|%auth_class%|login|java.lang.String/2004016611|%LOGIN%|%PASSWORD%|%USER_AGENT%|1|2|3|4|4|5|5|5|5|6|7|0|8|",
	auth_data_captcha: "7|0|9|%url%%auth_url%|%uid%|%auth_class%|login|java.lang.String/2004016611|%LOGIN%|%PASSWORD%|%CAPTCHA%|%USER_AGENT%|1|2|3|4|4|5|5|5|5|6|7|8|9|",
	user_url: 'userPhysical/',
	user_nocache: 'userPhysical/userPhysical.nocache.js',
	user_file: 'com.sigma.personal.client.physical.ClientService.gwt',
	user_class: 'com.sigma.personal.client.physical.ClientService',
	user_data: "7|0|4|%url%%user_url%|%auth_uid%|%user_class%|getAbonsList|1|2|3|4|0|",
	re_account: /electric.model.AbonentModel[^"]*","([^"]*)/,
	re_address: /electric.model.AbonentModel[^"]*"(?:,"[^"]*"){1},"([^"]*)/,
	counters: ['peni', 'balance'],
    }
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setOptions({cookiePolicy: 'netscape'});

    checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(prefs.password, 'Введите пароль!');

    var cfg = !prefs.type || !g_lks[prefs.type] ? g_lks.pesc : g_lks[prefs.type];

    if(cfg.protocols)
    	AnyBalance.setOptions({SSL_ENABLED_PROTOCOLS: cfg.protocols}); 

    var baseurl = cfg.url;
    var uid = cfg.uid;
    var auth_uid = cfg.auth_uid;
    AnyBalance.trace('Используем личный кабинет ' + baseurl);

    AnyBalance.setDefaultCharset('utf-8');    
	
    //Скачиваем скрипт для поиска $strongName
    var html = AnyBalance.requestGet(baseurl + cfg.auth_nocache);

    //Авторизируемся
    var auth_strong = gwtGetStrongName(html, cfg);
    var gwtAuthHeaders = { 
        'Content-Type': 'text/x-gwt-rpc; charset=UTF-8', 
        'X-GWT-Module-Base':baseurl + cfg.auth_url,
        'X-GWT-Permutation':gwtGetStrongName(html, cfg),
    };

    try{
        html = AnyBalance.requestPost(baseurl + cfg.auth_file, 
			makeReplaces(cfg.auth_data, cfg)
				.replace(/%LOGIN%/g, gwtEscape(prefs.login))
				.replace(/%PASSWORD%/g, gwtEscape(prefs.password))
				.replace(/%USER_AGENT%/, gwtEscape(g_userAgent)),
            gwtAuthHeaders
        );
        
        //Тут получаем что-то вроде //OK[[],0,6]
        var auth = gwtGetJSON(html);
        if(!auth[0]){
        	AnyBalance.trace(html);
            throw new AnyBalance.Error("error");
        }
    }catch(e){
    	if(/Неверно введен проверочный код/i.test(e.message)){
    		var img = AnyBalance.requestGet(baseurl + 'simpleCaptcha.jpg?' + Math.floor(Math.random()*100));
    		var captcha = AnyBalance.retrieveCode('Пожалуйста, введите проверочный код с картинки', img);

            html = AnyBalance.requestPost(baseurl + cfg.auth_file, 
				makeReplaces(cfg.auth_data_captcha, cfg)
					.replace(/%LOGIN%/g, gwtEscape(prefs.login))
					.replace(/%PASSWORD%/g, gwtEscape(prefs.password))
					.replace(/%USER_AGENT%/, gwtEscape(g_userAgent))
					.replace(/%CAPTCHA%/, gwtEscape(captcha)),
            	gwtAuthHeaders
            );
            
            //Тут получаем что-то вроде //OK[[],0,6]
            var auth = gwtGetJSON(html);
            if(!auth[0]){
            	AnyBalance.trace(html);
                throw new AnyBalance.Error("error");
            }
    	}else{
    		throw e;
    	}
    }

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

    var num = getParam(html, null, null, /\d+\.\d+,(\d+),/);
    if(!isset(num)){
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не удаётся найти баланс. Зайдите в личный кабинет через браузер и убедитесь, что вы подключили абонентов.');
    }

    var balanceRe = new RegExp('(-?\\d+\\.\\d+),' + num + '\\b', 'g');
    var balances = sumParam(html, null, null, balanceRe, null, parseBalance);
    for(var i=0; i<balances.length; i += cfg.counters.length){
    	for(var j=0; j<cfg.counters.length; ++j){
			var counter = cfg.counters[j] + (i==0 ? '' : Math.floor(i/cfg.counters.length));
            if(AnyBalance.isAvailable(counter))
				result[counter] = balances[i+j];
		}
    }

    getParam(html, result, 'licschet', cfg.re_account, replaceSlashes);
    getParam(html, result, '__tariff', cfg.re_address, replaceSlashes);

    AnyBalance.setResult(result); 
}