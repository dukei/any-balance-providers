/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс для днепропетровского интернет-провайдера exfloyt.

Сайт оператора: http://www.exfloyt.com.ua
Личный кабинет: https://stat.exfloyt.com.ua
*/

function getTrafficGb(str){
  return parseFloat((parseFloat(str)/1024).toFixed(2));
}

function main(){
    var prefs = AnyBalance.getPreferences();

    AnyBalance.setDefaultCharset('koi8-r');

    var baseurl = "https://stat.exfloyt.com.ua/";
    var html = AnyBalance.requestPost(baseurl, {
        login: prefs.login,
        passwd: prefs.password
    });

    if(!/exit=1/.test(html)){
        var error = getParam(html, null, null, /<b[^>]*class=['"]error['"][^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удаётся войти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /Остаток денег[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'traffic', /Остаток предоплаченного трафика[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}
