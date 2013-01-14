/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает сумму штрафов и их количество с сайта госуслуг татарстана https://uslugi.tatar.ru

Сайт оператора: https://uslugi.tatar.ru
Личный кабинет: https://uslugi.tatar.ru/user/login
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    if(!prefs.plate || !/^[\w\d]\d\d\d\w\w\d{2,3}$/i.test(prefs.plate))
        throw new AnyBalance.Error('Введите номер машины в формате cXXXccRR для автомобиля или XXXXccRR для мотоцикла, где с - буква, X - цифра, RR - номер региона (2 или 3 цифры).');
    if(!prefs.sr)
        throw new AnyBalance.Error('Введите последние 6 цифр номера свидетельства о регистрации.');
    
    var baseurl = "https://uslugi.tatar.ru/";
    var html = AnyBalance.requestGet(baseurl + 'user/login');

    var form = getParam(html, null, null, /<form[^>]+id="login-form"[^>]*>([\s\S]*?)<\/form>/i, null, html_entity_decode);
    if(!form)
        throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');

    var params = createFormParams(form, function(params, str, name, value){
        if(/phone_number/i.test(name))
            return prefs.login;
        if(/password/i.test(name))
            return prefs.password;
        if(/remember_me/i.test(name))
            return '0';
        return value;
    });

    html = AnyBalance.requestPost(baseurl + 'user/login', params);

    //AnyBalance.trace(html);
    if(!/\/user\/logout/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]*id=["']error_explanation[^>]*>([\s\S]*?)<\/div>/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var isAuto = /^\w/.test(prefs.plate);
    var number = getParam(prefs.plate, null, null, /^[\w\d]\d\d\d\w\w/);
    var region = getParam(prefs.plate, null, null, /(\d+)$/);

    html = AnyBalance.requestPost(baseurl + 'gibdd/fines/fines', {
        findType:'car',
        type_ts:isAuto ? 'auto' : 'moto',
        number:number,
        region:region,
        doc_nm:prefs.sr,
        find_protocol_region:'',
        find_protocol_series:'',
        find_protocol_number:'',
        find_protocol_date:''
    }); 

    var error = getParam(html, null, null, /<div[^>]*id=["']error_explanation[^>]*>([\s\S]*?)<\/div>/, replaceTagsAndSpaces, html_entity_decode);
    if(error)
        throw new AnyBalance.Error(error);

    var finesTable = getParam(html, null, null, /<table[^>]*class="extra-table"[^>]*>([\s\S]*?)<\/table>/i) || '';

    var result = {success: true};

    getParam(html, result, 'count', /Найдено\s*(\d+)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'balance', /штраф[^<]*?на сумму ([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    sumParam(finesTable, result, 'lastdate', /<tr[^>]*>\s*(?:(?:[\s\S](?!<\/tr))*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate, aggregate_max);
    sumParam(finesTable, result, 'firstdate', /<tr[^>]*>\s*(?:(?:[\s\S](?!<\/tr))*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate, aggregate_min);

    AnyBalance.setResult(result);
}
