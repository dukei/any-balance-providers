/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':           'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
	'Accept-Charset':   'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':  'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Connection':       'keep-alive',
	'User-Agent':       'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36',
};

/*function parseTrafficGbMy(str){
    return parseTrafficGb(str, 'mb');
}*/

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://cabinet.utex-telecom.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'cp/login?uri=', g_headers);
    if(!html || AnyBalance.getLastStatusCode() > 400){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    var html = AnyBalance.requestPost(baseurl + 'cp/login?uri=', {
        login:      prefs.login,
        password:   prefs.password
    });

    if(!/logout/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]*class='error'[^>]*>([\s\S]*?)<\/div>/i);
        if(error) {
            throw new AnyBalance.Error(error, null, /пароль/i.test(error));
        }

        AnyBalance.trace(html);
        throw new AnyBalance.Error("Не удалось зайти в личный кабинет. Сайт изменен?");
    }

    var result = {success: true};
    getParam(html, result, 'userName',  /<h1>([^(]*?)\(/i, replaceTagsAndSpaces);
    getParam(html, result, 'balance',  /Баланс<\/td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'traffic',  /Трафик<\/td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'monthly_payment',  /Суммарная абонентская плата за все услуги<\/td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    getParam(html, result, 'status',    /Статус<\/td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, 'agreement', /<h1>(?:[\s\S]*?)\(([^)]*)/i, replaceTagsAndSpaces);
    getParam(html, result, 'paycode', /Код оплаты<\/td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, '__tariff', /Текущий тариф<\/td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

    /*if(AnyBalance.isAvailable('trafficIn', 'trafficOut')){
        var dt = new Date();
        html = AnyBalance.requestPost(baseurl, {
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
        getParam(html, result, 'trafficIn', re, replaceTagsAndSpaces, parseTrafficGbMy);
        re = new RegExp(prefs.login + '\\s*</a>\\s*</td>(?:[\\S\\s]*?<td[^>]*>){3}(.*?)</td>', 'i');
        getParam(html, result, 'trafficOut', re, replaceTagsAndSpaces, parseTrafficGbMy);
    }*/

    AnyBalance.setResult(result);
}
