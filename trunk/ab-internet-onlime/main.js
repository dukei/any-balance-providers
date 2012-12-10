/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Московский интернет провайдер ОнЛайм предлагает услуги широкополосного доступа в интернет
Сайт оператора: http://onlime.ru/
Личный кабинет: https://my.onlime.ru/
*/

function main(){
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://my.onlime.ru/';

    AnyBalance.setDefaultCharset('utf-8');

    if(!prefs.login || !prefs.password)
        throw new AnyBalance.Error('Пожалуйста, установите в настройках провайдера логин и пароль.');
    
    // Заходим на главную страницу
    var info = AnyBalance.requestPost(baseurl + "session/login", {
    	"login_credentials[login]": prefs.login,
        "login_credentials[password]": prefs.password
    });
    
    if(!/\/session\/logout/i.test(info)){
        var error = $('#errHolder', info).text();
        if(error){
            throw new AnyBalance.Error(error);
        }
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }
    
    var result = {success: true};

    info = AnyBalance.requestGet(baseurl + "json/cabinet/");
    AnyBalance.trace('got info: ' + info);
    var oInfo = getJson(info.replace(/:(\-)?\./g, ':$10.')); //А то "balance":-.31 не распарсивается
    
    if(AnyBalance.isAvailable('balance'))
        result.balance = oInfo.balance;

    if(AnyBalance.isAvailable('bonus_balance'))
        result.bonus_balance = oInfo.points;

    result.__tariff = oInfo.tier;

    if(AnyBalance.isAvailable('lock'))
        result.lock = oInfo.lock == 1000 ? 100 : oInfo.lock; //Похоже, 1000 используется, как бесконечное значение, в кабинете показывается >100
    
    if(AnyBalance.isAvailable('agreement'))
        result.agreement = oInfo.contract;
    
    if(AnyBalance.isAvailable('license'))
        result.license = oInfo.account;
    
    if((AnyBalance.isAvailable('balance') && !isset(result.balance)) ||
        (AnyBalance.isAvailable('bonus_balance') && !isset(result.bonus_balance)) ||
        (AnyBalance.isAvailable('lock') && !isset(result.lock))){
        //Странно, json не вернул то, что надо, придется из html вырезать
        var html = AnyBalance.requestGet(baseurl + 'billing/balance');
        getParam(html, result, 'balance', /Баланс:[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'lock', /Количество дней до блокировки:[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, parseBalance);
    }

    if((AnyBalance.isAvailable('bonus_balance') && !isset(result.bonus_balance))){
        //Странно, json не вернул то, что надо, придется из html вырезать
        var html = AnyBalance.requestGet(baseurl + 'bonus/account/');
        getParam(html, result, 'bonus_balance', /Бонусный счет:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    }

    if(AnyBalance.isAvailable('internet_total', 'internet_up', 'internet_down')){
        info = AnyBalance.requestGet(baseurl + "statistics/inet_statistics");
        var $info = $(info);
        if(AnyBalance.isAvailable('internet_total', 'internet_down')){
            var val = $info.find('table.streifig tr:nth-child(2) th:nth-child(2)').text();
            if(val)
                result.internet_down = Math.round(parseFloat(val)/1024*100)/100; //Переводим в Гб с двумя точками после запятой
        }
        if(AnyBalance.isAvailable('internet_total', 'internet_up')){
            var val = $info.find('table.streifig tr:nth-child(2) th:nth-child(3)').text();
            if(val)
                result.internet_up = Math.round(parseFloat(val)/1024*100)/100; //Переводим в Гб с двумя точками после запятой
        }
        if(AnyBalance.isAvailable('internet_total')){
            if(result.internet_down && result.internet_up)
                result.internet_total = result.internet_down + result.internet_up;
        }
    }
    
    AnyBalance.setResult(result);
}

