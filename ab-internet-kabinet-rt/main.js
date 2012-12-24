/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для ростелкома (https://kabinet.rt.ru)

Сайт оператора: www.rt.ru
Личный кабинет: https://kabinet.rt.ru
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
    Accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    Connection:'keep-alive',
    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.64 Safari/537.11'
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
            for(var j=0; j<accinfo.accounts.length; ++j){
                var _acc = accinfo.accounts[j];
                if(endsWith(_acc.number, num)){
                    acc = _acc;
                    break;
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
            break;
        }

        AnyBalance.trace('Получаем данные для л/с: ' + acc.number);
        html = AnyBalance.requestPost(baseurl + 'serverLogic/getAccountInfo', {account: acc.id}, g_headers);
        json = getJson(html);

        acc.__detailedInfo = json;
        
        if(i < 4){
            var suffix = i ? i : '';
            
            if(AnyBalance.isAvailable('balance'))
                result['balance' + suffix] = json.balance/100;
            
            var statuses = []; 
            for(var j=0; json.services && j<json.services.length; ++j){
                var service = json.services[j];
                tariffs[tariffs.length] = service.typeString + ': ' + service.tariff.tarName;
                statuses[statuses.length] = service.typeString + ': ' + g_ServiceStatus[service.status];
            }

            if(AnyBalance.isAvailable('status') && statuses.length > 0)
                result['status' + suffix] = statuses.join(', ');
            
            if(AnyBalance.isAvailable('licschet'))
                result['licschet' + suffix] = acc.number;
        }

        if(json.balance > 0)
            totalBalancePlus += json.balance/100;
        else
            totalBalanceMinus += json.balance/100;
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
