﻿/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function createParamsArray(params){
    var a = [];
    for(var i in params)
        a[a.length] = encodeURIComponent(i) + '=' + encodeURIComponent(params[i]);
    return a;
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://stat.netis.ru/";

    var html = requestPostMultipart(baseurl + 'login.pl', {
        user:prefs.login,
        password:prefs.password,
        submit: 'Вход',
        'return': baseurl + 'index.pl'
    });

    //AnyBalance.trace(html);
    if(!/\?mode=logout/.test(html)){
        var error = getParam(html, null, null, /<p[^>]*class="error"[^>]*>([\s\S]*?)<\/p>/, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /Баланс лицевого счёта:\s*<b[^>]*>([\S\s]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'licschet', /Лицевой счёт:\s*(\d+)/i, replaceTagsAndSpaces);
    getParam(html, result, 'agreement', /Номер договора:\s*<i[^>]*>([\S\s]*?)<\/i>/i, replaceTagsAndSpaces);

    html = AnyBalance.requestGet(baseurl + "view/contr_srv.pl");

    getParam(html, result, '__tariff', /Выделенный доступ(?:[\S\s]*?<td[^>]*>){3}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces);

    if(AnyBalance.isAvailable('traffic')){
        html = AnyBalance.requestGet(baseurl + 'view/consume.pl');
        var form = getParam(html, null, null, /<form[^>]*name="form">([\s\S]*?)<\/form>/i);

        var params = createFormParams(form, function(params, str, name, value){
            if(/type="submit"/i.test(str) && name != 'showsum')
                return;
            if(name == 'tax')
                return;
            return value;
        });

        html = AnyBalance.requestGet(baseurl + 'view/consume.pl?' + createParamsArray(params).join('&'));

       getParam(html, result, 'traffic', /Всего[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficGb);
    }
    
    AnyBalance.setResult(result);
}