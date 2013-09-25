/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};
function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://bank.zenit.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	if(!prefs.login)
		throw new AnyBalance.Error('Введите логин!');
	if(!prefs.password)
		throw new AnyBalance.Error('Введите пароль!');
		
	var html = AnyBalance.requestGet(baseurl + 'frontend/frontend', g_headers);
	
	
	var params = createFormParams(html, function(params, str, name, value) {
		if(name == 'USER_ID')
			return prefs.login;
		else if(name == 'PASSWORD')
			return prefs.password;			
		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'frontend/frontend', params, addHeaders({Referer: baseurl + 'frontend/frontend'}));
	
	if(!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<table[^>]*id="LOGIN_ERROR_PANEL"[\s\S]*?error_code"[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		if(error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	fetchCardAndAcc(html, baseurl);
}

function fetchCardAndAcc(html, baseurl) {
	var prefs = AnyBalance.getPreferences();
	if(prefs.cardnum && !/^\d{4}$/.test(prefs.cardnum))
		throw new AnyBalance.Error("Введите 4 последних цифры номера карты или не вводите ничего, чтобы показать информацию по первой карте");

	var sid = getParam(html, null, null, /SID[^>]*hidden[^>]*value=(?:'|")([^(?:'|")]*)/i);
	
    html = AnyBalance.requestPost(baseurl + 'frontend/frontend', {
		RQ_TYPE:'WORK',
		Step_ID:2,
		SCREEN_ID:'MAIN',
		SID:sid,
		MENU_ID:'CONTRACT_LIST',
		ITEM_ID:'CONTRACT',
		CONTRACT:'CARD_0',
    }, g_headers);
	
	AnyBalance.trace('Попытаемся получить данные ' + (prefs.cardnum ? 'по карте или счету с номером ' + prefs.cardnum : 'по первой карте или счету'));
	var result = {success: true};
	// если не указан счет, ищем все на этой странице
	if(!prefs.cardnum) {
		fetch(html, result);
	}
	else
	{
		var cardnum = prefs.cardnum ? prefs.cardnum : '\\d{4}';
		var re = new RegExp('class="code"[^>]*>([^<]*)(?:[^>]*>){2,3}[^<]*' + cardnum + '\\s*<', 'i');
		var code = getParam(html, null, null, re);
		if(!code)
			throw new AnyBalance.Error('Не удаётся получить данные, свяжитесь с разработчиком');
			
		AnyBalance.trace('Нашли код нужной карты '+code);
		
		html = AnyBalance.requestPost(baseurl + 'frontend/frontend', {
			RQ_TYPE:'WORK',
			Step_ID:3,
			SCREEN_ID:'MAIN',
			SID:sid,
			MENU_ID:'CONTRACT_LIST',
			ITEM_ID:'SELECT',
			CONTRACT_TO:code,
		}, addHeaders({Referer: baseurl + 'frontend/frontend'}));

		fetch(html, result);
	}

    AnyBalance.setResult(result);
}


function fetch(html, result) {
	var table = getParam(html, null, null, /(<table[^>]*property_table[\s\S]*?<\/table>)/i);
	if(!table)
		throw new AnyBalance.Error('Не удаётся найти ни одной карты или счета');
	
	getParam(table, result, 'cardnum', /Номер[^>]*>(?:[\s\S]*?<span[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(table, result, 'status', /Состояние[^>]*>(?:[\s\S]*?<span[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(table, result, 'fio', /Владелец[^>]*>(?:[\s\S]*?<span[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(table, result, 'type', /Продукт[^>]*>(?:[\s\S]*?<span[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces);
	result.__tariff = result.type;
	getParam(table, result, 'balance', /Доступно[^>]*>(?:[\s\S]*?<span[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, ['currency', 'balance'], /Доступно[^>]*>(?:[\s\S]*?<span[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseCurrency);
}