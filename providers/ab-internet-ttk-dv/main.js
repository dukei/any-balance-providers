/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у оператора интернет ТТК-Дальний восток.

Сайт оператора: http://ttkdv.ru
Личный кабинет: https://ui.ttkdv.ru
*/

function parseTrafficGb(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    val = Math.round(val/1024*100)/100; //Перевели в Гб с двумя знаками после запятой
    AnyBalance.trace('Parsing traffic (' + val + ') from: ' + text);
    return val;
}

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://ui.ttkdv.ru";
    
    var html = AnyBalance.requestGet(baseurl);
    var login_name = getParam(html, null, null, /(login_remote\w+)/i);
    var pass_name = getParam(html, null, null, /(password_remote\w+)/i);

    if(!login_name || !pass_name)
      throw new AnyBalance.Error('Не удалось найти форму входа в личный кабинет!');

    var params = {
        anlijr: 0,
        bnlijr: true,
        redirect: '',
        'action.remote_login.5klijr.x':26,
        'action.remote_login.5klijr.y':5
    };

    params[login_name] = prefs.login;
    params[pass_name] = prefs.password;

    var html = AnyBalance.requestPost(baseurl + '/login', params);

    if(!/>Выход</i.test(html)){
        var error = getParam(html, null, null, /<font [^>]*class="error"[^>]*>([\s\S]*?)<\/font>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Сайт изменен?");
    }

    var result = {success: true};

    getParam(html, result, 'userName', /<!-- Наименование клиента -->[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'licschet', /<!-- Список ЛС клиента -->[\s\S]*?<option[^>]*selected[^>]*>([\s\S]*?)<\/option>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Итого на [\s\S]*?<td[^>]*><b>([^<]*)/i, replaceTagsAndSpaces, parseBalance);

    var href = getParam(html, null, null, /<a href=["']([^'"]+)["'][^>]*>\s*услуги\s*<\/a>/i);
    if(!href)
        AnyBalance.trace('Не удалось найти ссылку на услуги');
    if(href){
	html = AnyBalance.requestGet(baseurl + href);
        href = getParam(html, null, null, /<a href=["']([^'"]+)["'][^>]*>\s*Услуга IP\s*<\/a>/i);
        if(!href)
            AnyBalance.trace('Не удалось найти ссылку на услугу IP');
        if(href){
	    html = AnyBalance.requestGet(baseurl + href);
            getParam(html, result, '__tariff', /<a[^>]*href=["'][^'"]+&columnNumber=2["'][^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
            if(AnyBalance.isAvailable('trafficIn', 'trafficOut')){
                href = getParam(html, null, null, /<a href=["']([^'"]+&columnNumber=1)["'][^>]*/i);
                if(!href)
                   AnyBalance.trace('Не удалось найти ссылку на трафик');
                if(href){
                    html = AnyBalance.requestGet(baseurl + href);
                    var form = getParam(html, null, null, /<!-- Информация по выбранному сервису -->[\s\S]*?<form[^>]*>([\s\S]*?)<\/form>/i);
                    if(!form)
                        AnyBalance.trace('Не удалось найти форму для запроса трафика');
                    else{
                        var period = getParam(form, null, null, /Диапазон[\s\S]*?<select[^>]+name="([^"]*)/i, null, html_entity_decode);
                        var group = getParam(form, null, null, /Группировка[\s\S]*?<select[^>]+name="([^"]*)/i, null, html_entity_decode);
                        var params = createFormParams(form, function(params, str, name, value){
                            if(name == period)
                                return 2;
                            if(name == group)
                                return 3;
                            return value;
                        });
                        var image = getParam(form, null, null, /<input[^>]+type=['"]image[^>]+name=['"]([^'"]*)[^>]*title=['"]Обновить/i, null, html_entity_decode);
                        params[image + '.x'] = 20;
                        params[image + '.y'] = 9;

                        html = AnyBalance.requestPost(baseurl + '/webUserLogin', params);
                        getParam(html, result, 'trafficIn', /Итого:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficGb);
                        getParam(html, result, 'trafficOut', /Итого:(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficGb);
                    }
                }
            }
        }
    }

    AnyBalance.setResult(result);
}
