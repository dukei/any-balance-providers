/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Language': 'ru-RU,en-US,en;q=0.9',
	'Connection': 'keep-alive',
	'Origin': 'https://b2b.yota.ru',
    'Referer': 'https://b2b.yota.ru/',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
};

var g_status = {
	false: 'Номер не блокирован',
	true: 'Номер заблокирован',
	undefined: 'Неизвестен'
};

var g_status_tariff = {
	false: 'Тариф активен',
	true: 'Тариф не активен',
	undefined: 'Не определено'
};

var g_options = {
	'B2B-OP-TET-30': 'Раздача интернета',
	undefined: 'Не определено'
};
	
var baseurl = "https://b2b.yota.ru/";
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

function main(){
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Пожалуйста, введите логин!');
	checkEmpty(prefs.password, 'Пожалуйста, введите пароль!');
	
	AnyBalance.trace('Пробуем войти в личный кабинет...');
		
	var token = AnyBalance.getData(prefs.login + 'token');
		
	AnyBalance.restoreCookies();

    var html = AnyBalance.requestGet(baseurl + 'api/company-info', addHeaders({
		'Authorization': token
	}));
	
	AnyBalance.trace('api/company-info: ' + html);
		
	if(!html || AnyBalance.getLastStatusCode() >= 500){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
    }
	
	if(AnyBalance.getLastStatusCode() == 403 || /Forbidden/i.test(html)){
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		clearAllCookies();
		
		var login = prefs.login;
        if(/^\d{13,14}$/i.test(prefs.login.replace(/[\+\s\-]+/ig, ''))){
    	    AnyBalance.trace('Входить будем по номеру лицевого счета');
    	    login = prefs.login.replace(/[\+\s\-]+/ig, '');
        }else if(/^\d{11}$/i.test(prefs.login.replace(/[\+\s\-()]+/ig, ''))){
    	    AnyBalance.trace('Входить будем по номеру телефона');
    	    login = prefs.login.replace(/[\+\s\-()]+/ig, '');
        }else if(/@/i.test(prefs.login)){
    	    AnyBalance.trace('Входить будем по E-mail');
        }else{
		    AnyBalance.trace('Входить будем по номеру ICCID');
    	    login = prefs.login.replace(/[\+\s\-]+/ig, '');
	    }
	
	    html = AnyBalance.requestPost(baseurl + 'api/login', JSON.stringify({
			'username': login,
			'password': prefs.password
        }), addHeaders({
			'Accept': 'application/json',
			'Content-Type': 'application/json'
		}));
		
		AnyBalance.trace('api/login: ' + html);
	
	    var json = getJson(html);
		
		if(json.code){
	    	var error = json.message;
            if(error)
                throw new AnyBalance.Error(error, null, /Incorrect|Msisdn/i.test(error));
	    
	    	AnyBalance.trace(html);
	    	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	    }
		
		if(json.needNewPassword){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Yota требует сменить пароль. Войдите в кабинет ' + baseurl + ' через браузер и смените пароль. Новый пароль введите в настройках провайдера', null, true);
		}
		
		var token = AnyBalance.getLastResponseHeader('Authorization');
		
		if(!token){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось получить токен авторизации. Сайт изменен?');
		}
		
		html = AnyBalance.requestGet(baseurl + 'api/company-info', addHeaders({
		    'Authorization': token
	    }));
	
	    AnyBalance.trace('api/company-info: ' + html);
		
		AnyBalance.setData(prefs.login + 'token', token);
	    AnyBalance.saveCookies();
	    AnyBalance.saveData();
    }else{
	    AnyBalance.trace('Сессия сохранена. Входим автоматически...');
		AnyBalance.saveCookies();
	    AnyBalance.saveData();
    }
	
	var result = {success: true};
	
	var json = getJson(html);
	
	var token = AnyBalance.getData(prefs.login + 'token');
	
	getParam(json.balance, result, 'balance', null, null, parseBalance);
	getParam(json.agreementNumber, result, 'licschet');
	getParam(json.companyName, result, 'company_name');
	getParam(json.contractDate, result, 'contract_date', null, null, parseDateISO);
    
	var pnoneName = capitalFirstLetters(json.contactName);
	
	if(!result.balance){
		html = AnyBalance.requestGet(baseurl + 'api/balance', addHeaders({
		    'Authorization': token
	    }));
		
		getParam(html, result, 'balance', null, null, parseBalance);
	}
	
    var account;
    
    var sim = prefs.sim && prefs.sim.replace(/\D/g, '');
		
	AnyBalance.trace('Получаем список подключенных номеров...');
		
	html = AnyBalance.requestGet(baseurl + 'api/sim/list', addHeaders({
		'Authorization': token
	}));
	
	AnyBalance.trace('api/sim/list: ' + html);
	
	var json = getJson(html);
    
    AnyBalance.trace('Найдено подключенных номеров: ' + json.length);
            
    for(var i = 0; i < json.length; i++) {
        var curr = json[i];
		var needSim = curr.iccid;
		var needNum = curr.phone.msisdn;
		
        if(!sim) {
            account = curr;
            AnyBalance.trace('Номер в настройках не задан, возьмем первый: ' + curr.phone.msisdn);
            break;
        }
            
        if(endsWith(curr.iccid || curr.phone.msisdn, sim)) {
            account = curr;
            AnyBalance.trace('Нашли нужный номер: ' + curr.phone.msisdn);
            break;
        }
    }

    getParam(json.length, result, 'abon_count');

    if(!account) {
        AnyBalance.trace(JSON.stringify(json));
        throw new AnyBalance.Error('Не удалось найти ' + (prefs.sim ? 'номер телефона с последними цифрами ' + prefs.sim : 'ни одного номера телефона!'));
    }

    AnyBalance.trace('Успешно получили данные по номеру: ' + account.phone.msisdn);
    AnyBalance.trace(JSON.stringify(account));

    getParam(account.productLine, result, '__tariff');
	getParam(account.iccid.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3'), result, 'sim_num');
	getParam(account.name.text, result, 'sim_name');
    var phone = getParam(account.phone.msisdn, result, 'phone', null, replaceNumber);
    getParam(phone + ' - ' + pnoneName, result, 'contact_name');
	getParam(g_status[account.blocked]||account.blocked, result, 'status');
	getParam(g_status_tariff[account.blocked]||account.blocked, result, 'status_tariff');
	
	if(account.status){
		getParam(account.status.error, result, 'abon', null, null, parseBalance);
		getParam(account.status.message, result, 'packet_till', null, null, parseDate);
		getParam(account.status.message, result, 'next_pay_date', null, null, parseDate);
	}
	
    var info = account.activeConditions;
		
	if(info){
		AnyBalance.trace('Найдены дискаунты: ' + JSON.stringify(info));
		if(info.internetInfo){
			AnyBalance.trace('Найден пакет ' + info.internetInfo.circleType + ': ' + JSON.stringify(info.internetInfo));
			AnyBalance.trace('Это интернет');
			if(info.internetInfo.circleState == 'DISABLED')
				AnyBalance.trace('Пакет не подключен, пропускаем...');
			if(info.internetInfo.circleState == 'UNLIMITED')
				AnyBalance.trace('Пакет безлимитный, пропускаем...');
            if(info.internetInfo.left)
			    getParam(info.internetInfo.left + ' Gb', result, 'traffic_left', null, null, parseTraffic);
			if(info.internetInfo.left)
			    getParam(info.internetInfo.total + ' Gb', result, 'traffic_total', null, null, parseTraffic);
		}
		
		if(info.voiceInfo){
			AnyBalance.trace('Найден пакет ' + info.voiceInfo.circleType + ': ' + JSON.stringify(info.voiceInfo));
			AnyBalance.trace('Это минуты');
            if(info.voiceInfo.circleState == 'DISABLED')
				AnyBalance.trace('Пакет не подключен, пропускаем...');
			if(info.voiceInfo.circleState == 'UNLIMITED')
				AnyBalance.trace('Пакет безлимитный, пропускаем...');
            if(info.voiceInfo.left)
			    getParam(info.voiceInfo.left, result, 'min_left');
			if(info.voiceInfo.total)
			    getParam(info.voiceInfo.left, result, 'min_total');
		}
		
		if(info.smsInfo){
			AnyBalance.trace('Найден пакет ' + info.smsInfo.circleType + ': ' + JSON.stringify(info.smsInfo));
			AnyBalance.trace('Это SMS');
            if(info.smsInfo.circleState == 'DISABLED')
				AnyBalance.trace('Пакет не подключен, пропускаем...');
			if(info.smsInfo.circleState == 'UNLIMITED')
				AnyBalance.trace('Пакет безлимитный, пропускаем...');
            if(info.smsInfo.left)
			    getParam(info.smsInfo.left, result, 'sms_left');
			if(info.smsInfo.total)
			    getParam(info.smsInfo.left, result, 'sms_total');
		}
		
		if(info.options && info.options.length > 0){
			AnyBalance.trace('Найдены подключенные опции, обрабатываем...');
			for(var i=0; i<info.options.length; ++i){
                var o = info.options[i];
                AnyBalance.trace('Найдена опция ' + o.offerCode + ': ' + JSON.stringify(o));
//		        sumParam(o.price, result, 'abon', null, null, parseBalance, aggregate_sum); // Про запас
				if(AnyBalance.isAvailable('options')){
			        sumParam((g_options[o.offerCode]||o.offerCode) + ': ' + o.price + ' ₽', result, 'options', null, null, null, create_aggregate_join(',<br> '));
			    }
			}
		}else{
			AnyBalance.trace('Подключенных опций не найдено');
			result.options = 'Нет опций';
		}
	}else{
		AnyBalance.trace('Не удалось получить информацию по пакетам');
	}
	
    AnyBalance.setResult(result);
}
