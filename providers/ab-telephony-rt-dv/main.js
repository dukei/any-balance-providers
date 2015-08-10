/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток и другие параметры у дальневосточного провайдера проводной телефонии Ростелеком

Сайт оператора: http://dv.rt.ru/
Личный кабинет: https://cabinet.dv.rt.ru
*/

function main(){
    var prefs = AnyBalance.getPreferences();

    throw new AnyBalance.Error('Кабинет отменен Ростелекомом - все данные перенесены в Единый кабинет Ростелеком (https://kabinet.rt.ru). В этом кабинете надо зарегистрироваться заново и пользоваться соответствующим провайдером: Ростелеком (Единый кабинет).');

    var baseurl = "https://cabinet.dv.rt.ru/";
    AnyBalance.setDefaultCharset('utf-8');

    var html = AnyBalance.requestGet(baseurl + 'select_region/' + prefs.region);

    var form_build_id = getParam(html, null, null, /<input[^>]+name="form_build_id"[^>]*value="([^"]*)/i, null, html_entity_decode);

    if(!form_build_id)
        throw new AnyBalance.Error('Не удаётся найти форму входа. Сайт изменен?');

    if(prefs.prefix){
        //Вход по телефону
        html = AnyBalance.requestPost(baseurl + 'issa_login', {
            city_code:prefs.prefix,
            phone_bill:prefs.login,
            pin_code:prefs.password,
            op:'Войти',
            dept_id:prefs.region, 
            type:'phone',
            form_build_id:form_build_id,
            form_id:'issa_user_login_form'
        });
    }else{
        //Вход по лицевому счету
        html = AnyBalance.requestPost(baseurl + 'issa_login/bill', {
            phone_bill:prefs.login,
            pin_code:prefs.password,
            op:'Войти',
            dept_id:prefs.region, 
            type:'bill',
            form_build_id:form_build_id,
            form_id:'issa_user_login_form'
        });
    }

    if(!/issa_logout/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+warning[^>]*>([\s\S]*?)<div[^>]+msg_type="popup"[^>]*>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Неправильный логин-пароль?');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /<td[^>]*>Итого[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'licschet', /<div[^>]*id="user-account"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'fio', /<h1[^>]*class="username"[^>]*>([\s\S]*?)<\/h1>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'address', /<h1[^>]+class="username"[^>]*>[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);

    getParam(html, result, 'phone', /<span[^>]*id="menuPhone"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    sumParam(html, result, '__tariff', /<span[^>]*id="menuLocalTariff"[^>]*>([\s\S]*?)<\/span>/i, [replaceTagsAndSpaces, /^/, 'Тф: '], html_entity_decode, aggregate_join);
    getParam(html, result, 'ic_vendor', /<span[^>]*id="menuIntercityVendor"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'ic_tariff', /<span[^>]*id="menuIntercityTariff"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);

    sumParam(html, result, '__tariff', /<span[^>]*id="menuDslTariff"[^>]*>([\s\S]*?)<\/span>/i, [replaceTagsAndSpaces, /^/, 'Инт: '], html_entity_decode, aggregate_join);
    getParam(html, result, 'ilogin', /<span[^>]*id="menuDslLogins"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'iabon', /<span[^>]*id="menuDslAbonCharge"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);

    sumParam(html, result, '__tariff', /<span[^>]*id="menuConvertTariff"[^>]*>([\s\S]*?)<\/span>/i, [replaceTagsAndSpaces, /^/, 'ТВ: '], html_entity_decode, aggregate_join);
    getParam(html, result, 'tvid', /<span[^>]*id="menuTVi"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'tvabon', /<span[^>]*id="menuTViAbonCharge"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);

    //getRegions(result);

    AnyBalance.setResult(result);
}

function getRegions(result){
    var html = AnyBalance.requestGet("https://cabinet.dv.rt.ru/", {'Cookie': null});
    var re = /<a[^>]+href="\/select_region\/(\d+)">([^<]*)<\/a>/ig, matches;
    var ids = [], names = [];
    while(matches = re.exec(html)){
        ids.push(matches[1]);
        names.push(matches[2]);
    }
    result.entries = names.join('|');
    result.entryValues = ids.join('|');
}