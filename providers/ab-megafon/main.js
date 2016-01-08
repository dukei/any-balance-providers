/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var MEGA_FILIAL_MOSCOW = 1;
var MEGA_FILIAL_SIBIR = 2;
var MEGA_FILIAL_NW = 3;
var MEGA_FILIAL_FAREAST = 4;
var MEGA_FILIAL_VOLGA = 5;
var MEGA_FILIAL_KAVKAZ = 6;
var MEGA_FILIAL_CENTRAL = 7;
var MEGA_FILIAL_URAL = 8;

var lk_url = 'https://lk.megafon.ru/';

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
	id: 'mos',
    sg: "https://moscowsg.megafon.ru/",
	widget: 'https://moscowsg.megafon.ru/WIDGET_INFO/GET_INFO?X_Username=%LOGIN%&X_Password=%PASSWORD%&CHANNEL=WYANDEX&LANG_ID=1&P_RATE_PLAN_POS=1&P_PAYMENT_POS=2&P_ADD_SERV_POS=4&P_DISCOUNT_POS=3',
//	tray: "https://moscowsg.megafon.ru/TRAY_INFO/TRAY_INFO?LOGIN=%LOGIN%&PASSWORD=%PASSWORD%",
	internet: "http://user.moscow.megafon.ru/",
	internetRobot: "https://moscowsg.megafon.ru/MEGAFON_BALANCE/MGFSTF_GET_QOS_PACK_STATUS?MSISDN=%LOGIN%&PASSWORD=%PASSWORD%",
	balanceRobot: "https://moscowsg.megafon.ru/MEGAFON_BALANCE/MGFSTF_GET_BALANCE?MSISDN=%LOGIN%&PASSWORD=%PASSWORD%"
};
filial_info[MEGA_FILIAL_SIBIR] = {
	name: 'Сибирский филиал',
	id: 'sib',
    sg: "https://sibsg.megafon.ru/",
	tray: "https://sibsg.megafon.ru/ROBOTS/SC_TRAY_INFO?X_Username=%LOGIN%&X_Password=%PASSWORD%",
	widget: 'https://sibsg.megafon.ru/WIDGET_INFO/GET_INFO?X_Username=%LOGIN%&X_Password=%PASSWORD%&CHANNEL=WYANDEX&LANG_ID=1&P_RATE_PLAN_POS=1&P_PAYMENT_POS=2&P_ADD_SERV_POS=4&P_DISCOUNT_POS=3',
	sgCaptchaInputType: 'text',
};
filial_info[MEGA_FILIAL_NW] = {
	name: 'Северо-западный филиал',
	id: 'nw',
    sg: "https://szfsg.megafon.ru/",
	tray: 'https://szfsg.megafon.ru/ROBOTS/SC_TRAY_INFO?X_Username=%LOGIN%&X_Password=%PASSWORD%',
	widget: 'https://szfsg.megafon.ru/WIDGET_INFO/GET_INFO?X_Username=%LOGIN%&X_Password=%PASSWORD%&CHANNEL=WYANDEX&LANG_ID=1&P_RATE_PLAN_POS=1&P_PAYMENT_POS=2&P_ADD_SERV_POS=4&P_DISCOUNT_POS=3',
	sgCaptchaInputType: 'text',
};
filial_info[MEGA_FILIAL_FAREAST] = {
	name: 'Дальневосточный филиал',
	id: 'dv',
    sg: "https://dvsg.megafon.ru/",
	tray: 'https://dvsg.megafon.ru/ROBOTS/SC_TRAY_INFO?X_Username=%LOGIN%&X_Password=%PASSWORD%',
	widget: 'https://dvsg.megafon.ru/WIDGET_INFO/GET_INFO?X_Username=%LOGIN%&X_Password=%PASSWORD%&CHANNEL=WYANDEX&LANG_ID=1&P_RATE_PLAN_POS=1&P_PAYMENT_POS=2&P_ADD_SERV_POS=4&P_DISCOUNT_POS=3',
};
filial_info[MEGA_FILIAL_VOLGA] = {
	name: 'Поволжский филиал',
	id: 'vlg',
	//  site: "https://volgasg.megafon.ru/",
	//  func: megafonServiceGuide,
    sg: "https://volgasg.megafon.ru/",
	widget: 'https://volgasg.megafon.ru/WIDGET_INFO/GET_INFO?X_Username=%LOGIN%&X_Password=%PASSWORD%&CHANNEL=WYANDEX&LANG_ID=1&P_RATE_PLAN_POS=1&P_PAYMENT_POS=2&P_ADD_SERV_POS=4&P_DISCOUNT_POS=3',
	tray: 'https://volgasg.megafon.ru/ROBOTS/SC_TRAY_INFO?X_Username=%LOGIN%&X_Password=%PASSWORD%'
};
filial_info[MEGA_FILIAL_KAVKAZ] = {
	name: 'Кавказский филиал',
	id: 'kv',
    sg: "https://kavkazsg.megafon.ru/",
	tray: "https://kavkazsg.megafon.ru/ROBOTS/SC_TRAY_INFO?X_Username=%LOGIN%&X_Password=%PASSWORD%",
	widget: 'https://kavkazsg.megafon.ru/WIDGET_INFO/GET_INFO?X_Username=%LOGIN%&X_Password=%PASSWORD%&CHANNEL=WYANDEX&LANG_ID=1&P_RATE_PLAN_POS=1&P_PAYMENT_POS=2&P_ADD_SERV_POS=4&P_DISCOUNT_POS=3',
};
filial_info[MEGA_FILIAL_CENTRAL] = {
	name: 'Центральный филиал',
	id: 'ctr',
	sg: "https://moscowsg.megafon.ru/",
	lk: "https://lk.megafon.ru/",
	widget: 'https://moscowsg.megafon.ru/WIDGET_INFO/GET_INFO?X_Username=%LOGIN%&X_Password=%PASSWORD%&CHANNEL=WYANDEX&LANG_ID=1&P_RATE_PLAN_POS=1&P_PAYMENT_POS=2&P_ADD_SERV_POS=4&P_DISCOUNT_POS=3',
//	tray: "https://moscowsg.megafon.ru/TRAY_INFO/TRAY_INFO?LOGIN=%LOGIN%&PASSWORD=%PASSWORD%",
	internet: "http://user.moscow.megafon.ru/",
	internetRobot: "https://moscowsg.megafon.ru/MEGAFON_BALANCE/MGFSTF_GET_QOS_PACK_STATUS?MSISDN=%LOGIN%&PASSWORD=%PASSWORD%",
	balanceRobot: "https://moscowsg.megafon.ru/MEGAFON_BALANCE/MGFSTF_GET_BALANCE?MSISDN=%LOGIN%&PASSWORD=%PASSWORD%"
};
filial_info[MEGA_FILIAL_URAL] = {
	name: 'Уральский филиал',
	id: 'url',
	sg: 'https://uralsg.megafon.ru/',
	tray: 'https://uralsg.megafon.ru/ROBOTS/SC_TRAY_INFO?X_Username=%LOGIN%&X_Password=%PASSWORD%',
	widget: 'https://uralsg.megafon.ru/WIDGET_INFO/GET_INFO?X_Username=%LOGIN%&X_Password=%PASSWORD%&CHANNEL=WYANDEX&LANG_ID=1&P_RATE_PLAN_POS=1&P_PAYMENT_POS=2&P_ADD_SERV_POS=4&P_DISCOUNT_POS=3',
	old_server: true
};

var g_login_errors = {
	error_1: "Введите логин!",
	error_2: "Введите пароль!",
	error_3: "Введите защитный код!",
	error_4: "Неверный префикс.",
	error_5: "Защитный код устарел.",
	error_6: "Введен неверный защитный код.",
	error_7: "Выберите контрольный вопрос.",
	error_8: "Введите ответ на контрольный вопрос.",
	error_9: "Вам недоступен список контрольных вопросов.",
	error_10: "Передан неизвестный параметр.",
	error_11: "Ваш ответ слишком короткий.",
	error_12: "Не заполнено поле со старым паролем.",
	error_13: "Не заполнено поле с новым паролем.",
	error_14: "Не заполнено поле подтверждения пароля.",
	error_15: "Пользователь не найден.",
	error_100: "Вход в систему самообслуживания. Пожалуйста, подождите.",
	error_200: "Ошибка запроса на сервер. Обратитесь, пожалуйста, в службу поддержки.",
	error_0: "Ошибка. Сервис недоступен. Обратитесь, пожалуйста, в службу поддержки."
};
//http://www.mtt.ru/mtt/def
var def_table = {
	p920: [
		[0000000, 999999, MEGA_FILIAL_CENTRAL],
		[1000000, 1109999, MEGA_FILIAL_NW],
		[1110000, 1119999, MEGA_FILIAL_CENTRAL],
		[1120000, 1999999, MEGA_FILIAL_NW],
		[2000000, 2499999, MEGA_FILIAL_KAVKAZ],
		[2500000, 2999999, MEGA_FILIAL_CENTRAL],
		[3000000, 3999999, MEGA_FILIAL_NW],
		[4000000, 5999999, MEGA_FILIAL_KAVKAZ],
		[6000000, 6399999, MEGA_FILIAL_CENTRAL],
		[6400000, 6999999, MEGA_FILIAL_NW],
		[7000000, 9999999, MEGA_FILIAL_CENTRAL], ],
	p921: MEGA_FILIAL_NW,
	p922: [
		[5300000, 5599999, MEGA_FILIAL_VOLGA],
		[6200000, 6299999, MEGA_FILIAL_VOLGA],
		[8000000, 8999999, MEGA_FILIAL_VOLGA],
		[0000000, 9999999, MEGA_FILIAL_URAL], ],
	p923: MEGA_FILIAL_SIBIR,
	p924: MEGA_FILIAL_FAREAST,
	p925: MEGA_FILIAL_MOSCOW,
	p926: MEGA_FILIAL_MOSCOW,
	p927: MEGA_FILIAL_VOLGA,
	p928: MEGA_FILIAL_KAVKAZ,
	p929: [
		[0000000, 209999, MEGA_FILIAL_KAVKAZ],
		[210000, 749999, MEGA_FILIAL_CENTRAL],
		[750000, 1999999, MEGA_FILIAL_NW],
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
		[9000000, 9999999, MEGA_FILIAL_MOSCOW], ],
	p930: [
		[0000000, 59999, MEGA_FILIAL_NW],
		[110000, 119999, MEGA_FILIAL_KAVKAZ],
		[140000, 149999, MEGA_FILIAL_KAVKAZ],
		[310000, 749999, MEGA_FILIAL_CENTRAL],
		[760000, 769999, MEGA_FILIAL_NW],
		[860000, 869999, MEGA_FILIAL_KAVKAZ],
		[910000, 3999999, MEGA_FILIAL_NW],
		[7000000, 8999999, MEGA_FILIAL_CENTRAL], ],
	p931: MEGA_FILIAL_NW,
	p932: [
		[2010000, 2019999, MEGA_FILIAL_VOLGA],
		[5300000, 5599999, MEGA_FILIAL_VOLGA],
		[8400000, 8699999, MEGA_FILIAL_VOLGA],
		[0000000, 9999999, MEGA_FILIAL_URAL], ],
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
function getFilial(prefs) {
	var number = prefs.login;
	
	if (typeof(number) != 'string')
		throw new AnyBalance.Error('Телефон должен быть строкой из 10 цифр!', null, true);
	if (!/^\d{10}$/.test(number)) 
		throw new AnyBalance.Error('Телефон должен быть строкой из 10 цифр без пробелов и разделителей!', null, true);
	
	if(!prefs.region) {
		try{	
			// Мегафон сделал сервис для определения филиала, так что попытаемся обойтись им    
			// Но этот сервис сдох... 13.03.15, но снова поднялся 14.03.15
			var html = AnyBalance.requestPost("https://oldsg.megafon.ru/ps/scc/php/route.php", {
				 CHANNEL: 'WWW',
				 ULOGIN: number
			});
			var region = getParam(html, null, null, /<URL>https?:\/\/(\w+)\./i);
			if (region && filial_info[region]) {
				 return filial_info[region];
			}else{
				AnyBalance.trace('Не удалось получить филиал из: ' + html);
			}
		}catch(e){
			AnyBalance.trace('Не удалось получить филиал: ' + e.message + '. Чтобы избежать этой ошибки можно задать свой филиал вручную в настройках провайдера.');
		}
        
		//Филиал не определился, попробуем по префиксу понять
		AnyBalance.trace('Пытаемся определить регион по номеру телефона...');
		var prefix = parseInt(number.substr(0, 3));
		var num = parseInt(number.substr(3).replace(/^0+(\d+)$/, '$1')); //Не должно начинаться с 0, иначе воспринимается как восьмеричное число
		return getFilialByPrefixAndNumber(prefix, num);
	} else {
		AnyBalance.trace('Указан регион в настройках: ' + prefs.region);
		return filial_info[prefs.region];
	}
}

/**
 * Ищет филиал для переданного префикса и номера в таблице def_table
 */
function getFilialByPrefixAndNumber(prefix, number){
    var prefkey = 'p'+prefix;
    var filinfo = def_table[prefkey];
    if(!filinfo)
        // throw new AnyBalance.Error('Префикс ' + prefix + ' не принадлежит Мегафону! Попробуйте выбрать регион в настройках.');
        throw new AnyBalance.Error('Не удалось определить филиал автоматически! Вам необходимо выбрать филиал вручную в настройках аккаунта.', null, true);
    
    if(typeof(filinfo) == 'number')
        return filinfo;
    
    for(var i=0; i<filinfo.length; ++i){
        var info = filinfo[i];
        if(!info) continue;
        if(info[0] <= number && number <= info[1])
            return info[2];
    }

    throw new AnyBalance.Error('Номер '+ number + ' с префиксом ' + prefix + ' не принадлежит Мегафону! Если вы перешли с другого оператора, вам необходимо выбрать филиал вручную в настройках аккаунта');
}

function main(){
    var prefs = AnyBalance.getPreferences();
    checkEmpty(prefs.login, 'Введите номер телефона (логин)');

//    AnyBalance.setOptions({PER_DOMAIN: {'lk.megafon.ru': {SSL_ENABLED_PROTOCOLS: ['TLSv1'], SSL_ENABLED_CIPHER_SUITES: ['SSL_RSA_WITH_RC4_128_MD5']}}});

    var filial = getFilial(prefs);
    if(!filial)
        throw new AnyBalance.Error('Неизвестен филиал Мегафона для номера ' + prefs.login + '. Пожалуйста, выберите филиал вручную в настройках аккаунта.');

    var filinfo = filial_info[filial];
    if(!filinfo)
        throw new AnyBalance.Error('Unknown filial ' + filial);
    
    if(prefs.__initialization)
	    return initialize(filial);
    
    loadFilialInfo(filial);
}

function loadFilialInfo(filial){
    var filinfo = filial_info[filial];
    var prefs = AnyBalance.getPreferences();
   
    //Проходим все источники в порядке приоритетности, заданном пользователем
    var priority = (prefs.lkpriority || 'sg,app,tray').split(/,/g);

    var allow_captcha = isCaptchaAllowed();
    //Если у нас капча показывается по необходимости, то сначала пытаемся получить всё без капчи и только если не получается, второй раз получим с капчей
    var allow_captcha_sg = allow_captcha, allow_captcha_app = allow_captcha;
    if(!prefs.allowcaptcha)
        allow_captcha_sg = allow_captcha_app = false;

    var ok = false;
    var e_some_messages = [];
    var e_total_messages = [];

    for(var i=0; i<priority.length; ++i){
    	var src = priority[i];
        if(src == 'sg' && !ok){
            try{
            	var sginfo;
            	try{
            		AnyBalance.trace('Пробуем зайти в ЛК');
            		sginfo = enterLK(filial, {login: prefs.login, password: prefs.password});
            	}catch(e){
            		if(e.fatal || !allow_captcha_sg) throw e;
            		AnyBalance.trace('Пробуем зайти в сервис-гид (в лк не получилось: ' + e.message + ')');
            		sginfo = enterSG(filial, {login: prefs.login, password: prefs.password});
            	}
            	if(sginfo.old){
            		megafonServiceGuidePhysical(filial, sginfo.sessionid, sginfo.html);
            	}else{
            		megafonLK(filial, sginfo.html);
            	}
				ok = true;
			}catch(e){
				if(e.fatal)
					throw e;
				if(!e.meaningless)
					e_total_messages.push('ЛК: ' + e.message);
				e_some_messages.push('ЛК: ' + e.message);
				
				if(/Требуется ввод кода/i.test(e.message || '') && !allow_captcha_sg && allow_captcha_sg != allow_captcha){
					AnyBalance.trace('Без капчи зайти в sg не удалось, но может, потом попробуем с капчей...');
				    allow_captcha_sg = allow_captcha;
				    priority.push('sg');
				}
		        AnyBalance.trace('Не удалось получить информацию из личного кабинета: ' + e.message);
			}
		}
		
        if(src == 'app' && !ok){
            try{
           		AnyBalance.trace('Пробуем зайти в моб. приложение');
				megafonLkAPI(filinfo, {allow_captcha: allow_captcha_app});
				ok = true;
			}catch(e){
				if(e.fatal)
					throw e;
				if(!e.meaningless)
					e_total_messages.push('Мобильное приложение: ' + e.message);
				e_some_messages.push('Мобильное приложение: ' + e.message);

				if(/Требуется ввод кода/i.test(e.message || '') && !allow_captcha_app && allow_captcha_app != allow_captcha){
					AnyBalance.trace('Без капчи зайти в app не удалось, но может, потом попробуем с капчей...');
				    allow_captcha_app = allow_captcha;
				    priority.push('app');
				}

		        AnyBalance.trace('Не удалось получить информацию из мобильного приложения: ' + e.message + '\n' + e.stack);
			}
		}
		
        if(src == 'tray' && !ok){
            try{
           		AnyBalance.trace('Пробуем получить данные из информации для роботов');
                megafonTrayInfo(filial);
				ok = true;
			}catch(e){
				if(e.fatal)
					throw e;
//				if(!e.meaningless) //Это неинтересно уже показывать
//					e_total_messages.push('Роботы: ' + e.message);
				e_some_messages.push('Роботы: ' + e.message);
		        AnyBalance.trace('Не удалось получить информацию из входа для автоматизированных систем: ' + e.message);
			}
		}
	}

    if(!ok){
        try{
       		AnyBalance.trace('Пытаемся получить хотя бы баланс');
            megafonBalanceInfo(filial);
			ok = true;
		}catch(e){
			if(e.fatal)
				throw e;
			if(!e.meaningless) //Это неинтересно показывать
				e_total_messages.push('Робот баланса: ' + e.message);
			e_some_messages.push('Робот баланса: ' + e.message);
	        AnyBalance.trace('Не удалось получить информацию даже по балансу: ' + e.message);
		}
	}

	if(!ok)
		throw e_total_messages.join('\n') || e_some_messages.join('\n');
}

var g_headers = {
    Accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Cache-Control':'max-age=0',
    Connection:'keep-alive',
    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.60 Safari/537.1'
};

function getTrayXmlText(filial){
    var prefs = AnyBalance.getPreferences();
    var filinfo = filial_info[filial];
    
    AnyBalance.trace('Connecting to trayinfo for ' + filinfo.name);
    
    AnyBalance.setDefaultCharset('utf-8');
    var info = loadFilial(filial, 'tray');
        
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
      throw new AnyBalance.Error('Вы ввели неправильный пароль.', null, true);
    }

    if(/SCC-ROBOT-LOGIN-INCORRECT/.test(info)){
      AnyBalance.trace("Server returned: " + info);
      throw new AnyBalance.Error('Вы ввели неправильный логин.', null, true);
    }
    
    if(/ROBOTS-DENY|SCC-ROBOT-LOGIN-DENY/.test(info)){
      AnyBalance.trace("Server returned: " + info);
      throw new AnyBalance.Error('Доступ автоматическим системам заблокирован.\n\
Для разблокировки необходимо зайти в Сервис-Гид и включить настройку Настройки Сервис-Гида/Автоматический доступ системам/Доступ открыт пользователям и автоматизированным системам, а также нажать кнопку "разблокировать".');
    }

    if(/SCC-ROBOTS-ERROR/.test(info)){
      AnyBalance.trace("Server returned: " + info);
      throw new AnyBalance.Error('Сервис-Гид временно находится на техобслуживании. Зайдите позже.');
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

function loadFilial(filial, addr){
	var prefs = AnyBalance.getPreferences();
	var filinfo = filial_info[filial];
	var widget_url = filinfo[addr].replace(/%LOGIN%/g, prefs.login).replace(/%PASSWORD%/g, encodeURIComponent(prefs.password)), html;
	try{
		html = AnyBalance.getPreferences()['__dbg_'+addr] || AnyBalance.requestGet(widget_url, g_headers);
	}catch(e){
		if(e.message && /Connection closed by peer|Handshake failed|No peer certificate/i.test(e.message) && filinfo.old_server){
			//Поскольку на лоллипопе проблемы и напрямую он не может получить данные, придется получать через гейт
			html = AnyBalance.requestGet('https://anybalance.ru/ext/gate.php?dest=' + encodeURIComponent(widget_url));
		}
	}
	return html;
}

function megafonTrayInfo(filial) {
	var filinfo = filial_info[filial], errorInTray;
	var internet_totals_was = {};
	var mins_totals_was = {};
	var result = {success: true, filial: filinfo.id};
	
	if(filinfo.tray){ try {
		var xml = getTrayXmlText(filial), val;
		
		getParam(xml, result, '__tariff', /<RATE_PLAN>([\s\S]*?)<\/RATE_PLAN>/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(xml, result, 'balance', /<BALANCE>([\s\S]*?)<\/BALANCE>/i, replaceTagsAndSpaces, parseBalance);
		getParam(xml, result, 'phone', /<NUMBER>([\s\S]*?)<\/NUMBER>/i, replaceNumber, html_entity_decode);
		getParam(xml, result, 'prsnl_balance', /<PRSNL_BALANCE>([\s\S]*?)<\/PRSNL_BALANCE>/i, replaceTagsAndSpaces, parseBalance);
		
		var packs = xml.split(/<PACK>/ig);
		
		AnyBalance.trace('Packs: ' + packs.length);
		for (var ipack = 0; ipack < packs.length; ++ipack) {
			var pack = packs[ipack];
			var pack_name = getParam(pack, null, null, /<PACK_NAME>([\s\S]*?)<\/PACK_NAME>/i, null, html_entity_decode) || '';
			var discounts = sumParam(pack, null, null, /<DISCOUNT>([\s\S]*?)<\/DISCOUNT>/ig);
			AnyBalance.trace('Pack: ' + pack_name + ', discounts: ' + discounts.length);
			for (var i = 0; i < discounts.length; ++i) {
				var d = discounts[i];
				var name = getParam(d, null, null, /<NAME>([\s\S]*?)<\/NAME>/i) || '';
				var plan_name = getParam(d, null, null, /<PLAN_NAME>([\s\S]*?)<\/PLAN_NAME>/i) || '';
				var plan_si = getParam(d, null, null, /<PLAN_SI>([\s\S]*?)<\/PLAN_SI>/i) || '';
				var name_service = getParam(d, null, null, /<NAME_SERVICE>([\s\S]*?)<\/NAME_SERVICE>/i) || '';
				var names = name + ',' + plan_name + ',' + pack_name;
				var vol_ava = getParam(d, null, null, /<VOLUME_AVAILABLE>([\s\S]*?)<\/VOLUME_AVAILABLE>/i, replaceTagsAndSpaces, parseBalance);
				var vol_tot = getParam(d, null, null, /<VOLUME_TOTAL>([\s\S]*?)<\/VOLUME_TOTAL>/i, replaceTagsAndSpaces, parseBalance);

				if (/sms|смс/i.test(names)) {
					AnyBalance.trace('Найдены SMS: ' + names);
					sumParam(d, result, 'sms_left', /<VOLUME_AVAILABLE>([\s\S]*?)<\/VOLUME_AVAILABLE>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
					sumParam(d, result, 'sms_total', /<VOLUME_TOTAL>([\s\S]*?)<\/VOLUME_TOTAL>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
				} else if (/mms|ммс/i.test(names)) {
					AnyBalance.trace('Найдены MMS: ' + names);
					sumParam(d, result, 'mms_left', /<VOLUME_AVAILABLE>([\s\S]*?)<\/VOLUME_AVAILABLE>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
					sumParam(d, result, 'mms_total', /<VOLUME_TOTAL>([\s\S]*?)<\/VOLUME_TOTAL>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
				} else if (/GPRS| Байт|интернет|мб|Пакетная передача данных|QoS\d*:\s*\d+\s*Гб|Продли скорость\s*\d+\s*Гб|трафик|internet/i.test(names)
					 || /Пакетная передача данных/i.test(name_service) || /Байт|Тар.ед./i.test(plan_si)) {
					AnyBalance.trace('Найден интернет: ' + names + ', ' + plan_si);
					var valAvailable = vol_ava;
					var valTotal = vol_tot;
					var units = plan_si;
					if (units == 'шт'){
					    units = 'мб';
					}
					if (units == 'сек'){
					    units = 'байт';
					}
					if (units == 'мин') {
						//Надо попытаться исправить ошибку мегафона с единицами измерения трафика
						if (/[GM]B|[гм]б/i.test(plan_name)) units = 'мб';
						else if (/Internet/i.test(plan_name)) units = 'мб'; //Вот ещё такое исключение. Надеюсь, на всём будет работать, хотя сообщили из поволжского филиала
						else if (/100\s*мб/i.test(plan_name)) units = 'тар.ед.';
						else if (/Интернет (?:S|M|L|XL)/i.test(names)) units = 'мб';
						else if (/Все включено|Интернет трафик на месяц/i.test(plan_name)) units = 'мб'; //Из дальневосточного филиала сообщили
						else units = 'тар.ед.'; //измеряется в 100кб интервалах
					}

					var _valTotal = parseTrafficMy(valTotal + units);

					if (isset(valTotal)) { //Отметим, что этот пакет мы уже посчитали
						internet_totals_was[_valTotal] = true;

					    internet_totals_was.total = (internet_totals_was.total || 0) + _valTotal;
					}

					if(_valTotal > 100000000){
					    var realTotal = getParam(names, null, null, /\d+\s*[гмкgmk][бb]/i, null, parseTrafficToBytes);
					    if(isset(realTotal)){
							AnyBalance.trace('Нашли тотал из названия опции: ' + realTotal + ' байт');
							valAvailable = realTotal - (valTotal - valAvailable);
							valTotal = realTotal;
					    }
					}

					if (AnyBalance.isAvailable('internet_left') && isset(valAvailable)) {
					    var _val = parseTrafficMy(valAvailable + units);
						if(_val < 100000000){
						    result.internet_left = (result.internet_left || 0) + _val;
						}else{
							AnyBalance.trace('Безлимитное значение остатка трафика ' + names + ': ' + valAvailable + units + '. Пропускаем...');
						}
						
					}

					if (AnyBalance.isAvailable('internet_total') && isset(_valTotal)) {
					    var _val = parseTrafficMy(valTotal + units);
						if(_val < 100000000){
						    result.internet_total = (result.internet_total || 0) + _val;
						}else{
							AnyBalance.trace('Безлимитное значение всего трафика ' + names + ': ' + valTotal + units + '. Пропускаем...');
						}
					}

					if (AnyBalance.isAvailable('internet_cur') && isset(valAvailable) && isset(valTotal)) {
						result.internet_cur = (result.internet_cur || 0) + parseTrafficMy((valTotal - valAvailable) + units);
					}
				} else if (/Зона "Магнитогорск"/i.test(names)) {
					AnyBalance.trace('Зону магнитогорск пропускаем. Похоже, она никому не нужна: ' + d);
				} else if (/[36]0 мин\. бесплатно/i.test(names)) {
					var total = getParam(d, null, null, /<VOLUME_TOTAL>([\s\S]*?)<\/VOLUME_TOTAL>/i, replaceTagsAndSpaces, parseMinutes);
					mins_totals_was['' + total] = true;
					sumParam(d, result, 'mins_n_free', /<VOLUME_AVAILABLE>([\s\S]*?)<\/VOLUME_AVAILABLE>/i, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
				} else if ((/вызовы внутри спг|\.\s*МегаФон|на МегаФон|включено\s?/i.test(names) && !/МТС/i.test(names)) && /мин/i.test(plan_si)) {
					AnyBalance.trace('Найдены минуты внутри группы: ' + names + ', ' + plan_si);
					var total = getParam(d, null, null, /<VOLUME_TOTAL>([\s\S]*?)<\/VOLUME_TOTAL>/i, replaceTagsAndSpaces, parseMinutes);
					mins_totals_was['' + total] = true;
					sumParam(d, result, 'mins_net_left', /<VOLUME_AVAILABLE>([\s\S]*?)<\/VOLUME_AVAILABLE>/i, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
				} else if (/телефония исходящая|исходящая телефония| мин|Переходи на ноль/i.test(names) || /мин/i.test(plan_si)) {
					AnyBalance.trace('Найдены минуты: ' + names + ', ' + plan_si);
					// Это такой, армянский фикс :)
					if (/шт/i.test(plan_si)) {
						AnyBalance.trace('Найдены смс которые прикидываются минутами: ' + names + ', ' + plan_si);
						sumParam(d, result, 'sms_left', /<VOLUME_AVAILABLE>([\s\S]*?)<\/VOLUME_AVAILABLE>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
						sumParam(d, result, 'sms_total', /<VOLUME_TOTAL>([\s\S]*?)<\/VOLUME_TOTAL>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
					} else {
						// Если нашли эти минуты, то суммировать их не надо
						var total = getParam(d, null, null, /<VOLUME_TOTAL>([\s\S]*?)<\/VOLUME_TOTAL>/i, replaceTagsAndSpaces, parseMinutes);
						mins_totals_was['' + total] = true;
						if (/РЯ/.test(names)) {
							// Минуты РЯ
							sumParam(d, result, 'mins_rya_left', /<VOLUME_AVAILABLE>([\s\S]*?)<\/VOLUME_AVAILABLE>/i, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
							sumParam(d, result, 'mins_rya_total', /<VOLUME_TOTAL>([\s\S]*?)<\/VOLUME_TOTAL>/i, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
						} else if (/ЕАО,ХК/.test(names)) {
							// Минуты ЕАО,ХК
							sumParam(d, result, 'mins_eao_left', /<VOLUME_AVAILABLE>([\s\S]*?)<\/VOLUME_AVAILABLE>/i, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
							sumParam(d, result, 'mins_eao_total', /<VOLUME_TOTAL>([\s\S]*?)<\/VOLUME_TOTAL>/i, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
						} else {
							sumParam(d, result, 'mins_left', /<VOLUME_AVAILABLE>([\s\S]*?)<\/VOLUME_AVAILABLE>/i, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
							sumParam(d, result, 'mins_total', /<VOLUME_TOTAL>([\s\S]*?)<\/VOLUME_TOTAL>/i, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
						}
					}
				} else {
					AnyBalance.trace('Неизвестный discount: ' + d);
				}
			}
		}
		AnyBalance.trace('Ищем агрегированные параметры...');
		read_sum_parameters_text(result, xml);
	} catch (e) {
	    if(e.fatal)
	        throw e;
		//Не удалось получить инфу из хмл. Но не станем сразу унывать, получим что-нить из виджета
		AnyBalance.trace('Не удалось получить данные из входа для автоматических систем: ' + e.message);
		errorInTray = e.message || "Unknown error";
	}}else{
		AnyBalance.trace('Филиал не имеет входа для роботов...');
		errorInTray = "Вход отсутствует на сервере Мегафон";
    }
    
    if(errorInTray && !filinfo.widget){
	    var e = new AnyBalance.Error('Яндекс-виджет отсутствует для этого филиала');
	    e.meaningless = true;
	    throw e;
	}
	
	if (AnyBalance.isAvailable('internet_cost', 'bonus_balance', 'last_pay_sum', 'last_pay_date', 'mins_left', 'mins_net_left', 'mins_n_free', 'mins_total', 'internet_left', 'internet_total', 'internet_cur', 'sub_smit', 'sub_smio', 'sub_scl', 'sub_scr', 'sub_soi') || errorInTray || isAvailableButUnset(result, ['balance', 'phone', 'sms_left', 'sms_total', 'mins_left', 'mins_total', 'gb_with_you'])) {
		//Некоторую инфу можно получить из яндекс виджета. Давайте попробуем.
		var prefs = AnyBalance.getPreferences();
		AnyBalance.setDefaultCharset('utf-8');
		AnyBalance.trace('Попытаемся получить данные из яндекс виджета');
		var html = loadFilial(filial, 'widget');
		try {
			var json = getParam(html, null, null, /^[^({]*\((\{[\s\S]*?\})\);?\s*$/);
			if (!json) {
				AnyBalance.trace('Неверный ответ сервера: ' + html);
				throw new AnyBalance.Error('Неверный ответ сервера.');
			}
			json = getJsonEval(json);
			if (!json.ok) throw new AnyBalance.Error(json.error.text2);
			getParam(json.ok.html, result, 'bonus_balance', /<div[^>]*class="bonus"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
			getParam(json.ok.html, result, 'last_pay_sum', /<div[^>]*class="payment_amount"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
			getParam(json.ok.html, result, 'last_pay_date', /<div>([^<]*)<\/div>\s*<div[^>]+class="payment_source"/i, replaceTagsAndSpaces, parseDate);
			var need_int_cur = isAvailableButUnset(result, ['internet_cur']);
			if (errorInTray || isAvailableButUnset(result, ['internet_cost', 'balance', 'phone']) || AnyBalance.isAvailable('mins_left', 'mins_net_left', 'mins_n_free', 'mins_total', 'internet_left', 'internet_total', 'internet_cur', 'sub_smit', 'sub_smio', 'sub_scl', 'sub_scr', 'sub_soi')) {
				getParam(json.ok.html, result, 'balance', /<div[^>]+class="subs_balance[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
				if (isAvailableButUnset(result, ['balance'])) {
					var e = new AnyBalance.Error(errorInTray);
					e.skip = true;
					throw e; //Яндекс виджет не дал баланс. Значит, во всём дальнейшем смысла нет.
				}
				// Тут есть бага, если в TrayInfo вернули правильные значения, то здесь часто ноли, и соответственно, правильные значение затираются нолями.
				if (!isset(result.sub_smio)) {
					getParam(json.ok.html, result, 'sub_smio', /(?:Начислено абонентской платы|Абонентская плата)\s*<\/td>(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
				}
				if (!isset(result.sub_soi)) {
					getParam(json.ok.html, result, 'sub_soi', /(?:Исходящие SMS\/MMS|Начислено за услуги)\s*<\/td>(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
				}
				if (!isset(result.sub_scl)) {
					getParam(json.ok.html, result, 'sub_scl', /(?:Исходящие вызовы|Начислено за звонки)\s*<\/td>(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
				}
				if (!isset(result.sub_scr)) {
					getParam(json.ok.html, result, 'sub_scr', /Роуминг\s*<\/td>(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
				}
				// 																										Заменяем строку вида $[widgets.current.user($msisdn)]
				getParam(json.ok.html, result, 'phone', /<span[^>]*class="login"[^>]*>([\s\S]*?)<\/span>/i, [/\uFFFD/g, ' ', replaceTagsAndSpaces, /\$\[[\s\S]*?\]/i, '', replaceNumber], html_entity_decode);
				if (need_int_cur) getParam(json.ok.html, result, 'internet_cur', /Интернет-траффик \(GPRS\)\s*<\/td>(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTraffic);
				getParam(json.ok.html, result, 'internet_cost', /Интернет-траффик \(GPRS\)\s*<\/td>(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
				var table = getParam(json.ok.html, null, null, /<table[^>]*class="[^>]*rate-plans[^>][\s\S]*?<\/table>/i);
				if (table) {
					if (isAvailableButUnset(result, ['__tariff'])) sumParam(table, result, '__tariff', /<tr[^>]*>\s*<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
				} else {
					AnyBalance.trace('Не удалось найти список тарифных планов в яндекс.виджете');
				}
			}
			if (errorInTray || isAvailableButUnset(result, ['mms_left', 'mms_total', 'sms_left', 'sms_total', 'gb_with_you']) || AnyBalance.isAvailable('mins_left', 'mins_net_left', 'mins_n_free', 'mins_total', 'internet_left', 'internet_total', 'internet_cur')) {
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
				for (var i = 0; i < discounts.length; ++i) {
					var discount = discounts[i];
					var name = getParam(discount, null, null, /<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
					var val = getParam(discount, null, null, /<div[^>]*class="discount_volume"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
					if (!isset(val)) {
						AnyBalance.trace('Опция без значений: ' + discount);
						continue;
					}
					if (/SMS|СМС|сообщен/i.test(name) && !/минут/i.test(name)) {
						getLeftAndTotal(val, result, need_sms_left, need_sms_total, 'sms_left', 'sms_total', parseBalance);
					} else if (/MMS|ММС/i.test(name)) {
						getLeftAndTotal(val, result, need_mms_left, need_mms_total, 'mms_left', 'mms_total', parseBalance);
					} else if (/SMS|СМС|сообщен/i.test(name) && !/минут/i.test(name)) {
						getLeftAndTotal(val, result, need_sms_left, need_sms_total, 'sms_left', 'sms_total', parseBalance);
					} else if (/Бизнес Микс/i.test(name) && /шт/i.test(val)) {
						getLeftAndTotal(val, result, need_sms_left, need_sms_total, 'sms_left', 'sms_total', parseBalance);
					} else if (/Исходящие SM/i.test(name)) {
						if (!wasSM) {
							getLeftAndTotal(val, result, need_sms_left, need_sms_total, 'sms_left', 'sms_total', parseBalance);
							wasSM = true;
						} else {
							AnyBalance.trace('Пропускаем дублированные смс до сниженной цены: ' + val);
						}
					} else if (/Зона "Магнитогорск"/i.test(name)) {
						AnyBalance.trace('Зону магнитогорск пропускаем. Похоже, она никому не нужна: ' + discount);
					} else if (/[36]0 мин\. бесплатно/i.test(name)) {
						var mins = getLeftAndTotal(val, result, false, false, 'mins_n_free', null, parseMinutes);
						if (isset(mins.total) && !isset(mins_totals_was[mins.total])) {
							addLeftAndTotal(mins, result, AnyBalance.isAvailable('mins_n_free'), false, 'mins_n_free');
							new_mins_totals_was[mins.total] = true;
						}
					} else if (/мин на номера МегаФон|\.\s*МегаФон|на МегаФон|включено\s?/i.test(name) && !/МТС/i.test(name)) {
						var mins = getLeftAndTotal(val, result, false, false, 'mins_net_left', null, parseMinutes);
						if (!isset(mins.left) || mins.left < 1000000) { //Большие значения, считай, безлимит. Че его показывать...
							if (isset(mins.total) && !isset(mins_totals_was[mins.total])) {
								addLeftAndTotal(mins, result, AnyBalance.isAvailable('mins_net_left'), false, 'mins_net_left');
								new_mins_totals_was[mins.total] = true;
							}
						} else {
							AnyBalance.trace('Пропускаем безлимитные внутрисетевые минуты: ' + val);
						}
					} else if (/Гигабайт в дорогу/i.test(name)) {
						getLeftAndTotal(val, result, need_gb_with_you, false, 'gb_with_you', null, parseTrafficMy);
					// Трафик пришлось перенести выше, т.к. иногда есть трафик вот такого вида 187.73 мин \/ 324.27 мин \/ 512 мин и попадает в минуты
					} else if (/QS2 все включено/i.test(name) || /[кгмkgm][бb]|тар\.\s*ед/i.test(val)) {
						var traf = getLeftAndTotal(val, result, false, false, null, null, parseTrafficMy);
						if (isset(traf.total) && !isset(internet_totals_was[traf.total])) { //Проверяем, что на предыдущем этапе этот трафик ещё не был учтен
							new_internet_totals_was[traf.total] = true;
							new_internet_totals_was.total = (new_internet_totals_was.total || 0) + traf.total;
							if (AnyBalance.isAvailable('internet_cur'))
								result.internet_cur = (result.internet_cur || 0) + (traf.total - (traf.left || 0));
							if (AnyBalance.isAvailable('internet_left')) 
								result.internet_left = (result.internet_left || 0) + (traf.left || 0);
							if (AnyBalance.isAvailable('internet_total')) 
								result.internet_total = (result.internet_total || 0) + traf.total;
						// Бывают и такие остатки: 60.55 Mb \/ \/
						} else {
							getParam(val, result, 'internet_cur', /([^\/\\]+)/i, replaceTagsAndSpaces, parseTraffic);
						}
					} else if (/мин/i.test(val) || /минут/i.test(name)) {
						var mins = getLeftAndTotal(val, result, false, false, 'mins_left', 'mins_total', parseMinutes);
						if (!isset(mins.left) || mins.left < 1000000) { //Большие значения, считай, безлимит. Че его показывать...
							if (isset(mins.total) && !isset(mins_totals_was[mins.total])) {
								addLeftAndTotal(mins, result, AnyBalance.isAvailable('mins_left'), AnyBalance.isAvailable('mins_total'), 'mins_left', 'mins_total');
								new_mins_totals_was[mins.total] = true;
							}
						} else {
							AnyBalance.trace('Пропускаем безлимитные минуты: ' + val);
						}
					} else {
						AnyBalance.trace('Неизвестная опция ' + name + ': ' + val);
					}
				}
				internet_totals_was = joinObjects(internet_totals_was, new_internet_totals_was); //Запоминаем весь учтенный на этом этапе трафик
				mins_totals_was = joinObjects(mins_totals_was, new_mins_totals_was); //Запоминаем весь учтенный на этом этапе трафик
			}
		} catch (e) {
			if (e.skip) throw e;
			if (!errorInTray) {
				AnyBalance.trace('Не удалось получить доп. счетчики из Яндекс.виджета: ' + e.message);
			} else {
				var matches;
				if (e.message && (matches = e.message.match(/login:(\d+).*wrong_cnt:(\d+)/i)))
					throw new AnyBalance.Error('Неправильный номер телефона или пароль. Неудачных входов подряд: ' + matches[2]);
				if (e.message && (/The user is locked/i.test(e.message)))
					throw new AnyBalance.Error('Пользователь заблокирован (' + prefs.login + '). Пожалуйста, попытайтесь войти в сервис-гид по адресу https://sg.megafon.ru через браузер и выполните инструкции по разблокировке пользователя и получению нового пароля.', null, true);
				throw new AnyBalance.Error(errorInTray + '. Яндекс.Виджет: ' + e.message);
			}
		}
	}

/* //Переехали в гет мегафон баланс, потому что всё равно только в столичном филиале
	// Возможно фикс грубый, но бывает такое, что в виджете и в internet info трафик различается на 50 мб, из-за этого все суммируется дважды
	if(!isset(result.internet_total) && !isset(result.internet_left) && !result.internet_cur)
		getInternetInfo(filial, result, internet_totals_was);
	else
		AnyBalance.trace('Мы уже получили весь трафик, в getInternetInfo не пойдем, т.к. иначе все просуммируется и трафика станет в два раза больше')
*/
	setCountersToNull(result);
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
	// Фиксим для некоторых тарифов, они ввели еще одни данные по пакетам, и они отличаются от ALL_VOLUME
	/*var totalGiven = getParam(xml, null, null, /<GIVE_VOLUME>([\s\S]*?)<\/GIVE_VOLUME>/i, replaceTagsAndSpaces, parseTrafficMyMb) || 0;
	if(totalGiven >= total) {
		AnyBalance.trace('Пытаемся пофиксить трафик, измененили ' + total + ' на ' + totalGiven);
		total = totalGiven;
	}*/
    if(isset(total)){
        var need_traffic = !internet_totals_was[total] && internet_totals_was.total != total;
        
        if(!need_traffic){
            AnyBalance.trace('Трафик ' + total + ' уже есть, поэтому не будем его дополнительно искать');
        }
        
        if(need_traffic){
            sumParam(xml, result, 'internet_cur', /<CUR_VOLUME>([\s\S]*?)<\/CUR_VOLUME>/i, replaceTagsAndSpaces, parseTrafficMyMb, aggregate_sum);
            sumParam(xml, result, 'internet_left', /<LOST_VOLUME>([\s\S]*?)<\/LOST_VOLUME>/i, replaceTagsAndSpaces, parseTrafficMyMb, aggregate_sum);
            sumParam(total + 'мб', result, 'internet_total', null, replaceTagsAndSpaces, parseTrafficMyMb, aggregate_sum);
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

function megafonBalanceInfo(filial) {
    var filinfo = filial_info[filial];
    var prefs = AnyBalance.getPreferences();

    AnyBalance.trace('Connecting to MEGAFON_BALANCE ' + filinfo.name);
    if(!filinfo.balanceRobot){
	    var e = new AnyBalance.Error('MEGAFON_BALANCE отсутствует для этого филиала');
	    e.meaningless = true;
	    throw e;
    }

    var html = AnyBalance.requestGet(filinfo.balanceRobot.replace(/%LOGIN%/i, encodeURIComponent(prefs.login)).replace(/%PASSWORD%/i, encodeURIComponent(prefs.password)));
    if(!/<BALANCE>([^<]*)<\/BALANCE>/i.test(html)){
        var error = getParam(html, null, null, /<ERROR_MESSAGE>([\s\S]*?)<\/ERROR_MESSAGE>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error, null, /Wrong password/i.test(error));
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сервис временно недоступен');
    }

    var result = {success: true, filial: filinfo.id};

    var balance = getParam(html, null, null, /<BALANCE>([^<]*)<\/BALANCE>/i, replaceTagsAndSpaces, parseBalance);
    var limit = getParam(html, null, null, /<CREDIT_\w+LIMIT>([^<]*)<\/CREDIT_\w+LIMIT>/i, replaceTagsAndSpaces, parseBalance);
    getParam(balance-(limit || 0), result, 'balance');
    getParam(limit, result, 'credit');
    getParam(html, result, 'phone', /<MSISDN>([^<]*)<\/MSISDN>/i, replaceNumber, html_entity_decode);

    //Не, врет безбожно, бесполезно вызывать
    //getInternetInfo(filial, result, {});

    setCountersToNull(result);
    AnyBalance.setResult(result);
}

function checkTextForError(text){
    //Произошла ошибка при работе с системой.
    var error = getParam(text, null, null, /&#1055;&#1088;&#1086;&#1080;&#1079;&#1086;&#1096;&#1083;&#1072; &#1086;&#1096;&#1080;&#1073;&#1082;&#1072; &#1087;&#1088;&#1080; &#1088;&#1072;&#1073;&#1086;&#1090;&#1077; &#1089; &#1089;&#1080;&#1089;&#1090;&#1077;&#1084;&#1086;&#1081;[\s\S]*?<[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    if(error)
        throw new AnyBalance.Error(error);

    error = getParam(text, null, null, /<STRONG[^>]+class="attention">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
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

function megafonServiceGuidePhysical(filial, sessionid, text){
	AnyBalance.trace('Мы в megafonServiceGuidePhysical; sessionid ==' + sessionid);
    var filinfo = filial_info[filial];
    var baseurl = filinfo.sg;
    var prefs = AnyBalance.getPreferences(), matches;
    
    var result = {success: true, filial: filinfo.id};

    var phone = prefs.phone || prefs.login;

    if(!text || !/id="MAIN_FORM_NAME"[^>]*value="ACCOUNT_INFO"/i.test(text) || !/id="SESSION_ID" value="[^"]+/i.test(text)){
        text = AnyBalance.requestPost(baseurl + 'SCWWW/ACCOUNT_INFO', {
            SUBSCRIBER_MSISDN:phone,
            CHANNEL: 'WWW', 
            SESSION_ID: sessionid,
            P_USER_LANG_ID: '1',
            CUR_SUBS_MSISDN:phone
        }, addHeaders({Referer: baseurl + 'SCC/SC_BASE_LOGIN'}));
    }

    checkTextForError(text);
    if(!/id="MAIN_FORM_NAME"[^>]*value="ACCOUNT_INFO"/i.test(text) || !/id="SESSION_ID"[^>]*value="[^"]+/i.test(text)){
        AnyBalance.trace(text);
    	if(/SESSION_TIMEOUT_REDIRECT/.test(text))
    		throw new AnyBalance.Error('Сессия внезапно устарела.');
    	throw new AnyBalance.Error('Не удалось зайти в сервис-гид. Сайт изменен?');
    }
	
    //Теперь получим баланс и кредитный лимит (Уровень кредита|Кредитный лимит):
	var balance = getParam(text, null, null, /&#1041;&#1072;&#1083;&#1072;&#1085;&#1089;[\s\S]*?<div class="balance_[^>]*>([\S\s]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    var limit = getParam(text, null, null, /(?:&#1059;&#1088;&#1086;&#1074;&#1077;&#1085;&#1100; &#1082;&#1088;&#1077;&#1076;&#1080;&#1090;&#1072;|&#1050;&#1088;&#1077;&#1076;&#1080;&#1090;&#1085;&#1099;&#1081; &#1083;&#1080;&#1084;&#1080;&#1090;):([\S\s]*?)<\/tr>/i, replaceTagsAndSpaces, parseBalance);
    getParam(balance-(limit || 0), result, 'balance');
    getParam(limit, result, 'credit');
    //Теперь получим телефон
    getParam(text, result, 'phone', /<select[^>]*name="SUBSCRIBER_MSISDN"[\s\S]*?<option[^>]+value="([^"]*)[^>]*selected/i, replaceNumber, html_entity_decode);
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
	
	var foundInternetPacketOptions = {};
    
    //Между Текущие скидки и пакеты услуг: и Текущие услуги:
    //matches = text.match(/<div сlass="heading">&#1058;&#1077;&#1082;&#1091;&#1097;&#1080;&#1077; &#1089;&#1082;&#1080;&#1076;&#1082;&#1080; &#1080; &#1087;&#1072;&#1082;&#1077;&#1090;&#1099; &#1091;&#1089;&#1083;&#1091;&#1075;:<\/div>([\s\S]*?)<div class="heading">&#1058;&#1077;&#1082;&#1091;&#1097;&#1080;&#1077; &#1091;&#1089;&#1083;&#1091;&#1075;&#1080;:<\/div>/); 
    var text = getParam(text, null, null, /<table(?:[\s\S](?!<\/table>))*?(?:colname="SUBS_VOLUME"|head_grid_template_name="DISCOUNTS")(?:[\s\S]*?<\/table>){2}/i);
	var optionGroupHtml = '', optionGroupText = '';
    if(text){//Таблица скидок
        var colnum = /colname="OWNER"/.test(text) ? 2 : 1; //Новая колонка в некоторых кабинетах - владелец скидки
        var has_used = /colname="SUBS_VOLUME"/.test(text);
        var columnsRegexps = [
 			/(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i,
			/(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i,
			/(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i,
			/(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i,
			/(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i,
        ];
        var rows = sumParam(text, null, null, /<tr[^>]*>[\s\S]*?<\/tr>/ig, null, html_entity_decode);
		var reOption = /<tr[^>]*>(?:(?:[\s\S](?!<\/tr>))*?<td[^>]*>\s*<div[^>]+class="td_def"[^>]*>){3}[\s\S]*?<\/tr>/i;
        for(var i=0; i<rows.length; ++i){
		    var row = rows[i];
			if(/grid-header-cell/i.test(row)){
			    continue; //Заголовок пропускаем
			}else if(!reOption.test(row)){
				optionGroupHtml = row;
				optionGroupText = getParam(row, null, null, null, replaceTagsAndSpaces);
			    AnyBalance.trace('Найдена группа опций: ' + optionGroupText);
			}else{
				//Должны точно ловиться:
				//Бонус 1 - полчаса бесплатно (Москва)
				//10 мин на МТС, Билайн, Скай Линк
				
				var name = getParam(row, null, null, /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
			    AnyBalance.trace('Найдена опция: ' + name);
				
				var isInternetUnits = /[\d\.]+\s*[гмкgmk][бb]/i.test(row);
				
				//Ищем в таблице скидок строки вида: 39:00 мин   39:00, что означает Всего, Остаток
				if(/<div class="td_def">\s*(\d+)(?::(\d+))?[^<]*(?:М|м)ин[^<]*<[^а-я\d]*<div class="td_def">(\d+)(?::(\d+))?/i.test(row)){ 
				    //Это минуты, надо бы их рассортировать
					if(/[36]0 мин\. бесплатно/i.test(name))
						sumOption(colnum, row, result, null, 'mins_n_free', '.', parseMinutes);
					else if(/мин на МТС Билайн Скай Линк/i.test(name))
						sumOption(colnum, row, result, 'mins_compet_total', 'mins_compet_left', '.', parseMinutes);
					else if(/мин на номера СНГ/i.test(name))
						sumOption(colnum, row, result, 'mins_sng_total', 'mins_sng_left', '.', parseMinutes);
					else if(/мин по России/i.test(name))
						sumOption(colnum, row, result, 'mins_country_total', 'mins_country_left', '.', parseMinutes);
					else if(/внутри сети|\.\s*мегафон|на МегаФон|включено\s?/i.test(name) && !/мтс/i.test(name)) //мегафон не должен быть сначала. А то перепутается с названием тарифа
						sumOption(colnum, row, result, 'mins_net_total', 'mins_net_left', '.', parseMinutes);
					else{
				        AnyBalance.trace('Минуты ' + name + ', относим к просто минутам');
						sumOption(colnum, row, result, 'mins_total', 'mins_left', '.', parseMinutes);
					}
				// Надо проверить нет ли в юнитах кб, а то вот такая строка "5 минут 30 SMS 30 MMS 30 МБ" разбирается неправильно
				}else if(/(?:SMS|СМС|сообщен)/i.test(name) && !isInternetUnits ){
					// Карманный интернет теперь покрывается циклом выше
					
					//200 SMS MegaVIP 0
					//Пакет SMS за бонусы
					//Пакет SMS-сообщений (Поволжье)
					//SMS на номера России
					//(SMS|СМС|сообщен)
					sumOption(colnum, row, result, 'sms_total', 'sms_left', '.');
				}else if(/Исходящие SM\s*</i.test(name)){
					//Исходящие SM (ОХард, Москва)
					sumOption(colnum, row, result, 'sms_total', 'sms_left', '.');
				}else if(/(?:MMS|ММС)/i.test(name) && !isInternetUnits ){
					//MMS
					sumOption(colnum, row, result, 'mms_total', 'mms_left', '.');
				}else if(/Нужный подарок/i.test(name)){
					//Нужный подарок (Поволжье)
					sumOption(colnum, row, result, 'handygift_total', 'handygift_left', '.');
				}else if(/Гигабайт в дорогу/i.test(name)){
					//Гигабайт в дорогу
					sumOption(colnum, row, result, null, 'gb_with_you', '.');
				}else if(/на номера МегаФон/i.test(name)){
					//3 мин на номера МегаФон-Сибирь
					sumOption(colnum, row, result, 'mins_net_total', 'mins_net_left', '.', parseMinutes);
				}else if(/БИ[ТT]\b|GPRS|Интернет|трафик|Internet|\d+\s+[гмкgmk][бb]/i.test(name) || isInternetUnits){
				    var internetPacket = getParam(optionGroupText, null, null, /Интернет \w+/i);
					if(internetPacket)
					    foundInternetPacketOptions[internetPacket] = true;
						
					var total = getParam(row, null, null, columnsRegexps[0 + colnum - 1], replaceTagsAndSpaces, parseTrafficMy);
					var left = getParam(row, null, null, columnsRegexps[1 + colnum - 1], replaceTagsAndSpaces, parseTrafficMy);
					var used;
					if(has_used)
						used = getParam(row, null, null, columnsRegexps[2 + colnum - 1], replaceTagsAndSpaces, parseTrafficMy);

					if(isset(total) && isset(left) && !used)
						used = total - left;

					var night = /ноч/i.test(name) ? '_night' : '';
					sumParam(total, result, 'internet_total' + night, null, null, null, aggregate_sum);
					sumParam(left, result, 'internet_left' + night, null, null, null, aggregate_sum);
					sumParam(used, result, 'internet_cur' + night, null, null, null, aggregate_sum);

					sumParam(row, result, 'internet_till', columnsRegexps[(has_used ? 3 : 2) + colnum - 1], [replaceTagsAndSpaces, /.*-/, ''], parseDate, aggregate_min);
				}else if(/<div[^>]+class="td_def"[^>]*>\s*\d+\s*шт\s*</i.test(row)){
					//Какие-то штуки. Наверное СМС
					AnyBalance.trace('Штуки ' + name + ' относим к смс');
					sumOption(colnum, row, result, 'sms_total', 'sms_left', '.');
				}else{
				    AnyBalance.trace('??? НЕИЗВЕСТНАЯ ОПЦИЯ (группа ' + optionGroupText + ') ' + name + ': ' + row);
				}
			}
        }
    }

    //Пакет Интернет 24 теперь покрывается циклом выше

    if(AnyBalance.isAvailable('last_pay_sum', 'last_pay_date')){
        text = AnyBalance.requestPost(baseurl + 'SCWWW/PAYMENTS_INFO',
                    {
                        CHANNEL: 'WWW', 
                        SESSION_ID: sessionid,
                        CUR_SUBS_MSISDN: phone,
                        SUBSCRIBER_MSISDN: phone
        			}, addHeaders({Referer: baseurl + 'SCC/SC_BASE_LOGIN'}));
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
        		}, addHeaders({Referer: baseurl + 'SCC/SC_BASE_LOGIN'}));
                
        if(matches = text.match(/&#1041;&#1086;&#1085;&#1091;&#1089;&#1085;&#1099;&#1081; &#1073;&#1072;&#1083;&#1072;&#1085;&#1089;:[\s\S]*?<td class="td_right">[\s\S]*?<div>([\d\.]+)/i)){
            result.bonus_balance = parseFloat(matches[1]);
        }

        //Сгорают в текущем месяце
        getParam(text, result, 'bonus_burn', /<colgroup[^>]+grid_template_name="DEAD_BONUSES"(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    }


    if(filinfo.sg){
        // Продли скорость (Москва)
        if(false && AnyBalance.isAvailable(['internet_total','internet_cur', 'internet_left'])){ //Вроде бы уже не должно работать. Отключаем.
            text = AnyBalance.requestGet(baseurl + 'SCCEXTSYS/EXT_SYSTEM_PROXY_FORM?CHANNEL=WWW&SESSION_ID=' + sessionid + '&URI=3.', addHeaders({Referer: baseurl + 'SCC/SC_BASE_LOGIN'}));
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
        	}, addHeaders({Referer: baseurl + 'SCC/SC_BASE_LOGIN'}));

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
						if(!foundInternetPacketOptions[optName]){
							if(/^Интернет \w+$/i.test(optName))
							{
								AnyBalance.trace('Опция ' + optName+ ' нам известна, разбираем...');
								sumParam(tr, result, 'internet_total', /Включённый объём:(?:[\s\S]*?<div[^>]*>){3}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
								sumParam(tr, result, 'internet_left', /Включённый объём:(?:[\s\S]*?<div[^>]*>){4}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseTraffic, aggregate_sum);

								if(isAvailable('internet_cur'))
									result.internet_cur = (result.internet_cur||0) + (result.internet_total - (result.internet_left||0));
							}
							else
								AnyBalance.trace('Опция ' + optName+ ' неизвестна, свяжитесь с автором провайдера для добавления данной опции.');
						}else{
							AnyBalance.trace('Опцию ' + optName+ ' уже обработали ранее, пропускаем');
						}
					}
				}
			}
			else{
				AnyBalance.trace(text);
				AnyBalance.trace("Не удаётся найти таблицу услуг, свяжиетсь с автором провайдера");
			}
        }

        //Отключаем посылку смс при входе.
		turnOffNotificationSMSSG(filial, sessionid, phone);
    }
    
    if(filial == MEGA_FILIAL_VOLGA){
        if(AnyBalance.isAvailable('internet_left')) {
            text = AnyBalance.requestGet(baseurl + 'SCCEXTSYS/EXT_SYSTEM_PROXY_FORM?CHANNEL=WWW&SESSION_ID=' + sessionid + '&URI=5.');
            sumParam(text, result, 'internet_left', /<volume>([^<]*)<\/volume>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
            sumParam(text, result, 'internet_left', /осталось ([^<]*(?:[kmgкмг][бb]|байт|bytes))/i, replaceTagsAndSpaces, parseTrafficMy, aggregate_sum);
        }
    }
    
	setCountersToNull(result);
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
    if(isset(val)){
	if(val > 1000000){
            AnyBalance.trace('Parsed ' + val + ' seconds from ' + str + ' (' + _str + '). Это безлимитные минуты, пропускаем.');
	    val = undefined;
	}else
            AnyBalance.trace('Parsed ' + val + ' seconds from ' + str + ' (' + _str + ')');
    }else
        AnyBalance.trace('Failed to parse seconds from ' + str + ' (' + _str + ')');
    return val;
}

function sumOption(num, text, result, totalName, leftName, optionName, parseFunc){
    if(!parseFunc) parseFunc = parseBalance;

    if(totalName){
	    var mins = /^mins_/.test(totalName);
        var aggregate = mins ? aggregate_sum_minutes : aggregate_sum;
        var re1 = new RegExp('(?:[\\s\\S]*?<td[^>]*>){' + (num+1) + '}([\\s\\S]*?)</td>', 'i');
        var val = getParam(text, null, null, re1, replaceTagsAndSpaces, parseFunc);
	    if(!mins || val < 1000000) //Большие значения, считай, безлимит. Че его показывать...
            sumParam(val || 0, result, totalName, null, null, null, aggregate);
        else
            AnyBalance.trace('Пропускаем безлимитные минуты: ' + val);
    }
    if(leftName){
	    var mins = /^mins_/.test(leftName);
        var aggregate = mins ? aggregate_sum_minutes : aggregate_sum;
        var re2 = new RegExp('(?:[\\s\\S]*?<td[^>]*>){' + (num+2) + '}([\\s\\S]*?)</td>', 'i');
        var val = getParam(text, null, null, re2, replaceTagsAndSpaces, parseFunc);
	    if(!mins || val < 1000000) //Большие значения, считай, безлимит. Че его показывать...
            sumParam(val, result, leftName, null, null, null, aggregate);
        else
            AnyBalance.trace('Пропускаем безлимитные минуты: ' + val);
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

function parseTrafficToBytes(str){
  return parseTrafficExMega(str, 1024, 0, 'b');
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
    var units = getParam(_text, null, null, /([kmgкмгт][бb]?|[бb](?![\wа-я])|байт|byte)/i);
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

function isCaptchaAllowed(){
	var prefs = AnyBalance.getPreferences();
	
	var matches = /(\d+)-(\d+)/.exec(prefs.allowcaptcha || '');
	if(matches){
		var from = parseInt(matches[1]), to = parseInt(matches[2]);
		var hours = new Date().getHours();
		if(hours < from || hours >= to)
			return false;
		return true;
	}else if(prefs.allowcaptcha == 'man'){
	    return !!(prefs.$$startReason$$ || 0)&0xFF;
	}else{
		return true;
	}
}

function initialize(filial){
    var prefs = AnyBalance.getPreferences();
    checkEmpty(!prefs.password || /^\w{6,26}$/.test(prefs.password), 'Желаемый пароль должен содержать от 6 до 26 символов');
    
    var pass = AnyBalance.retrieveCode('Наберите на телефоне с номером ' + prefs.login + ' команду *105*00# или отправьте СМС с текстом 00 на номер 000105. В ответ придет СМС с паролем. Введите его в поле ввода ниже. <!--#instruction:{"sms":{"number":"000105","text":"00","number_in":"MegaFon","regexp_in":"Пароль для доступа\\D+(\\d+)\\."},"ussd":{"number":"*105*00#","number_in":"MegaFon","regexp_in":"Пароль для доступа\\D+(\\d+)\\."}}#-->', null, {time: 300000});

    var sginfo;
    try{
        sginfo = enterLK(filial, {login: prefs.login, password: pass, useOldSG: true});
    }catch(e){
        if(e.fatal)
            throw e;
        AnyBalance.trace('Не удалось войти через ЛК, пробуем зайти в СГ напрямую: ' + e.message);
        sginfo = enterSG(filial, {login: prefs.login, password: pass});
    }
    if(prefs.password && pass != prefs.password){
    	changePasswordSG(filial, sginfo.sessionid, pass, prefs.password);
    }
    turnOffNotificationSMSSG(filial, sginfo.sessionid, prefs.login);
    allowRobotsSG(filial, sginfo.sessionid, prefs.login);
    
    var result = {success: true, __initialization: true};

    result.login = prefs.login;
    result.password = prefs.password;
    for(var f in filial_info){
	if(filial_info[f] == filial)
	    result.region = f;
    }

	AnyBalance.setResult(result);
}

function isLoggedInLK(html){
	return /app-id=ru.megafon.mlk/i.test(html) && /logout/i.test(html);
}

function isLoggedInSG(html){
	return /CLOSE_SESSION/i.test(html);
}

function enterLK(filial, options){
	var prefs = AnyBalance.getPreferences();
	AnyBalance.trace('Пробуем войти в новый ЛК...');
	
	var baseurl = lk_url;
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	if(isLoggedInLK(html)){
		var phone = getParam(html, null, null, /<div[^>]+private-office-info-phone[^>]*>([\s\S]*?)<\/div>/i, [replaceTagsAndSpaces, replaceHtmlEntities, /\D/g, '']);
		AnyBalance.trace('Автоматически зашли в личный кабинет на номер ' + phone);
		if(!phone){
			AnyBalance.trace(html);
			AnyBalance.trace('Не удалось определить номер... Будем входить по логину и паролю.');
			removeAllLKCookies();
			html = AnyBalance.requestGet(baseurl + 'login/', g_headers);
		}else if(phone.indexOf(prefs.login) >= 0){
			AnyBalance.trace('Номер правильный. Используем этот вход.');
		}else{
			AnyBalance.trace('Номер неправильный (нужен ' + prefs.login + '). Будем входить по логину и паролю.');
			removeAllLKCookies();
			html = AnyBalance.requestGet(baseurl + 'login/', g_headers);
		}
	}
	if(!isLoggedInLK(html)){
		var token = getParam(html, null, null, /name=CSRF value="([^"]+)/i);
		if(!token)
			AnyBalance.trace(html);
		
		checkEmpty(token, 'Не удалось найти токен авторизации ЛК!', true);
		
		html = AnyBalance.requestPost(baseurl + 'dologin/', {
			j_username:options.login,
			j_password:options.password,
			CSRF:token,
		}, addHeaders({Referer: baseurl + 'login/'}));
	}	

	if (!isLoggedInLK(html) && !isLoggedInSG(html)) {
		var error = getParam(html, null, null, /login-warning[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
		if (!error)
			error = getParam(html, null, null, /<div[^>]+mf-error[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /(?:Неверный|Неправильный) логин\/пароль|Пользователь заблокирован/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в новый личный кабинет. Сайт изменен или на этом номере он не поддерживается.');
	}
			
	var sessionid = getParam(html, null, null, /SESSION_ID=([^&"]+)/i);

	try{
		if(options.useOldSG){
			var sghtml = html;
			var href = getParam(sghtml, null, null, /href="\/redirect\/sg\/index"/i, replaceTagsAndSpaces, html_entity_decode);
			// Не у всех доступен новый ЛК, если у юзера он не подключен, та нас редиректит сразу в старый кабинет
	    
			if(href || sessionid) {
				var goneToSG = false;
	    
				if(href && !sessionid) {
					AnyBalance.trace('Нашли ссылку для перехода в старый сервис-гид, получим данные оттуда...');
					try {
						sghtml = AnyBalance.requestGet(baseurl + 'redirect/sg/index', g_headers);
						goneToSG = true;
						var url = AnyBalance.getLastUrl();
						AnyBalance.trace('Redirected to ' + url /*+ '\nResult\n\n' + html*/);
						sessionid = getParam(href + url, null, null, /SESSION_ID=([^&"]+)/i);
					} catch(e){
					    AnyBalance.trace('Error: ' + e.message);
					}
				}
				
				if(sessionid && !href) {
					AnyBalance.trace('На данном номере не поддерживается новый ЛК, нас просто отправили в старый кабинет...');
				}
				
				if(!sessionid) {
					if(prefs.debug) {
						sessionid = AnyBalance.retrieveCode("Пожалуйста, введите sessionid");
					} else {
						if(goneToSG) AnyBalance.trace(sghtml);
						throw new AnyBalance.Error('Не удалось найти код сессии!');
					}
				}

				return {old: true, sessionid: sessionid, html: sghtml};
			} else {
				throw new AnyBalance.Error('Не удалось найти ссылку на вход в старый кабинет!');
			}
		}
	}catch(e){
		AnyBalance.trace('Ошибка входа в сервис гид через ЛК: ' + e.message + '\nБудем получать данные из ЛК');
	}

	//Может быть нас просто отправили в старый кабинет...
	var sessionid = getParam(html, null, null, /SESSION_ID=([^&"]+)/i);
	return {old: !!sessionid, html: html, sessionid: sessionid};
}

function changePasswordSG(filial, sessionid, frompass, topass){
    AnyBalance.trace('Мы в megafonServiceGuidePhysical; sessionid ==' + sessionid);

    var filinfo = filial_info[filial];
    var baseurl = filinfo.sg;
    var prefs = AnyBalance.getPreferences(), matches;
    
    var result = {success: true, filial: filinfo.id};

    var phone = prefs.login;
/*  //И без этого работает, незачем сервер мегафона зря нагружать
    var text = AnyBalance.requestPost(baseurl + 'SCWWW/SUBS_CHANGE_PASSWORD_ONLY_FORM', {
		P_GRID_LEFT:'0',
		P_GRID_WIDTH:'740',
		findspec:'',
        SUBSCRIBER_MSISDN:phone,
        CHANNEL: 'WWW', 
        SESSION_ID: sessionid,
        P_USER_LANG_ID: 1,
        CUR_SUBS_MSISDN:phone
    });

    if(AnyBalance.getLastStatusCode() > 400){
	AnyBalance.trace(text);
	throw new AnyBalance.Error('Ошибка на сервере Мегафона. Попробуйте ещё раз позже');
    }
    checkTextForError(text);
*/	

    text = AnyBalance.requestPost(baseurl + 'SCWWW/SUBS_CHANGE_PASSWORD_ONLY_ACTION', {
		PASSWORD:frompass,
		NEW_PASSWORD:topass,
		CONFIRM_PASSWORD:topass,
		P_GRID_LEFT:'0',
		P_GRID_WIDTH:'740',
        SUBSCRIBER_MSISDN:phone,
        CHANNEL: 'WWW', 
        SESSION_ID: sessionid,
        P_USER_LANG_ID: 1,
        CUR_SUBS_MSISDN:phone
    }, addHeaders({Referer: baseurl + 'SCC/SC_BASE_LOGIN'}));

   	var action_result = getParam(text, null, null, /<div[^>]+class="action_result"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
   	AnyBalance.trace("Result: " + action_result);

    //Пароль успешно изменен
    if(/&#1055;&#1072;&#1088;&#1086;&#1083;&#1100; &#1091;&#1089;&#1087;&#1077;&#1096;&#1085;&#1086; &#1089;&#1084;&#1077;&#1085;&#1077;&#1085;/i.test(text))
		return true;

    var error = getParam(text, null, null, /<STRONG[^>]+class="attention">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    if(error)
		throw new AnyBalance.Error(error);

    if(AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(text);
		throw new AnyBalance.Error('Ошибка на сервере Мегафона. Попробуйте ещё раз позже');
    }

    AnyBalance.trace(text);
    throw new AnyBalance.Error('Не удалось сменить пароль');    
}

function enterSG(filial, options){
    var filinfo = filial_info[filial];
    var baseurl = filinfo.sg;

    var html = AnyBalance.requestGet(baseurl, g_headers);
    var form = getParam(html, null, null, /<form[^>]+id="LOGIN_FORM"[^>]*>[\s\S]*?<\/form>/i);
    if(!form){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удаётся найти форму входа в Сервис-гид. Сайт изменен?');
    }

    var psid = getParam(form, null, null, /<input[^>]+name="PHPSESSID"[^>]*value="([^"]*)/i, null, html_entity_decode);
    var code;
    if(psid){
	var imgurl = baseurl + "ps/scc/php/cryptographp.php?PHPSESSID=" + psid + '&ref=' + (Math.round(1E3 * Math.random()) + 1) + '&w=137';
	var img = AnyBalance.requestGet(imgurl, g_headers);
		var inputType = filinfo.sgCaptchaInputType || 'number';
        code = AnyBalance.retrieveCode('Пожалуйста, введите код с картинки', img, {inputType: inputType});
    }

    html = AnyBalance.requestPost(baseurl + 'ps/scc/php/check.php?CHANNEL=WWW', {
		PHPSESSID: psid,
		LOGIN: options.login, 
        PASSWORD: options.password,
		CODE: code
    }, g_headers);
    
    var sessionid = getSessionIdFromSGLogin(html);
/*
    html = AnyBalance.requestPost(baseurl + 'SCC/SC_BASE_LOGIN', {
        SESSION_ID: sessionid,
        CHANNEL: 'WWW', 
        P_USER_LANG_ID: '1',
        LOGIN: options.login,
        PASSWD: options.password
    });
*/

/*  //И без этого работает, зачем сервер мегафона нагружать зря
    html = AnyBalance.requestPost(baseurl + 'SCC/SC_BASE_LOGIN', {
        SESSION_ID: sessionid,
        CHANNEL: 'WWW', 
        LOGIN: options.login,
        PASSWD:options.password
    }, addHeaders({Referer: baseurl + 'ps/scc/login.html?MODE=LOGIN&CHANNEL=WWW&CHANNELTYPE=COMMON&P_USER_LANG_ID=1'}));
    
    checkTextForError(html);
*/
    return {old: true, sessionid: sessionid, html: html};;
}

function getSessionIdFromSGLogin(html){
    var errid = getParam(html, null, null, /<ERROR_ID>(.*?)<\/ERROR_ID>/i, replaceTagsAndSpaces, html_entity_decode);
    if(errid){
        AnyBalance.trace('Got error from sg: ' + errid);

        if(errid == '60020011')
            throw new AnyBalance.Error('Пользователь заблокирован. Для разблокировки наберите команду *105*00# и нажмите клавишу вызова, новый пароль будет отправлен Вам в SMS.', null, true);

        //Случилась ошибка, может быть мы можем даже увидеть её описание
	var error = getParam(html, null, null, /<ERROR_MESSAGE>(.*?)<\/ERROR_MESSAGE>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error){
            AnyBalance.trace('Got error message from sg: ' + error);
            throw new AnyBalance.Error(error, null, /неправильный пароль|Абонент не найден|Пользователь заблокирован/i.test(html));
        }

        errid = "error_" + Math.abs(parseInt(errid));
        if(g_login_errors[errid])
            throw new AnyBalance.Error(g_login_errors[errid]);

        AnyBalance.trace('Got unknown error from sg');
        throw new AnyBalance.Error(g_login_errors.error_0);
    }

    var sessionid = getParam(html, null, null, /<SESSION_ID>(.*?)<\/SESSION_ID>/i, replaceTagsAndSpaces, html_entity_decode);
    if(!sessionid){
	AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось получить сессию'); //Странный ответ, может, можно переконнектиться потом
    }

    return sessionid;
}

function turnOffNotificationSMSSG(filial, sessionid, login){
    var filinfo = filial_info[filial];
    var baseurl = filinfo.sg;

    var text = AnyBalance.requestPost(baseurl + 'SCWWW/SMS_NG_FORM', {
    	'P_GRID_LEFT':'0',
    	'P_GRID_WIDTH':'740',
    	'find':'',
    	'CHANNEL':'WWW',
    	'SESSION_ID':sessionid,
    	'P_USER_LANG_ID':'1',
    	'CUR_SUBS_MSISDN':login,
	'SUBSCRIBER_MSISDN':login
    }, addHeaders({Referer: baseurl + 'SCC/SC_BASE_LOGIN'}));

    //Ищем строчку с Успешный вход
    var row = getParam(text, null, null, /<tr[^>]+(?:[\s\S](?!<\/tr>))*?&#1059;&#1089;&#1087;&#1077;&#1096;&#1085;&#1099;&#1081; &#1074;&#1093;&#1086;&#1076;[\s\S]*?<\/tr>/i);
    if(row){
        if(/<input[^>]+id="idSMSCheck_\d+"[^>]*checked/i.test(row)){
        	AnyBalance.trace('Уведомление по смс о входе разрешено. Запрещаем его, чтобы не парило мозг.');
        	var snev = getParam(row, null, null, /<input[^>]+name="P_SNEV_ID_LIST"[^>]*value="([^"]*)/i, null, html_entity_decode);
        	text = AnyBalance.requestPost(baseurl + 'SCWWW/SMS_NG_ACTION', {
        		'RECIPIENT':'',
        		'P_SNEV_ID_LIST':snev,
        		'P_SMS_NOTIFY_FLAG_LIST':'',
        		'P_EMAIL_NOTIFY_FLAG_LIST':'',
        		'P_GRID_LEFT':'0',
        		'P_GRID_WIDTH':'740',
        		'CHANNEL':'WWW',
        		'SESSION_ID':sessionid,
        		'P_USER_LANG_ID':'1',
		'CUR_SUBS_MSISDN':login,
        		'SUBSCRIBER_MSISDN':login
        	}, addHeaders({Referer: baseurl + 'SCC/SC_BASE_LOGIN'}));
        	var action_result = getParam(text, null, null, /<div[^>]+class="action_result"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        	AnyBalance.trace("Result: " + action_result);
        }else if(/<input[^>]+id="idSMSCheck_/i.test(row)){
		AnyBalance.trace('Уведомление по смс о входе отключено. И отлично.');
        }else{
        	AnyBalance.trace('Не удалось получить галочку отмены смс оповещения: ' + row);
        }
    }else{
       	AnyBalance.trace('Не удалось найти строку отмены смс оповещения: ' + text);
    }
}

function allowRobotsSG(filial, sessionid, login){
    var filinfo = filial_info[filial];
    var baseurl = filinfo.sg;

    var text = AnyBalance.requestPost(baseurl + 'SCWWW/UNBLOCK_ROBOT_FORM', {
    	'P_GRID_LEFT':'0',
    	'P_GRID_WIDTH':'740',
    	'findspec':'',
    	'CHANNEL':'WWW',
    	'SESSION_ID':sessionid,
    	'P_USER_LANG_ID':'1',
    	'CUR_SUBS_MSISDN':login,
	'SUBSCRIBER_MSISDN':login
    }, addHeaders({Referer: baseurl + 'SCC/SC_BASE_LOGIN'}));

    if(/<input[^>]+id="robot_allowed_radio"[^>]*checked/i.test(text)){
	AnyBalance.trace('Доступ для автоматизированных систем разрешен, отлично.');
    }else{
	AnyBalance.trace('Доступ для автоматизированных систем запрещен, надо включить...');
        text = AnyBalance.requestPost(baseurl + 'SCWWW/SAVE_ROBOT_PARAMETERS_ACTION', {
        	'P_IS_ROBOT_LOGIN_ALLOWED':'1',
        	'P_GRID_LEFT':'0',
        	'P_GRID_WIDTH':'740',
        	'CHANNEL':'WWW',
        	'SESSION_ID':sessionid,
        	'P_USER_LANG_ID':'1',
		'CUR_SUBS_MSISDN':login,
        	'SUBSCRIBER_MSISDN':login
        }, addHeaders({Referer: baseurl + 'SCC/SC_BASE_LOGIN'}));
        var action_result = getParam(text, null, null, /<div[^>]+class="action_result"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        AnyBalance.trace("Result: " + action_result);
    }
}

//Получение данных из ЛК мегафона
function megafonLK(filial, html){
	var result = {success: true, filial: filial_info[filial].id};

	getParam(html, result, 'phone', /<div[^>]*private-office-info-phone[^>]*>([\s\S]*?)<\/div>/i, replaceNumber, html_entity_decode);
	getParam(html, result, 'credit', /<div[^>]*private-office-limit[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balance', /Баланс([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'available', /Доступно([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'bonus_balance', /Бонусные баллы([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
//	getParam(html, result, '__tariff', />\s*Тариф([\s\S]*?)<\/div>/i, [replaceTagsAndSpaces, /^&laquo;(.*)&raquo;$/, '$1'], html_entity_decode);

	if(AnyBalance.isAvailable('__tariff')){
		html = AnyBalance.requestGet(lk_url + '', g_headers);
	    getParam(html, result, '__tariff', />\s*Тариф([\s\S]*?)<\/div>/i, [replaceTagsAndSpaces, /^&laquo;(.*)&raquo;$/, '$1'], html_entity_decode);
	}else{
		html = AnyBalance.requestGet(lk_url + 'tariffs/', g_headers);
	    getParam(html, result, '__tariff', /<div[^>]+gadget-tariff-name[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	}
	
	if(AnyBalance.isAvailable('mins_n_free', 'mins_net_left', 'mins_left', 'mins_total', 'mms_left', 'mms_total', 'sms_left', 'sms_total', 
			'gb_with_you', 'internet_left', 'internet_total', 'internet_cur', 'internet_left_night', 'internet_total_night', 'interent_cur_night')){
		html = AnyBalance.requestGet(lk_url + 'remainders/', g_headers);
		megafonLKRemainders(filial, html, result);
	}

	if(AnyBalance.isAvailable('bonus_burn')){
		html = AnyBalance.requestGet(lk_url + 'bonus/', g_headers);
		getParam(html, result, 'bonus_burn', /<div[^>]+gadget-bonus-summ-2[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	}

	if(AnyBalance.isAvailable('sub_soi', 'sub_smit', 'sub_smio', 'sub_scl', 'sub_scr', 'internet_cost',
			'last_pay_sum', 'last_pay_date')){
//		html = AnyBalance.requestGet(lk_url + 'historyNew/', g_headers);
		megafonLKFinance(filial, html, result);
	}

	megafonLKTurnOffSMSNotification(html);

	setCountersToNull(result);
	AnyBalance.setResult(result);
}

function megafonLKRemainders(filial, html, result){
	var remGroups = getElements(html, /<div[^>]+class="gadget-remainders-color[^>]*>/ig);
	AnyBalance.trace('Найдено ' + remGroups.length + ' групп остатков услуг');

	for(var i=0; i<remGroups.length; ++i){
		var rg = remGroups[i];
		var gname = getElement(rg, /<h1[^>]*>/i, replaceTagsAndSpaces, html_entity_decode);
		
		var rows = getElements(rg, /<div[^>]+gadget-remainders-row[^>]*>/ig);
		AnyBalance.trace('Группа ' + gname + ' содержит ' + (rows.length-1) + ' подуслуг');

		for(var j=0; j<rows.length; ++j){
			var row = rows[j];
			if(/gadget-remainders-mobile-del/i.test(row))
				continue; //Заголовок пропускаем

			var rname = getElement(row, /<div[^>]+gadget-remainders-td-name[^>]*>/i, replaceTagsAndSpaces, html_entity_decode);
			var total = getParam(row, null, null, /<div[^>]+gadget-remainders-td-2[^>]*>([\s\S]*?)<\/div>/i, [/<span[^>]+gadget-remainders-mobile-name[^>]*>[\s\S]*?<\/span>/i, '']);
			var left = getParam(row, null, null, /<div[^>]+gadget-remainders-td-3[^>]*>([\s\S]*?)<\/div>/i, [/<span[^>]+gadget-remainders-mobile-name[^>]*>[\s\S]*?<\/span>/i, '']);
			var units = getParam(left, null, null, /<span[^>]*>([^<]*)<\/span>\s*$/i, replaceTagsAndSpaces, html_entity_decode);
			var name = gname + ' ' + rname;

			AnyBalance.trace('Обработка услуги ' + gname + ':' + rname);

			// Минуты
			if(/мин/i.test(units)) {
				var val = getParam(left, null, null, null, replaceTagsAndSpaces, parseBalance);
				if(val >= 0){
					if(/бесплат/i.test(name)) {
						getParam(left, result, 'mins_n_free', null, replaceTagsAndSpaces, parseMinutes);
					}else if((/\.\s*МегаФон|на МегаФон|включено\s?/i.test(name) && !/МТС/i.test(name))
							|| /внутри сети/i.test(name)) {
						sumParam(left, result, 'mins_net_left', null, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
					} else {
						sumParam(left, result, 'mins_left', null, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
						sumParam(total, result, 'mins_total', null, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
					}
				}else{
					AnyBalance.trace('Отрицательное значение минут, пропускаем: ' + row);
				}
			// Сообщения
			} else if(/шт|sms|смс|mms|ммс/i.test(units)) {
				//Название группы иногда содержит всё подряд. Так что надо аккуратно матчить
			    if(/mms|ММС/i.test(rname)){
					sumParam(left, result, 'mms_left', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
					sumParam(total, result, 'mms_total', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
				}else if(/sms|[cС]М[cС]/i.test(rname)){
					sumParam(left, result, 'sms_left', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
					sumParam(total, result, 'sms_total', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
			    }else if(/mms|ММС/i.test(name)){
					sumParam(left, result, 'mms_left', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
					sumParam(total, result, 'mms_total', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
				}else{
					sumParam(left, result, 'sms_left', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
					sumParam(total, result, 'sms_total', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
				}
			// Трафик
			} else if(/([kmgкмгт][бb]?|[бb](?![\wа-я])|байт|byte)/i.test(units)) {
				if(/Гигабайт в дорогу/i.test(name)) {
					getParam(left, result, 'gb_with_you', null, replaceTagsAndSpaces, parseTraffic);
				} else {
					var suffix = '';
					if(/ноч/i.test(name)) suffix = '_night';

					var unlim = /^9{7,}$/.test(total.replace(/\D/g, '')); //Безлимитные значения состоят только из девяток
					
					var internet_left = getParam(left, null, null, null, replaceTagsAndSpaces, parseTraffic);
					var internet_total = getParam(total, null, null, null, replaceTagsAndSpaces, parseTraffic);
					if(isset(internet_left) && !unlim)
						sumParam(internet_left, result, 'internet_left' + suffix, null, null, null, aggregate_sum);
					if(isset(internet_total) && !unlim)
						sumParam(internet_total, result, 'internet_total' + suffix, null, null, null, aggregate_sum);
					if(isset(internet_left) && isset(internet_total))
						sumParam(internet_total - internet_left, result, 'internet_cur' + suffix, null, null, null, aggregate_sum);
					
             		/*if(current.dateTo)
             			sumParam(current.dateTo, result, 'internet_till', null, replaceTagsAndSpaces, parseDate, aggregate_min);
             		else if(current.dateFrom && current.monthly)
             			sumParam(current.dateFrom, result, 'internet_till', null, replaceTagsAndSpaces, function(str) {
             				var time = parseDate(str);
             				if(time){
             					var dt = new Date(time);
             					time = new Date(dt.getFullYear(), dt.getMonth()+1, dt.getDate(), dt.getHours(), dt.getMinutes(), dt.getSeconds()).getTime();
             				}
             				return time;
             			}, aggregate_min);*/
				}
			// Ошибка 
			} else {
				AnyBalance.trace('Неизвестные единицы измерений: ' + units + ' опция: ' + name + ': '  + row);
			}
		}
	}

	var discounts = getElements(html, /<div[^>]+gadget-remainders-discount-info[^>]*>/ig);
	AnyBalance.trace('Найдено ' + discounts.length + ' скидок');

	for(i=0; i<discounts.length; ++i){
		var discount = discounts[i];
		if(/до ограничения скорости осталось/i.test(discount)){
			sumParam(discount, result, 'internet_left', /до ограничения скорости осталось(.*?)(?:-|$)/i, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
			sumParam(discount, result, 'internet_till', /действует до(.*)/i, replaceTagsAndSpaces, parseDate, aggregate_min);
		}else{
			AnyBalance.trace('Неизвестная скидка: ' + discount);
		}
	}
}

function requestPipe(csrf, addr, get, post){
	if(!get)
		get = {};
	get.CSRF = csrf;
	if(!post)
		get._ = new Date().getTime();

    var url = lk_url + 'pipes/lk/' + addr + '?';
    var params = '';
	for(var name in get){
		params += (params ? '&' : '') + encodeURIComponent(name) + '=' + encodeURIComponent('' + get[name]);
	}
	url += params;

	var html;
	if(post){
		html = AnyBalance.requestPost(url, post, addHeaders({'X-Requested-With': 'XMLHttpRequest'}));
	}else{
		html = AnyBalance.requestGet(url, addHeaders({'X-Requested-With': 'XMLHttpRequest'}));
	}

	var json = getJson(html);
	return json;
}

function megafonLKFinance(filial, html, result){
	var csrf = getParam(html, null, null, /CSRF_PARAM\s*=\s*"([^"]*)/, replaceSlashes);
	 
	if(AnyBalance.isAvailable('sub_soi', 'sub_smit', 'sub_smio', 'sub_scl', 'sub_scr', 'internet_cost')){
		var json = requestPipe(csrf, 'reports/expenses');
		AnyBalance.trace('Parsing expenses: ' + JSON.stringify(json));

		for(var group in json.expenseGroups){
			var g = json.expenseGroups[group];
			if(/Абонентская плата/i.test(group)){
				for(var i=0; i<g.expenses.length; ++i){
					var expense = g.expenses[i];
					if(/тариф/i.test(expense.definition))
						sumParam(expense.amount, result, 'sub_smit', null, null, null, aggregate_sum);
					else
						sumParam(expense.amount, result, 'sub_smio', null, null, null, aggregate_sum);
				}
			}else if(/Интернет/i.test(group)){
				for(var i=0; i<g.expenses.length; ++i){
					var expense = g.expenses[i];
					sumParam(expense.amount, result, 'internet_cost', null, null, null, aggregate_sum);
				}
			}else if(/Роуминг/i.test(group)){
				for(var i=0; i<g.expenses.length; ++i){
					var expense = g.expenses[i];
					sumParam(expense.amount, result, 'sub_scr', null, null, null, aggregate_sum);
				}
			}else if(/вызов|сообщен|Звонки/i.test(group)){
				for(var i=0; i<g.expenses.length; ++i){
					var expense = g.expenses[i];
					sumParam(expense.amount, result, 'sub_scl', null, null, null, aggregate_sum);
				}
			}else{
				if(!/прочие услуги/i.test(group))
					AnyBalance.trace('Относим траты к неизвестным услугам: неизвестная группа трат ' + group + ': ' + JSON.stringify(g));

				for(var i=0; i<g.expenses.length; ++i){
					var expense = g.expenses[i];
					sumParam(expense.amount, result, 'sub_soi', null, null, null, aggregate_sum);
				}
			}
		}
	}

	if(AnyBalance.isAvailable('last_pay_sum', 'last_pay_date')){
		json = requestPipe(csrf, 'payment/history/list', {OFFSET: 0, SIZE: 5});
		if(json.payments && json.payments.length){
			getParam(json.payments[0].amount, result, 'last_pay_sum');
			getParam(json.payments[0].date, result, 'last_pay_date', null, null, parseDate);
		}
	}
}

function removeAllLKCookies(){
	var cookies = AnyBalance.getCookies();
	for(var i=0; i<cookies.length; ++i){
		if(cookies[i].domain == 'lk.megafon.ru')
			AnyBalance.setCookie('lk.megafon.ru', cookies[i].name, null);
	}
}

function megafonLKTurnOffSMSNotification(html){

    function getSMSHash(csrf){
		var json = requestPipe(csrf, 'check/sms');
		return json.hash;
	}

//	var html = AnyBalance.requestGet(lk_url + 'settings/notification/', g_headers);
	var csrf = getParam(html, null, null, /CSRF_PARAM\s*=\s*"([^"]*)/, replaceSlashes);
	var json = requestPipe(csrf, 'userProfile/settings/notifications');
	
	var on = json.notify;
	if(!on){
		AnyBalance.trace('Уведомления о входе отключены. Ну и отлично.');
		return;
	}	

    AnyBalance.trace('Уведомления о входе включены. Попытаемся отключить, чтобы не парили зря мозг.');

	var hash = getSMSHash(csrf);

	var json = requestPipe(csrf, 'userProfile/settings/notifications', null, {NOTIFY: 'false'});
	if(!json.ok){
		AnyBalance.trace('Запрос на выключение сработал неудачно: ' + info);
	}

	var tries = 5;
	while(tries--){
		var newHash = getSMSHash(csrf);
		if(newHash != hash){
			break; //Наверное, переключилось
		}
		AnyBalance.trace('Ждем результата. Запас терпения: ' + tries);
		if(tries > 0)
			AnyBalance.sleep(4000);
	}

	var json = requestPipe(csrf, 'userProfile/settings/notifications');
	if(json.notify === false){
		AnyBalance.trace('Уведомление выключено успешно!');
	}else{
		AnyBalance.trace('Результат выключения, к сожалению, неизвестен: ' + info);
	}
}

var g_countersTable = {
	common: {
		"balance": "balance",
		"mins_left": "remainders.mins_left",
		"mins_net_left": "remainders.mins_net_left",
		"mins_n_free": "remainders.mins_n_free",
		"internet_left": "remainders.internet_left",
		"internet_left_night": "remainders.internet_left_night",
		"sms_left": "remainders.sms_left",
		"mms_left": "remainders.mms_left",
		"bonus_balance": "bonus_balance",
		"gb_with_you": "remainders.gb_with_you",
		"internet_cur": "remainders.internet_cur",
		"internet_cur_night": "remainders.internet_cur_night",
		"internet_total": "remainders.internet_total",
		"internet_total_night": "remainders.internet_total_night",
		"internet_till": "remainders.internet_till",
		"mins_total": "remainders.mins_total",
		"mins_net_total": "remainders.mins_net_total",
		"sms_total": "remainders.sms_total",
		"mms_total": "remainders.mms_total",
		"credit": "credit",
		"sub_scl": "sub_scl",
		"last_pay_sum": "payments.sum",
		"last_pay_date": "payments.date",
		"phone": "phone",
		"__tariff": "tariff"
	}
};


function megafonLkAPI(filinfo, options){
	var prefs = AnyBalance.getPreferences();

	megafonLkAPILogin(options);
	
	function shouldProcess(counter, info){ return true }
    var adapter = new NAdapter(g_countersTable.common, shouldProcess);
	
    adapter.megafonLkAPIDo = adapter.envelope(megafonLkAPIDo);
	
	var result = {success: true};
	
	adapter.megafonLkAPIDo(options, result);
	result = adapter.convert(result);

	setCountersToNull(result);
	
	AnyBalance.setResult(result);
}
