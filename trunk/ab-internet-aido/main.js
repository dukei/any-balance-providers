/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:21.0) Gecko/20100101 Firefox/21.0',
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
	'Accept-Encoding': 'gzip, deflate',
	'Connection':'keep-alive',
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://my.aido.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 
	// у этого провайдера реализована защита.
	var html = AnyBalance.requestGet(baseurl + 'login');
	if(prefs.__dbg){
		html = AnyBalance.requestGet(baseurl);
	} else {
		var token = /authenticity_token[\s\S]*?value="([\s\S]*?)"/i.exec(html);
		// Если токен не нашли, дальше нет смысла идти
		var token = getParam(html, null, null, /authenticity_token[\s\S]*?value="([\s\S]*?)"/i, null, html_entity_decode);
		if(!token)
			throw new AnyBalance.Error('Не удалось найти токен авторизации, сайт либо недоступен, либо изменен');

		html = AnyBalance.requestPost(baseurl + 'login', 
		{
			'authenticity_token': token,
			utf8:'✓',
			commit:'Войти',
			'user[login]':prefs.login,
			'user[password]':prefs.password,
		}, g_headers); 
    }
	// по идее надо разбирать json, но сайт возвращает его в порнушном виде, не понятно как его преобразовать в нормальный
	/*var found = /HupoApp\(([\s\S]*?),\s*\{logLevel/i.exec(html);
	var json;
	if(!found)
		throw new AnyBalance.Error('Не удалось получиь данные авторизации');
	else
		json = getJsonEval(found[1]);*/
		
	if(!/HupoApp\(([\s\S]*?),\s*\{logLevel/i.test(html))
		throw new AnyBalance.Error('Не удалось войти в личный кабнет, неправильный логни-пароль?');
		
	var result = {success: true};
    getParam(html, result, 'balance', /n_sum_bal":"([\s\S]*?)"/i, null, parseBalance);
	getParam(html, result, 'monthly_fee', /n_good_sum[\s\S]*?n_good_sum":"([\s\S]*?)"/i, null, parseBalance);

    //Возвращаем результат
    AnyBalance.setResult(result);
}
