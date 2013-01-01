/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для апрелевского интернет-провайдера Инфо-Связь (Апрелевка, МО)

Сайт оператора: http://www.info-svyaz.net/
Личный кабинет: https://stat.info-svyaz.net/
*/

function getTrafficGb(str){
  var val = parseBalance(str);
  if(isset(val))
      val = Math.round(val/1024/1024/1024*100)/100;
  AnyBalance.trace('Parsed traffic ' + val + 'Gb from ' + str);
  return val;
}

function main(){
    var prefs = AnyBalance.getPreferences();

    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://stat.info-svyaz.net/utm5/";
    var html = AnyBalance.requestPost(baseurl + 'index.php', {
        login: prefs.login,
        password: prefs.password
    });

    if(!/\?module=zz_logout/.test(html)){
        var error = getParam(html, null, null, /<p[^>]*style=['"]color:red['"][^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет! Сайт изменен?');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /Баланс[\s\S]*?<td[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'userName', /ФИО[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'licschet', /Основной лицевой счет[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'credit', /Кредит[\s\S]*?<td[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);

    var html = AnyBalance.requestGet(baseurl + '?module=40_tariffs');
    getParam(html, result, '__tariff', /<td[^>]*>Текущий ТП[\s\S]*?<td[^>]*class=['"]utm-cell['"][^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    if(AnyBalance.isAvailable('trafficIn', 'trafficOut')){
        AnyBalance.trace('Получение трафика... Че-то у них это тормозит. Если скорость важнее, отключите счетчик трафика');
        var now = new Date();
        var m = now.getMonth() + 1;
        var year = now.getFullYear();
        var date1 = Date.UTC(year, m-2, 1) / 1000 + now.getTimezoneOffset()*60;
        var date2 = Date.UTC(year, m-1, 1) / 1000 + now.getTimezoneOffset()*60;
        var html = AnyBalance.requestPost(baseurl + '?module=35_dhs_report', {
             date1:date1,
             date2:date2,
             month:0,
             year:0
       });

       getParam(html, result, 'trafficIn', /.>\s*Итого\s*<(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, getTrafficGb);
       getParam(html, result, 'trafficOut', /.>\s*Итого\s*<(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, getTrafficGb);
    }
    
    if(AnyBalance.isAvailable('payments')){
        var now = new Date();
        var m = now.getMonth() + 1;
        var year = now.getFullYear();
        var date1 = Date.UTC(year, m-1, 1) / 1000 + now.getTimezoneOffset()*60;
        var date2 = Date.UTC(year, m, 1) / 1000 + now.getTimezoneOffset()*60;
        var html = AnyBalance.requestPost(baseurl + '?module=32_payments_report', {
             date1:date1,
             date2:date2,
             month:0,
             year:0
       });

       getParam(html, result, 'payments', /Итого[\s\S]*?<td[^>]*>(-?\d[\d\.,\s]*)/i, replaceTagsAndSpaces, parseBalance);
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

