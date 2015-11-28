/**
Компания Автодор, занимающаяся оплату за проезд по платным дорогам (http://any-balance-providers.googlecode.com)

Получает баланс из личного кабинета компании Автодор

Сайт: http://avtodor-ts.ru/
Личный кабинет: http://avtodor-ts.ru/user/login
*/

var g_headers = {
'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
'Connection':'keep-alive',
'Origin': 'https://avtodor-ts.ru',
'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = 'https://avtodor-tr.ru/';

    AnyBalance.setDefaultCharset('utf-8');

    var html = AnyBalance.requestPost(baseurl + 'account/login', {
            "email":prefs.login,
            "password":prefs.password,
            "submit0": "Подождите...",
            "return_url": ""
        }, addHeaders({
          Referer: baseurl + 'account/login',
          "Upgrade-Insecure-Requests": 1
    }));

    if(!/\/logout/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="block_thanks"[^>]*>[\s\S]*?<div[^>]+class="text"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        console.log(error);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    var loyalty = {success: true};

    getParam(html, result, 'fio', /<td>Клиент[\s]*<\/td>[\s]*<td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /<td>Баланс<\/td>[\s\S]*<td>([\s\S]*)<span class="alsrub">i<\/span><\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'number', /<td>Договор[\s]*<\/td>[\s]*<td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'email', /<td>Email[\s]*<\/td>[\s]*<td class="word-break">([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, loyalty, 'url', /<div class="col-md-4 col-sm-6 col-xs-6 gray"><a href="([\s\S]*?)" class="btn btn-lg btn-gray" >Программа лояльности<\/a>/i);
    console.log(loyalty)

    var html = AnyBalance.requestGet(loyalty.url)
    if(!/Личный кабинет участника программы лояльности/i.test(html)){
      var error = getParam(html, null, null, /<div class="unauthorized-invite">[\s\S]*?<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
      console.log(error);
      if(error)
          throw new AnyBalance.Error(error);
    }

    getParam(html, result, 'bonus', /<td><span class="mybonusbalance green-bold-text" style="font-size: 36px">([\s\S]*?)<\/span><\/td>/i, replaceTagsAndSpaces, parseBalance);

    //Возвращаем результат
    AnyBalance.setResult(result);
}
