/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var baseurl = 'https://lk.rn-card.ru';
var g_savedData;
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d)(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $2 $3-$4-$5'];

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
	
	if(AnyBalance.isAvailable('last_oper_date', 'last_oper_card', 'last_oper_sum', 'last_oper_desc')){
	    var table = getElement(html, /<div[^>]+table-card-operations[^>]*>/i);
	    var hists = getElements(table, /<div[^>]+table-flex-row[^>]*>/ig);
	
	    if(hists.length && hists.length > 0){
			AnyBalance.trace('Найдено операций: ' + hists.length);
		    for(var i=0; i<hists.length; ++i){
	    	    var hist = hists[i];
				
				getParam(hist, result, 'last_oper_date', /<div[^>]+table-flex-row[^>]*>(?:[\s\S]*?<div[^>]*>){1}([\s\S]*?)<span/i, replaceTagsAndSpaces, parseDate);
		        getParam(hist, result, 'last_oper_card', /<div[^>]+table-flex-row[^>]*>(?:[\s\S]*?<div[^>]*>){2}([\s\S]*?)<span/i, replaceTagsAndSpaces);
				getParam(hist, result, 'last_oper_sum', /<div[^>]+table-flex-row[^>]*>(?:[\s\S]*?<\/span[^>]*>){3}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
				getParam(hist, result, 'last_oper_desc', /<div[^>]+table-flex-row[^>]*>(?:[\s\S]*?<\/span[^>]*>){4}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
				
			    break;
	        }
		}else{
			AnyBalance.trace('Не удалось получить данные по операциям');
		}
	}
	
	html = AnyBalance.requestGet(baseurl + '/Contract', addHeaders({Referer: baseurl + '/'}));
	
	getParam(html, result, '__tariff', /<h2[^>]*>\s*?&#x414;&#x43E;&#x433;&#x43E;&#x432;&#x43E;&#x440;[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces); // Номер договора
	getParam(html, result, 'contract', /<h2[^>]*>\s*?&#x414;&#x43E;&#x433;&#x43E;&#x432;&#x43E;&#x440;[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces); // Номер договора
	getParam(html, result, 'tariff_policy', /<\/i>Тарифная политика[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces); // Тарифная политика
	getParam(html, result, 'balance', /&#x411;&#x430;&#x43B;&#x430;&#x43D;&#x441;[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance); // Баланс
	getParam(html, result, 'own_balance', /&#x421;&#x43E;&#x431;&#x441;&#x442;&#x432;&#x435;&#x43D;&#x43D;&#x44B;&#x435; &#x441;&#x440;&#x435;&#x434;&#x441;&#x442;&#x432;&#x430;[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance); // Собственные средства
	getParam(html, result, 'credit_limit', /&#x41A;&#x440;&#x435;&#x434;&#x438;&#x442;&#x43D;&#x44B;&#x439; &#x41B;&#x438;&#x43C;&#x438;&#x442;[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance); // Кредитный лимит
	getParam(html, result, 'blocked', /&#x417;&#x430;&#x431;&#x43B;&#x43E;&#x43A;&#x438;&#x440;&#x43E;&#x432;&#x430;&#x43D;&#x43E;[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance); // Заблокировано
	getParam(html, result, 'irreducible_balance', /&#x41D;&#x435;&#x441;&#x43D;&#x438;&#x436;&#x430;&#x435;&#x43C;&#x44B;&#x439; &#x43E;&#x441;&#x442;&#x430;&#x442;&#x43E;&#x43A;[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance); // Неснижаемый остаток
	getParam(html, result, 'prev_month_spending', /<\/i>\s*?Расход за прошлый месяц[\s\S]*?<div[^>]*>([\s\S]*?)\/div>/i, replaceTagsAndSpaces, parseBalance); // Расход за прошлый месяц
	getParam(html, result, 'this_month_spending', /<\/i>\s*?Расход за текущий месяц[\s\S]*?<div[^>]*>([\s\S]*?)\/div>/i, replaceTagsAndSpaces, parseBalance); // Расход за текущий месяц
	getParam(html, result, 'contract_type', /<\/i>Тип договора[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces); // Тип договора
	getParam(html, result, 'contract_state', /<\/i>\s*?Статус[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces); // Статус договора
	getParam(html, result, 'contract_date', /<\/i>\s*?Период[\s\S]*?<span[^>]*>([\s\S]*?)по[\s\S]*?<\/span>/i, replaceTagsAndSpaces, parseDate); // Дата заключения договора
	getParam(html, result, 'last_pay_sum', /<\/i>\s*?Последний плат[её]ж(?:[\s\S]*?<div[^>]*>){1}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance); // Сумма последнего платежа
	getParam(html, result, 'last_pay_date', /<\/i>\s*?Последний плат[её]ж(?:[\s\S]*?<div[^>]*>){0}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseDate); // Дата последнего платежа
		
//	getParam(html, result, 'cards_count', /<div[^>]+class="cell-contract-info"[^>]*>&#x41E;&#x431;&#x449;&#x435;&#x435; &#x43A;&#x43E;&#x43B;&#x438;&#x447;&#x435;&#x441;&#x442;&#x432;&#x43E; &#x43A;&#x430;&#x440;&#x442;(?:[\s\S]*?<div[^>]*>){1}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
//	getParam(html, result, 'cards_active', /<div[^>]+class="cell-contract-info"[^>]*>&#x41A;&#x43E;&#x43B;&#x438;&#x447;&#x435;&#x441;&#x442;&#x432;&#x43E; &#x430;&#x43A;&#x442;&#x438;&#x432;&#x43D;&#x44B;&#x445; &#x43A;&#x430;&#x440;&#x442;(?:[\s\S]*?<div[^>]*>){1}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
//	getParam(html, result, 'cards_blocked', /<div[^>]+class="cell-contract-info"[^>]*>&#x41A;&#x43E;&#x43B;&#x438;&#x447;&#x435;&#x441;&#x442;&#x432;&#x43E; &#x437;&#x430;&#x431;&#x43B;&#x43E;&#x43A;&#x438;&#x440;&#x43E;&#x432;&#x430;&#x43D;&#x43D;&#x44B;&#x445; &#x43A;&#x430;&#x440;&#x442;(?:[\s\S]*?<div[^>]*>){1}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	
	if(AnyBalance.isAvailable(['inn', 'legal_address', 'actual_address', 'email', 'phone', 'company'])){
	    html = AnyBalance.requestGet(baseurl + '/Account/Profile', addHeaders({Referer: baseurl + '/Contract'}));
	
	    getParam(html, result, 'inn', /&#x418;&#x41D;&#x41D;[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces); // ИНН
		getParam(html, result, 'legal_address', /&#x42E;&#x440;&#x438;&#x434;&#x438;&#x447;&#x435;&#x441;&#x43A;&#x438;&#x439; &#x430;&#x434;&#x440;&#x435;&#x441;[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces); // Юридический адрес
		getParam(html, result, 'actual_address', /&#x424;&#x430;&#x43A;&#x442;&#x438;&#x447;&#x435;&#x441;&#x43A;&#x438;&#x439; &#x430;&#x434;&#x440;&#x435;&#x441;[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces); // Фактический адрес
		getParam(html, result, 'email', />Email[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces); // E-mail
		if(result.email)
			result.email = result.email.toLowerCase();
		getParam(html, result, 'phone', /&#x422;&#x435;&#x43B;&#x435;&#x444;&#x43E;&#x43D;[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceNumber); // Номер телефона
		getParam(html, result, 'company', /&#x41F;&#x43E;&#x43B;&#x43D;&#x43E;&#x435; &#x43D;&#x430;&#x437;&#x432;&#x430;&#x43D;&#x438;&#x435; &#x43E;&#x440;&#x433;&#x430;&#x43D;&#x438;&#x437;&#x430;&#x446;&#x438;&#x438;[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, [replaceTagsAndSpaces, /Индивидуальный предприниматель/i, 'ИП']); // Организация
	}
	
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
