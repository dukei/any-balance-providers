/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){
    var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.login, 'Введите идентификатор клиента!');
	checkEmpty(prefs.password, 'Введите секретный код!');
	
    var baseurl = 'https://m.regiobank.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + 'logon', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'logon', {
        username:prefs.login,
        password:prefs.password,
        authtype:'tbp', 
		submit:''
    }, addHeaders({Referer: baseurl + 'logon'}));

	var json = getJson(html);
	if(!json)
		throw new AnyBalance.Error('Не удалось войти в кабинет, проверьте идентификатор и секрентый код!');
	if(!json.personName){
        throw new AnyBalance.Error(json.message);
    }
	html = AnyBalance.requestGet(baseurl + 'accounts?_=', g_headers);
	
	json = getJson(html);
	if(!json)
		throw new AnyBalance.Error('Не удалось найти информацию по картам, сайт изменен?');
	
	var result = {success: true};

	// Первичная инфа завернута в счет, его и будем искать
	for(var i = 0; i < json.cardinfo.length; i++) {
		var current = json.cardinfo[i];
		// Если есть счет, то начинаем искать нужный
		if(prefs.acc ? endsWith(current.acctnumb, prefs.acc) : true) {
			getCardMain(current, result);
			break;			
		} else {
			throw new AnyBalance.Error('Не удалось найти счет с последними цифрами '+prefs.acc);
		}
	}
    AnyBalance.setResult(result);
}

function getCardMain(current, result) {
	getParam(current.acctnumb+'', result, '__tariff');
	getParam(current.acctnumb+'', result, 'acc_num');
	getParam(current.balance+'', result, 'balance', null, null, parseBalance);
	getParam(current.accttitle+'', result, 'accttitle');
	getParam(current.currency+'', result, ['currency', 'balance']);

	for (var i = 0; i < current.cards.length; i++) {
		var card = current.cards[i];
		getParam(card.cardnumb+'', result, 'cardnumb');
		getParam(card.expdate+'', result, 'card_expdate', null, null, parseDate);
		// пока ломаем, получаем только первую карту
		break;
	}
}