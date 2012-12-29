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

    var baseurl = "https://stat.exfloyt.com.ua";
    //Примитивный сервер, требует строгого порядка параметров. Заголовки, наверное, не особо важны, но пусть остаются.
    var html = AnyBalance.requestPost(baseurl + '/stg_ustat.cgi', 'login=' + prefs.login + '&passwd=' + prefs.password, {
        Accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
        'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
        'Cache-Control':'max-age=0',
        'Content-Type':'application/x-www-form-urlencoded',
        Connection:'keep-alive',
        Origin:baseurl,
        Referer:baseurl + '/',
        'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.97 Safari/537.11'
    });

    //AnyBalance.trace(html);

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
