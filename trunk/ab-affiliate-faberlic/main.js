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

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://faberlic.com/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestPost(baseurl + 'index2.php?option=com_module&module=flregionselection&no_html=1&task=getmodule&act=setRegion&reg_id=1000034210371', null, addHeaders({Referer: baseurl + 'index.php?option=com_user&view=login&lang=ru', 'X-Requested-With':'XMLHttpRequest'}));
		
	html = AnyBalance.requestGet(baseurl + 'index.php?option=com_user&view=login&lang=ru', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'username') 
			return prefs.login;
		else if (name == 'passwd')
			return prefs.password;

		return value;
	});
    
	html = AnyBalance.requestPost(baseurl + 'index.php?option=com_user&view=login&lang=ru', params, addHeaders({Referer: baseurl + 'index.php?option=com_user&view=login&lang=ru'}));
	
    html = AnyBalance.requestGet(baseurl + 'index.php?option=com_user&view=cabinet', g_headers);
    
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<dd[^>]+class="error message fade"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неправильный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}    
    
    html = AnyBalance.requestGet(baseurl + 'index.php?option=com_user&view=bill&Itemid=2184&lang=ru', g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Доступно(?:[^>]*>){4}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /Личный кабинет(?:[^>]*>){9}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
    
    html = AnyBalance.requestGet(baseurl + 'index.php?option=com_list&view=list&listId=84&Itemid=1679&lang=ru', g_headers);
    
	getParam(html, result, 'orders_sum', /Итоговая сумма заказов(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'points_sum', /Итоговая сумма баллов(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
    
    html = AnyBalance.requestGet(baseurl + 'index.php?option=com_user&view=cabinet&Itemid=2069&lang=ru', g_headers);
    
	getParam(html, result, 'lo', /<td[^>]*>\s*Текущий период\s*<\/td>(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'olg', /<td[^>]*>\s*Текущий период\s*<\/td>(?:[\s\S]*?<td[^>]*>){9}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'go', /<td[^>]*>\s*Текущий период\s*<\/td>(?:[\s\S]*?<td[^>]*>){12}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}