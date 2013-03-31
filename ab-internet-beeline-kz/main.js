/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плате для казахстанского интернет оператора Билайн Интернет Дома

Operator site: http://internet.beeline.kz
Личный кабинет: https://my.internet.beeline.kz
*/

var g_headers = {
'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
'Connection':'keep-alive',
'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "https://my.internet.beeline.kz/RU/";
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestPost(baseurl + 'Account/LogOn', {
	login:'',
	password:'',
	submit:'',
	'AuthData.RememberMe':false,
	'AuthData.ReturnUrl':'',
	'AuthData.Login':prefs.login,
	'AuthData.Password':prefs.password
    }, addHeaders({Referer: baseurl})); 

    if(!/exit_btn_text/i.test(html)){
        //Если в кабинет войти не получилось, то в первую очередь надо поискать в ответе сервера объяснение ошибки
        var error = getParam(html, null, null, /ShowAlert\("[^"]*",\s*"([^"]*)/, replaceSlashes);
        if(error)
            throw new AnyBalance.Error(error);
        //Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    //Раз мы здесь, то мы успешно вошли в кабинет
    //Получаем все счетчики
    var result = {success: true};
    getParam(html, result, 'licschet', /(?:Лицевой счет №)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /(?:Ваш баланс)([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /<div[^>]+class="panel"[\s\S]*?<div[^>]+class="header"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'fio', /<div[^>]+class="name"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);

    if(AnyBalance.isAvailable('trafficIn', 'trafficOut')){
        html = AnyBalance.requestGet(baseurl + 'cabinet/internet/statistic', g_headers);
        getParam(html, result, 'trafficIn', /(?:Принято:)([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseTrafficGb);
        getParam(html, result, 'trafficOut', /(?:Передано:)([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseTrafficGb);
    }

    //Возвращаем результат
    AnyBalance.setResult(result);
}
