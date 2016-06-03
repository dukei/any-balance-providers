/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у оператора интернет СПАРК.

Сайт оператора: http://www.spark-com.ru
Личный кабинет: https://stat.spark-com.ru
*/

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://stat.spark-com.ru/";

    AnyBalance.setDefaultCharset('utf-8');

    var html = AnyBalance.requestPost(baseurl, {
        login: prefs.login,
        pass: prefs.password
    });

    if(!/FormLoginOut/i.test(html)){
        var error = getElement(html, /<ol[^>]*class="error[^>]*>/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error, null, /парол/i.test(error));

        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    
    getParam(html, result, 'userName', /ФИО:([\s\S]*?)<\/(?:li|div)>/i, replaceTagsAndSpaces);
    getParam(html, result, 'licschet', /Лицевой счет:([\s\S]*?)<\/(?:li|div)>/i, replaceTagsAndSpaces);
    getParam(html, result, 'balance', /Текущий баланс:([\s\S]*?)<\/(?:li|div)>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'abonentka', /Текущая абонентская плата за все услуги:([\s\S]*?)<\/(?:li|div)>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'traffic', /Расход трафика в текущем месяце:([\s\S]*?)<\/(?:li|div)>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'trafficGb', /Расход трафика в текущем месяце:([\s\S]*?)<\/(?:li|div)>/i, replaceTagsAndSpaces, parseTrafficGb);
    getParam(html, result, 'status', /Статус подключения:([\s\S]*?)<\/(?:li|div)>/i, replaceTagsAndSpaces);
    getParam(html, result, '__tariff', /Текущий тарифный план:[\s\S]*?>([\s\S]*?)<\/(?:li|div)>/i, replaceTagsAndSpaces);

    if(AnyBalance.isAvailable('bonus')){
		var html = AnyBalance.requestGet(baseurl + "account_bonuses/");
    	getParam(html, result, 'bonus', /Итого<\/td><td[^>]*>[^<]*<\/td><td[^>]*>([\-\d,\.\s]*)/i, replaceTagsAndSpaces, parseBalance);
    }
    
    AnyBalance.setResult(result);
}
