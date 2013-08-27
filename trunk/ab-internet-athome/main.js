/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для питерского интернет-провайдера Эт хоум

Сайт оператора: http://at-home.ru
Личный кабинет: https://billing.at-home.ru/
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/28.0.1500.95 Safari/537.36'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    //AnyBalance.setDefaultCharset('utf-8');
	AnyBalance.setOptions({FORCE_CHARSET: 'utf-8'});

    var baseurl = 'https://billing.at-home.ru/';

    var html = AnyBalance.requestPost(baseurl + 'lk/user/authorize/', {
        redirect: 1,
        referer: '/lk/user/plainAuth/',
        login:prefs.login,
        pwd:prefs.password,
        x: 34,
        y: 2
    }, g_headers);

    //AnyBalance.trace(html);
    if(!/\/lk\/user\/logout/.test(html)){
        var error = getParam(html, null, null, /<div[^>]*class=["']p_b_w_text[^>]*>([\s\S]*?)<\/div>/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /Баланс:[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /<td(?:[\s\S](?!<\/td>))*<input[^>]*checked(?:[\s\S](?!<\/td>))*<div[^>]*konstr_param_desc[^>]*>([\S\s]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'abon', /Абонентская плата:[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'licschet', /Номер счета:[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    if(AnyBalance.isAvailable('trafficIn', 'trafficOut')){
        var dt = new Date();
        var html = AnyBalance.requestGet(baseurl + 'lk/report/trafic/?start_date=' + dt.getFullYear() + '-' + (dt.getMonth()+1) + '-' + '01&end_date=' + dt.getFullYear() + '-' + (dt.getMonth()+1) + '-' + dt.getDate() + '&x=27&y=10');

       getParam(html, result, 'trafficIn', /Входящий трафик(?:[\s\S]*?<td[^>]*>){2}([\S\s]*?)<\/td>/i, replaceFloat, parseTrafficGbMy);
       getParam(html, result, 'trafficOut', /Исходящий трафик(?:[\s\S]*?<td[^>]*>){3}([\S\s]*?)<\/td>/i, replaceFloat, parseTrafficGbMy);
    }
    
    AnyBalance.setResult(result);
}

function parseTrafficGbMy(str){
  var val = getParam(str.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
  return parseFloat((val/1024).toFixed(2));
}