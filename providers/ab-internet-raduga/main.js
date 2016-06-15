/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function parseTrafficGbMy(str){
    return parseTrafficGb(str, 'mb');
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');
	
    var baseurl = "https://cabinet.radugainternet.ru/";
    var html = AnyBalance.requestGet(baseurl + 'login', g_headers);
	
    html = AnyBalance.requestPost(baseurl + 'login', {
        salt: getParam(html, null, null, /<input[^>]+name="salt"[^>]*value="([^"]*)/i, replaceHtmlEntities),
        password_hash:'',
        login:prefs.login,
        password:prefs.password,
        rememberme:0,
        loginButton:'Войти'
    }, addHeaders({Referer: baseurl + 'login'}));
	
	if (!/\/logout\//i.test(html)) {
		var error = getParam(html, null, null, /<ul[^>]+class="errors"[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверн/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
    var result = {success: true};
	
    getParam(html, result, 'balance', /<span[^>]+id="header-balance"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'agreement', /<p[^>]*>\s*Договор\s*<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	getParam(html, result, 'fio', /<div[^>]+id="balance-block"[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);
	getParam(html, result, '__tariff', [/Текущий тариф:([^>]*>){4}/i, /<th[^>]*>Тариф:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i], replaceTagsAndSpaces);
	getParam(html, result, 'till', /<th[^>]*>Списание аб.платы за следующий период[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDateWord);
	getParam(html, result, 'add_traffic', /<th[^>]*>Использовать доп. трафик после окончания включенного[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'abon', /<th[^>]*>Абонентская плата:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'add_traffic_cost', /<th[^>]*>Стоимость доп. трафика:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	
    getParam(html, result, 'traffic_left', [/Трафик[^>]*>\(оставшийся\/включенный\)\s*:(?:[^>]*>){2}([\s\d]+Мб)/i,
		/<th[^>]*>Оставшийся трафик:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i], replaceTagsAndSpaces, parseTraffic);	
    getParam(html, result, 'traffic_total', [/Трафик[^>]*>\(оставшийся\/включенный\)\s*:(?:[^>]*>){2}[\s\d]+Мб\s*\/([\s\d]+Мб)/i,
	/<th[^>]*>Трафик, включенный в абонентскую плату:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i], replaceTagsAndSpaces, parseTraffic);
	
    getParam(html, result, ['traffic_left_night', 'traffic_used_night'], /Ночной трафик[^>]*>\(оставшийся\/включенный\)\s*:(?:[^>]*>){2}([\s\d]+Мб)/i, replaceTagsAndSpaces, parseTraffic);	
    getParam(html, result, ['traffic_total_night', 'traffic_used_night'], /Ночной трафик[^>]*>\(оставшийся\/включенный\)\s*:(?:[^>]*>){2}[\s\d]+Мб\s*\/([\s\d]+Мб)/i, replaceTagsAndSpaces, parseTraffic);	
	
	if(isset(result.traffic_total_night) && isset(result.traffic_left_night)) {
		getParam(result.traffic_total_night - result.traffic_left_night, result, 'traffic_used_night');
	}
	
    //getParam(html, result, 'limit_traffic', /<h2[^>]*>Ограничение трафика[\s\S]*<th[^>]*>Статус:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    //getParam(html, result, 'autoactive', /<th[^>]*>Автоактивация:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    //getParam(html, result, 'till', /<th[^>]*>Списание аб.платы за следующий период[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDateMomentMSK);
	
    if(AnyBalance.isAvailable('traffic')){
		var href = getParam(html, null, null, /<a href="\/([^"]+)" >\s*за месяц/i);
        html = AnyBalance.requestGet(baseurl + href);
		
        getParam(html, result, 'traffic', /Итого:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	}
    if(AnyBalance.isAvailable('bonus')){
        html = AnyBalance.requestGet(baseurl + 'accounts/');
        
		getParam(html, result, 'bonus', /Бонус:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    }	
	
    AnyBalance.setResult(result);
}