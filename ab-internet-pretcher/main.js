/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у криворожского интернет-провайдера PretcherNet

Сайт оператора: http://www.pretcher.dp.ua/
Личный кабинет: https://zeus.pretcher.dp.ua
*/

function parseTrafficGb(str){
  var val = getParam(str.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseBalance);
  if(isset(val)){
      var ret = parseFloat((val/1000/1000/1000).toFixed(2));
      AnyBalance.trace('Parsed traffic ' + ret + 'Gb from ' + str);
      return ret;
  }
}

function main(){
    var prefs = AnyBalance.getPreferences();

    AnyBalance.setDefaultCharset('windows-1251');

    var baseurl = "https://zeus.pretcher.dp.ua/con2/index.php";

    var html = AnyBalance.requestPost(baseurl, {
        cmd:'enter',
        login:prefs.login,
        pass:prefs.password
    });

    //AnyBalance.trace(html);

    if(!/\?cmd=exit/i.test(html)){
        var error = getParam(html, null, null, /<font[^>]+color=['"]?red[^>]*>([\s\S]*?)<\/font>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Личный кабинет изменился или проблемы на сайте.");
    }

    html = AnyBalance.requestGet(baseurl + "?cmd=info");

    var result = {success: true};

    getParam(html, result, 'balance', /Текущий баланс[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'licschet', /договор №:([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'status', /<h2[^>]*>аккаунт:([\S\s]*?)<\/h2>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /Текущий тарифный план[\s\S]*?<TR[^>]+bgcolor=e8e8e8[^>]*>(?:[\s\S]*?<td[^>]*>){1}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'abon', /Текущий тарифный план[\s\S]*?<TR[^>]+bgcolor=e8e8e8[^>]*>(?:[\s\S]*?<td[^>]*>){4}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    var dt = new Date();

    if(AnyBalance.isAvailable('trafficIn','trafficOut')){
        html = AnyBalance.requestGet(baseurl + "?cmd=stat");
        getParam(html, result, 'trafficOut', /Итого:(?:[\s\S]*?<td){2}[^>]*title='([^']*?)(?:\/|')/i, replaceTagsAndSpaces, parseTrafficGb);
        getParam(html, result, 'trafficIn', /Итого:(?:[\s\S]*?<td){2}[^>]*title='[^']*\/([^']*)'/i, replaceTagsAndSpaces, parseTrafficGb);
    }

    AnyBalance.setResult(result);
}
