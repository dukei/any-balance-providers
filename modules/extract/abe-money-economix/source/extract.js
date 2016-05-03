/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':         'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':     'keep-alive',
	'User-Agent':     'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.109 Safari/537.36'
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

  html = AnyBalance.requestGet(baseurl + '/web_banking/protected/accounts/index', g_headers);

	var accounts = getElements(html, /<div[^>]+productShort[^>]*>/ig, null, html_entity_decode);
	if(!accounts.length) {
		AnyBalance.trace(html);
		AnyBalance.trace('Не удалось найти счета.');
		return;
	}


	AnyBalance.trace('Найдено счетов: ' + accounts.length);
	result.accounts = [];
	
	for(var i = 0; i < accounts.length; ++i){
    var acc   = accounts[i],
        id    = getParam(acc, null, null, /<td[^>]+lh20 w100Pc paddR10[^>]*>([^<]*)/i, [replaceTagsAndSpaces, /,\s*/g, '']),
        num   = getParam(acc, null, null, /<td[^>]+lh20 w100Pc paddR10[^>]*>([^<]*)/i, [replaceTagsAndSpaces, /,\s*/g, '']),
        title = getParam(acc, null, null, /<span[^>]+aliasText[^>]*>([^<]*)/i);
		
		var c = {__id: id, __name: title, num: num};
		
		if(__shouldProcess('accounts', c)) {
			processAccount(acc, c);
		}
		
		result.accounts.push(c);
	}
}

function processAccount(acc, result){
    AnyBalance.trace('Обработка счета ' + result.__name);

  var href = getParam(acc, null, null, /<a[^>]+href="([^"]*)/i);
  if(!href) {
    AnyBalance.trace(acc);
    AnyBalance.trace("Не удалось найти ссылку на подробную информацию о счёте.")
  }

  var html = AnyBalance.requestGet(baseurl + href, g_headers);

	getParam(acc,  result, 'accounts.status',                          /<span[^>]+class="lowercase"[^>]*>([\s\S]*?)<\/span>/i,                replaceTagsAndSpaces);
	getParam(html, result, 'accounts.agreement',                       /decorate-block(?:[\s\S]*?<span[^>]+infoLine[^>]*>){2}[^:]*:([^<]*)/i, replaceTagsAndSpaces);
	getParam(html, result, 'accounts.date_start',                      /amountbox[\s\S]*?<span[^>]+infoLine[^>]*>([^<]*)/i,                   replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'accounts.balance',                         /<span[^>]+amountBox[^>]*>([\s\S]*?)<\//i,                             replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['accounts.currency' , 'accounts.balance'], /<span[^>]+amountBox[^>]*>([\s\S]*?)<\//i,                             replaceTagsAndSpaces, parseCurrency);

	if(AnyBalance.isAvailable('accounts.transactions')) {
		processAccountTransactions(html, href, result);
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
	getParam(infoTable, info, 'info.name_last',       /Фамилия(?:[^>]*>){2}([\s\S]*?)<\/td>/i,            replaceTagsAndSpaces);
	getParam(infoTable, info, 'info.name',            /Имя(?:[^>]*>){2}([\s\S]*?)<\/td>/i,                replaceTagsAndSpaces);
	getParam(infoTable, info, 'info.name_patronymic', /Отчество(?:[^>]*>){2}([\s\S]*?)<\/td>/i,           replaceTagsAndSpaces);
	getParam(infoTable, info, 'info.email',           /e-mail(?:[^>]*>){2}([\s\S]*?)<\/td>/i,             replaceTagsAndSpaces);
	getParam(infoTable, info, 'info.mphone',          /мобильный телефон(?:[^>]*>){2}([\s\S]*?)<\/td>/i,  replaceTagsAndSpaces);
	getParam(infoTable, info, 'info.hphone',          /Домашний телефон(?:[^>]*>){2}([\s\S]*?)<\/td>/i,   replaceTagsAndSpaces);
	getParam(infoTable, info, 'info.wphone',          /Рабочий телефон(?:[^>]*>){2}([\s\S]*?)<\/td>/i,    replaceTagsAndSpaces);
	getParam(infoTable, info, 'info.inn',             /инн(?:[^>]*>){2}([\s\S]*?)<\/td>/i,                replaceTagsAndSpaces);
	getParam(infoTable, info, 'info.passport',        /номер(?:[^>]*>){2}([\s\S]*?)<\/td>/i,              replaceTagsAndSpaces);
	getParam(infoTable, info, 'info.raddress',        /адрес регистрации(?:[^>]*>){2}([\s\S]*?)<\/td>/i,  replaceTagsAndSpaces);
	getParam(infoTable, info, 'info.faddress',        /адрес фактического(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
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

function getParamByName(html, names) {
  names = isArray(names) ? names : [names];
  var params = {};
  for(var i = 0; i < names.length; i++) {
    params[names[i]] = getParam(html, null, null, new RegExp('name=["\']' + names[i] + '["\'][^>]*value=["\']([^"\']+)"', 'i')) || '';
  }
  return params;
}
