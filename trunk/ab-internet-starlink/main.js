/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у московского интернет-провайдера Starlink

Сайт оператора: http://starlink.ru/
Личный кабинет: https://stat.starlink.ru/
*/

function parseTrafficGb(str){
  var val = getParam(str.replace(/\s+/g, ''), null, null, /(-?\d[\d.,]*)/, replaceFloat, parseBalance);
  if(isset(val)){
      var ret = parseFloat((val/1024).toFixed(2));
      AnyBalance.trace('Parsed traffic ' + ret + 'Gb from ' + str);
      return ret;
  }
}

function main(){
    var prefs = AnyBalance.getPreferences();

    AnyBalance.setDefaultCharset('windows-1251');

    var baseurl = "https://stat.starlink.ru/";

    var html = AnyBalance.requestPost(baseurl + 'form.statistics.php', {
        login:prefs.login,
        pass:prefs.password,
        check:1
    });

    if(!/\?s=exit/i.test(html)){
        var error = getParam(html, null, null, /<font[^>]+color="?red[^>]*>([\s\S]*?)<\/font>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Личный кабинет изменился или проблемы на сайте.");
    }

    var result = {success: true};

    getParam(html, result, 'balance', /Баланс лицевого счета[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'available', /Доступно для оплаты услуг[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'daysleft', /До конца отчетного периода осталось дней[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /<td[^>]*>\s*Тарифный план[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'traffic', /Трафик за период(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficGb);
    getParam(html, result, 'trafficTurbo', /Осталось турбо трафика(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficGb);

    AnyBalance.setResult(result);
}
