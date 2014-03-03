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
	
	var login = prefs.login.replace(/(\d{3})(\d{3})(\d{2})(\d{2})/, "+7 ($1) $2-$3-$4");
	if(!login)
		throw new AnyBalance.Error('Не верный формат логина, необходимо вводить логин без +7 в начале и без пробелов.');
	
	var html = AnyBalance.requestGet(baseurl + 'auth.aspx', g_headers);
	
	var loginParams = { 
		'submitId':'SignIn',
		'timestamp':'/Date('+new Date().getTime()+'-14400000)/',
		'webFormValues': [
			{'name':'FormId','value':'SignInForm'},
			{'name':'SignInLogin','value':login},
			{'name':'ShowPassword','value':'false'},
			{'name':'Password','value':prefs.password}
		]
	};
	html = AnyBalance.requestPost(baseurl + 'AuthExII/AuthenticationBackendService.svc/SignIn', JSON.stringify(loginParams), addHeaders({
		Referer: baseurl + 'auth.aspx',
		'X-Requested-With':'XMLHttpRequest'
	}));
	
	var json = getJson(html);
	
	if (json.d.errors) {
		var errors = '';
		for(var i = 0; i < json.d.errors.length; i++) {
			var currnetMessage = getParam(json.d.errors[i].message, null, null, /<h2>([^<]+)/i, replaceTagsAndSpaces);
			errors += currnetMessage + (i < json.d.errors.length-1 ? ', ' : '');
		}
		if (errors != '')
			throw new AnyBalance.Error(errors, null, /Неверный логин или пароль/i.test(errors));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}	
	
	
	html = AnyBalance.requestGet(baseurl + 'Default.aspx?action=standing', g_headers);
	
	if(prefs.type == 'acc')
        fetchAccount(html, baseurl);
    else
        fetchCard(html, baseurl); //По умолчанию карты будем получать
}

function fetchCard(html, baseurl){
    var prefs = AnyBalance.getPreferences();
    //if(prefs.cardnum && !/^\d{4}$/.test(prefs.cardnum))
        //throw new AnyBalance.Error("Введите 4 последних цифры номера карты или не вводите ничего, чтобы показать информацию по первой карте");
	
	var div = getParam(html, null,null, /"content_balance_inner"[^>]*>([\s\S]*?)<\/table/i);
	if(!div)
		throw new AnyBalance.Error('Не удаётся найти данные по картам!');
	
	// <a\s*id="ctl\d+_rptCards_hlCard_\d+"\s+href="([^"]*)[^>]*>[^<]*Карта
	var re = new RegExp('<a\\s*id="ctl\\d+_rptCards_hlCard_\\d+"\\s+href="([^"]*)[^>]*>[^<]*' + (prefs.cardnum ? prefs.cardnum : ''), 'i');
    var href = getParam(html, null, null, re, replaceTagsAndSpaces, html_entity_decode);
	if(!href)
		throw new AnyBalance.Error('Не удаётся найти ' + (prefs.cardnum ? 'карту с последними цифрами ' + prefs.cardnum : 'ни одной карты!'));
	
	var html = AnyBalance.requestGet(baseurl + href, g_headers);

    var result = {success: true};
    getParam(html, result, 'cardnum', /"renamed"(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces);
	getParam(html, result, '__tariff', /"renamed"(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces);
    getParam(html, result, 'balance', /Можно потратить(?:[^>]*>){4}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, ['currency', 'balance'], /Можно потратить(?:[^>]*>){4}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'validto', /Окончание срока действия(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDate);
    
    AnyBalance.setResult(result);
}


function fetchAccount(html, headers, baseurl){
    var prefs = AnyBalance.getPreferences();
    if(prefs.cardnum && !/^\d{4}$/.test(prefs.cardnum))
        throw new AnyBalance.Error("Введите 4 последних цифры номера счета или не вводите ничего, чтобы показать информацию по первому счету");

    var re = new RegExp('(<tr[^>]*>\\s*<td[^>]*class="ui-narrowest"(?:[^>]*>){5}\s*\\d{16}' + (prefs.cardnum ? prefs.cardnum : '\\d{4}') + '[\\s\\S]*?</tr>)', 'i');
    var tr = getParam(html, null, null, re);

    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.cardnum ? 'счет с первыми цифрами ' + prefs.cardnum : 'ни одного счета!'));

    var result = {success: true};
    getParam(tr, result, 'cardnum', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'accnum', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, ['currency', 'balance'], /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    AnyBalance.setResult(result);
}