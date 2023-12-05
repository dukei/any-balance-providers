/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var baseurl = 'https://lk.rn-card.ru';
var g_savedData;

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'Origin': baseurl.replace(/\/+$/, ''),
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');
	
	if(!g_savedData)
		g_savedData = new SavedData('rn-card', prefs.login);

	g_savedData.restoreCookies();
	
	AnyBalance.trace ('Пробуем войти в личный кабинет...');
	
	var html = AnyBalance.requestGet(baseurl + '/', g_headers);
	
    if(!html || (AnyBalance.getLastStatusCode() >= 400)){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
	}
	
	if(!/Account\/Logout/i.test(html)){
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		clearAllCookies();
    	html = loginSite(html);
	}else{
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
    }

    var result = {success: true};
	
	getParam(html, result, '__tariff', /Номер договора:\s*?([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	getParam(html, result, 'contract', /Номер договора:\s*?([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	getParam(html, result, 'tariff_policy', /<div[^>]+class="cell-contract-info"[^>]*>&#x41F;&#x43E;&#x434;&#x43A;&#x43B;&#x44E;&#x447;&#x435;&#x43D;&#x43D;&#x430;&#x44F; &#x442;&#x430;&#x440;&#x438;&#x444;&#x43D;&#x430;&#x44F; &#x43F;&#x43E;&#x43B;&#x438;&#x442;&#x438;&#x43A;&#x430;(?:[\s\S]*?<div[^>]*>){1}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	getParam(html, result, 'balance', /<div[^>]+class="cell-contract-info"[^>]*>&#x414;&#x43E;&#x441;&#x442;&#x443;&#x43F;&#x43D;&#x43E; &#x441;&#x440;&#x435;&#x434;&#x441;&#x442;&#x432;(?:[\s\S]*?<div[^>]*>){1}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'own_balance', /<div[^>]+class="cell-contract-info"[^>]*>&#x421;&#x43E;&#x431;&#x441;&#x442;&#x432;&#x435;&#x43D;&#x43D;&#x44B;&#x435; &#x441;&#x440;&#x435;&#x434;&#x441;&#x442;&#x432;&#x430;(?:[\s\S]*?<div[^>]*>){1}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'credit_limit', /<div[^>]+class="cell-contract-info"[^>]*>&#x41A;&#x440;&#x435;&#x434;&#x438;&#x442;&#x43D;&#x44B;&#x439; &#x41B;&#x438;&#x43C;&#x438;&#x442;(?:[\s\S]*?<div[^>]*>){1}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'blocked', /<div[^>]+class="cell-contract-info"[^>]*>&#x417;&#x430;&#x431;&#x43B;&#x43E;&#x43A;&#x438;&#x440;&#x43E;&#x432;&#x430;&#x43D;&#x43E;(?:[\s\S]*?<div[^>]*>){1}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'irreducible_balance', /<div[^>]+class="cell-contract-info"[^>]*>&#x41D;&#x435;&#x441;&#x43D;&#x438;&#x436;&#x430;&#x435;&#x43C;&#x44B;&#x439; &#x43E;&#x441;&#x442;&#x430;&#x442;&#x43E;&#x43A;(?:[\s\S]*?<div[^>]*>){1}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'prev_month_spending', /<div[^>]+class="cell-contract-info"[^>]*>&#x420;&#x430;&#x441;&#x445;&#x43E;&#x434; &#x437;&#x430; &#x43F;&#x440;&#x43E;&#x448;&#x43B;&#x44B;&#x439; &#x43C;&#x435;&#x441;&#x44F;&#x446;(?:[\s\S]*?<div[^>]*>){1}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'this_month_spending', /<div[^>]+class="cell-contract-info"[^>]*>&#x420;&#x430;&#x441;&#x445;&#x43E;&#x434; &#x437;&#x430; &#x442;&#x435;&#x43A;&#x443;&#x449;&#x438;&#x439; &#x43C;&#x435;&#x441;&#x44F;&#x446;(?:[\s\S]*?<div[^>]*>){1}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'contract_type', /<div[^>]+class="cell-contract-info"[^>]*>&#x422;&#x438;&#x43F; &#x434;&#x43E;&#x433;&#x43E;&#x432;&#x43E;&#x440;&#x430;(?:[\s\S]*?<div[^>]*>){1}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	getParam(html, result, 'contract_state', /<div[^>]+class="cell-contract-info"[^>]*>&#x421;&#x442;&#x430;&#x442;&#x443;&#x441; &#x434;&#x43E;&#x433;&#x43E;&#x432;&#x43E;&#x440;&#x430;(?:[\s\S]*?<div[^>]*>){1}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	getParam(html, result, 'contract_date', /<div[^>]+class="cell-contract-info"[^>]*>&#x414;&#x430;&#x442;&#x430; &#x437;&#x430;&#x43A;&#x43B;&#x44E;&#x447;&#x435;&#x43D;&#x438;&#x44F;(?:[\s\S]*?<div[^>]*>){1}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'cards_count', /<div[^>]+class="cell-contract-info"[^>]*>&#x41E;&#x431;&#x449;&#x435;&#x435; &#x43A;&#x43E;&#x43B;&#x438;&#x447;&#x435;&#x441;&#x442;&#x432;&#x43E; &#x43A;&#x430;&#x440;&#x442;(?:[\s\S]*?<div[^>]*>){1}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cards_active', /<div[^>]+class="cell-contract-info"[^>]*>&#x41A;&#x43E;&#x43B;&#x438;&#x447;&#x435;&#x441;&#x442;&#x432;&#x43E; &#x430;&#x43A;&#x442;&#x438;&#x432;&#x43D;&#x44B;&#x445; &#x43A;&#x430;&#x440;&#x442;(?:[\s\S]*?<div[^>]*>){1}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cards_blocked', /<div[^>]+class="cell-contract-info"[^>]*>&#x41A;&#x43E;&#x43B;&#x438;&#x447;&#x435;&#x441;&#x442;&#x432;&#x43E; &#x437;&#x430;&#x431;&#x43B;&#x43E;&#x43A;&#x438;&#x440;&#x43E;&#x432;&#x430;&#x43D;&#x43D;&#x44B;&#x445; &#x43A;&#x430;&#x440;&#x442;(?:[\s\S]*?<div[^>]*>){1}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'last_pay_sum', /<span[^>]*>[\s\S]*?&#x41F;&#x43E;&#x441;&#x43B;&#x435;&#x434;&#x43D;&#x438;&#x439; &#x43F;&#x43B;&#x430;&#x442;&#x451;&#x436;(?:[\s\S]*?<span[^>]*>){1}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'last_pay_date', /<span[^>]*>[\s\S]*?&#x41F;&#x43E;&#x441;&#x43B;&#x435;&#x434;&#x43D;&#x438;&#x439; &#x43F;&#x43B;&#x430;&#x442;&#x451;&#x436;(?:[\s\S]*?<span[^>]*>){0}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'inn', /&#x418;&#x41D;&#x41D;[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	
	AnyBalance.setResult(result);
}

function loginSite(html){
    var prefs = AnyBalance.getPreferences();

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
    
	var html = AnyBalance.requestGet(baseurl, g_headers);
	var rvt = getParam(html, /<input[^>]+__RequestVerificationToken[^>]*value="([^"]*)/i, replaceHtmlEntities);
	
	if(!rvt){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти токен верификации запроса. Сайт изменен?');
	}

	html = AnyBalance.requestPost(baseurl + '/Account/Login?returnurl=%2F&handler=Login', {
		'Login': prefs.login,
        'Password': prefs.password,
        'IsPersistent': true,
        '__RequestVerificationToken': rvt,
        'IsPersistent': false
	}, addHeaders({
		'RequestVerificationToken': rvt,
		'Content-Type': 'application/x-www-form-urlencoded',
	    'Referer': baseurl + 'Account/Login?ReturnUrl=%2F',
	}));
    
	if(!/Account\/Logout/i.test(html)){
		var error = getParam(html, /<div[^>]+class="alert alert-danger"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		if(error)
			throw new AnyBalance.Error(error, null, /логин|парол/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}

	g_savedData.setCookies();
	g_savedData.save();
	
	return html;
}
