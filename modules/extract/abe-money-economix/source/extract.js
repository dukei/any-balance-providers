/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.109 Safari/537.36'
};

var baseurl = 'https://ibank.economiks.ru:2443';

function login(prefs) {
	AnyBalance.setDefaultCharset('windows-1251');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + '/web_banking/protected/welcome.jsf', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту интернет-банка! Попробуйте обновить данные позже.');
	}

	if (!/logout/i.test(html)) {
        var form = getElement(html, /<form[^>]+name="form:loginForm"[^>]*>/i);

        var params = createFormParams(html, function(params, str, name, value) {
            if (name == 'form:login')
                return prefs.login;
            return value;
        });
		html = AnyBalance.requestPost(baseurl + '/web_banking/login.jsf', params, addHeaders({
			Referer: baseurl + '/web_banking/login.jsf'
		}));

		params = createFormParams(html, function(params, str, name, value) {
			if(name == 'j_password')
				return prefs.password;
			else if(name == 'password_common')
				return prefs.password;
			else if(name == 'j_username')
				return prefs.login;
			else if (name == 'captcha'){
				var src = getParam(html, null, null, /<img[^>]+id="jcaptcha"[^>]+src="([\s\S]*?)"/i);
				if(!src)
					throw new AnyBalance.Error("Не удалось найти капчу. Сайт изменён?");
				var img = AnyBalance.requestGet(baseurl + src, addHeaders({Referer: baseurl + '/web_banking/login.jsf'}));
				return AnyBalance.retrieveCode('Пожалуйста, введите код с картинки', img, {time: 180000});
			}
		});
		html = AnyBalance.requestPost(baseurl+'/web_banking/j_security_check', params, addHeaders({
			Referer: baseurl + '/web_banking/login.jsf'
		}));


	}else{
		AnyBalance.trace('Уже залогинены, используем существующую сессию')
	}

	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, [/<div[^>]+iconError"[^>]*>([\s\S]*?)<\/div>/i, /<span[^>]+id="captcha_msg"[^>]*>([\s\S]*?)<\/span>/i], replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /(Неверно указаны данные|код с картинки введен неверно)/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в интернет-банк. Сайт изменен?');
	}

	__setLoginSuccessful();

	return html;
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка счетов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processAccounts(html, result) {
    if(!AnyBalance.isAvailable('accounts'))
        return;

	//На одной странице находятся и карты и счета.
	//Ищем все таблицы.
	var accountsTable = getElements(html, /<table[^>]+class="tbllist"[^>]*>/ig, null, html_entity_decode);
	if(!accountsTable) {
		AnyBalance.trace(html);
		AnyBalance.trace('Не удалось найти таблицу со счетами.');
		return;
	}

	//Ищем таблицу со счетами.
	for(var i=0; i < accountsTable.length; i++) {
		if(/счет/i.test(accountsTable[i])) {
			var rows = getElements(accountsTable[i], /<tr[^>]*>/ig);
		}
	}
	if(!rows) {
		AnyBalance.trace(html);
		AnyBalance.trace("Не нашли ни одного счёта.");
		result.accounts = [];
		return;
	}


	AnyBalance.trace('Найдено счетов: ' + (rows.length - 1)); //т.к. захватывает первую строчку с описанием колонок
	result.accounts = [];
	
	for(var i=1; i < rows.length; ++i){
        var acc = rows[i];
		var id = getParam(acc, null, null, /<a[^>]*>(\d+)/i); //Там нет никаких отличительных особенностей. ТОлько номер
		var num = getParam(acc, null, null, /<a[^>]*>(\d+)/i);
		var title = getParam(acc, null, null, /<a[^>]*>([\s\S]*?)<\/a>/i);
		
		var c = {__id: id, __name: title, num: num};
		
		if(__shouldProcess('accounts', c)) {
			processAccount(html, acc, c);
		}
		
		result.accounts.push(c);
	}
}

function processAccount(html, account, result){
    AnyBalance.trace('Обработка счета ' + result.__name);

	//Нужно взять параметры, для отправки пост запроса по выбранной карте
	var postTable = getElement(html, /<div[^>]+class="d-body-content"[^>]*>/i, null, html_entity_decode);
	var params = createFormParams(postTable, function(params, str, name, value) {
		return value;
	});

	var paramsLabel = getParam(account, null, null, /submitForm\('([\s\S]*?)',/i, [ /(.+)/i, '$1'+':_idcl']);
	params[paramsLabel] = getParam(account, null, null, /submitForm\([^,]+,\s*'([\s\S]*?)'/i);
	params.account_id = getParam(account, null, null, /'account_id',\s*'([\s\S]*?)'/i);
	if(!params[paramsLabel] || !params.account_id || !paramsLabel) {
		AnyBalance.trace("Не смогли найти параметр запроса данных по карте " + result.__name);
		return;
	}

	html = AnyBalance.requestPost(baseurl+'/web_banking/protected/welcome.jsf', params, addHeaders({
		Referer:baseurl+'/web_banking/protected/welcome.jsf'
	}));

	getParam(account, result, 'accounts.status', /<span[^>]+class="lowercase"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	getParam(html, result, 'accounts.agreement', /id="info"(?:[\s\S]*?<div[^>]*>){3}[^:]*:([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(html, result, 'accounts.date_start', /id="info"(?:[\s\S]*?<div[^>]*>){4}[^:]*:([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'accounts.balance', /<span[^>]+class="amountBox\s*"[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['accounts.currency' , 'accounts.balance', 'accounts.incomingLefts'], /<span[^>]+class="amountBox\s*"[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, parseCurrency);

	if(AnyBalance.isAvailable('accounts.transactions')) {
		processAccountTransactions(html, result);
	}
}

function processInfo(html, result){
    html = AnyBalance.requestGet(baseurl + '/web_banking/protected/service/info.jsf', g_headers);

    var info = result.info = {};
	var infoTable = getElement(html, /<table[^>]+class="tbl"[^>]*>/i, null, html_entity_decode);
	if(!infoTable) {
		AnyBalance.trace("Не смогли найти таблицу с пользовательскими данными.");
		return;
	}
	getParam(infoTable, info, 'info.name_last', /Фамилия(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(infoTable, info, 'info.name', /Имя(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(infoTable, info, 'info.name_patronymic', /Отчество(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(infoTable, info, 'info.email', /e-mail(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(infoTable, info, 'info.mphone', /мобильный телефон(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(infoTable, info, 'info.hphone', /Домашний телефон(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(infoTable, info, 'info.wphone', /Рабочий телефон(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(infoTable, info, 'info.inn', /инн(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(infoTable, info, 'info.passport', /номер(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(infoTable, info, 'info.raddress', /адрес регистрации(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(infoTable, info, 'info.faddress', /адрес фактического(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка депозитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processDeposits(html, result) {
	throw new AnyBalance.Error('Обработка депозитов пока не поддерживается. Пожалуйста, обратитесь к разработчикам.');
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка кредитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCredits(html, result) {
	throw new AnyBalance.Error('Обработка кредитов пока не поддерживается. Пожалуйста, обратитесь к разработчикам.');
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка карт
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(html, result) {
	throw new AnyBalance.Error('Обработка карт пока не поддерживается. Пожалуйста, обратитесь к разработчикам.');
}

