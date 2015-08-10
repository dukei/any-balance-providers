/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у интернет провайдера тульского региона Росинтел.

Сайт оператора: http://kgdttk.ru
Личный кабинет: http://billing.kgdttk.ru
*/

function getTrafficGb(str){
  var balance = parseBalance(str);
  if(isset(balance))
      return parseFloat((balance/1024).toFixed(2));
}

function main(){
	throw new AnyBalance.Error("Провайдер более не работает, воспользуйтесь провайдером ТТК (Единый кабинет)");
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "http://billing.kgdttk.ru/";

    var html = AnyBalance.requestPost(baseurl + 'client/index.php', {
        login: prefs.login,
        password: prefs.password
    });

    if(!/'devision',\s*'-1'/i.test(html)){
        var error = getParam(html, null, null, /<(form) [^>]*name="loginForm">/i);
        if(error)
            throw new AnyBalance.Error("Неверный логин или пароль");
        throw new AnyBalance.Error("Не удалось зайти в личный кабинет. Сайт изменен?");
    }

    var result = {success: true};

    getParam(html, result, 'userName', /Вы:<\/td>\s*<td[^>]*>(.*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    //Четвертая третья колонка в таблице под заголовком баланс
    getParam(html, result, 'balance', /<td[^>]*>Баланс(?:[\S\s]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    var re = new RegExp(prefs.login + '\\s*</a>\\s*</td>\\s*<td[^>]*>(.*?)</td>', 'i');
    getParam(html, result, '__tariff', re, replaceTagsAndSpaces, html_entity_decode);
    re = new RegExp(prefs.login + '\\s*</a>\\s*</td>(?:[\\S\\s]*?<td[^>]*>){5}(.*?)</td>', 'i');
    getParam(html, result, 'status', re, replaceTagsAndSpaces, html_entity_decode);

    if(AnyBalance.isAvailable('trafficIn', 'trafficOut')){
        var dt = new Date();
        html = AnyBalance.requestPost(baseurl + 'client/index.php', {
            devision:2,
            service:1,
            statmode:0,
            vgstat:0,
            timeblock:1,
            year_from:dt.getFullYear(),
            month_from:dt.getMonth()+1,
            day_from:1,
            year_till:dt.getFullYear(),
            month_till:dt.getMonth()+1,
            day_till:dt.getDate()
        });
        re = new RegExp(prefs.login + '\\s*</a>\\s*</td>(?:[\\S\\s]*?<td[^>]*>){2}(.*?)</td>', 'i');
        getParam(html, result, 'trafficIn', re, replaceTagsAndSpaces, getTrafficGb);
        re = new RegExp(prefs.login + '\\s*</a>\\s*</td>(?:[\\S\\s]*?<td[^>]*>){3}(.*?)</td>', 'i');
        getParam(html, result, 'trafficOut', re, replaceTagsAndSpaces, getTrafficGb);
    }

    AnyBalance.setResult(result);
}
