/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36',
};

function handleRedirect(html){
	var url = getParam(html, null, null, /<meta[^>]+http-equiv="refresh"[^>]*content="\d+;([^"]*)/i, null, html_entity_decode);
	if(url)
		return AnyBalance.requestGet(url, g_headers);
	return html;
}

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://faberlic.com/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl, g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'index.php?option=com_ajax&jsonrpc=Loginauth', JSON.stringify({
		"jsonrpc":"2.0",
		"method":"login",
		"params":{
			"login":prefs.login,
			"password":prefs.password,
			"remember":false
		},
		"id":1
	}), addHeaders({
		'Content-Type': 'application/json',
		'X-Requested-With': 'XMLHttpRequest',
		Referer: baseurl
	}));
	
	var json = getJson(html);
	if(!json.result || !json.result.success){
		var error = json.result && json.result.error;
		if (error)
			throw new AnyBalance.Error(error, null, /парол/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}

	html = AnyBalance.requestGet(baseurl, g_headers);
    
	if (!/logout/i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет после авторизации. Сайт изменен?');
	}    
    
    html = AnyBalance.requestGet(baseurl + 'index.php?option=com_user&view=bill&Itemid=2184&lang=ru', g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Доступно(?:[^>]*>){4}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'topay', /К оплате(?:[^>]*>){4}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /<span[^>]+rel="tooltip"[^>]+title="([\s\S]*?)"[^>]*>/i);

	if(isAvailable(['orders_sum', 'points_sum', 'points_sum_good'])) {

		html = AnyBalance.requestGet(baseurl + 'index.php?option=com_list&view=list&listId=84&Itemid=1679&lang=ru', g_headers);

		getParam(html, result, 'orders_sum', /Итоговая сумма заказов(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'points_sum', /Итоговая сумма баллов(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'points_sum_good', /Итоговая сумма баллов, учтенных в расчете(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	}

	if(isAvailable(['lo', 'olg', 'go'])) {

		html = AnyBalance.requestGet(baseurl + 'index.php?option=com_user&view=cabinet&Itemid=2069&lang=ru', g_headers);
		var block = getElements(html, [/<div[^>]+period-score-block[^>]*>/ig, /Текущий период/i])[0];

		getParam(block, result, 'lo', /ЛО[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
		getParam(block, result, 'olg', /ОЛГ[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
		getParam(block, result, 'go', /ГО[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	}

	if(isAvailable(['personal', 'group'])) {

		html = AnyBalance.requestPost(baseurl + 'index2.php?option=com_module&task=getmodule&module=mod_flmybusiness&no_html=1', {}, addHeaders({
			Referer: baseurl + 'index.php?option=com_user&view=cabinet&Itemid=2069&lang=ru',
			'X-Requested-With': 'XMLHttpRequest'
		}));

		getParam(html, result, 'personal', /В личных(?:[^>]*>){5}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'group', /В группе(?:[^>]*>){5}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	}
	AnyBalance.setResult(result);
}