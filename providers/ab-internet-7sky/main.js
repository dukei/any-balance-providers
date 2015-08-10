/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у одинцовского интернет-провайдера Seventh Sky.

Сайт оператора: http://www.seven-sky.net/
Личный кабинет: https://stat.7-sky.info/
*/

function main(){
	throw new AnyBalance.Error("Данный провайдер является дубликатом провайдера \"Seven Sky (Москва)\", найдите данного провайдера в каталоге и установите.");
	
    var prefs = AnyBalance.getPreferences();

    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://stat.7-sky.info/cgi-bin/clients/";

    var html = AnyBalance.requestPost(baseurl + 'login', {
        action:'validate',
        login:prefs.login,
        password:prefs.password,
        submit:'Вход'
    });

    //AnyBalance.trace(html);

    if(!/action=logout/i.test(html)){
        var error = getParam(html, null, null, /<span[^>]+style="[^"]*color\s*:\s*#101010[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Личный кабинет изменился или проблемы на сайте.");
    }
  
    var result = {success: true};

    var sid = getParam(html, null, null, /session_id=([0-9a-f]{32,})/i);

    getParam(html, result, 'balance', /Ваш баланс:[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'licschet', /счет N([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);

    html = AnyBalance.requestGet(baseurl + 'deal_account?action=menu_services&session_id='+sid);
    getParam(html, result, 'prihod', /Сумма платежей:[\s\S]*?<table[^>]+class="data"(?:[\s\S]*?<td[^>]*>){2}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    var url = getParam(html, null, null, /<a[^>]+href="\/cgi-bin\/clients\/([^"]*)[^>]*>Доступ к сети Интернет/i, null, html_entity_decode);
    if(url){
        html = AnyBalance.requestGet(baseurl + url);

        getParam(html, result, '__tariff', /Тарифный план:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
/*        
        if(AnyBalance.isAvailable('trafficIn', 'trafficOut')){
            html = AnyBalance.requestGet(baseurl + "?action=ShowLoginsBalance&mid=1&module=dialup&contractId="+contractId);
            getParam(html, result, 'trafficIn', /Итого:(?:[\s\S]*?<td[^>]*>){4}([^<]*)/i, replaceTagsAndSpaces, parseTrafficGb);
            getParam(html, result, 'trafficOut', /Итого:(?:[\s\S]*?<td[^>]*>){5}([^<]*)/i, replaceTagsAndSpaces, parseTrafficGb);
        }
*/
    }else{
        AnyBalance.trace('Не удаётся получить ссылку на услугу доступа к интернету');
    }

    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

