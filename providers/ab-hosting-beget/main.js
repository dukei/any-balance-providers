/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Cache-Control': 'max-age=0',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
};

var baseurl = 'https://cp.beget.com/';
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d)(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+$1 $2 $3-$4-$5'];

function getInfo(){
	var prefs = AnyBalance.getPreferences();
	
	var token = AnyBalance.getData('token' + prefs.login);
	
	AnyBalance.setCookie('.beget.com', '--beget--auth-token', token);

    var html = AnyBalance.requestPost('https://cp.beget.com/main?ajaxj&method=ajaxj_new_session', null, addHeaders({
		'Accept': 'application/json, text/plain, */*',
	   	'Origin': 'https://cp.beget.com',
        'Referer': baseurl + 'login',
		'X-Requested-With': 'XMLHttpRequest'
	}));
		
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
	if(!json.data.customer){
		var error = json.error;
    	if(error)
    		throw new AnyBalance.Error(error);

    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }
	
    return json.data.customer;
}

function main() {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');
	
	AnyBalance.trace ('Пробуем войти в личный кабинет...');
	
	AnyBalance.setCookie('.beget.com', 'beget', 'begetok');
	
	var token = AnyBalance.getData('token' + prefs.login);
	var data;
	
	if(token){
		try{
	    	AnyBalance.restoreCookies();
			data = getInfo();
	    	AnyBalance.trace('Сессия сохранена. Входим автоматически...');
	    }catch(e){
	    	AnyBalance.trace('Сессия истекла. Будем логиниться заново...');
	    	clearAllCookies();
	    	AnyBalance.setData('token' + prefs.login, undefined);
	        AnyBalance.saveData();
			loginSite(prefs);
			data = getInfo();
	    }
    }else{
    	AnyBalance.trace('Сессия новая. Будем логиниться заново...');
    	clearAllCookies();
    	loginSite(prefs);
		data = getInfo();
    }
	
	var result = {success: true};
	
	if(data){
		getParam(data.summaryTotalRate + '', result, 'payment', null, null, parseBalance);
		getParam(data.balance + '', result, 'balance', null, null, parseBalance);
		
		getParam(data.id, result, 'user_id'); //ID пользователя
		getParam(data.planName, result, '__tariff');
		getParam(data.fio, result, 'fio');
		
		getParam(data.serverIp, result, 'IP');
		getParam(data.serverName, result, 'server_name');
		
		getParam(data.deleteDate, result, 'date_delete', null, null, parseDate);
		getParam(data.blockDate, result, 'date_block', null, null, parseDate);
		getParam(data.payDays + '', result, 'daysleft', null, null, parseBalance);
		
		getParam(data.ftpCount + '', result, 'ftp', null, null, parseBalance);
		getParam(data.mysqlCount + '', result, 'mysql', null, null, parseBalance);
		getParam(data.sitesCount + '', result, 'sites', null, null, parseBalance);
		getParam(data.mailCount + '', result, 'mail', null, null, parseBalance);
		getParam(data.tel, 	result, 'phone', null, replaceNumber);

		getParam(data.planQuota + 'mb', result, 'plan_quota', null, null, parseTraffic);
		getParam(data.userQuota.usedSize + 'kb', result, 'used_quota', null, null, parseTraffic);
	}else{
		throw new AnyBalance.Error('Не удалось получить данные. Сайт изменен?')
	}
	
	AnyBalance.setResult(result);
}

function loginSite(prefs){
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	AnyBalance.setCookie('.beget.com', 'beget', 'begetok');
	
    var html = AnyBalance.requestGet(baseurl, addHeaders({Referer: baseurl}));
	
	if(!html || AnyBalance.getLastStatusCode() >= 500){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
	}
	
	html = AnyBalance.requestGet(baseurl + 'login', addHeaders({Referer: baseurl}));
	
	var captcha = solveRecaptcha('Пожалуйста, докажите, что вы не робот', AnyBalance.getLastUrl(), JSON.stringify({SITEKEY: '6LeRWikaAAAAAGDjXDWC5s2pMpJmFf7ZH0ShLSjL', TYPE: 'V3', ACTION: 'login', USERAGENT: g_headers['User-Agent']}));
	
	html = AnyBalance.requestPost('https://api.beget.com/v1/auth', JSON.stringify({
        "login": prefs.login,
        "password": prefs.password,
        "code": "",
        "saveMe": true
    }), addHeaders({
		'Authorization': 'Bearer undefined',
		'Accept': 'application/json, text/plain, */*',
		'Content-Type': 'application/json;charset=UTF-8',
        'Referer': baseurl,
		'X-Token': captcha
	}));

	var login_errors = {
		'0':   'Произошла внутренняя ошибка.',
		'-1':  'Превышен лимит отправки сообщений с кодом доступа для этого аккаунта.',
		'-2':  'Код авторизации введён не корректно.',
		'-3':  'Превышено количество попыток ввода, попробуйте через час.',
		'-10': 'Не заполнены обязательные поля для входа.',
		'-11': 'Вы ввели некорректное имя или пароль.',
		'-12': 'Доступ с Вашего IP-адреса запрещён. Пожалуйста, обратитесь в службу поддержки для решения данного вопроса.',
		'-13': 'Произошла внутренняя ошибка.',
		'-14': 'Ваш браузер безнадёжно устарел.',
		'-15': 'Вход в панель управления недоступен. Выполняется обновление, попробуйте позже.',
		'-16': 'Аккаунт был удалён. Для уточнения подробностей обратитесь в службу поддержки.',
		'INCORRECT_CREDENTIALS': 'Вы ввели некорректное имя или пароль.'
	};

	var json = getJson(html);
	
	if(!json.token) {
		var error = login_errors[json.error]||json.error;
		if (error)
			throw new AnyBalance.Error(error, null, true);
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}
	
	var token = json.token;
	
	if(!token){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось получить токен авторизации. Сайт изменен?');
	}

    AnyBalance.setData('token' + prefs.login, token);
	AnyBalance.saveCookies();
	AnyBalance.saveData();
}
