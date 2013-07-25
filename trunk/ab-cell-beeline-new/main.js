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

function getBlock(url, html, name, exact){
    var formhtml = html;
    if(isArray(html)){  //Если массив, то разный хтмл для поиска блока и для формы
        formhtml = html[1];
        html = html[0];
    }

    var re = new RegExp("PrimeFaces\\.\\w+\\s*\\(\\s*\\{[^}]*update:\\s*'" + (exact ? "" : "[^']*:") + name);
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
    
    var form = getParam(formhtml, null, null, new RegExp('<form[^>]+name="' + formId + '"[\\s\\S]*?</form>', 'i'));
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
    data = getParam(html, null, null, new RegExp('<update[^>]*' + (exact ? 'id="' : '[^>]*:') + name + '"[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]></update>', 'i'));
    if(!data){
        AnyBalance.trace('Неверный ответ для блока ' + name + ': ' + html);
        return '';
    }
    return data;  
}

function myParseCurrency(text){
    var val = html_entity_decode(text).replace(/\s+/g, '').replace(/[\-\d\.,]+/g,'');
    AnyBalance.trace('Parsing currency (' + val + ') from: ' + text);
    return val;
}

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "https://my.beeline.ru/";
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + 'login.html', g_headers);

    var tform = getParam(html, null, null, /<form[^>]+name="loginFormB2C:loginForm"[^>]*>[\s\S]*?<\/form>/i);
    if(!tform){ //Если параметр не найден, то это, скорее всего, свидетельствует об изменении сайта или о проблемах с ним
        if(AnyBalance.getLastStatusCode() > 400){
            AnyBalance.trace("Beeline returned: " + AnyBalance.getLastStatusString());
            throw new AnyBalance.Error('Личный кабинет Билайн временно не работает. Пожалуйста, попробуйте позднее.');
        }
        throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
    }

    var params = createFormParams(tform);
    params['loginFormB2C:loginForm:login'] = prefs.login;
    params['loginFormB2C:loginForm:password'] = prefs.password;
    params['loginFormB2C:loginForm:passwordVisible'] = prefs.password;
    params['loginFormB2C:loginForm:loginButton'] = '';

    var action = getParam(tform, null, null, /<form[^>]+action="\/([^"]*)/i, null, html_entity_decode);

    //Теперь, когда секретный параметр есть, можно попытаться войти
    html = AnyBalance.requestPost(baseurl + (action || 'login.html'), params, addHeaders({Referer: baseurl + 'login.html'})); 

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

    if(/b2b_post/i.test(html)){
        fetchPost(baseurl, html);
    }else{
        fetchPre(baseurl, html);
    }
}

function fetchPost(baseurl, html){
    //Раз мы здесь, то мы успешно вошли в кабинет
    AnyBalance.trace("Мы в постоплатном кабинете");
    //Получаем все счетчики
    var result = {success: true};

    var multi = /<span[^>]+class="marked"[^>]*>/i.test(html), xhtml;

    getParam(html, result, 'phone', multi ? /<span[^>]+class="marked"[^>]*>([\s\S]*?)<\/span>/i : /<input[^>]+id="serviceBlock:paymentForm:[^>]*value="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'prebal', /ваша предварительная сумма по договору([\s\S]*?)<\/span><\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, ['currency', 'prebal'], /ваша предварительная сумма по договору([\s\S]*?)<\/span><\/span>/i, replaceTagsAndSpaces, parseBalance);

    if(!multi){
        xhtml = getBlock(baseurl + 'c/post/index.html', html, 'list-contents', true);
        getParam(xhtml, result, '__tariff', /<h2[^>]*>Текущий тариф([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
        
        getParam(xhtml, result, 'balance', /Расходы по номеру за текущий период с НДС[\s\S]*?<div[^>]+class="balan?ce-summ"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
        getParam(xhtml, result, ['currency', 'balance'], /Расходы по номеру за текущий период с НДС[\s\S]*?<div[^>]+class="balan?ce-summ"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, myParseCurrency);

    }else{
        //Если несколько номеров в кабинете, то почему-то баланс надо брать отсюда
        xhtml = getBlock(baseurl + 'c/post/index.html', html, 'homeBalance');
        getParam(xhtml, result, 'balance', /Расходы по номеру за текущий период с НДС[\s\S]*?<div[^>]+class="balan?ce-summ"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
        getParam(xhtml, result, ['currency','balance'], /Расходы по номеру за текущий период с НДС[\s\S]*?<div[^>]+class="balan?ce-summ"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, myParseCurrency);

        xhtml = getBlock(baseurl + 'c/post/index.html', html, 'loadingTariffDetails');
        getParam(xhtml, result, '__tariff', /<div[^>]+:tariffInfo[^>]*class="(?:current|tariff-info)"[^>]*>(?:[\s\S](?!<\/div>))*?<h2[^>]*>([\s\S]*?)<\/h2>/i, replaceTagsAndSpaces, html_entity_decode);
    }

    if(AnyBalance.isAvailable('sms_left', 'mms_left')){
        xhtml = getBlock(baseurl + 'c/post/index.html', html, 'loadingBonusesAndServicesDetails');
        xhtml = getBlock(baseurl + 'c/post/index.html', [xhtml, html], 'bonusesloaderDetails');
        getBonuses(xhtml, result);
    }

    if(AnyBalance.isAvailable('fio')){
        var xhtml = AnyBalance.requestGet(baseurl + 'm/post/index.html', g_headers);
        getParam(xhtml, result, 'fio', /<div[^>]+class="abonent-name"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        
    }

    //Возвращаем результат
    AnyBalance.setResult(result);

}

function fetchPre(baseurl, html){
    //Раз мы здесь, то мы успешно вошли в кабинет постоплатный
    AnyBalance.trace("Мы в предоплатном кабинете");
    //Получаем все счетчики
    var result = {success: true};

    getParam(html, result, 'phone', /<input[^>]+id="serviceBlock:paymentForm:[^>]*value="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);

    var xhtml = getBlock(baseurl + 'c/pre/index.html', html, 'currentTariffLoaderDetails');

    getParam(xhtml, result, '__tariff', /<div[^>]+:tariffInfo[^>]*class="current"[^>]*>(?:[\s\S](?!<\/div>))*?<h2[^>]*>([\s\S]*?)<\/h2>/i, replaceTagsAndSpaces, html_entity_decode);

    if(AnyBalance.isAvailable('balance', 'fio')){
        xhtml = getBlock(baseurl + 'c/pre/index.html', html, 'balancePreHeadDetails');
        getParam(xhtml, result, 'balance', /у вас на балансе([\s\S]*)/i, replaceTagsAndSpaces, parseBalance);
        getParam(xhtml, result, ['currency', 'balance'], /у вас на балансе([\s\S]*)/i, replaceTagsAndSpaces, myParseCurrency);
        getParam(xhtml, result, 'fio', /<span[^>]+class="b2c.header.greeting.pre.b2c.ban"[^>]*>([\s\S]*?)(?:<\/span>|,)/i, replaceTagsAndSpaces, html_entity_decode);
    }

    if(AnyBalance.isAvailable('sms_left', 'mms_left', 'rub_bonus', 'rub_opros', 'sek_bonus')){
        xhtml = getBlock(baseurl + 'c/pre/index.html', html, 'bonusesloaderDetails');
        getBonuses(xhtml, result);
    }

    //Возвращаем результат
    AnyBalance.setResult(result);
}

function getBonuses(xhtml, result){
    var services = sumParam(xhtml, null, null, /<tr[^>]*>\s*<td[^>]+class="title"(?:[\s\S](?!<\/tr>))*?<td[^>]+class="value"[\s\S]*?<\/tr>/ig);
    for(var i=0; i<services.length; ++i){
        var name = getParam(services[i], null, null, /<td[^>]+class="title"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        if(/SMS/i.test(name)){
            sumParam(services[i], result, 'sms_left', /<td[^>]+class="value"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
        }else if(/MMS/i.test(name)){
            sumParam(services[i], result, 'mms_left', /<td[^>]+class="value"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
        }else if(/Рублей БОНУС/i.test(name)){
            sumParam(services[i], result, 'rub_bonus', /<td[^>]+class="value"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
        }else if(/Рублей за участие в опросе/i.test(name)){
            sumParam(services[i], result, 'rub_opros', /<td[^>]+class="value"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
        }else if(/Секунд БОНУС\s*\+/i.test(name)){
            sumParam(services[i], result, 'min_bi', /<td[^>]+class="value"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
        }else if(/Секунд БОНУС-2/i.test(name)){
            sumParam(services[i], result, 'min_local', /<td[^>]+class="value"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
        }else{
            AnyBalance.trace("Неизвестная опция: " + services[i]);
        }
    }
}
