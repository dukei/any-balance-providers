/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    Accept: 'application/vnd.qiwi.sso-v1+json',
	Origin: 'https://w.qiwi.com',
	'Accept-Language': 'ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.0.2357.132 Safari/537.36',
	'Content-Type': 'application/json',
};

function main() {
    var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите номер телефона!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    AnyBalance.requestGet(baseurl + 'payment/main.action'); //Надо сессию поставить
	
    AnyBalance.trace ('Trying to enter NEW account at address: ' + baseurl);
	
    var login = /^\s*\+/.test(prefs.login) ? prefs.login : '+7' + prefs.login;
	
    var response = requestAPI('cas/tgts', {
        login: login,
        password: prefs.password
    });
	
	response = requestAPI('cas/sts', {
		"ticket": response.entity.ticket,
		"service":"https://w.qiwi.com/j_spring_cas_security_check"
	});
	
	var html = AnyBalance.requestGet(baseurl + 'j_spring_cas_security_check?ticket=' + response.entity.ticket, addHeaders({'Referer': baseurl}));
	
	if(/Внимание! Срок действия вашего пароля истек/i.test(html)) {
		throw new AnyBalance.Error('Внимание! Срок действия вашего пароля истек. Зайдите в кошелек через браузер и следуйте инструкции.', null, true);
	}
	
	AnyBalance.trace ('It looks like we are in selfcare...');
	
    var result = {success: true};
	
	info = AnyBalance.requestPost(baseurl + 'person/state.action', '', addHeaders({Accept: 'application/json, text/javascript', 'X-Requested-With':'XMLHttpRequest'}));
	
	response = getJson(info);
	
	var i = 0;
	for (var balance in g_currency) {
		if (!isset(response.data.balances[balance]))
			continue;

		var balanceVar = (i >= 1 ? 'balance' + (i + 1) : 'balance');
		getParam(response.data.balances[balance] + '', result, balanceVar, null, replaceTagsAndSpaces, parseBalance);
		getParam(g_currency[balance] + '', result, [(i >= 1 ? 'currency' + (i + 1) : 'currency'), balanceVar]);
		i++
	}
	
	getParam(response.data.person, result, '__tariff');
	getParam(response.data.messages, result, 'messages');
	getParam(response.data.unpaidOrderCount, result, 'bills');
	
	// Баланс мегафона
	if(AnyBalance.isAvailable('megafon_balance', 'megafon_can_pay')) {
		html = AnyBalance.requestPost (baseurl + 'user/megafon/content/balanceheader.action', {}, addHeaders({Accept: 'text/html, */*; q=0.01', 'X-Requested-With':'XMLHttpRequest'}));
		
		getParam(html, result, 'megafon_balance', /phone-amount[^>]*>([\s\S]*?)<\/div/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'megafon_can_pay', /current_amount[^>]*>([\s\S]*?)<\/div/i, replaceTagsAndSpaces, parseBalance);
	}
	
	// QVC
	if(AnyBalance.isAvailable('qvc_card')) {
        html = AnyBalance.requestGet(baseurl + 'qvc/main.action');
		
		var card = getParam (html, result, 'qvc_card', /Номер карты:([^>]*>){3}/i, replaceTagsAndSpaces, html_entity_decode);
		getParam (html, result, 'qvc_exp', /Срок действия:([^>]*>){3}/i, replaceTagsAndSpaces, parseDate);
		// Получим отчеты, чтобы получить последнюю транзакцию по карте
		var today = new Date();
		var yr = today.getFullYear();
		var month = today.getMonth()+1;
		month = ('0'+month).slice(-2);
		var day = ('0'+today.getDate()).slice(-2);
		// На валидность проверяется только дата окончания отчета
		html = AnyBalance.requestGet(baseurl + 'qvc/reports.action?number='+card+'&daterange=true&start=01.01.2010&finish='+day+'.'+month+'.'+yr);
		
		var element = getParam (html, null, null, /<div[^>]*class="reportsLine(?:[^>]*>){9}\s*\d{1,2}.\d{1,2}.\d{2,4}(?:[^>]*>){25,30}[^>]*clearBoth/i, null, html_entity_decode);
		if(element) {
			var seller = getParam (element, null, null, /<div class="comment">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
			var ammount = getParam (element, null, null, /<div class="cash">([-\s\d,.]+)/i, replaceTagsAndSpaces);
			
			var date = getParam (element, null, null, /<span class="date">([\s\S]*?)<\//i, replaceTagsAndSpaces);
			var time = getParam (element, null, null, /<span class="time">([\s\S]*?)<\//i, replaceTagsAndSpaces);
			
			var all = date + ' ' + time +': \n' + seller + ' (' + ammount + ')';
			getParam (all, result, 'qvc_last');
		} else {
			AnyBalance.trace('Не нашли ни одной транзакции!');
		}
    }
    AnyBalance.setResult (result);
}

var g_currency = {
    RUB: 'р',
    USD: '$',
	EUR: '€',
    KZT: '〒',
    UAH: '₴',
};

function parseCurrencyMy(text){
    var currency = parseCurrency(text);
    return g_currency[currency] ? ' ' + g_currency[currency] : currency;
}

var baseurlAuth = 'https://auth.qiwi.com/';
var baseurl = 'https://w.qiwi.com/';
	
function requestAPI(action, params) {
    var info = AnyBalance.requestPost(baseurlAuth + action, JSON.stringify(params), g_headers);
    AnyBalance.trace ('Request result: ' + info);
	
    var response = getJson(info);	
	
    // Проверка ошибки входа
    if (!response.entity.ticket) {
		var error = response.entity.error.message;
		if(error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль|Неправильный номер телефона или пароль/i.test(error));
		
		throw new AnyBalance.Error('Не удалось войти в Qiwi Visa Wallet, сайт изменен?');
    }	
	
	return response;
}