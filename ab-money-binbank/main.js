/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://online.binbank.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'lite/app/pub/Login', g_headers);
	
	var matches = /Wicket.Ajax.ajax\(\{"f":"id([^"]+)","\w":".\/([^"]+)/i.exec(html);
    if(!matches){
        var prof = getParam(html, null, null, /<title>(Профилактические работы)<\/title>/i);
        if(prof)
            throw new AnyBalance.Error("В настоящее время в системе Интернет-банк проводятся профилактические работы. Пожалуйста, попробуйте ещё раз позже.");
        throw new AnyBalance.Error("Не удаётся найти форму входа в интернет-банк! Сайт недоступен или изменения на сайте.");
    }
	
    var id = matches[1], href = matches[2];

    var params = {};
    params[id + "_hf_0"] = '';
    params.hasData = 'X';
    params.login = prefs.login;
    params.password = prefs.password;
	
	html = AnyBalance.requestPost(baseurl + 'lite/app/pub/' + href, params, addHeaders({Referer: baseurl + 'lite/app/pub/Login'}));
	
	if(!/lite\/app\/pub\/Exit/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if(error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + 'lite/app/priv/accounts', g_headers);
	
	fetchCard(html, baseurl, prefs); //По умолчанию карты будем получать
}

function fetchCard(html, baseurl, prefs){
    if(prefs.cardnum && !/^\d{4}$/.test(prefs.cardnum))
        throw new AnyBalance.Error("Введите 4 последних цифры номера карты или не вводите ничего, чтобы показать информацию по первой карте");
	
	// <div[^>]*class="card-info"(?:[^>]*>){2}[\d\s*]{10,}5241(?:[^>]*>){20,30}\s*<div[^>]*class="account-amount-info"(?:[^>]*>){10,40}(?:\s*?<\/div>){3}
	var re = new RegExp('<div[^>]*class="card-info"(?:[^>]*>){2}[\\d\\s*]{10,}' + (prefs.cardnum ? prefs.cardnum : '') + '(?:[^>]*>){20,30}\\s*<div[^>]*class="account-amount-info"(?:[^>]*>){10,40}(?:\\s*?</div>){3}', 'i');
    var card = getParam(html, null, null, re);
	if(!card)
		throw new AnyBalance.Error('Не удаётся найти ' + (prefs.cardnum ? 'карту с последними цифрами ' + prefs.cardnum : 'ни одной карты!'));
	
	AnyBalance.trace('Got card div: ' + card);
	
    var result = {success: true};
	
	getParam(card, result, 'fio', /(?:[\s\S]*?<td[^>]*>){8}([\s\S]*?)<\//i, replaceTagsAndSpaces);
	
	getParam(card, result, 'accnum', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\//i, replaceTagsAndSpaces);
    getParam(card, result, 'cardnum', /"card-info"(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(card, result, '__tariff', /"card-info"(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces);
    getParam(card, result, 'balance', /"amount"(?:[^>]*>){2}([\s\S]*?)<\//i, [replaceTagsAndSpaces, /([\s\S]+)-/, '$1.'], parseBalance);
    getParam(card, result, ['currency', 'balance'], /"amount"(?:[^>]*>){3}([\s\S]*?)<\//i, [replaceTagsAndSpaces, /\./, '']);
    
    AnyBalance.setResult(result);
}