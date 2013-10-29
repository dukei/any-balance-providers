/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'Origin': 'https://www.sob.kz',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.sob.kz/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'frontend/frontend', g_headers);
	
	var execKey = getParam(html, null, null, /execution=([\s\S]{4})/i);
	var href = getParam(html, null, null, /id="FORM_FAST_LOGIN"[^>]*action="\/([^"]*)/i);
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'Login') 
			return prefs.login;
		else if (name == 'password')
			return prefs.password;
		else if (name == '_flowExecutionKey')
			return execKey;
		return value;
	});
	html = AnyBalance.requestPost(baseurl + href, params, addHeaders({Referer: baseurl + 'frontend/auth/userlogin?execution=' + execKey}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /Смена Пароля(?:[\s\S]*?<[^>]*>){2}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error) 
			throw new AnyBalance.Error(error);
		error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error) 
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	if (prefs.type == 'acc') 
		fetchAcc(html);
	else 
		fetchCard(html, baseurl);
}

function fetchCard(html, baseurl) {
	var prefs = AnyBalance.getPreferences();
	if (prefs.lastdigits && !/^\d{4}$/.test(prefs.lastdigits)) 
		throw new AnyBalance.Error("Надо указывать 4 последних цифры карты или не указывать ничего");
	// Теперь ищем ссылку на карты, точнее сабмит на список карт
	var page = getParam(html, null, null, /(<form\s*id='FORM_CARD_LIST'[\s\S]*?<\/form>)/i);
	if (!page) {
		throw new AnyBalance.Error("Не удаётся найти ссылку на информацию по картам. Пожалуйста, обратитесь к автору провайдера для исправления ситуации.");
	}
	var params = createFormParams(page, null);
	html = AnyBalance.requestPost(baseurl + 'frontend/frontend', params);
	// Пока мы не знаем как выглядит счет с несколькими картами, поэтому париться им сейчас нет смысла
	var result = {success: true};
	
	getParam(html, result, 'cardNumber', /ibec_submit_emulator form_owwb_ws_entryCardsDoing-2_1'>([\s\S]*?),/i);
	getParam(html, result, '__tariff', /ibec_submit_emulator form_owwb_ws_entryCardsDoing-2_1'>([\s\S]*?),/i);
	getParam(html, result, 'userName', /ibec_header_right">\s*<b>([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(html, result, 'balance', /<item parent_id='[\s\S]*?_balance' class='ibec_balance'>\s*<content>\s*<name>([\s\S]*?)<\//i, null, parseBalance);
	getParam(html, result, ['currency', 'balance'], /<item parent_id='[\s\S]*?_balance' class='ibec_balance'>\s*<content>\s*<name>([\s\S]*?)<\//i, null, parseCurrency);
	
	AnyBalance.setResult(result);
}

function fetchAcc(html) {
	throw new AnyBalance.Error('Получение данных по счетам еще не поддерживается, свяжитесь с автором провайдера!');
}