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

    var baseurl = "https://kabinet.rt.ru/";

    var html = AnyBalance.requestPost(baseurl + 'serverLogic/login', {
        action: 'login',
        login:prefs.login,
        passwd:prefs.password
    }, g_headers);

    var json = getJson(html);
    if(json.isError)
        throw new AnyBalance.Error(json.errorMsg);
    if(!json.sessionKey)
        throw new AnyBalance.Error("Не удалось получить идентификатор сессии!");

    AnyBalance.setCookie('kabinet.rt.ru', 'sessionHashKey', json.sessionKey);

    html = AnyBalance.requestGet(baseurl, g_headers);
    var accinfo = getParam(html, null, null, /var[\s+]services\s*=\s*(\{[\s\S]*?\})\s*;/, null, getJson);
    if(!accinfo)
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    
    if(accinfo.isError)
        throw new AnyBalance.Error(accinfo.errorMsg);

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

            AnyBalance.trace('Получаем данные для л/с: ' + acc.number);
            html = AnyBalance.requestPost(baseurl + 'serverLogic/getAccountInfo', {account: acc.id}, g_headers);
            json = getJson(html);
    
            acc.__detailedInfo = json;

            var balance = getAccBalance(json);
            
            if(i < 4){
                if(AnyBalance.isAvailable('balance' + suffix))
                    result['balance' + suffix] = balance;
                
                var statuses = [], names = [], bonuses = [], phones = [], sms = [], mms = [], gprs = []; 
                for(var j=0; json.services && j<json.services.length; ++j){
                    var service = json.services[j];
                    tariffs.push((service.typeString || service.serviceType) + (service.tariff ? ': ' + service.tariff.tarName : ''));
                    statuses.push(g_ServiceStatus[service.status]);
                    if(service.alias)
                        names.push(service.alias);
                    phones.push(service.number);
    
                    if(AnyBalance.isAvailable('bonus' + suffix)){
                        var jsonBonus = getJson(AnyBalance.requestPost(baseurl + 'serverLogic/getBonusProgramStatus', {serviceId: service.id}, g_headers));
                        if(jsonBonus.balance)
                            bonuses.push(parseInt(jsonBonus.balance));
                    }
                    if(AnyBalance.isAvailable('sms' + suffix, 'mms' + suffix, 'min' + suffix, 'gprs' + suffix)){
                        var jsonPackets = getJson(AnyBalance.requestPost(baseurl + 'serverLogic/viewCurrentBonus', {serviceId: service.id}, g_headers));
                        if(jsonPackets.bonusCurrent){
                            for(var j1=0; j1<jsonPackets.bonusCurrent.length; ++j1){
                                var _packet = jsonPackets.bonusCurrent[j1];
                                sumParam(_packet.currentCount, result, 'sms'+suffix, /(\d+)\s*SMS/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
                                sumParam(_packet.currentCount, result, 'mms'+suffix, /(\d+)\s*MMS/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
                                sumParam(_packet.currentCount, result, 'min'+suffix, /(\d+)\s*мин/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
                                sumParam(_packet.currentCount, result, 'gprs'+suffix, /([\d.,]+)\s*(?:[мmkкгg][бb]|байт|bytes)/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
                            }
                        }
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
					} else {
						AnyBalance.trace('Бонусов не нашли, попробуем получить бонусы другим способом...');
						try {
							var jsonBonus = JSON.parse(AnyBalance.requestPost(baseurl + 'plugins/south-bonus/1.0.2-SNAPSHOT/request', {action: 'getBonusBalance', accountId:acc.__detailedInfo.id}, g_headers));
							if(jsonBonus.balance)
								getParam(jsonBonus.balance+'', result, 'bonus' + suffix, null, replaceTagsAndSpaces, parseBalance);						
						} catch(e) {}
					}
				}
            }
            if(balance > 0)
                totalBalancePlus += balance;
            else
                totalBalanceMinus += balance;
        }
    }

    if(tariffs.length)
        result.__tariff = tariffs.join(', ');

    //Получим баланс для остальных л\с, если юзер запросил
    if(AnyBalance.isAvailable('totalBalancePlus', 'totalBalanceMinus')){
        for(var i=0; i<accinfo.accounts.length; ++i){
            var acc = accinfo.accounts[i];
            if(!acc.__detailedInfo){
                AnyBalance.trace('Дополнительно получаем данные для л/с: ' + acc.number);
                html = AnyBalance.requestPost(baseurl + 'serverLogic/getAccountInfo', {account: acc.id}, g_headers);
                json = getJson(html);

                if(json.balance > 0)
                    totalBalancePlus += json.balance/100;
                else
                    totalBalanceMinus += json.balance/100;
            }

            if(AnyBalance.isAvailable('totalBalancePlus'))
                result.totalBalancePlus = totalBalancePlus;

            if(AnyBalance.isAvailable('totalBalanceMinus'))
                result.totalBalanceMinus = totalBalanceMinus;
        }
    }

    AnyBalance.setResult(result);
}

function getAccBalance(json){
    //Баланс может быть разбит на суббалансы
    var balance;
    if((!isset(json.balance) || json.balance==null) && json.subAccounts){
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