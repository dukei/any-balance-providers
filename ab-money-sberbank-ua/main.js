/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
/*	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',*/
	'Accept-Language': 'ru,en-US;q=0.8,en;q=0.6,uk;q=0.4',
	'Connection': 'keep-alive',
	'Origin': 'https://online.oschadbank.ua',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.66 Safari/537.36 OPR/25.0.1614.31 (Edition beta)',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://online.oschadbank.ua/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введіть логін!');
	checkEmpty(prefs.password, 'Введіть пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'wb/', g_headers);
	
	var execKey = getParam(html, null, null, /execution=([\s\S]{4})/i);

  
	var href = getParam(html, null, null, /id="FORM_FAST_LOGIN"[^>]*action="\/([^"]*)/i);
	
	var params = createFormParams(html, function(params, str, name, value) {  
  		if (name == 'AUTH_METHOD') 
			return 'FAST_PWA';  
		if (name == 'Login') 
			return prefs.login;
		else if (name == 'password')
			return prefs.password;
		else if (name == '_flowExecutionKey')
			return execKey; 
		else if (name == '_eventId')
			return 'submitUserId'; 
    
		return value;
	});
	html = AnyBalance.requestPost(baseurl + href, params, addHeaders({Referer: baseurl + 'wb/auth/userlogin?execution=' + execKey}));

AnyBalance.trace(baseurl + 'wb/auth/userlogin?execution=' + execKey);
                                                                                        
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /Смена Пароля(?:[\s\S]*?<[^>]*>){2}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error) 
			throw new AnyBalance.Error(error);
		error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);

		if (error) 
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не вдалося зайти в особистий кабінет. Сайт змінено?');
	}
	if (prefs.type == 'acc') 
		fetchAcc(html);
	else 
		fetchCard(html, baseurl);
}

function getSID(html) {
	var sid = getParam(html, null, null, /'SID'[^>]*value='([^']*)/i, replaceTagsAndSpaces, html_entity_decode);
	return sid;
}

function fetchCard(html, baseurl) {
	var prefs = AnyBalance.getPreferences();
	if (prefs.lastdigits && !/^\d{4}$/.test(prefs.lastdigits)) 
		throw new AnyBalance.Error("Надо вказати 4 останніх цифри карти або не вказувати нічого");
	
	var result = {success: true};
	
	getParam(html, result, 'fio', /user-name"([^>]*>){4}/i, replaceTagsAndSpaces);
	
	var cardnum = prefs.lastdigits || '\\d{4}';
	// <div class="owwb-cs-slide-list-item-inner">(?:[^>]*>){15}[\s\d*]{10,}9528(?:[^>]*>){120}
	var regExp = new RegExp('<div class="owwb-cs-slide-list-item-inner">(?:[^>]*>){15}[\\s\\d*]{10,}' + cardnum + '(?:[^>]*>){120}','i');
	var root = getParam(html, null, null, regExp);
    if (!root) {
		AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не вдалося знайти ' + (prefs.lastdigits ? 'карту с останніми цифрами ' + prefs.lastdigits : 'ні однієї карти!'));
    }
    getParam(root, result, 'balance', /(?:Доступно:|"amount"[^>]*>)\s*(-?[\d\s.,]+)/i, replaceTagsAndSpaces, parseBalance);
    getParam(root, result, 'maxlimit', /(?:Кредитний ліміт:)\s*(-?[\d\s.,]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(root, result, 'till', /Дата закінчення дії(?:[^>]*>){4}([\s\S]*?)<\//i, replaceTagsAndSpaces, (prefs.dz == 'mmyy') ? null : getDz);
    getParam(root, result, 'debt', /Загальна заборгованість(?:[^>]*>){5}([\s\S]*?)<\/div/i, replaceTagsAndSpaces, parseBalance);
    getParam(root, result, 'rr', /Номер рахунку(?:[^>]*>){4}([\s\S]*?)<\//i, replaceTagsAndSpaces);
    getParam(root, result, ['currency', 'balance', 'maxlimit', 'debt'], /amount-currency[^>]*>([^<]+)/i, [replaceTagsAndSpaces, /[^a-zа-я]/ig, '']);
    getParam(root, result, '__tariff', /(\d{4}\*{6,}\d{4})/i);
	getParam(root, result, 'cardNumber', /(\d{4}\*{6,}\d{4})/i);
	
	AnyBalance.setResult(result);
}

function fetchAcc(html) {
	throw new AnyBalance.Error('Получение данных по счетам еще не поддерживается, свяжитесь с автором провайдера!');
}

function getDz(date) {
    var months = {'січень': '01','лютий': '02','березень': '03','квітень': '04','травень': '05','червень': '06','липень': '07','серпень': '08','вересень': '09','жовтень': '10','листопад': '11','грудень': '12'};
	
	var mm = getParam(date, null, null, null, [replaceTagsAndSpaces, /[\d\s]/g, '']);
    var yy = getParam(date, null, null, null, [replaceTagsAndSpaces, /\D/g, '']);
	if(!mm || !yy)
		return date;
	
	return months[mm] + '.' + yy;
}