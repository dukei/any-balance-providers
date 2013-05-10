/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс, остаток дней и статус у интернет-провайдера NetByNet.

Сайт провайдера: http://www.netbynet.ru/
Личный кабинет: http://stat.netbynet.ru/
*/

var g_regions = {
    voronezh: mainVoronezh,
    belgorod: mainBelgorod,
    center: mainCenter,
    orel: mainBelgorod,
    oskol: mainBelgorod,
    lipetsk: mainBelgorod,
};

function main(){
    var prefs = AnyBalance.getPreferences();

    if (!prefs.login || prefs.login == '')
        throw new AnyBalance.Error ('Введите логин');

    if (!prefs.password || prefs.password == '')
        throw new AnyBalance.Error ('Введите пароль');

    var func = g_regions[prefs.region] || g_regions.center;
    var region = (g_regions[prefs.region] && prefs.region) || 'center';
    AnyBalance.trace("region: " + region);
    func(region);
}

function mainCenter(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://stat.netbynet.ru/';

    AnyBalance.trace ("Trying to enter selfcare at address: " + baseurl);
    var html = AnyBalance.requestPost (baseurl + "main", {
    	login: prefs.login,
        password: prefs.password
    });

    if(!/logout/i.test(html)){
        var error = getParam(html, null, null, /class="error"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
        if (error){
            throw new AnyBalance.Error (error);
        }
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }


    AnyBalance.trace ("It looks like we are in selfcare...");

    var result = {success: true};

    AnyBalance.trace("Parsing data...");

    // Тарифный план
    // Тариф выцепить сложно, пришлось ориентироваться на запись после остатка дней
    value = html.match (/Осталось[\s\S]*?<td>(.*?)<\/td>/i);
    if (value && value[1].indexOf ('нет') == -1)
      result.__tariff = value[1];

    // Баланс
    getParam (html, result, 'balance', /<span[^>]+class="balance"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);

    // Абонент
    getParam (html, result, 'subscriber', /Абонент[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);

    // Номер договора
    getParam (html, result, 'contract', /Договор([^<(]*)/i, replaceTagsAndSpaces, html_entity_decode);

    // Расчетный период - остаток
    getParam (html, result, 'day_left', /Осталось[^\d]*([\d]+)/i, replaceTagsAndSpaces, parseBalance);

    //Таблица с тарифными планами
    var table = getParam(html, null, null, /<table[^>]*>(?:[\s\S](?!<\/table>))*?<th[^>]*>Договор(?:[\s\S](?!<\/table>))*?<th[^>]*>Текущий тариф[\s\S]*?<\/table>/i);
    if(table){
        getParam(table, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        // Статус
        getParam(table, result, 'status', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    }else{
        AnyBalance.trace('Не удалось найти таблицу с тарифным планом. Сайт изменен?');
    }

    if (AnyBalance.isAvailable ('promised_payment')) {

        AnyBalance.trace ("Fetching stats...");

        html = AnyBalance.requestGet(baseurl + "stats");

        AnyBalance.trace("Parsing stats...");

        // Обещанные платежи
        var promised_payments = html.match (/<li>.*?История обещанных платежей[\s\S]*?<li>/i);
        if (promised_payments) {
            getParam (promised_payments[0], result, 'promised_payment', /<tr>(?:[\s\S]*?< *td *>){5}[^\d]*(\d+\.?\d*)/i, [], parseFloat);
        }
    }

//    AnyBalance.requestGet (baseurl + "logout");


    AnyBalance.setResult(result);
}

function mainVoronezh(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://selfcare.puzzle.su/voronezh/index.php';

    AnyBalance.trace ("Trying to enter selfcare at address: " + baseurl);
    var html = requestPostMultipart (baseurl + "?", {
    	'pr[form][auto][form_save_to_link]': 0,
    	'pr[form][auto][login]': prefs.login,
    	'pr[form][auto][password]': prefs.password,
    	'pr[form][auto][form_event]': 'Войти'
    }, {'Accept-Charset': 'windows-1251'});

    if(!/\?exit=1/i.test(html)){
        var error = getParam (html, null, null, /<font[^>]+color=['"]red['"][^>]*>([\s\S]*?)<\/font>/i, replaceTagsAndSpaces);
        if (error){
            throw new AnyBalance.Error (error);
        }
        throw new AnyBalance.Error ("Не удаётся войти в личный кабинет. Сайт изменен?");
    }

    AnyBalance.trace ("It looks like we are in selfcare...");

    var result = {success: true};

    html = AnyBalance.requestGet(baseurl + '?pr%5Bcontrol%5D%5Bkernel%5D%5Brecord%5D=23&pr%5Bcontrol%5D%5Bkernel%5D%5Bparent%5D=19&menu=19');

    AnyBalance.trace("Parsing data...");

    // Баланс
    getParam (html, result, 'balance', /Лицевой счет:[\s\S]*?баланс:([\s\S]*?)<br/i, replaceTagsAndSpaces, parseBalance);

    // Абонент
    getParam (html, result, 'subscriber', /Приветствуем Вас,([^<]*)/i, replaceTagsAndSpaces);

    // Номер договора
    getParam (html, result, 'contract', /Лицевой счет:([\s\S]*?),/i, replaceTagsAndSpaces);

    // Расчетный период - остаток
    getParam (html, result, 'day_left', /До списания абонентской платы осталось:([\s\S]*?)<br/i, replaceTagsAndSpaces, parseBalance);

    // Бонусный баланс 
    getParam (html, result, 'bonus_balance', /Бонусный счет[\s\S]*?Баланс:([\s\S]*?)<br/i, replaceTagsAndSpaces, parseBalance);

    sumParam(html, result, '__tariff', /Тарифный план:([\s\S]*?)(?:<\/span>|<a)/i, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
    // Бонусный статус
    sumParam (html, result, '__tariff', /(<strong[^>]*>\s*Бонусный счет[\s\S]*?)Баланс/i, replaceTagsAndSpaces, html_entity_decode, aggregate_join);

    AnyBalance.setResult(result);
}

function mainBelgorod(region){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('windows-1251');
    var baseurl = 'https://selfcare.puzzle.su/'+region+'/';

    AnyBalance.trace ("Trying to enter selfcare at address: " + baseurl);
    var html = requestPostMultipart (baseurl + "?", {
    	'LOGIN': prefs.login,
    	'PASSWD': prefs.password,
    	'URL': 'selfcare.puzzle.su',
    	'subm.x': 31,
    	'subm.y': 4
    });

    if(!/\?exit=1/i.test(html)){
        var error = getParam (html, null, null, /<font[^>]+color=['"]red['"][^>]*>([\s\S]*?)<\/font>/i, replaceTagsAndSpaces);
        if (error){
            throw new AnyBalance.Error (error);
        }
        throw new AnyBalance.Error ("Не удаётся войти в личный кабинет. Сайт изменен?");
    }

    AnyBalance.trace ("It looks like we are in selfcare...");

    var result = {success: true};

    html = AnyBalance.requestGet(baseurl + '?pr%5Bcontrol%5D%5Bkernel%5D%5Brecord%5D=23&pr%5Bcontrol%5D%5Bkernel%5D%5Bparent%5D=19&menu=19');

    AnyBalance.trace("Parsing data...");

    // Баланс
    getParam (html, result, 'balance', /<b[^>]*>Лицевой счет:[\s\S]*?баланс:([\s\S]*?)<br/i, replaceTagsAndSpaces, parseBalance);

    // Абонент
    getParam (html, result, 'subscriber', /Приветствуем Вас,([^<]*)/i, replaceTagsAndSpaces);

    // Номер договора
    getParam (html, result, 'contract', /<b[^>]*>Лицевой счет:([\s\S]*?),/i, replaceTagsAndSpaces);

    // Расчетный период - остаток
    getParam (html, result, 'day_left', /(?:Количество дней до ухода в финансовую блокировку|До списания абонентской платы осталось):([\s\S]*?)<br/i, replaceTagsAndSpaces, parseBalance);

    // Бонусный баланс 
    getParam (html, result, 'bonus_balance', /Баланс:([\s\S]*?)\s*балл/i, replaceTagsAndSpaces, parseBalance);

    sumParam(html, result, '__tariff', /Тарифный план:([\s\S]*?)(?:<\/span>|<a)/i, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
    // Бонусный статус
    sumParam (html, result, '__tariff', /(<strong[^>]*>\s*Бонусный счет[\s\S]*?)Баланс/i, replaceTagsAndSpaces, html_entity_decode, aggregate_join);

    // Статус договора 
    getParam (html, result, 'status', /Текущий статус договора:([\s\S]*?)<br/i, replaceTagsAndSpaces, html_entity_decode);
    getParam (html, result, 'abonday', /Суточная абонентская плата:([\s\S]*?)<br/i, replaceTagsAndSpaces, parseBalance);
    getParam (html, result, 'abon', /Ежемесячная абонентская плата:([\s\S]*?)<br/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}

