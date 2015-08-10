/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Cache-Control': 'max-age=0',
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Origin': 'http://www.convex.ru',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.93 Safari/537.36',
	'Accept-Encoding': 'gzip, deflate',
	'Accept-Language': 'ru,en;q=0.8'
};

function getTrafficGb(str){
  return parseFloat((parseFloat(str)/1000).toFixed(2));
}

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://bill.convex.ru/';

    AnyBalance.setDefaultCharset('windows-1251');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet('http://www.convex.ru/_bill?e=auth', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
    html = AnyBalance.requestPost(baseurl, [
        ['login', prefs.login],
        ['pwd', prefs.password],
		['x', '103'],
		['y', '22'],
    ], addHeaders({Referer: 'http://www.convex.ru/_bill?e=auth'}));

	if (!/Просмотр отчетов/i.test(html)) {
		var error = getParam(html, null, null, /<h1>Авторизация в сервере статистики<\/h1>\s*<p>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
    var result = {success: true};

    getParam(html, result, 'userName', /Просмотр отчетов[^(]*\(([^<)]+)/i, replaceTagsAndSpaces, html_entity_decode);
    
    html = AnyBalance.requestGet(baseurl + 'client/', g_headers);

    getParam(html, result, '__tariff', /Тариф в этом месяце.*?<b>(.*?)<\/b>/i);
    getParam(html, result, 'balance', /Текущий остаток на счете:.*?<font[^>]*>(.*?)<\/font>/i, [/\s+/g, ''], parseFloat);

    if(AnyBalance.isAvailable('traffic', 'trafficExternal')){
        html = AnyBalance.requestGet(baseurl + 'user/', g_headers); 
        //<td align=right>358 829.00</td><td align=right>182 960.00</td></tr></table>
        getParam(html, result, 'traffic', /<td[^>]*>([^<]*)<\/td><td[^>]*>[^<]*<\/td><\/tr><\/table>/i, [/\s+/g, ''], getTrafficGb);
        getParam(html, result, 'trafficExternal', /<td[^>]*>[^<]*<\/td><td[^>]*>([^<]*)<\/td><\/tr><\/table>/i, [/\s+/g, ''], getTrafficGb);
    }
    
    AnyBalance.setResult(result);
}