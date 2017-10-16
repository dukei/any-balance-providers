/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.116 Safari/537.36'
};

var baseurl = 'https://i.tochka.com';

function login() {
	var prefs = AnyBalance.getPreferences();

	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + '/summary', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту интернет-банка! Попробуйте обновить данные позже.');
	}

	if (!/logout/i.test(html)) {
        var form = getElement(html, /<form[^>]+login-form[^>]*>/i);

        var params = createFormParams(form, function(params, str, name, value) {
            if (name == 'name_mini_otp')
                return prefs.login;
            if (name == 'passwd_mini_otp')
                return prefs.password;
            if (name == 'captcha'){
            	var img = AnyBalance.requestGet(baseurl + '/login/captcha.jpg', addHeaders({Referer: baseurl}));
            	return AnyBalance.retrieveCode('Пожалуйста, введите код с картинки', img, {time: 180000});
            }
            return value;
        });
		html = AnyBalance.requestPost(baseurl + '/user/do_login', params, addHeaders({Referer: baseurl + '/user/login'}));
	}else{
		AnyBalance.trace('Уже залогинены, используем существующую сессию')
	}

	if (/<input[^>]+name="MINI_OTP_GC"/i.test(html)) {
		AnyBalance.trace("Потребовался ввод кода.");
        var msg = getElement(html, /<label[^>]+otp[^>]*>([^<]*)/i, replaceTagsAndSpaces);
        var form = getElement(html, /<form[^>]+so_login_form[^>]*>/i);

        var params = createFormParams(form, function(params, str, name, value) {
            if (name == 'MINI_OTP_GC')
                return AnyBalance.retrieveCode((msg || 'Пожалуйста, введите код OTP/SMS для входа в интернет-банк.' ), null, {inputType: 'number', time: 180000});
            return value;
        });

        html = AnyBalance.requestPost(baseurl + '/mini_otp/do_login', params, addHeaders({Referer: baseurl + '/mini_otp/login'}));
	}

	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+errors-panel[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /(Проверьте правильность указания Логина и Пароля|неправильный одноразовый ключ)/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в интернет-банк. Сайт изменен?');
	}

	html = AnyBalance.requestPost(baseurl+'/fraud_monitoring_ajax/send', {
		'time-zone': new Date().getTimezoneOffset(),
		'random': Math.random(),
	});

	html = AnyBalance.requestGet(baseurl+'/summary', g_headers);

    __setLoginSuccessful();
	
	return html;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка счетов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processAccounts(html, result) {
    if(!AnyBalance.isAvailable('accounts'))
        return;

    html = AnyBalance.requestGet(baseurl + '/account/list', addHeaders({
		Referer: baseurl + '/summary',
	}));

	var table = getElement(html, /<table[^>]+class="action-list"[^>]*>/i);

	var accounts = getElements(table, /<tr[^>]+data-row[^>]*>/ig);
	if(!accounts.length){
		AnyBalance.trace(html);
		AnyBalance.trace('Не удалось найти счета.');
		return;
	}
	
	AnyBalance.trace('Найдено счетов: ' + accounts.length);
	result.accounts = [];
	
	for(var i=0; i < accounts.length; ++i){
		var id = getParam(accounts[i], null, null, /<br[^>]*>([^<]*)/i);
		var num = getParam(accounts[i], null, null, /<br[^>]*>([^<]*)/i);
		var title = getParam(accounts[i], null, null, /<tr(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces);
		
		var c = {__id: id, __name: title, num: num};
		
		if(__shouldProcess('accounts', c)) {
			processAccount(accounts[i], table, c);
		}
		
		result.accounts.push(c);
	}
}

function processAccount(account, table, result){
    AnyBalance.trace('Обработка счета ' + result.__name);

	//Ищем customer id
	var CI = getParam(table, null, null, /request_customer_id=(\d*)/i);
	if(!CI) {
		AnyBalance.trace(table);
		AnyBalance.trace("Не удалось найти ID пользователя. Сайт изменён?");
		return;
	}

	var html = AnyBalance.requestGet(baseurl + '/account/edit/' + result.__id + '?request_customer_id=' + CI, g_headers);

    getParam(html, result, 'accounts.type', /Тип счета(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, 'accounts.__tariff', /Тарифный план(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, 'accounts.status', /Статус(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, 'accounts.date_start', /Дата открытия(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDateWord);
    getParam(html, result, 'accounts.balance', /Остаток(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'accounts.aBalance', /Доступный(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, ['accounts.currency' , 'accounts.balance', 'accounts.availableBalance'], /Остаток(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);

    if(AnyBalance.isAvailable('accounts.transactions')) {
        processAccountTransactions(html, result);
    }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка карт
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(html, result) {
	if(!AnyBalance.isAvailable('cards'))
		return;

	html = AnyBalance.requestGet(baseurl + '/card/list??filter=on&account=&cardType=&cardStatus=', g_headers);

	var table = getElement(html, /<table[^>]+class="action-list"[^>]*>/i);
	var cards = getElements(table, /<tr[^>]+id="cc-\d+"[^>]+data-row[^>]*>/ig);
	if(!cards.length){
		AnyBalance.trace(html);
		AnyBalance.trace('Не удалось найти карты.');
		return;
	}

	AnyBalance.trace('Найдено карт: ' + cards.length);
	result.cards = [];
	

	for(var i = 0; i < cards.length; ++i){
		var id = getParam(cards[i], null, null, /<span[^>]+pan[^>]*>([\s\S]*?)<\/span>/i);
		var num = getParam(cards[i], null, null, /<span[^>]+pan[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
		var title = getParam(cards[i], null, null, /<td[^>]+cc_brand[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

		var c = {__id: id, __name: title, num: num};

		if (__shouldProcess('cards', c)) {
			processCard(cards[i], c);
		}

		result.cards.push(c);
	}
}

function processCard(card, result) {
    AnyBalance.trace('Обработка карты ' + result.__name);

	getParam(card, result, 'cards.till', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDateWord);
	getParam(card, result, 'cards.status', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

	//меняем формат ID удаляя звёздочки и пробелы
	var formattedID = getParam(result.__id, null, null, /(.*)?/i, [/(\*|\s)/ig, '']);
	var html = AnyBalance.requestGet(baseurl + '/card/view/' + formattedID, g_headers);

	getParam(html, result, 'cards.type', /тип карты(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'cards.cardholder', /Владелец(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

	getParam(html, result, 'cards.accnum', /Cчет(?:[^>]*>){1}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	getParam(html, result, 'cards.balance', /Остаток(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cards.reserved', /Зарезервировано(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cards.credit', /Кредит(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cards.available', /Доступно(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['cards.currency', 'cards.balance', 'cards.reserved', 'cards.credit', 'cards.available'], /Доступно(?:[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);


	if(isAvailable('cards.transactions'))
		processCardTransactions(result, formattedID);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка депозитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processDeposits(html, result) {
	throw new AnyBalance.Error("На данный момент обработка депозитов не поддерживается. Пожалуйста, обратитесь к разработчику.");
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка кредитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCredits(html, result) {
	throw new AnyBalance.Error("На данный момент обработка кредитов не поддерживается. Пожалуйста, обратитесь к разработчику.");
}

function processInfo(html, result){
    html = AnyBalance.requestGet(baseurl + '/requisites/show', g_headers);
    var info = result.info = {};
    getParam(html, info, 'info.inn', /"#inn"[^]*?text\("([^"]*)"/i, replaceTagsAndSpaces);
    getParam(html, info, 'info.name', /"#name"[^]*?text\("([^"]*)"/i, replaceHtmlEntities);
    getParam(html, info, 'info.kpp', /"#kpp"[^]*?text\("([^"]*)"/i, replaceHtmlEntities);
}
