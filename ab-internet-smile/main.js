/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию о балансе, рекомендуемой оплате, абон. плате,
бонусах, трафике на интернет-тарифах мультисервисной сети Смайл.

Сайт оператора: http://www.smile-net.ru
Личный кабинет: http://user.smile-net.ru/newpa/
*/

function main () {
    var prefs = AnyBalance.getPreferences ();
    var baseurl = 'http://user.smile-net.ru/newpa/';

    if (!prefs.login || prefs.login == '')
        throw new AnyBalance.Error ('Введите логин');

    if (!prefs.password || prefs.password == '')
        throw new AnyBalance.Error ('Введите пароль');

    AnyBalance.trace ('Trying to enter selfcare at address: ' + baseurl);
    var html = AnyBalance.requestPost (baseurl, {
        login: prefs.login,
        password: prefs.password,
        handler: 'Login'
    });

    var regexp=/<title>\s*Авторизация\s*<\/title>/i;
    var res = regexp.exec (html);
    if (res)
        throw new AnyBalance.Error ('Неверный логин или пароль');

    // Проверка на корректный вход
    regexp = /<title>\s*Общая\s*информация\s*пользователя\s*\d*\s*<\/title>/;
    if (regexp.exec (html))
        AnyBalance.trace ('It looks like we are in selfcare...');
    else {
        AnyBalance.trace ('Have not found logOff... Unknown error. Please contact author.');
        throw new AnyBalance.Error ('Неизвестная ошибка. Пожалуйста, свяжитесь с автором.');
    }
    var result = {success: true};

    // ФИО
    getParam (html, result, 'customer', /handler=Customer[^>]*>([^<]+)/i);

    // Номер договора
    getParam (html, result, 'contract', /Номер\s*договора.*?class="value".*?>(\d+)/i, [], parseInt);

    // Баланс
    getParam (html, result, 'balance', /Баланс.*?class="value".*?>(-?\d+\.?\d*)/i, [], parseFloat);

    // К оплате
    getParam (html, result, 'payment', /К оплате.*?class="value".*?>(-?\d+\.?\d*)/i, [], parseFloat);

    // Абонентская плата
    getParam (html, result, 'licenseFee', /абон\.\s*плата\s*(-?\d+\.?\d*)/i, [], parseFloat);

    // Дата окончания рассчетного периода
    getParam (html, result, 'dateEndSettlementDays', /Дата\s*окончания\s*рассчетного\s*периода.*?class="value".*?>(\d{2}\.\d{2}\.\d{4}\s*\d{2}:\d{2})/i, [/(\d*).(\d*).(\d*)/, '$3/$2/$1'], Date.parse);

    // Тариф
    getParam (html, result, '__tariff', /Название текущего тарифного плана.*?class="value".*?>([^<]*)/i);

    // Статус
    getParam (html, result, 'status', /Статус.*?class="value".*?>(?:<[^>]*>|)([^<]*)/i);


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
        getParam (html, result, 'trafLimit', /Осталось бесплатного трафика.*?class="value".*?>([\d\.]+)/, null, parseFloat);
        
        // Входящий трафик
        getParam (html, result, 'trafIn', /Входящий трафик.*?class="value".*?>([\d\.]+)/, null, parseFloat);
    
        // Исходящий трафик
        getParam (html, result, 'trafOut', /Исходящий трафик.*?class="value".*?>([\d\.]+)/, null, parseFloat);
      
    }
    
    if (AnyBalance.isAvailable ('trafIn', 'trafOut') && result.trafIn === undefined && result.trafOut === undefined) {
        var dt = new Date();
        var year = dt.getFullYear(),
          month = dt.getMonth()+1,
          newYear = month == 12 ? year+1 : year,
          newMonth = month == 12 ? 1 : month + 1;
          
        AnyBalance.trace ('Fetching traffic info...');
        html = AnyBalance.requestPost (baseurl + '?handler=TrafficStat', {
          begin_date: '01.' + month + '.' + year,
          end_date: '01.' + newMonth + '.' + newYear
        });
        
        AnyBalance.trace ('Parsing traffic info...');
    
        // Входящий трафик
        getParam (html, result, 'trafIn', /Входящий[\s\S]*?>([\d\.]+)</i, null, parseFloat);
    
        // Исходящий трафик
        getParam (html, result, 'trafOut', /Исходящий[\s\S]*?>([\d\.]+)</i, null, parseFloat);
    }


    AnyBalance.setResult(result);
}
