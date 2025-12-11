/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_ServiceStatus = {
        NOT_CONNECTED: "Не подключена",
        CONNECTED: "Услуга активна",
        BLOCKED: "Отключена за неуплату",
        VOLUNTARY_BLOCKED: "Включена добровольная блокировка",
        LOSS_BLOCK: "Заблокирована по утере/краже",
        ACTIVE: "Услуга активна и используется",
        INACTIVE: "Услуга не активна",
        OPERATOR_BLOCK: "Услуга заблокирована по инициативе оператора связи",
        FRAUD: "Блокировка за мошенничество",
        UNKNOWN_STATUS: "Статус не определен",
};

var baseurl = "https://lk.rt.ru/";

var g_web_headers = {
	Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
	'Accept-Language': 'en-US,en;q=0.9,ru;q=0.8,ru-RU;q=0.7',
	Connection: 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.120 Safari/537.36',
    Referer:baseurl,
    'Sec-Fetch-Mode': 'navigate',
	'Sec-Fetch-User': '?1',
	'Sec-Fetch-Site': 'same-origin',
	Origin: 'https://b2c.passport.rt.ru'
};

var g_headers = {
	Accept: 'application/json, text/plain, */*',
	'Accept-Language': 'en-US,en;q=0.9,ru;q=0.8,ru-RU;q=0.7',
	Connection: 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.120 Safari/537.36',
	'Content-Type': 'application/json',
    Referer:baseurl,
    'Sec-Fetch-Mode': 'cors',
    Origin: 'https://lk.rt.ru',
    'Sec-Fetch-Site': 'same-origin'
};

    /**
     * 79034785123 -> +7(903)478-51-23
     */
    var phoneFormat = function (phoneNumber, stacionar) {
        var phoneRegexp = /\s*\+?(\d)\s*\(?(\d{3})\)?\s*(\d{3})-?(\d{2})-?(\d{2})\s*/;
        var phone = phoneNumber === "string" ? phoneNumber : String(phoneNumber);
        return phone.replace(phoneRegexp, stacionar ? "$1 ($2) $3-$4-$5" : "+$1 ($2) $3-$4-$5");
    };

var SERVICE_TYPE = new function () {
    var self = this;
    var ServiceType = function (id, name, url, title, jurTitle) {
        var sdc = this;
        sdc.id = id;
        sdc.name = name;
        sdc.url = url;
        sdc.title = title;
        if (jurTitle) { sdc.juristicTitle = jurTitle;}
        sdc.icon = function () { return lkIcons.getIcon(sdc.name); };
    };

    self["0"] = self["UNKNOWN"] = /*                    */new ServiceType(0, "", "", "Неизвестный тип услуги", "Неизвестный тип услуги");
    self["1"] = self["INTERNET"] = /*                   */new ServiceType(1, "INTERNET", "internet", "Домашний Интернет", "Интернет");
    self["2"] = self["TELEPHONY"] = self["PHONE"] = /*  */new ServiceType(2, "TELEPHONY", "phone", "Домашний телефон", "Стационарный телефон");
    self["2"].getDisplayNumber = function (serviceNumber) {
        if (!serviceNumber) {return "";}
        serviceNumber = serviceNumber.trim();
        serviceNumber = serviceNumber.length == 10 ? "7" + serviceNumber : serviceNumber;
        return phoneFormat(serviceNumber);
    };
    self["4"] = self["WIFI"] = /*                       */new ServiceType(4, "WIFI", "wifi", "Wi-Fi", null);
    self["6"] = self["EQUIPMENT"] = /*                  */new ServiceType(6, "EQUIPMENT", "Оборудование", "Оборудование", "Оборудование");
    self["8"] = self["IPTV"] = /*                       */new ServiceType(8, "IPTV", "iptv", "Интерактивное ТВ", null);
    self["9"] = self["VPBX"] = /*                       */new ServiceType(9, "VPBX", "cloudphone", "Облачная АТС", null);
    self["13"] = self["USC_WIFI"] = /*                  */new ServiceType(13, "USC_WIFI", "usc", "Универсальная услуга связи Wi-Fi", null);
    self["14"] = self["DTV"] = /*                       */new ServiceType(14, "DTV", "cabeltv", "Кабельное ТВ (цифровое)", null);

    self["15"] = self["OTT"] = /*                       */new ServiceType(15, "OTT", "ott", "Услуга «АЛЛЁ»", null);
    self["15"].getDisplayNumber = function (serviceNumber) { return !serviceNumber ? "" : phoneFormat("7" + serviceNumber.trim(), false); };
    self["15"].serviceNumberNaming = "Номер";

    self["16"] = self["MVNO"] = /*                      */new ServiceType(16, "MVNO", "mvno", "Мобильная связь", null);
    self["16"].getDisplayNumber = function (serviceNumber) { return !serviceNumber ? "" : phoneFormat(serviceNumber.trim()); };

    self.getDisplayNumber = function (service) {
        var servType = SERVICE_TYPE[service.type];
        if (!servType || !servType.getDisplayNumber) { return service.displayNumber; }
        return servType.getDisplayNumber(service.displayNumber);
    };
    self.getIcon = function (serviceId) {
        if (SERVICE_TYPE[serviceId]) {
            return SERVICE_TYPE[serviceId].icon();
        }
        return "promised"; // FIXME Что за магические строки?..
    };
};


function generateUUID () {
    var s = [], itoh = '0123456789ABCDEF', i;
    for (i = 0; i < 36; i++) {
        s[i] = Math.floor(Math.random() * 0x10);
    }
    s[14] = 4;
    s[19] = (s[19] & 0x3) | 0x8;
    for (i = 0; i < 36; i++) {
        s[i] = itoh[s[i]];
    }
    s[8] = s[13] = s[18] = s[23] = '-';
    return s.join('');
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');
	
	getInfoByAlternative(prefs); // Пока получаем баланс альтернативным способом
	
	return;

    if(AnyBalance.getLevel() < 4)
        throw new AnyBalance.Error('Этот провайдер требует API v.4+');

    checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(prefs.password, 'Введите пароль!');

    var login=prefs.login, type='LOGIN';
    if(/^\d{9,11}$/i.test(prefs.login.replace(/[\+\s\-()]+/ig, ''))){
    	AnyBalance.trace('Входить будем по номеру телефона');
    	login = prefs.login.replace(/[\+\s\-()]+/ig, '');
    	type = 'PHONE';
    }else if(/@/i.test(prefs.login)){
    	AnyBalance.trace('Входить будем по eмейл');
    	type = 'EMAIL';
    }else{
    	AnyBalance.trace('Входить будем по логину');
    }
/*
    //Get captcha
    var sitekey = '6LeQM84SAAAAAKALDOQ_0oUk2i09ozbCzrWg4nt5';
    var html = AnyBalance.requestGet('https://www.google.com/recaptcha/api/challenge?k=' + sitekey + '&ajax=1&cachestop=' + Math.random(), addHeaders({
    	Referer: baseurl
    }));
    var challenge = getParam(html, /challenge\s*:\s*'([^']*)/);
    html = AnyBalance.requestGet('https://www.google.com/recaptcha/api/reload?c=' + challenge + '&k=' + sitekey + '&reason=i&type=image&lang=ru', addHeaders({
    	Referer: baseurl
    }));
    var imgid = getParam(html, /Recaptcha.finish_reload\(\'([^']*)/);
    var img = AnyBalance.requestGet('https://www.google.com/recaptcha/api/image?c=' + imgid, addHeaders({
    	Referer: baseurl
    }));

    var code = AnyBalance.retrieveCode('Пожалуйста, введите слова с картинки', img);
*/
	
	AnyBalance.setCookie('.rt.ru', 'oxxfgh', 'f9d528d6-f77e-421d-aa52-fb0260e7ec6e#0#1800000#5000');
	var html = AnyBalance.requestPost(baseurl + 'client-api/checkSession', JSON.stringify({
		client_uuid: generateUUID(), 
		current_page: ''
	}), addHeaders({Referer: baseurl}));


    var state = JSON.stringify({uuid: generateUUID()});
    html = AnyBalance.requestGet('https://b2c.passport.rt.ru/auth/realms/b2c/protocol/openid-connect/auth?' + createUrlEncodedParams({
    	response_type: 'code',
    	scope: 'openid',
    	client_id: 'lk_b2c',
    	state: state,
    	redirect_uri: 'https://lk.rt.ru/sso-auth/?redirect=https%3A%2F%2Flk.rt.ru%2F'
    }), g_web_headers);

     html = handleBobcmn(AnyBalance.getLastUrl(), html);
    html = AnyBalance.requestGet('https://b2c.passport.rt.ru/auth/realms/b2c/protocol/openid-connect/auth?' + createUrlEncodedParams({
    	response_type: 'code',
    	scope: 'openid',
    	client_id: 'lk_b2c',
    	state: state,
    	redirect_uri: 'https://lk.rt.ru/sso-auth/?redirect=https%3A%2F%2Flk.rt.ru%2F'
    }), g_web_headers);

	if(/Личный кабинет временно недоступен/i.test(html)) {
		throw new AnyBalance.Error('Личный кабинет временно недоступен. Ведутся технические работы, попробуйте обновить баланс позже.');
	}

    var form = getElement(html, /<form[^>]+kc-form-login/i);
    if(!form){
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
    }

    var action = getParam(form, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities);
	var params = AB.createFormParams(form, function(params, str, name, value) {
		if (name == 'username') {
			return prefs.login;
		} else if (name == 'password') {
			return prefs.password;
		}

		return value;
	});

	var html = AnyBalance.requestPost(action, params, addHeaders({Referer: AnyBalance.getLastUrl()}, g_web_headers));

	if(AnyBalance.getLastUrl().indexOf(baseurl) != 0){
		var error = getElement(html, /<div[^>]+error/i, replaceTagsAndSpaces);
		if(error)
			throw new AnyBalance.Error(error, null, /парол/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}

	html = AnyBalance.requestPost(baseurl + 'client-api/checkSession', JSON.stringify({
		client_uuid: generateUUID(), 
		current_page: ''
	}), addHeaders({Referer: baseurl}));

	html = AnyBalance.requestPost(baseurl + 'client-api/getAccounts', JSON.stringify({
		client_uuid: generateUUID(),
		current_page: 'login'
	}), addHeaders({Referer: baseurl}));
    
    var accinfo = getRTJson(html);

    if(!accinfo.accounts || accinfo.accounts.length == 0)
        throw new AnyBalance.Error("В вашем кабинете Ростелеком ещё не подключена ни одна услуга");

    AnyBalance.trace('Найдено ' + accinfo.accounts.length + ' л/с');
    AnyBalance.trace('Требуются ' + (prefs.num || 'любые л/с'));

    var nums = prefs.num ? prefs.num.split(/,/g) : ['', '', '', ''];

    var not_found = [];
    var index = 0;
    var tariffs = [];
    var totalBalancePlus = 0;
    var totalBalanceMinus = 0;
    var result = {success: true};

    for(var i=0; i<nums.length; ++i){
        var num = nums[i].replace(/\s+/g, '');

        var acc = null;
        if(num){
            //Если num непустой, то ищем аккаунт с этим номером
            accsearch:
            for(var j=0; j<accinfo.accounts.length; ++j){
                var _acc = accinfo.accounts[j];
                if(endsWith(_acc.number, num)){
                    acc = _acc;
                    break;
                }
                if(_acc.services){
                    //Если не нашли по номеру л/с, то ищем по номеру телефона
                    for(var j1=0; j1<_acc.services.length; ++j1){
                        var _service = _acc.services[j1];
                        if(endsWith(_service.number, num)){
                    	    acc = _acc;
                            break accsearch;
                        }
                    }
                }
            }
        }else{
            //Если num пустой, то просто берем следующий по счету аккаунт
            acc = accinfo.accounts[i];
        }

        if(!acc){
            if(num){
                not_found[not_found.length] = num;
                AnyBalance.trace('Аккаунт, оканчивающийся на ' + num + ' не найден.');
            }
            continue;
        }

        var suffix = i ? i : '';

        if(AnyBalance.isAvailable('totalBalancePlus', 'totalBalanceMinus') ||
           (i < 4 && AnyBalance.isAvailable('balance' + suffix, 'bonus' + suffix, 'sms' + suffix, 'mms' + suffix, 'min' + suffix, 'gprs' + suffix, 'status' + suffix, 'licschet' + suffix, 'name' + suffix, 'phone' + suffix))){

            var servicesIds = [];
            for(var s=0; s<acc.services.length; ++s)
            	servicesIds.push(acc.services[s].serviceId);

			html = AnyBalance.requestPost(baseurl + 'client-api/getServiceTariffName', JSON.stringify({
				servicesId: servicesIds,
				client_uuid: generateUUID(),
				current_page: 'main'
			}), g_headers);
			acc.__tariffNames = getRTJson(html).tariffNames;

            AnyBalance.trace('Получаем данные для л/с: ' + acc.number);
			try{
				html = AnyBalance.requestPost(baseurl + 'client-api/getAccountBalance', JSON.stringify({
					accountId: acc.accountId,
					client_uuid: generateUUID(),
					current_page: 'main'
				}), g_headers);

				acc.__detailedInfo = getRTJson(html);;

				var balance = getAccBalance(acc.__detailedInfo);

				if(i < 4){
					if(AnyBalance.isAvailable('balance' + suffix))
						result['balance' + suffix] = balance;

					var statuses = [], names = [], bonuses = [], phones = [], sms = [], mms = [], gprs = [];
					for(var j=0; acc.services && j<acc.services.length; ++j){
						var service = acc.services[j];

						if(acc.__tariffNames[service.serviceId])
							tariffs.push(acc.__tariffNames[service.serviceId]);

						html = AnyBalance.requestPost(baseurl + 'client-api/getServiceInfo', JSON.stringify({
							serviceId: service.serviceId,
							client_uuid: generateUUID(),
							current_page: 'main'
						}), g_headers);

						statuses.push(g_ServiceStatus[getRTJson(html).status]);
						var st = SERVICE_TYPE[service.type];
						if(st)
							names.push(st.title);
						phones.push(SERVICE_TYPE.getDisplayNumber(service));

						if(AnyBalance.isAvailable('bonus' + suffix)){
							if(service.bonusStatus >= 0){
                                AnyBalance.trace('Сервис ' + st.title + ' имеет бонус');
							}else{
								AnyBalance.trace('Сервис ' + st.title + ' не подключил бонусы');
							}
/*							AnyBalance.trace('Пробуем найти бонусную программу Премия...');
							var jsonBonus = getJson(AnyBalance.requestPost(baseurl + 'client-api/getBonusStatus', {serviceId: service.id}, g_headers));
							if(!jsonBonus.isError){
								sumParam(jsonBonus.balance+'', result, 'bonus' + suffix, null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
							}else{
								AnyBalance.trace('Не удалось бонусную программу Премия: ' + jsonBonus.errorMsg);
							}*/
						}

						if(AnyBalance.isAvailable('sms' + suffix, 'mms' + suffix, 'min' + suffix, 'gprs' + suffix)){
							var jsonPackets = getJson(AnyBalance.requestPost(baseurl + 'client-api/getServiceTariff', JSON.stringify({
								serviceId: service.serviceId,
								client_uuid: generateUUID(),
								current_page: 'mvno'
							}), g_headers));

							if(jsonPackets.options){
								for(var j1=0; j1<jsonPackets.options.length; ++j1){
									var _packet = jsonPackets.options[j1];
									var limits = _packet.limits[0];
									if(!limits){
										AnyBalance.trace('Option without limits: ' + JSON.stringify(_packet));
										continue;
									}
									if(/SMS|СМС/i.test(limits.unit))
										sumParam(limits.remain, result, 'sms'+suffix, null, null, parseBalance, aggregate_sum);
									else if(/MMS|ММС/i.test(limits.unit))
										sumParam(limits.remain, result, 'mms'+suffix, null, null, parseBalance, aggregate_sum);
									else if(/мин|MIN/i.test(limits.unit))
										sumParam(limits.remain, result, 'min'+suffix, null, null, parseBalance, aggregate_sum);
									else if(/[мmkкгg][бb]|байт|byte/i.test(limits.unit))
										sumParam(limits.remain, result, 'gprs'+suffix, null, null, parseBalance, aggregate_sum);
								}
							}
						}

/*						if(/INTERNET|TELEPHONY|IPTV|CDMA/.test(service.type || '')  //Судя по шаблону detailed_list, только у этих сервисов есть статистика
							&& AnyBalance.isAvailable('trafIn' + suffix, 'trafOut' + suffix, 'minOutIC' + suffix)){
							//Междугородная исходящая телефония
							var dt = new Date();
							var jsonStatistics = getJson(AnyBalance.requestPost(baseurl + 'serverLogic/statistic', {action:'get_statistic',serviceId:service.id,month: dt.getMonth(), year: dt.getFullYear()}, g_headers));
							AnyBalance.trace('Смотрим статистику');
							for(var j1=0; jsonStatistics.statistic && j1<jsonStatistics.statistic.length; ++j1){
							   var su = jsonStatistics.statistic[j1];
							   AnyBalance.trace(su.name + ': ' + su.value + ' ' + su.unit);
							   if(su.statUnit == 'TYPE_TIME'){
								   if(/Междугородная исходящая/i.test(su.name))
									   sumParam(su.value, result, 'minOutIC'+suffix, null, null, parseMinutes, aggregate_sum);
								   else
									   AnyBalance.trace('^^^ а эти минуты пропустили...');
							   }else if(su.statUnit == 'TYPE_TRAFFIC'){
								   if(/входящий/i.test(su.name))
									   sumParam(su.value + su.unit, result, 'trafIn'+suffix, null, null, parseTrafficGb, aggregate_sum);
								   else if(/Исходящий/i.test(su.name))
									   sumParam(su.value + su.unit, result, 'trafOut'+suffix, null, null, parseTrafficGb, aggregate_sum);
								   else
									   AnyBalance.trace('^^^ а этот трафик пропустили...');
							   }else{
								   AnyBalance.trace('^^^ а эту статистику пропустили...');
							   }
							}
							if(jsonStatistics.isError)
								AnyBalance.trace(jsonStatistics.errorMessage);
						}
*/
					}

					if(AnyBalance.isAvailable('status' + suffix) && statuses.length > 0)
						result['status' + suffix] = statuses.join(', ');

					if(AnyBalance.isAvailable('licschet' + suffix))
						result['licschet' + suffix] = acc.number;

					if(AnyBalance.isAvailable('name' + suffix) && names.length > 0)
						result['name' + suffix] = names.join(', ');

					if(AnyBalance.isAvailable('phone' + suffix) && phones.length > 0)
						result['phone' + suffix] = phones.join(', ');

					if(AnyBalance.isAvailable('bonus' + suffix)) {
						if(bonuses.length > 0) {
							result['bonus' + suffix] = aggregate_sum(bonuses);
						}
					}

/*					if(AnyBalance.isAvailable('bonusInt' + suffix)){
						AnyBalance.trace('Пробуем найти бонусную программу Интернет-Бонус...');
						try {
							var sbversion = getSouthBonusVersion(baseurl);
							if(sbversion != '???'){
								html = '';
								html = AnyBalance.requestPost(baseurl + 'plugins/south-bonus/' + sbversion + '/request', {action: 'getBonusBalance', accountId:acc.__detailedInfo.id}, g_headers);
								var jsonBonus = getRTJson(html);
								getParam(jsonBonus.balance+'', result, 'bonusInt' + suffix, null, replaceTagsAndSpaces, parseBalance);
							}else{
								AnyBalance.trace('Не удалось получить Интернет-Бонус: программа отсутствует');
							}
						} catch (e) {
							AnyBalance.trace('Не удалось получить Интернет-Бонус: ' + html);
						}
					}*/
				}
				if(balance > 0)
					totalBalancePlus += balance;
				else
					totalBalanceMinus += balance;
			}catch(e){
				AnyBalance.trace('Ошибка получения данных для л/с ' + acc.number + ': ' + e.message);
			}
        }
    }

    if(tariffs.length)
        result.__tariff = tariffs.join(', ');

    if(AnyBalance.isAvailable('bonusFPL')){
		AnyBalance.trace('Пробуем найти программу "Бонус"...');
		try {
			html = AnyBalance.requestPost(baseurl + 'client-api/getFplStatus', JSON.stringify({
				client_uuid: generateUUID(),
				current_page: ''
			}), g_headers);
			var jsonBonus = getRTJson(html);
			getParam(jsonBonus.balance, result, 'bonusFPL');
		} catch (e) {
			AnyBalance.trace('Не удалось получить программу "Бонус": ' + e.message);
		}
	}

    //Получим баланс для остальных л\с, если юзер запросил
    if(AnyBalance.isAvailable('totalBalancePlus', 'totalBalanceMinus')){
        for(var i=0; i<accinfo.accounts.length; ++i){
            var acc = accinfo.accounts[i];
            if(!acc.__detailedInfo){
                AnyBalance.trace('Дополнительно получаем данные для л/с: ' + acc.number);
				try{
					html = AnyBalance.requestPost(baseurl + 'client-api/getAccountBalance', JSON.stringify({
						accountId: acc.accountId,
						client_uuid: generateUUID(),
						current_page: 'main'
					}), g_headers);
					json = getRTJson(html);
					var balance = getAccBalance(json);

					if(balance > 0)
						totalBalancePlus += balance;
					else
						totalBalanceMinus += balance;
				}catch(e){
				    AnyBalance.trace('Не удалось получить данные л/с ' + acc.number + ': ' + e.message);
				}
            }

            if(AnyBalance.isAvailable('totalBalancePlus'))
                result.totalBalancePlus = totalBalancePlus;

            if(AnyBalance.isAvailable('totalBalanceMinus'))
                result.totalBalanceMinus = totalBalanceMinus;
        }
    }

    AnyBalance.setResult(result);
}

var g_south_bonus_version;
function getSouthBonusVersion(baseurl){
    if(!isset(g_south_bonus_version)){
        var html = AnyBalance.requestPost(baseurl + 'plugins/configuration', '', g_headers);
        var json = getJson(html);
        for(var i=0; i<json.length; ++i){
            if(json[i].name == 'south-bonus'){
                return g_south_bonus_version = json[i].cononcialVersion;
            }
        }
        g_south_bonus_version = '???';
        AnyBalance.trace('Could not find cononcialVersion for south-bonus: ' + html);
    }
    return g_south_bonus_version;
}

function getAccBalance(json){
    //Баланс может быть разбит на суббалансы
    var balance;
    if((!isset(json.balance) || json.balance===null) && json.subAccounts){
        for(var i=0; i<json.subAccounts.length; ++i){
            var acc = json.subAccounts[i];
            if(isset(acc.balance) && acc.balance!=null){
                if(!isset(balance)) balance = 0;
                balance += parseInt(acc.balance/100);
            }
        }
    }else{
        balance = json.balance/100;
    }
    return balance;
}

function getRTJson(text){
    var json = getJson(text);
    if(json.isError)
        throw new AnyBalance.Error(json.errorMsg);
    return json;
}

function getInfoByAlternative(prefs){
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(/^\d+$/.test(prefs.login), 'Введите номер лицевого счета!');
	
	var headers = {
	    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	    'Accept-Language': 'en-US,en;q=0.9,ru;q=0.8,ru-RU;q=0.7',
	    'Cache-Control': 'max-age=0',
	    'Connection': 'keep-alive',
	    'Upgrade-Insecure-Requests': '1',
	    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
    };
	
    var html = AnyBalance.requestGet('https://platiuslugi.ru/', headers);
    
	if(AnyBalance.getLastStatusCode() >= 400){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
    }
	
	html = AnyBalance.requestGet('https://platiuslugi.ru/oplata/rostelecom/', addHeaders({
		'Referer': 'https://platiuslugi.ru/'
	}), headers);
	
	var form = getElement(html, /<form[^>]+name="[\s\S]*?__CLIENTSresults"[^>]*>/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
	}
	        
	var params = createFormParams(form, function(params, str, name, value) {
		if (name == 'db[fields][CUSTOMFIELD:a3_NUMBER_1_2]') {
			return prefs.login;
			
		}
	        
		return value;
	});
	
    params['clientID'] = new Date().getTime() + '' + (100000 + Math.floor(Math.random() * 900000)); // 1708642102136193349
	
	var blockIndex = getParam(form, /<form[^>]+name="([\s\S]*?)__CLIENTSresults"/i, replaceTagsAndSpaces);
	
	html = AnyBalance.requestPost('https://platiuslugi.ru/call_app/' + blockIndex + '::next_step/', params, addHeaders({
    	'Accept': 'text/html, */*; q=0.01',
		'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    	'Origin': 'https://platiuslugi.ru',
        'Referer': 'https://platiuslugi.ru/oplata/rostelecom/',
		'X-Requested-With': 'XMLHttpRequest'
	}), headers);
    
    AnyBalance.trace('Ответ от внешней системы: ' + html);
	
	if(!/_PA_BALANCE_/i.test(html)){
		var error = getParam(html, /<div[^>]+message error bg-info[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		if(error)
			throw new AnyBalance.Error(error, null, /номер/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось получить информацию о балансе. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /_PA_BALANCE_[\s\S]*?value="([^"]*)/i, replaceTagsAndSpaces, parseBalance);
	result.__tariff = prefs.login;
	result.licschet = prefs.login;
		
	AnyBalance.setResult(result);
}