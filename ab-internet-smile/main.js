/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию о балансе, рекомендуемой оплате, абон. плате,
бонусах, трафике на интернет-тарифах мультисервисной сети Смайл.

Сайт оператора: http://www.smile-net.ru
Личный кабинет: http://user.smile-net.ru/newpa/
*/

function main () {
    var prefs = AnyBalance.getPreferences ();
    var baseurl = 'https://user.smile-net.ru/newpa/';

    if (!prefs.login || prefs.login == '')
        throw new AnyBalance.Error ('Введите логин');

    if (!prefs.password || prefs.password == '')
        throw new AnyBalance.Error ('Введите пароль');

    AnyBalance.trace ('Trying to enter selfcare at address: ' + baseurl);
    var html = AnyBalance.requestPost (baseurl + '?handler=Login', {
        login: prefs.login,
        password: prefs.password,
        handler: 'Login'
    });

    // Проверка на корректный вход
    if (/\?handler=Login&amp;out=out/.test(html))
        AnyBalance.trace ('It looks like we are in selfcare...');
    else {
        var regexp=/<title>\s*Авторизация\s*<\/title>/i;
        var res = regexp.exec (html);
        if (res)
            throw new AnyBalance.Error ('Неверный логин или пароль');

        AnyBalance.trace ('Have not found logOff... Unknown error. Please contact author.');
        throw new AnyBalance.Error ('Не удалось зайти в личный кабинет. Неизвестная ошибка. Пожалуйста, свяжитесь с автором.');
    }
    var result = {success: true};

    // ФИО
    getParam (html, result, 'customer', /handler=Customer[^>]*>([^<]+)/i);

    // Номер договора
    getParam (html, result, 'contract', />\s*Номер лицевого счета\s*<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

    // Баланс
    getParam (html, result, 'balance', />\s*Баланс\s*<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    // К оплате
    getParam (html, result, 'payment', />\s*К оплате\s*<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    // Абонентская плата
    getParam (html, result, 'licenseFee', /абон\.\s*плата\s*(-?\d+\.?\d*)/i, null, parseBalance);

    // Дата окончания рассчетного периода
    getParam (html, result, 'dateEndSettlementDays', />\s*Дата окончания расчетного периода\s*<[\s\S]*?<td[^>]*>([\s\S]*?)(?:дата начала|<\/td>)/i, replaceTagsAndSpaces, parseDate);

    // Тариф
    getParam (html, result, '__tariff', />\s*Название текущего тарифа\s*<[\s\S]*?<td[^>]*>([\s\S]*?)(?:\(|<\/td>)/i, replaceTagsAndSpaces);

    // Статус
    getParam (html, result, 'status', />\s*Статус\s*<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);


    if (AnyBalance.isAvailable ('bonus')) {

        AnyBalance.trace ('Fetching payments...');

        html = AnyBalance.requestGet (baseurl + '?handler=Payments');

        AnyBalance.trace ('Parsing payments...');
    
        // Бонусы
        getParam (html, result, 'bonus', /Бонусы и компенсации: (\d+\.?\d*)/, [], parseFloat);
    }

    
    if(AnyBalance.isAvailable('trafLimit','trafIn','trafOut')){
        html = AnyBalance.requestGet (baseurl + '?handler=ConnectInfo');
        
        // Лимит
        getParam (html, result, 'trafLimit', />\s*Осталось бесплатного трафф?ика\s*<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        
        // Входящий трафик
        getParam (html, result, 'trafIn', />\s*Входящий трафф?ик\s*<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    
        // Исходящий трафик
        getParam (html, result, 'trafOut', />\s*Исходящий трафф?ик\s*<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
      
    }
    
    if (AnyBalance.isAvailable ('trafIn', 'trafOut') && (result.trafIn === undefined || result.trafOut === undefined)) {
        var dt = new Date();
        var year = dt.getFullYear(),
          month = dt.getMonth()+1,
          newYear = month == 12 ? year+1 : year,
          newMonth = month == 12 ? 1 : month + 1;
          
        AnyBalance.trace ('Fetching traffic info...');
        html = AnyBalance.requestPost (baseurl + '?handler=TrafficStat', {
          begin_date: '01.' + month + '.' + year,
          end_date: '01.' + newMonth + '.' + newYear,
          process: 'process'
        });
        
        AnyBalance.trace ('Parsing traffic info...');
    
        // Входящий трафик
        getParam (html, result, 'trafIn', />\s*Входящий\s*<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    
        // Исходящий трафик
        getParam (html, result, 'trafOut', />\s*Исходящий\s*<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    }


    AnyBalance.setResult(result);
}
