/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'Content-Type':'application/json; charset=UTF-8',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
	'Origin':'https://www.kaspi.kz',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.kaspi.kz/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var login = getParam(prefs.login || '', null, null, /^\d{10}$/, [/^(\d{3})(\d{3})(\d{2})(\d{2})$/, '+7 ($1) $2-$3-$4']);
	if(!login)
		throw new AnyBalance.Error('Не верный формат логина, необходимо вводить логин без +7 в начале и без пробелов.');
	
	var html = AnyBalance.requestGet(baseurl + 'entrance', g_headers);
	
	var loginParams = { 
		'submitId':'SignIn',
		'requesTimestamp':'/Date('+new Date().getTime()+'-14400000)/',
		'webFormValues': [
			{'name':'FormId','value':'SignInForm'},
			{'name':'SignInLogin','value':login},
			{'name':'ShowPassword','value':'false'},
			{'name':'Password','value':prefs.password}
		]
	};
	html = AnyBalance.requestPost(baseurl + 'api/auth/sign-in', JSON.stringify(loginParams), addHeaders({
		Referer: baseurl + 'entrance',
		'X-Requested-With':'XMLHttpRequest'
	}));
	
	//var json = getJson(html);
	
	/*if (json.d.errors) {
		var errors = '';
		for(var i = 0; i < json.d.errors.length; i++) {
			var currnetMessage = getParam(json.d.errors[i].message, null, null, /<h2>([^<]+)/i, replaceTagsAndSpaces);
			errors += currnetMessage + (i < json.d.errors.length-1 ? ', ' : '');
		}
		if (errors != '')
			throw new AnyBalance.Error(errors, null, /Неверный логин или пароль/i.test(errors));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}*/	
	
	html = AnyBalance.requestGet(baseurl + 'index.aspx?action=bank', g_headers);
	
	if(prefs.type == 'dep')
        fetchDepozit(html, baseurl);
    else
        fetchCard(html, baseurl); //По умолчанию карты будем получать
}

function fetchCard(html, baseurl){
    var prefs = AnyBalance.getPreferences();
    if(prefs.cardnum && !/^\d{4}$/.test(prefs.cardnum))
        throw new AnyBalance.Error("Введите 4 последних цифры номера карты или не вводите ничего, чтобы показать информацию по первой карте");
	
	// <div[^>]*id="account(?:[^>]*>){4}\s*(?:[^>]*>)?[\s*]*Russ(?:[^>]*>){50,255}\s*<\/div>\s*<\/div>
	var re = new RegExp('<div[^>]*id="account(?:[^>]*>){4}\\s*(?:[^>]*>)?[\\s*]*' + (prefs.cardnum ? prefs.cardnum : '[^<]+') + '(?:[^>]*>){50,255}(?:\\s*<\\/div>){3,6}', 'i');
    var account = getParam(html, null, null, re, replaceTagsAndSpaces, html_entity_decode);
	if(!account)
		throw new AnyBalance.Error('Не удаётся найти ' + (prefs.cardnum ? 'карту с последними цифрами ' + prefs.cardnum : 'ни одной карты!'));
	
    var result = {success: true, currency: '₸'};
	
	getParam(account, result, 'balance', /Можно потратить[^<]+?([\s*\d.,-]+)т\s/i, replaceTagsAndSpaces, parseBalance);
    getParam(account, result, 'cardnum', /([\s\S]*?)Можно потратить/i, replaceTagsAndSpaces);
	getParam(account, result, '__tariff', /([\s\S]*?)Можно потратить/i, replaceTagsAndSpaces);
	getParam(account, result, 'validto', /Срок действия карты([\s\d.,]+)/i, replaceTagsAndSpaces, parseDate);

	getParam(account, result, 'cred_balance', /Кредитные средства([\s\d.,]+т)/i, replaceTagsAndSpaces, parseBalance);
	getParam(account, result, 'card_debt', /Задолженность по карте([\s\d.,]+т)/i, replaceTagsAndSpaces, parseBalance);
	getParam(account, result, 'main_debt', /Основной долг([\s\d.,]+т)/i, replaceTagsAndSpaces, parseBalance);
	getParam(account, result, 'pcts', /Проценты к оплате([\s\d.,]+т)/i, replaceTagsAndSpaces, parseBalance);
	getParam(account, result, 'payment_ammount', /Платеж по карте([\s\d.,]+т)/i, replaceTagsAndSpaces, parseBalance);
	getParam(account, result, 'payment_left', /Осталось внести([\s\d.,]+т)/i, replaceTagsAndSpaces, parseBalance);
	getParam(account, result, 'limit', /Кредитный лимит([\s\d.,]+т)/i, replaceTagsAndSpaces, parseBalance);
	getParam(account, result, 'pay_in', /Через([\s\d.,]+)дн/i, replaceTagsAndSpaces, parseBalance); 
	
    AnyBalance.setResult(result);
}

function fetchDepozit(html, baseurl){
    var prefs = AnyBalance.getPreferences();
    if(prefs.cardnum && !/^\d{4}$/.test(prefs.cardnum))
        throw new AnyBalance.Error("Введите 4 последних цифры номера счета или не вводите ничего, чтобы показать информацию по первому счету");
	
	//html = AnyBalance.requestGet(baseurl + 'index.aspx?action=my-bank#item_deposits', g_headers);
	
    var re = new RegExp('<div[^>]*deposit(?:[^>]*>){3,5}\\s*(?:[^>]*>)?[\\s*]*' + (prefs.cardnum ? prefs.cardnum : '[^<]+') + '(?:[^>]*>){10,255}(?:\\s*</div>){6}', 'i');
    
	var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.cardnum ? 'счет с первыми цифрами ' + prefs.cardnum : 'ни одного счета!'));

    var result = {success: true, currency: '₸'};
	
    getParam(tr, result, 'balance', /Накоплено(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'cardnum', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, 'accnum', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	
    AnyBalance.setResult(result);
}