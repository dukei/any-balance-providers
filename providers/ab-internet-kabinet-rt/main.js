/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-Language': 'en-US,en;q=0.9,ru;q=0.8,ru-RU;q=0.7',
	'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'android.RTkabinet',
	'X-Requested-With': 'com.dartit.RTcabinet'
};

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
var g_savedData;

var phoneFormat = function (phoneNumber, stacionar) { // 79034785123 -> +7 903 478-51-23
    var phoneRegexp = /\s*\+?(\d)\s*\(?(\d{3})\)?\s*(\d{3})-?(\d{2})-?(\d{2})\s*/;
    var phone = phoneNumber === "string" ? phoneNumber : String(phoneNumber);
    return phone.replace(phoneRegexp, stacionar ? "$1 $2 $3-$4-$5" : "+$1 $2 $3-$4-$5");
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

function generateUUID(){
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
	
	if(!g_savedData)
		g_savedData = new SavedData('rostelecom', prefs.login);

	g_savedData.restoreCookies();
	
	var pageUUID = g_savedData.get('pageUUID');
	
	AnyBalance.trace('Пробуем войти в личный кабинет...');
	
	var html = AnyBalance.requestPost(baseurl + 'client-api/checkSession', JSON.stringify({
		client_uuid: generateUUID(), 
		current_page: "auto-attach",
		page_uuid: pageUUID
	}), addHeaders({'Content-Type': 'application/json', 'Referer': baseurl}));
	
	if(AnyBalance.getLastStatusCode() >= 500){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
    }
	
	AnyBalance.trace('checkSession: ' + html);
	
	if(!/"isSessionLost":\s*?false/i.test(html)){
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		clearAllCookies();
    	login(prefs);
	}else{
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
    }

    var result = {success: true};
	
	var pageUUID = g_savedData.get('pageUUID');

	var html = AnyBalance.requestPost(baseurl + 'client-api/getAccounts', JSON.stringify({
		client_uuid: generateUUID(),
		current_page: "auto-attach",
		page_uuid: pageUUID
	}), addHeaders({'Content-Type': 'application/json', 'Referer': baseurl}));
	
	AnyBalance.trace('getAccounts: ' + html);
    
    var accinfo = getRTJson(html);

    if(!accinfo.accounts || accinfo.accounts.length == 0)
        throw new AnyBalance.Error("У вас не подключена ни одна услуга");

    AnyBalance.trace('Найдено л/с: ' + accinfo.accounts.length);
    AnyBalance.trace('Требуются ' + ('л/с: ' + prefs.num || 'любые л/с'));

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
                AnyBalance.trace('Аккаунт, оканчивающийся на ' + num + ' не найден');
            }
            continue;
        }
		
		// Балансы
        var suffix = i ? i : '';

        if(AnyBalance.isAvailable('totalBalancePlus', 'totalBalanceMinus') ||
           (i < 4 && AnyBalance.isAvailable('balance' + suffix, 'bonus' + suffix, 'sms' + suffix, 'mms' + suffix, 'min' + suffix, 'gprs' + suffix, 'till' + suffix, 'abon' + suffix, 'desc' + suffix, 'status' + suffix, 'licschet' + suffix, 'name' + suffix, 'phone' + suffix))){

            var servicesIds = [];
            for(var s=0; s<acc.services.length; ++s)
            	servicesIds.push(acc.services[s].serviceId);
			
			html = AnyBalance.requestPost(baseurl + 'client-api/getServiceTariffName', JSON.stringify({
				servicesId: servicesIds,
				client_uuid: generateUUID(),
				current_page: 'service',
				page_uuid: pageUUID
			}), addHeaders({'Content-Type': 'application/json', 'Referer': baseurl}));
			
	        AnyBalance.trace('getServiceTariffName: ' + html);
			
			acc.__tariffNames = getRTJson(html).tariffNames;

            AnyBalance.trace('Получаем данные для л/с ' + acc.number);
			try{
				html = AnyBalance.requestPost(baseurl + 'client-api/getAccountBalanceV2', JSON.stringify({
					accountId: acc.accountId,
					client_uuid: generateUUID(),
					current_page: 'account',
					page_uuid: pageUUID
				}), addHeaders({'Content-Type': 'application/json', 'Referer': baseurl}));
                
	            AnyBalance.trace('getAccountBalanceV2: ' + html);
				
				acc.__detailedInfo = getRTJson(html);

				var balance = getAccBalance(acc.__detailedInfo);

				if(i < 4){
					if(AnyBalance.isAvailable('balance' + suffix))
						result['balance' + suffix] = balance;

					var statuses = [], names = [], bonuses = [], phones = [], sms = [], mms = [], gprs = [], descs = [];
					for(var j=0; acc.services && j<acc.services.length; ++j){
						var service = acc.services[j];

						if(acc.__tariffNames[service.serviceId])
							tariffs.push(acc.__tariffNames[service.serviceId]);

						html = AnyBalance.requestPost(baseurl + 'client-api/getServiceInfo', JSON.stringify({
							serviceId: service.serviceId,
							client_uuid: generateUUID(),
							current_page: 'main',
							page_uuid: pageUUID
						}), addHeaders({'Content-Type': 'application/json', 'Referer': baseurl}));
                        
	                    AnyBalance.trace('getServiceInfo: ' + html);
						
						if(getRTJson(html).voluntaryBlockEndDate){
						    statuses.push(g_ServiceStatus[getRTJson(html).status] + ' до ' + getRTJson(html).voluntaryBlockEndDate);
						}else{
							statuses.push(g_ServiceStatus[getRTJson(html).status]);
						}
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

						if(AnyBalance.isAvailable('sms' + suffix, 'mms' + suffix, 'min' + suffix, 'gprs' + suffix, 'till' + suffix, 'abon' + suffix, 'desc' + suffix)){
							html = AnyBalance.requestPost(baseurl + 'client-api/getServiceTariff', JSON.stringify({
								serviceId: service.serviceId,
								client_uuid: generateUUID(),
								current_page: 'service',
								page_uuid: pageUUID
							}), addHeaders({'Content-Type': 'application/json', 'Referer': baseurl}));
                            
							AnyBalance.trace('getServiceTariff: ' + html);
							
							var jsonPackets = getJson(html);
							
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
									getParam(limits.endDate, result, 'till'+suffix, null, null, parseDate);
								}
							}
							
							if(jsonPackets.fee)
								getParam(jsonPackets.fee/100, result, 'abon'+suffix, null, null, parseBalance);
							
							if(jsonPackets.description)
								descs.push(jsonPackets.description.replace(/<br>$/g, ''));
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
						result['status' + suffix] = statuses.join(',\n ');

					if(AnyBalance.isAvailable('licschet' + suffix))
						result['licschet' + suffix] = acc.number;

					if(AnyBalance.isAvailable('name' + suffix) && names.length > 0)
						result['name' + suffix] = names.join(',\n ');

					if(AnyBalance.isAvailable('phone' + suffix) && phones.length > 0)
						result['phone' + suffix] = phones.join(',\n ');
					
					if(AnyBalance.isAvailable('desc' + suffix) && descs.length > 0)
						result['desc' + suffix] = descs.join(',<br> ');

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
				current_page: 'service',
				page_uuid: pageUUID
			}), addHeaders({'Content-Type': 'application/json', 'Referer': baseurl}));
			
	        AnyBalance.trace('getFplStatus: ' + html);
			
			var jsonBonus = getRTJson(html);
			
			getParam(jsonBonus.balance, result, 'bonusFPL');
			getParam(jsonBonus.levelInfo.name, result, 'bonusFPLStatus');
			if(jsonBonus.balanceBurningPoints && jsonBonus.balanceBurningPoints.length > 0){
			    getParam(jsonBonus.balanceBurningPoints[0].points, result, 'bonusFPLBurn');
			    getParam(jsonBonus.balanceBurningPoints[0].burningDate.replace(/(\d{4})-(\d{2})-(\d{2})/, '$3.$2.$1'), result, 'bonusFPLBurnDate', null, null, parseDate);
			}
		} catch (e) {
			AnyBalance.trace('Не удалось получить программу "Бонус": ' + e.message);
		}
	}

    //Получим баланс для остальных л\с, если юзер запросил
    if(AnyBalance.isAvailable('totalBalancePlus', 'totalBalanceMinus')){
        for(var i=0; i<accinfo.accounts.length; ++i){
            var acc = accinfo.accounts[i];
            if(!acc.__detailedInfo){
                AnyBalance.trace('Дополнительно получаем данные для л/с ' + acc.number);
				try{
					html = AnyBalance.requestPost(baseurl + 'client-api/getAccountBalanceV2', JSON.stringify({
			            accountId: acc.accountId,
			            client_uuid: generateUUID(),
			            current_page: 'account',
			            page_uuid: pageUUID
		            }), addHeaders({'Content-Type': 'application/json', 'Referer': baseurl}));
					
	                AnyBalance.trace('getAccountBalanceV2: ' + html);
					
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
	
	if(AnyBalance.isAvailable('fio')){
	    html = AnyBalance.requestPost(baseurl + 'client-api/getProfile', JSON.stringify({
		    client_uuid: generateUUID(), 
		    current_page: "auto-attach",
		    page_uuid: pageUUID
	    }), addHeaders({'Content-Type': 'application/json', 'Referer': baseurl}));
        
	    AnyBalance.trace('getProfile: ' + html);
		
		json = getRTJson(html);
		
		var person = {};
		sumParam(json.lastName, person, '__n', null, null, null, create_aggregate_join(' '));
		sumParam(json.name, person, '__n', null, null, null, create_aggregate_join(' '));
		sumParam(json.middleName, person, '__n', null, null, null, create_aggregate_join(' '));
	    getParam(person.__n, result, 'fio');
	}

    AnyBalance.setResult(result);
}

var g_south_bonus_version;

function getSouthBonusVersion(baseurl){
    if(!isset(g_south_bonus_version)){
        var html = AnyBalance.requestPost(baseurl + 'plugins/configuration', '', addHeaders({'Content-Type': 'application/json', 'Referer': baseurl}));
		
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