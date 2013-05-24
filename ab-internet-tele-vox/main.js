/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у благовещенского интернет-провайдера Televox

Сайт оператора: http://www.tlvx.ru/
Личный кабинет: https://www.tele-vox.ru
*/

function parseTrafficGb(str){
  var val = getParam(str.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseBalance);
  if(isset(val)){
      var ret = parseFloat((val/1024/1024/1024).toFixed(2));
      AnyBalance.trace('Parsed traffic ' + ret + 'Gb from ' + str);
      return ret;
  }
}

function main(){
    var prefs = AnyBalance.getPreferences();

    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "http://www.tele-vox.ru/webexecuter";

    var html = AnyBalance.requestPost(baseurl, {
        midAuth:0,
        user:prefs.login,
        pswd:prefs.password,
        N10001:''
    });

    //AnyBalance.trace(html);

    if(!/\?action=Exit/i.test(html)){
        var error = getParam(html, null, null, /<h2[^>]*>ОШИБКА:([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Личный кабинет изменился или проблемы на сайте.");
    }

    var contractId = getParam(html, null, null, /contractId=(\d+)/);
    if(!contractId)
        throw new AnyBalance.Error("Не удалось найти номер контракта. Личный кабинет изменился или проблемы на сайте.");

    html = AnyBalance.requestGet(baseurl + "?action=ShowBalance&mid=contract&contractId="+contractId);

    var result = {success: true};

    getParam(html, result, 'balance', /Исходящий остаток на конец месяца[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'prihod', /Приход за месяц \(всего\)[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    getParam(html, result, 'licschet', /Договор №[\s\S]*?<a[^>]*>([^<]*)/i, replaceTagsAndSpaces);

    html = AnyBalance.requestGet(baseurl + "?action=ChangeTariff&mid=contract&contractId="+contractId);
    //Тарифный план в последней строчке таблицы
    getParam(html, result, '__tariff', /Тарифный план[\s\S]*<tr[^>]*>\s*<td[^>]*>\s*<font[^>]*>([^<]*?)<\/font>/i, replaceTagsAndSpaces);

    var dt = new Date();

    if(AnyBalance.isAvailable('trafficIn','trafficOut')){
        html = AnyBalance.requestGet(baseurl + "?action=ShowLoginsBalance&mid=1&module=dialup&contractId=" + contractId);
        getParam(html, result, 'trafficIn', /Итого:(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficGb);
        getParam(html, result, 'trafficOut', /Итого:(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficGb);
    }

    AnyBalance.setResult(result);
}
