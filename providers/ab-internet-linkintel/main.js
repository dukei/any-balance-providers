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

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "http://linkintel.ru";
    
    AB.checkEmpty(prefs.login, 'Введите логин!');
    AB.checkEmpty(prefs.password, 'Введите пароль!');
    
    var html = AnyBalance.requestGet(baseurl, g_headers);
    
    if(!html || AnyBalance.getLastStatusCode() > 400) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }
    
    var params = AB.createFormParams(html, function (params, str, name, value) {
        if (/user$/i.test(name)) {
            return prefs.login;
        }
        if (/pass(?:word)?$/i.test(name)) {
            return prefs.password;
        }
        return value;
    });
    
    html = AnyBalance.requestPost(baseurl, params, AB.addHeaders({ Referer: baseurl }));
    
    if (!/confirm\.php/i.test(AnyBalance.getLastUrl())) {
        var error = AB.getElement(html, /<div[^>]*?class="[^"]*?logerror/i, replaceTagsAndSpaces);
        if (error) {
            throw new AnyBalance.Error(error, false, /парол|некорректные\s+значения/.test(error));
        }
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
    
    var result = {success: true};
    
    getParam(html, result, 'userName', /Уважаемый клиент\s*([^\(]*)/i, AB.replaceTagsAndSpaces);
    getParam(html, result, 'account', /лицевой счет:\s*([^,\)\s]*)/i, AB.replaceTagsAndSpaces);
    
    html = AnyBalance.requestPost(baseurl + '/Cabinet/index.php', params, AB.addHeaders({ Referer: baseurl }));
    
    var usercart = AB.getElement(html, /<div[^>]*?user_card/i);
    if (!usercart) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось найти информацию о пользователе. Сайт изменен?');
    }

    getParam(usercart, result, '__tariff', /Тариф:(.*?)<br/i, AB.replaceTagsAndSpaces);
    getParam(usercart, result, 'balance', /Баланс на данный момент:.*?>([^<>]+)<\/a/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    getParam(usercart, result, 'bonus_balance', /Баллов на данный момент:\s*<a[^>]*>([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    
    if(AnyBalance.isAvailable('traffic_in', 'traffic_out', 'traffic_total')) {
		AnyBalance.trace('Getting traffic info');
		html = AnyBalance.requestGet(baseurl + '/Cabinet/traffic.php');
		
		getParam(html, result, ['traffic_in', 'traffic_total'], /Входящий трафик, Мбайт(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, parseTrafficMy);
		getParam(html, result, ['traffic_out', 'traffic_total'], /Исходящий трафик, Мбайт(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, parseTrafficMy);
		
		if(isset(result.traffic_in) && isset(result.traffic_out))
			getParam(result.traffic_in + result.traffic_out, result, 'traffic_total');
    }
    
    AnyBalance.setResult(result);
}

function parseTrafficMy(text) {
	return AB.parseTrafficGb(text, 'mb');
}