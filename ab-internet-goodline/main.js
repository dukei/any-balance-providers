/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для кузбасского интернет-провайдера GoodLine

Сайт оператора: http://goodline.info/
Личный кабинет: https://stat.eltc.ru
*/

function parseTrafficGb(str){
	var val = getParam(str.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
	return parseFloat((val/1024).toFixed(2));
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('windows-1251');

    var baseurl = "https://stat.eltc.ru/";

    var html = AnyBalance.requestPost(baseurl + 'users/auth', {
        login:prefs.login,
        password:prefs.password,
        remember:0,
        submit:'Войти в систему'
    });

    //AnyBalance.trace(html);
    if(!/\/users\/exit/.test(html)){
        var error = getParam(html, null, null, /<span[^>]*class=["']text-suspend[^>]*>([\s\S]*?)<\/span>/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        error = getParam(html, null, null, /jGrowl\s*\(\s*'([^']*)/, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /Текущее состояние счета[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'pay', /Рекомендуемый платеж[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'status', /Статус[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'agreement', /Номер договора[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    //Получаем таблицу услуг
    var table = getParam(html, null, null, /<table[^>]+class="my-service-info"[^>]*>([\S\s]*?)<\/table>/i);
    if(table){
        var tariff = [];
        //вычленяем тарифные планы из таблицы услуг
        table.replace(/<tr[^>]*>[\s\S]*?<\/tr>/ig, function(str){
            //получаем тариф текущей услуги
            var t = getParam(str, null, null, /(?:[\s\S]*?<td[^>]*>){2}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
            if(t)
                 tariff[tariff.length] = t;
        });
        result.__tariff = tariff.join(', ');
    }else{
        AnyBalance.trace('Не удалось найти таблицу подключенных услуг');
    }

    if(AnyBalance.isAvailable('trafficInter', 'trafficIntra')){
        var html = AnyBalance.requestGet(baseurl + 'statistics/internet');

       getParam(html, result, 'trafficInter', /Интернет за месяц[\s\S]*?Итого[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficGb);
       getParam(html, result, 'trafficIntra', /Интернет за месяц[\s\S]*?Итого(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficGb);
    }
    
    AnyBalance.setResult(result);
}