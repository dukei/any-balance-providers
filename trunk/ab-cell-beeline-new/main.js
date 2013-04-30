/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плате для сотового оператора xxxxxx 

Operator site: http://xxxxxx.ru
Личный кабинет: https://kabinet.xxxxxx.ru/login
*/

var g_headers = {
'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
'Connection':'keep-alive',
'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.31 (KHTML, like Gecko) Chrome/26.0.1410.64 Safari/537.31'
};

function getBlock(url, html, name){
    var re = new RegExp("PrimeFaces\\.\\w+\\s*\\(\\s*\\{[^}]*update:\\s*'[^']*:" + name);
    var data = getParam(html, null, null, re);
    if(!data){
        AnyBalance.trace('Блок ' + name + ' не найден!');
        return '';
    }

    var formId = getParam(data, null, null, /formId:\s*'([^']*)/, replaceSlashes);
    if(!formId){
        AnyBalance.trace('Не найден ID формы для блока ' + name + '!');
        return '';
    }

    var form = getParam(html, null, null, new RegExp('<form[^>]+name="' + formId + '"[\\s\\S]*?</form>', 'i'));
    if(!form){
        AnyBalance.trace('Не найдена форма ' + formId + ' для блока ' + name + '!');
        return '';
    }
    
    var params = createFormParams(form);
    var source = getParam(data, null, null, /source:\s*'([^']*)/, replaceSlashes);     
    var render = getParam(data, null, null, /update:\s*'([^']*)/, replaceSlashes);     

    params['javax.faces.partial.ajax'] = true;
    params['javax.faces.source'] = source;
    params['javax.faces.partial.execute'] = '@all';
    params['javax.faces.partial.render'] = render;
    params[render] = render;
    params[source] = source;

    html = AnyBalance.requestPost(url, params, addHeaders({Referer: url, 'Faces-Request':'partial/ajax', 'X-Requested-With':'XMLHttpRequest'}));
    data = getParam(html, null, null, new RegExp('<update[^>]*:' + name + '"[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]></update>', 'i'));
    if(!data){
        AnyBalance.trace('Неверный ответ для блока ' + name + ': ' + html);
        return '';
    }
    return data;  
}

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "https://my.beeline.ru/";
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + 'login.html', g_headers);

    var tform = getParam(html, null, null, /<form[^>]+name="loginFormB2c"[^>]*>([\s\S]*?)<\/form>/i);
    if(!tform) //Если параметр не найден, то это, скорее всего, свидетельствует об изменении сайта или о проблемах с ним
        throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');

    var params = createFormParams(tform);
    params['loginFormB2c:login'] = prefs.login;
    params['loginFormB2c:password'] = prefs.password;
    params['loginFormB2c:passwordVisible'] = prefs.password;
    params['loginFormB2c:loginButton'] = '';

    //Теперь, когда секретный параметр есть, можно попытаться войти
    html = AnyBalance.requestPost(baseurl + 'login.html', params, addHeaders({Referer: baseurl + 'login.html'})); 

    if(/<form[^>]+name="chPassForm"/i.test(html))
        throw new AnyBalance.Error('Вы зашли по временному паролю, требуется сменить пароль. Для этого войдите в ваш кабинет https://my.beeline.ru через браузер и смените там пароль. Новый пароль введите в настройки данного провайдера.');

    //После входа обязательно проверяем маркер успешного входа
    //Обычно это ссылка на выход, хотя иногда приходится искать что-то ещё
    if(!/logOutLink/i.test(html)){
        //Если в кабинет войти не получилось, то в первую очередь надо поискать в ответе сервера объяснение ошибки
        var error = getParam(html, null, null, /<span[^>]+class="ui-messages-error-summary"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        //Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    //Раз мы здесь, то мы успешно вошли в кабинет
    //Получаем все счетчики
    var result = {success: true};

    getParam(html, result, 'phone', /<input[^>]+id="serviceBlock:paymentForm:[^>]*value="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);

    var xhtml = getBlock(baseurl + 'c/pre/index.html', html, 'currentTariffLoaderDetails');
    getParam(xhtml, result, '__tariff', /<div[^>]+:tariffInfo[^>]*class="current"[^>]*>(?:[\s\S](?!<\/div>))*?<h2[^>]*>([\s\S]*?)<\/h2>/i, replaceTagsAndSpaces, html_entity_decode);

    if(AnyBalance.isAvailable('balance', 'fio')){
        xhtml = getBlock(baseurl + 'c/pre/index.html', html, 'balancePreHeadDetails');
        getParam(xhtml, result, 'balance', /у вас на балансе[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
        getParam(xhtml, result, 'currency', /у вас на балансе[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseCurrency);
        getParam(xhtml, result, 'fio', /<span[^>]+class="b2c.header.greeting.pre.b2c.ban"[^>]*>([\s\S]*?)(?:<\/span>|,)/i, replaceTagsAndSpaces, html_entity_decode);
    }

    if(AnyBalance.isAvailable('sms_left', 'mms_left')){
        xhtml = getBlock(baseurl + 'c/pre/index.html', html, 'bonusesloaderDetails');
        var services = sumParam(xhtml, null, null, /<tr[^>]*>\s*<td[^>]+class="title"(?:[\s\S](?!<\/tr>))*?<td[^>]+class="value"[\s\S]*?<\/tr>/ig);
        for(var i=0; i<services.length; ++i){
            var name = getParam(services[i], null, null, /<td[^>]+class="title"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
            if(/SMS/i.test(name)){
                sumParam(services[i], result, 'sms_left', /<td[^>]+class="value"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
            }else if(/MMS/i.test(name)){
                sumParam(services[i], result, 'mms_left', /<td[^>]+class="value"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
            }else{
                AnyBalance.trace("Неизвестная опция: " + services[i]);
            }
        }
    }

    //Возвращаем результат
    AnyBalance.setResult(result);
}
