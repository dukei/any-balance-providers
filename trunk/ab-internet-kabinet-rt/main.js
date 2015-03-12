/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_ServiceStatus = {
	ACTIVE: "активна",
	CONNECTED: "активна",
	INACTIVE: "неактивна",
	NOT_CONNECTED: "неактивна",
	BLOCKED: "отключена за неуплату",
	OPERATOR_BLOCK: "включена добровольная блокировка",
	ENABLED: "включена",
	DISABLED: "отключена",
	RESERVED: "забронирована",
	WAIT_CONFIRM: "ожидание подключения",
	UNKNOWN_STATUS: "не определен"
};

var g_headers = {
	Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	Connection: 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.64 Safari/537.11'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    if(AnyBalance.getLevel() < 4)
        throw new AnyBalance.Error('Этот провайдер требует API v.4+');

    checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(prefs.password, 'Введите пароль!');

    var baseurl = "https://lk.rt.ru/";

    var html = AnyBalance.requestPost(baseurl + 'serverLogic/login', {
        action: 'login',
        login:prefs.login,
        passwd:prefs.password
    }, g_headers);
	
	if(/Личный кабинет временно недоступен/i.test(html)) {
		throw new AnyBalance.Error('Личный кабинет временно недоступен. Ведутся технические работы, попробуйте обновить баланс позже.');
	}
	
    var json = getJson(html);
    if(json.isError)
        throw new AnyBalance.Error(json.errorMsg, null, /Вы ввели несуществующую пару логин-пароль/.test(json.errorMsg));
    if(!json.sessionKey)
        throw new AnyBalance.Error("Не удалось получить идентификатор сессии!");

    AnyBalance.setCookie('lk.rt.ru', 'sessionHashKey', json.sessionKey);

    html = AnyBalance.requestGet(baseurl, g_headers);
	
	html = AnyBalance.requestGet(baseurl + 'serverLogic/cabinetGetStructure', g_headers);
	
    var accinfo = getRTJson(html);

    if(!accinfo.cabinet.accounts || accinfo.cabinet.accounts.length == 0)
        throw new AnyBalance.Error("В вашем кабинете Ростелеком ещё не подключена ни одна услуга");

    AnyBalance.trace('Найдено ' + accinfo.cabinet.accounts.length + ' л/с');
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
            for(var j=0; j<accinfo.cabinet.accounts.length; ++j){
                var _acc = accinfo.cabinet.accounts[j];
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
            acc = accinfo.cabinet.accounts[i];
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

            AnyBalance.trace('Получаем данные для л/с: ' + acc.number);
			try{
				html = AnyBalance.requestPost(baseurl + 'serverLogic/accountGetExtData', {account: acc.id}, g_headers);
				json = getRTJson(html).account;
				
				acc.__detailedInfo = json;

				var balance = getAccBalance(json);
				
				if(i < 4){
					if(AnyBalance.isAvailable('balance' + suffix))
						result['balance' + suffix] = balance;
					
					var statuses = [], names = [], bonuses = [], phones = [], sms = [], mms = [], gprs = []; 
					for(var j=0; json.services && j<json.services.length; ++j){
						var service = json.services[j];
						//tariffs.push(/*(service.type || service.serviceType) + */(service.tariff ? ': ' + service.tariff.title : ''));
						
						if(service.tariff.title)
							tariffs.push(service.tariff.title);
						
						statuses.push(g_ServiceStatus[service.status]);
						if(service.alias)
							names.push(service.alias);
						phones.push(service.number);
		
						if(AnyBalance.isAvailable('bonus' + suffix)){
							AnyBalance.trace('Пробуем найти бонусную программу Премия...');
							var jsonBonus = getJson(AnyBalance.requestPost(baseurl + 'serverLogic/getBonusProgramStatus', {serviceId: service.id}, g_headers));
							if(!jsonBonus.isError){
								sumParam(jsonBonus.balance+'', result, 'bonus' + suffix, null, replaceTagsAndSpaces, parseBalance, aggregate_sum);						
							}else{
								AnyBalance.trace('Не удалось бонусную программу Премия: ' + jsonBonus.errorMsg);
							}
						}
						if(AnyBalance.isAvailable('sms' + suffix, 'mms' + suffix, 'min' + suffix, 'gprs' + suffix)){
							var jsonPackets = getJson(AnyBalance.requestPost(baseurl + 'serverLogic/viewCurrentBonus', {serviceId: service.id}, g_headers));
							if(jsonPackets.bonusCurrent){
								for(var j1=0; j1<jsonPackets.bonusCurrent.length; ++j1){
									var _packet = jsonPackets.bonusCurrent[j1];
									if(/SMS/i.test(_packet.title))
										sumParam(_packet.currentCount, result, 'sms'+suffix, null, null, parseBalance, aggregate_sum);
									else if(/MMS/i.test(_packet.title))
										sumParam(_packet.currentCount, result, 'mms'+suffix, null, null, parseBalance, aggregate_sum);
									else if(/мин/i.test(_packet.title))
										sumParam(_packet.currentCount, result, 'min'+suffix, null, null, parseBalance, aggregate_sum);
									else if(/[мmkкгg][бb]|байт|bytes/i.test(_packet.title))
										sumParam(_packet.currentCount, result, 'gprs'+suffix, null, null, parseBalance, aggregate_sum);
								}
							}
						}
						if(/INTERNET|TELEPHONY|IPTV|CDMA/.test(service.type || '')  //Судя по шаблону detailed_list, только у этих сервисов есть статистика
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

					if(AnyBalance.isAvailable('bonusInt' + suffix)){
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
					}
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
			html = '';
			html = AnyBalance.requestPost(baseurl + 'serverLogic/bonusFPLGetProgram', '', g_headers);
			var jsonBonus = getRTJson(html);
			if(jsonBonus.masterFPL)
				getParam(jsonBonus.masterFPL.points+'', result, 'bonusFPL', null, replaceTagsAndSpaces, parseBalance);						
			else
				AnyBalance.trace('Нет masterFPL: ' + html);
		} catch (e) {
			AnyBalance.trace('Не удалось получить программу "Бонус": ' + e.message);
		}
	}

    //Получим баланс для остальных л\с, если юзер запросил
    if(AnyBalance.isAvailable('totalBalancePlus', 'totalBalanceMinus')){
        for(var i=0; i<accinfo.cabinet.accounts.length; ++i){
            var acc = accinfo.cabinet.accounts[i];
            if(!acc.__detailedInfo){
                AnyBalance.trace('Дополнительно получаем данные для л/с: ' + acc.number);
				try{
					html = AnyBalance.requestPost(baseurl + 'serverLogic/accountGetExtData', {account: acc.id}, g_headers);
					json = getRTJson(html);
					if(json.account.balance > 0)
						totalBalancePlus += json.account.balance/100;
					else
						totalBalanceMinus += json.account.balance/100;
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