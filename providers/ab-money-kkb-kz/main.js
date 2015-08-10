/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.homebank.kz/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
    var ft = getParam(html, null, null, /value="([0-9]*?)"[\s]name="ft_"/i, replaceTagsAndSpaces, html_entity_decode);
    
	html = AnyBalance.requestPost(baseurl + 'login/login.htm', {
		tbUserId: prefs.login,
		tbPassword: prefs.password,
		ft_: ft,
        isKeyBoard: 'false'
	}, addHeaders({Referer: baseurl}));
	
    html = AnyBalance.requestGet(baseurl + 'finance/accounts/allaccounts.htm', g_headers);
    
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /class="error"[^>]*>[\s\S]*?([\s\S]*?)<\/td/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Введите корректный Идентификатор|Вы ввели неверный пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	var numPart = '';
	if(prefs.num) {
		for(var i = 0; i < prefs.num.length; i++) {
			numPart += '\\s*' + prefs.num[i];
		}
	}
	
	if (prefs.type == 'card') 
		fetchCard(baseurl, html, result, numPart);
	else if (prefs.type == 'acc') 
		fetchAccount(baseurl, html, result, numPart);
    else 
        fetchCard(baseurl, html, result, numPart);        
    
    function fetchCard(baseurl, html, result, numPart){
    
        var table = getParam(html, null, null, /Платежные карты[\s\S]*?(<table[\s\S]*?Текущие счета)/ig);
        
        getParam(table, result, 'account', new RegExp('(KZ[0-9\\sA-Z]*?' + numPart + ')</', 'i'), replaceTagsAndSpaces, html_entity_decode);
        checkEmpty(result.account, 'Не удалось найти ' + (prefs.num ? 'продукт с последними цифрами ' + prefs.num : 'ни одного банковского продукта!'), true);
        AnyBalance.trace(table); 

        getParam(table, result, 'balance', new RegExp('title="[^"]*Идентификационный[^>]*>[^<]+' + numPart + '[\\s\\S]*?class="tgtr"[\\s\\S]*?>([\\s\\S]*?)</td', 'i'), replaceTagsAndSpaces, parseBalance);
        getParam(table, result, ['currency', 'balance'], new RegExp('title="[^"]*Идентификационный[^>]*>[^<]+' + numPart + '[\\s\\S]*?class="tgtr"[\\s\\S]*?>([\\s\\S]*?)</td', 'i'), replaceTagsAndSpaces, parseCurrency);
        getParam(table, result, 'available', new RegExp('title="[^"]*Идентификационный[^>]*>[^<]+' + numPart + '[\\s\\S]*?class="tgtr"(?:[\\s\\S]*?>){3}([\\s\\S]*?)</td', 'i'), replaceTagsAndSpaces, parseBalance);
        getParam(table, result, 'blocked', new RegExp('title="[^"]*Идентификационный[^>]*>[^<]+' + numPart + '[\\s\\S]*?class="tgtr"(?:[\\s\\S]*?>){5}([\\s\\S]*?)</td', 'i'), replaceTagsAndSpaces, parseBalance);
        getParam(table, result, 'repayment', new RegExp('title="[^"]*Идентификационный[^>]*>[^<]+' + numPart + '[\\s\\S]*?class="tgtr"(?:[\\s\\S]*?>){11}([\\s\\S]*?)</td', 'i'), replaceTagsAndSpaces, parseBalance);
    }
    
    function fetchAccount(baseurl, html, result, numPart){
        
        var table = getParam(html, null, null, /Текущие счета[\s\S]*?(<table[\s\S]*?<\/iframe)/ig);
        
        getParam(table, result, 'account', new RegExp('(KZ[0-9\\sA-Z]*?' + numPart + ')</', 'i'), replaceTagsAndSpaces, html_entity_decode);
        checkEmpty(result.account, 'Не удалось найти ' + (prefs.num ? 'продукт с последними цифрами ' + prefs.num : 'ни одного банковского продукта!'), true);
        AnyBalance.trace(table);

        getParam(table, result, 'balance', new RegExp('title="[^"]*Идентификационный[^>]*>[^<]+' + numPart + '[\\s\\S]*?class="tgtr"[\\s\\S]*?>([\\s\\S]*?)</td', 'i'), replaceTagsAndSpaces, parseBalance);
        getParam(table, result, ['currency', 'balance'], new RegExp('title="[^"]*Идентификационный[^>]*>[^<]+' + numPart + '[\\s\\S]*?class="tgtr"[\\s\\S]*?>([\\s\\S]*?)</td', 'i'), replaceTagsAndSpaces, parseCurrency);
        getParam(table, result, 'available', new RegExp('title="[^"]*Идентификационный[^>]*>[^<]+' + numPart + '[\\s\\S]*?class="tgtr"(?:[\\s\\S]*?>){3}([\\s\\S]*?)</td', 'i'), replaceTagsAndSpaces, parseBalance);
        getParam(table, result, 'blocked', new RegExp('title="[^"]*Идентификационный[^>]*>[^<]+' + numPart + '[\\s\\S]*?class="tgtr"(?:[\\s\\S]*?>){5}([\\s\\S]*?)</td', 'i'), replaceTagsAndSpaces, parseBalance);
    }
    
	AnyBalance.setResult(result);
}