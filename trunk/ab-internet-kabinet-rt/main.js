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
    });

    var json = getJson(html);
    if(json.isError)
        throw new AnyBalance.Error(json.errorMsg);
    if(!json.sessionKey)
        throw new AnyBalance.Error("Не удалось получить идентификатор сессии!");

    AnyBalance.setCookie('kabinet.rt.ru', 'sessionHashKey', json.sessionKey);

    html = AnyBalance.requestGet(baseurl);
    json = getParam(html, null, null, /var[\s+]services\s*=\s*(\{[\s\S]*?\})\s*;/, null, getJson);
    if(!json)
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    
    if(json.isError)
        throw new AnyBalance.Error(json.errorMsg);

    if(!json.accounts || json.accounts.length == 0)
        throw new AnyBalance.Error("В вашем кабинете Ростелеком ещё не подключена ни одна услуга");

    var acc;
    for(var i=0; i<json.accounts.length; ++i){
        var _acc = json.accounts[i];
        if(!prefs.num || (prefs.num && endsWith(_acc.number, prefs.num))){
            acc = _acc;
            break;
        }
    }

    if(!acc)
        throw new AnyBalance.Error("Не найдено лицевого счета, оканчивающегося на " + prefs.num);

    html = AnyBalance.requestPost(baseurl + 'serverLogic/getAccountInfo', {account: acc.id});
    json = getJson(html);

    var result = {success: true};

    if(AnyBalance.isAvailable('balance'))
        result.balance = json.balance/100;

    var tariffs = [];
    var statuses = []; 
    for(var i=0; json.services && i<json.services.length; ++i){
        var service = json.services[i];
        tariffs[tariffs.length] = service.typeString + ': ' + service.tariff.tarName;
        statuses[statuses.length] = service.typeString + ': ' + g_ServiceStatus[service.status];
    }
    if(tariffs.length)
        result.__tariff = tariffs.join(', ');
    if(AnyBalance.isAvailable('status') && statuses.length > 0)
        result.status = statuses.join(', ');

    if(AnyBalance.isAvailable('licschet'))
        result.licschet = acc.number;


    AnyBalance.setResult(result);
}
