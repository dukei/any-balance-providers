var g_api_headers = {
    'User-Agent': 'MLK Android Phone 3.3.10',
    'Connection': 'Keep-Alive'
};

var g_headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Connection': 'keep-alive',
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36'
};

var api_url = 'https://api.megafon.ru/mlk/';
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

/** API Megafon LK*/
function callAPI(method, url, params, allowerror) {
    var html;
    if(method == 'post') {
        if(typeof(params) == 'string')
            html = AnyBalance.requestPost(api_url + url, params, addHeaders({'Content-Type': 'application/json; charset=utf-8'}, g_api_headers));
        else
            html = AnyBalance.requestPost(api_url + url, params, g_api_headers);
    }else
        html = AnyBalance.requestGet(api_url + url, g_api_headers);

    var json = {};
    if(html){
        try{
            json = getJson(html);
        }catch(e){
            json = getJsonEval(html);
        }
    }

    if(json.code === 'a216'){ //Аккаунт заблокирован, надо явно его разблокировать через ussd или поддержку
    	throw new AnyBalance.Error(json.message, null, true);
    }

    if(json.code && !allowerror) {
    	//Иногда мегафон случайно выдаёт на случайные методы Неавторизованный доступ
        throw new AnyBalance.Error('Ошибка вызова API! ' + json.message, /Неавторизованный доступ/i.test(json.message), /парол/i.test(json.message));
    }
    return json;
}

function megafonLkAPILogin(options){
    var prefs = AnyBalance.getPreferences();
    options = options || {};

    AnyBalance.setDefaultCharset('utf-8');

    checkEmpty(prefs.login && /^\d{10}$/.test(prefs.login), 'Введите 10 цифр номера телефона без пробелов и разделителей в качестве логина!');

    AnyBalance.trace('Пробуем войти через API мобильного приложения...');

    var sessid = AnyBalance.getCookie('JSESSIONID');
    if(sessid) //А то логин ставит secure cookie и из-за этого check в официальном приложении никогда не работает
        AnyBalance.setCookie('api.megafon.ru', 'JSESSIONID', sessid);

    var html = AnyBalance.requestGet('https://api.megafon.ru/mlk/auth/check', g_api_headers);
    if(AnyBalance.getLastStatusCode() >= 400){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сервер мобильного API временно недоступен.');
    }

    var json = getJson(html);
    if(json.authenticated){
        AnyBalance.trace('Уже авторизованы на номер ' + json.phone);
        if(json.phone != prefs.login){
            AnyBalance.trace('Номер неправильный (надо ' + prefs.login + '), придется авторизоваться заново');
            json.authenticated = false;
        }else {
            AnyBalance.trace('Номер правильный, используем текущую сессию');
        }
    }

    if(!json.authenticated) {
        json = callAPI('post', 'login', {
            login: prefs.login,
            password: prefs.password
        }, true);

        if (json.code) {
            if (json.code == 'a211' && options.allow_captcha) { //Капча
                var capchaImg = AnyBalance.requestGet(api_url + 'auth/captcha', g_api_headers);
                var captcha = AnyBalance.retrieveCode('Мегафон иногда требует подтвердить, что вы не робот. Сейчас как раз такой случай.\n\nЧтобы уменьшить вероятность требования капчи, используйте опцию входа без пароля с однократным вводом кода из SMS при первом обновлении баланса.', capchaImg, {/*inputType: 'number'*/});
                json = callAPI('post', 'login', {
                    login: prefs.login,
                    password: prefs.password,
                    captcha: captcha
                });
            }

            if (json.code)
                throw new AnyBalance.Error('Ошибка вызова API! ' + json.message, null, /парол/i.test(json.message));
        }

        __setLoginSuccessful();
    }
}

function randomId(){
	var chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
	var out = '';
	for(var i=0; i<11; ++i){
		out += chars.substr(Math.floor(Math.random()*chars.length), 1);
	}
	return out;
}

function megafonLkAPILoginNew(options){
	options = options || {};
	var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var deviceid = AnyBalance.getData('deviceid');
    if(!deviceid){
    	deviceid = randomId();
    	AnyBalance.setData('deviceid', deviceid);
    	AnyBalance.saveData();
    }
    AnyBalance.trace('Device id: ' + deviceid);
    g_api_headers['X-MLK-DEVICE-ID'] = deviceid;

	if(!/^\d{10}$/.test(prefs.login))
		throw new AnyBalance.Error('Пожалуйста, укажите в настройках 10 цифр вашего номера Мегафон, например, 9261234567');

	var token = AnyBalance.getData('token-' + prefs.login);
	if(token){
		AnyBalance.trace('Сохранен токен биометрии, входим автоматически');
		json = callAPI('post', 'auth/biometry', JSON.stringify({captcha: null, msisdn: prefs.login, token: token}), true);
		if(json.code){
			AnyBalance.trace(JSON.stringify(json));
			if(/Внутренняя ошибка/i.test(json.message)) //Иногда сервер глючит и не надо присылать смс второй раз
				throw new AnyBalance.Error(json.message + '\nПожалуйста, попробуйте позже');
				 
		    AnyBalance.trace('Входим по пину');
			var pin = AnyBalance.getData('pin-' + prefs.login);
			json = callAPI('post', 'auth/pin', JSON.stringify({captcha: null, msisdn: prefs.login, pin: pin}), true);
			if(json.code){
			    AnyBalance.trace(JSON.stringify(json));
			    if(/Внутренняя ошибка/i.test(json.message)) //Иногда сервер глючит и не надо присылать смс второй раз
				    throw new AnyBalance.Error(json.message + '\nПожалуйста, попробуйте позже');

				token = null;
			}else{
				json = callAPI('post', 'api/profile/biometry', '{}', true);
				if(json.token){
					AnyBalance.trace('Обновляем токен биометрии');
					AnyBalance.setData('token-' + prefs.login, json.token);
					AnyBalance.saveData();
				}
			}
		}
	}
	if(!token){
		AnyBalance.trace('Вход по одноразовому паролю. Привязываем устройство');
		var json = callAPI('post', 'auth/otp/request', {login: prefs.login}, true);

		if(!json.ok){
			AnyBalance.trace(html);
			throw new AnyBalance.Error(json.message || 'Ошибка входа. Неправильный номер?', null, true);
		}

		var code = AnyBalance.retrieveCode('Пожалуйста, введите код входа в Личный Кабинет из СМС для привязки номера к устройству', null, {inputType: 'number'});

		json = callAPI('post', 'auth/otp/submit', {login: prefs.login, otp: code}, true);

		if(json.code){
			AnyBalance.trace(html);
			throw new AnyBalance.Error(json.message || 'Неверный код подтверждения');
		}

		var pin = Math.floor(1000 + Math.random()*9000).toString();
		json = callAPI('post', 'api/profile/pin', JSON.stringify({captcha: null, pin: pin}));
		
		json = callAPI('post', 'api/profile/biometry', '{}');
		if(!json.token)
			throw new AnyBalance.Error('Не удалось получить токен биометрии. Сайт изменен?');

		AnyBalance.setData('pin-' + prefs.login, pin);
		AnyBalance.setData('token-' + prefs.login, json.token);
		AnyBalance.saveData();
	}
}

function megafonLkAPIDo(options, result) {
	var prefs = AnyBalance.getPreferences();

    if (AnyBalance.isAvailable('phone')) {
        getParam(prefs.login, result, 'phone', null, replaceNumber);
    }
     
    if (AnyBalance.isAvailable('balance', 'credit', 'available')) {
        json = callAPI('get', 'api/main/balance');

        getParam(json.balanceWithLimit + '', result, 'available', null, replaceTagsAndSpaces, parseBalance);
        getParam(json.balance + '', result, 'balance', null, replaceTagsAndSpaces, parseBalance);
        getParam((json.balanceWithLimit - json.balance) + '', result, 'credit', null, replaceTagsAndSpaces, parseBalance);
    }

    if(AnyBalance.isAvailable('tariff') && !result.tariff){
    	json = callAPI('get', 'api/tariff/2019-2/current');
    	getParam(json.name, result, 'tariff', null, replaceTagsAndSpaces);
    }

    try{
        if(AnyBalance.isAvailable('bonus_status', 'bonus_burn')){
            json = callAPI('get', 'api/bonus/status');
            getParam(json.statusDesc, result, 'bonus_status', null, replaceTagsAndSpaces);
            getParam(null, result, 'bonus_burn');
        }
    }catch(e){
    	AnyBalance.trace('Не удалось получить информацию о бонусной программе: ' + e.message);
    }

	processServices(result);
    processRemaindersApi(result);
    processMonthExpensesApi(result);

    processPaymentsApi(result);

    if (AnyBalance.isAvailable('sub_scl')) {
    	try{
            json = callAPI('get', 'api/payments/info');
            
            getParam(json.outcome + '', result, 'sub_scl', null, replaceTagsAndSpaces, parseBalance);
        }catch(e){
            AnyBalance.trace('Ошибка получения информации о звонках: ' + e.message + '\n' + e.stack);
        }
    }

    processInfoApi(result);

    if(AnyBalance.isAvailable('detalization'))
        processDetalizationApi(result);

    if(!options.dontTurnOffSms)
        processSmsTurnOffApi();
}

function processPaymentsApi(result){
    if (AnyBalance.isAvailable('payments')) {
    	try{
            var json = callAPI('get', 'api/payments/history?offset=0&size=10', true);
            
            if(json.payments) {
                result.payments = [];
            
                for (var i = 0; i < json.payments.length; i++) {
                    var pmnt = json.payments[i];
            
                    var p = {};
                    getParam(pmnt.amount, p, 'payments.sum');
                    getParam(pmnt.date, p, 'payments.date', null, null, parseDate);
                    getParam(pmnt.descr, p, 'payments.descr');
            
                    result.payments.push(p);
                }
            }else{
                AnyBalance.trace('Не удалось получить историю платежей: ' + JSON.stringify(json));
            }
        }catch(e){
            AnyBalance.trace('Ошибка получения истории платежей: ' + e.message + '\n' + e.stack);
        }
    }
}

function processMonthExpensesApi(result){
    if (AnyBalance.isAvailable('month_expenses')) {
    	try{
            var json = callAPI('get', 'api/reports/months', true);
            
            if(json.expenseMonths) {
                result.month_expences = [];
            
                for (var i = 0; i < json.expenseMonths.length; i++) {
                    var exp = json.expenseMonths[i];
            
                    var p = {};
                    getParam(exp.amount, p, 'month_expences.sum');
                    getParam(exp.reportDate, p, 'month_expences.date', null, null, parseDate); //MM/yyyy
                    getParam(exp.percent, p, 'month_expences.pct');
            
                    result.month_expences.push(p);
                }
            }else{
                AnyBalance.trace('Не удалось получить историю месячных трат: ' + JSON.stringify(json));
            }
        }catch(e){
            AnyBalance.trace('Ошибка получения истории месячных трат: ' + e.message + '\n' + e.stack);
        }
    }
}

function processRemaindersApi(result){
    if (AnyBalance.isAvailable('remainders') || (AnyBalance.isAvailable('tariff') && !result.tariff)) {
        var json = callAPI('get', 'api/options/remainders');

        var remainders = result.remainders = {};

        var namesProcessed = [];
        //for(var i = 0; i < json.models.length; i++) {
        // Идем с конца, чтобы игнорировать "замерзшие" остатки
        if(!json.models){
        	AnyBalance.trace('Остатков не обнаружено: ' + JSON.stringify(json));
        	return;
        }
        	
        for(var i = json.models.length-1; i >= 0; i--) {
            var model = json.models[i];

            if(model.optionsRemaindersType == 'RATE_PLAN' && !result.tariff)
            	result.tariff = replaceAll(model.name, replaceTagsAndSpaces);

            var optionId = (model.remainders && model.remainders[0] && model.remainders[0].optionId);

            // Этот пакет опций мы уже обработали
            if(namesProcessed.indexOf(model.name + optionId) >= 0 && /OPTION/i.test(model.optionsRemaindersType)) {
                AnyBalance.trace('Мы уже обработали пакеты опций из группы ' + model.name);
                AnyBalance.trace(JSON.stringify(model));
                continue;
            }

            if(model.remainders) {
                namesProcessed.push(model.name + optionId);
                for(var z = 0; z < model.remainders.length; z++) {
                    var current = model.remainders[z];
                    var name = current.name;
                    var units = current.unit;

                    // Игнорируем отрицательные значения пакетов
                    if(current.available < 0) {
                        AnyBalance.trace('Игнорируем отрицательные остатки...' + JSON.stringify(current));
                        continue;
                    }

                    // Минуты
                    if((/мин|сек/i.test(units) && !/интернет/i.test(name)) || (/шт/i.test(units) && /минут/i.test(name) && !/СМС|SMS|MMS|ММС/i.test(name))) {
                        AnyBalance.trace('Parsing minutes...' + JSON.stringify(current));
                        var unlim = /^9{6,}$/i.test(current.total); //Безлимитные значения только из девяток состоят
						if(unlim || +current.total > 2600000){
							AnyBalance.trace('пропускаем безлимит минут: ' + name + ' ' + (current.available + current.unit) + '/' + (current.total + current.unit));
							continue;
						}
						if(/в сутки/i.test(name)) {
							getParam(current.available + units, remainders, 'remainders.mins_day', null, replaceTagsAndSpaces, parseMinutes);
                        }else if(/бесплат/i.test(name)) {
                            getParam(current.available + units, remainders, 'remainders.mins_n_free', null, replaceTagsAndSpaces, parseMinutes);
                        }else if((/\.\s*МегаФон|на мегафон|на МФ/i.test(name) && !/МТС/i.test(name) && !/стационар/i.test(name))
                            || /внутри сети/i.test(name)) {
                            sumParam(current.available + units, remainders, 'remainders.mins_net_left', null, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
						}else if(/Безлимитные входящие/i.test(name)) {
							AnyBalance.trace('Бесконечное значение минут (' + name + '), пропускаем...');
							continue;
                        } else {
                            sumParam(current.available + units, remainders, 'remainders.mins_left', null, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
                            sumParam(current.total + units, remainders, 'remainders.mins_total', null, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
                        }
                        // Сообщения
                    } else if(/шт|sms|смс|mms|ммс/i.test(units)) {
                        var unlim = /^9{6,}$/i.test(current.total); //Безлимитные значения только из девяток состоят
						if(unlim){
							AnyBalance.trace('пропускаем безлимит смс: ' + name + ' ' + (current.available + current.unit) + '/' + (current.total + current.unit));
							continue;
						}
                        if(/mms|ММС/i.test(name)){
                            AnyBalance.trace('Parsing mms...' + JSON.stringify(current));
                            sumParam(current.available, remainders, 'remainders.mms_left', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
                            sumParam(current.total, remainders, 'remainders.mms_total', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
                        }else{
                            AnyBalance.trace('Parsing sms...' + JSON.stringify(current));
                            sumParam(current.available, remainders, 'remainders.sms_left', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
                            sumParam(current.total, remainders, 'remainders.sms_total', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
                        }
                        // Трафик
                    } else if(/([kmgtкмгт][бb]|[бb](?![\wа-я])|байт|byte)/i.test(units)) {
                        AnyBalance.trace('Parsing data...' + JSON.stringify(current));

                        if(/Гигабайт в дорогу/i.test(name)) {
                            getParam(current.available + current.unit, remainders, 'remainders.gb_with_you', null, replaceTagsAndSpaces, parseTraffic);
						}else if(/Интернет в роуминге/i.test(name)) {
							if(/Остальные страны/i.test(name))
								getParam(current.available + current.unit, remainders, 'remainders.internet_roam_other', null, replaceTagsAndSpaces, parseTraffic);
							else if(/Популярные страны/i.test(name))
								getParam(current.available + current.unit, remainders, 'remainders.internet_roam_popular', null, replaceTagsAndSpaces, parseTraffic);
							else if(/ЕВРОПА/i.test(name))
								getParam(current.available + current.unit, remainders, 'remainders.internet_roam_europe', null, replaceTagsAndSpaces, parseTraffic);
						}else if(/Автопродление/i.test(name)) {
								getParam(current.available + current.unit, remainders, 'remainders.internet_auto_prolong', null, replaceTagsAndSpaces, parseTraffic);
						}else if(/Интернет в Крыму/i.test(name)) {
								getParam(current.available + current.unit, remainders, 'remainders.internet_left_crimea', null, replaceTagsAndSpaces, parseTraffic);
                        } else {
                            var suffix = '';
                            if(/ноч/i.test(name)) suffix = '_night';
                            
                            var unlim = /^9{7,}$/i.test(current.total); //Безлимитные значения только из девяток состоят
                            
                            var internet_left = getParam(current.available + current.unit, null, null, null, replaceTagsAndSpaces, parseTraffic);
                            var internet_total = getParam(current.total + current.unit, null, null, null, replaceTagsAndSpaces, parseTraffic);
                            
							if(!unlim)
								unlim = (internet_total >= 999000); //Больше 999 ГБ это же явно безлимит
							if(unlim)
								AnyBalance.trace('пропускаем безлимит трафика: ' + name + ' ' + (current.available + current.unit) + '/' + (current.total + current.unit));
                            
                            if(isset(internet_left) && !unlim)
                                sumParam(internet_left, remainders, 'remainders.internet_left' + suffix, null, null, null, aggregate_sum);
                            if(isset(internet_total) && !unlim)
                                sumParam(internet_total, remainders, 'remainders.internet_total' + suffix, null, null, null, aggregate_sum);
                            if(isset(internet_left) && isset(internet_total))
                                sumParam(internet_total - internet_left, remainders, 'remainders.internet_cur' + suffix, null, null, null, aggregate_sum);

                            if(current.dateTo)
                                sumParam(current.dateTo, remainders, 'remainders.internet_till', null, replaceTagsAndSpaces, parseDate, aggregate_min);
                            else if(current.dateFrom && current.monthly)
                                sumParam(current.dateFrom, remainders, 'remainders.internet_till', null, replaceTagsAndSpaces, function(str) {
                                    var time = parseDate(str);
                                    if(time){
                                        var dt = new Date(time);
                                        time = new Date(dt.getFullYear(), dt.getMonth()+1, dt.getDate(), dt.getHours(), dt.getMinutes(), dt.getSeconds()).getTime();
                                    }
                                    return time;
                                }, aggregate_min);
                        }
                        // Ошибка
                    } else {
                        AnyBalance.trace('Неизвестные единицы измерений: ' + units + ' опция: ' + name + ': '  + JSON.stringify(current));
                    }
                }
            }
        }
    }
}

function processInfoApi(result){
    if(AnyBalance.isAvailable('info')){
        AnyBalance.trace('Получаем инфо');

        var json = callAPI('get', 'api/profile/info');

        var info = result.info = {};

        getParam(json.contractStart, info, 'info.date_start', null, null, parseDate);
        getParam(json.birthdate, info, 'info.birthday', null, null, parseDate);
        getParam(json.email, info, 'info.email');
        getParam(json.name, info, 'info.fio');
        getParam(json.region.id, info, 'info.region_id');
        getParam(json.region.name, info, 'info.region_name');
    }
}

function processSmsTurnOffApi(){
    try {
        // Проверим включены ли смс-оповещения о входе
        var json = callAPI('get', 'api/profile/info');
        if(json.notifications) {
            AnyBalance.trace('Включено смс оповещение о входе, отключаем...');

            json = callAPI('post', 'api/profile/notifications?status=false');
            AnyBalance.trace('Отключили, проверяем...');
            json = callAPI('get', 'api/profile/info');

            if(!json.notifications)
                AnyBalance.trace('Успешно отключили смс оповещение о входе в кабинет!');
            else
                AnyBalance.trace('Не удалось отключить смс оповещение о входе в кабинет. Свяжитесь с разработчиком.');
        } else {
            AnyBalance.trace('Cмс оповещение о входе в кабинет уже отключено!');
        }
    } catch(e) {
        AnyBalance.trace('Отключение смс не удалось: ' + e.message);
    }
}

function processServices(result){
	if(!AnyBalance.isAvailable('services_free', 'services_paid'))
		return;

    var json = callAPI('get', 'api/options/list/current');
    getParam(json.free ? json.free.length : 0, result, 'services_free');
    getParam(json.paid ? json.paid.length : 0, result, 'services_paid');
}
