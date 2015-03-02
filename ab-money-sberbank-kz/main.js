/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'Origin': 'https://online.sberbank.kz',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://online.sberbank.kz/';
	var error, html, redirect;
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	html = AnyBalance.requestGet(baseurl + 'CSAFront/index.do', g_headers);

	html = AnyBalance.requestPost(baseurl + 'CSAFront/login.do', {
		'field(login)': prefs.login,
		'field(password)': prefs.password,
		deviceprint: 'version=3.4.0.0_2&pm_fpua=mozilla/5.0 (windows nt 6.1; wow64) applewebkit/537.36 (khtml, like gecko) chrome/40.0.2214.115 safari/537.36|5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.115 Safari/537.36|Win32&pm_fpsc=24|1440|900|900&pm_fpsw=&pm_fptz=3&pm_fpln=lang=ru|syslang=|userlang=&pm_fpjv=1&pm_fpco=1&pm_fpasw=widevinecdmadapter|pepflashplayer|internal-remoting-viewer|internal-nacl-plugin|pdf|npauthz|npspwrap|npgoogleupdate3|npnv3dv|npnv3dvstreaming|npvlc|npwlpg|npitunes|npfgoperaplugin&pm_fpan=Netscape&pm_fpacn=Mozilla&pm_fpol=true&pm_fposp=&pm_fpup=&pm_fpsaw=1440&pm_fpspd=24&pm_fpsbd=&pm_fpsdx=&pm_fpsdy=&pm_fpslx=&pm_fpsly=&pm_fpsfse=&pm_fpsui=&pm_os=Windows&pm_brmjv=40&pm_br=Chrome&pm_inpt=&pm_expt=',
		htmlinjection: '{"functions":{"names":["$","authform","blackberrylocationcollector","divfloat","domdatacollection","fingerprint","floattostring","html5locationcollector","hashtable","ie","ie_fingerprint","iframerequest","indicator","interactionelement","loginvalidator","mozilla_fingerprint","opera_fingerprint","passwordvalidator","payinput","requiredvalidator","select","selectcore","staticmessagemanager","str2date","str2time","strcheck","timer","uielementlist","uievent","validator","windows","absposition","activexdetect","addadditionalmessage","addclearmasks","addelementtoform","adderror","addeventlistener","addeventlistenerex","addfield","addfieldwithcheck","addhidden","addinactiveesmessage","addmessage","addoption","addorderparameter"],"excluded":{"size":0,"count":0},"truncated":true},"inputs":["field(login)","field(password)","hiddenajaxurlerrorform","hiddenajaxurlstageform","iehack","password"],"iframes":[],"scripts":[191,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,500,730,810,229,0,1661,240,2,218],"collection_status":0}',
		manvsmachinedetection: '1,1,INPUT:text,10@1,3,0;1,1,0;1,5,0;1,5,0;1,4,0;1,3,0;1,4,0@0,1425305183296,0',
		operation: 'button.begin'
	}, addHeaders({
		Referer: baseurl + 'CSAFront/index.do',
		'X-Requested-With': 'XMLHttpRequest'
	}));

	redirect = getParam(html, null, null, /name="\$\$redirect"\s+value="([^"]+)/i);

	if(!redirect){
		if(/\$\$errorFlag/i.test(html)){
			error = getParam(html, null, null, /[\s\S]*/i, replaceTagsAndSpaces, html_entity_decode);
			throw new AnyBalance.Error(error, null, null, /неправильный идентификатор\/логин|неправильный пароль/i.test(error));
		}
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	html = AnyBalance.requestGet(redirect, g_headers);

	if (!/logoff/i.test(html)) 
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');

	// Счет возможно работает некорректно, т.к. не было возможности протестировать
	 if (prefs.type == 'acc')
		fetchAcc(html, baseurl);
	 else
		fetchCard(html, baseurl);
}

function fetchCard(html, baseurl) {
	var prefs = AnyBalance.getPreferences();

	if (prefs.lastdigits && !/^\S{3}$/.test(prefs.lastdigits))
		throw new AnyBalance.Error("Надо указывать 3 последних символа карты или не указывать ничего");

	var html = AnyBalance.requestGet(baseurl + 'PhizIC/private/cards/list.do', g_headers);

	var accounts = sumParam(html, null, null, /all-about-product[\s\S]+?productBottom[^>]*>/g);
	if(!accounts || (isArray(accounts) && accounts.length === 0))
		throw new AnyBalance.Error('Не найдено ни одной карты');

	//Ищем заданную пользователем карту или берем первую
	var account;
	if(prefs.lastdigits){
		var filtered = accounts.filter(function(account){return new RegExp('accountNumber[^>]*>[^,]*?' + prefs.lastdigits + ',').test(account); });
		if(filtered.length > 1)
			throw new AnyBalance.Error('Найдено больше одной карты с последними цифрами ' + prefs.lastdigits);
		else if(filtered.length === 0)
			throw new AnyBalance.Error('Не найдено ни одной карты с последними цифрами ' + prefs.lastdigits);
		else
			account = filtered[0];
	} else {
		account = accounts[0];
	}
	AnyBalance.trace('Найдена карта');

	var result = {success: true};

	getParam(html, result, 'userName', /previousEnterInfo[^>]>[\s\S]*?<\/span>/i, replaceTagsAndSpaces);
	getParam(account, result, '__tariff', /mainProductTitle[^>]*>([^<]+)/i);
	getParam(account, result, 'date', /действует по([^<]+)/i, replaceTagsAndSpaces, parseDate);
	getParam(account, result, 'balance', /overallAmount[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(account, result, 'currency', /overallAmount[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseCurrency);

	AnyBalance.setResult(result);
}

function fetchAcc(html, baseurl) {
	var prefs = AnyBalance.getPreferences();
	if (prefs.lastdigits && !/^\S{3}$/.test(prefs.lastdigits))
		throw new AnyBalance.Error("Надо указывать 3 последних символа счёта или не указывать ничего");

	var html = AnyBalance.requestGet(baseurl + 'PhizIC/private/accounts.do', g_headers);

	var accounts = sumParam(html, null, null, /all-about-product[\s\S]+?productBottom[^>]*>/g);
	if(!accounts || (isArray(accounts) && accounts.length === 0))
		throw new AnyBalance.Error('Не найдено ни одного счета');

	//Ищем заданный пользователем счет или берем первый
	var account;
	if(prefs.lastdigits){
		var filtered = accounts.filter(function(account){return new RegExp('accountNumber[^>]*>[^,]*?' + prefs.lastdigits + ',').test(account); });
		if(filtered.length > 1)
			throw new AnyBalance.Error('Найдено больше одной счета с последними цифрами ' + prefs.lastdigits);
		else if(filtered.length === 0)
			throw new AnyBalance.Error('Не найдено ни одного счета с последними цифрами ' + prefs.lastdigits);
		else
			account = filtered[0];
	} else {
		account = accounts[0];
	}
	AnyBalance.trace('Найден счет');

	var result = {success: true};

	getParam(html, result, 'userName', /previousEnterInfo[^>]>[\s\S]*?<\/span>/i, replaceTagsAndSpaces);
	getParam(account, result, '__tariff', /mainProductTitle[^>]*>([^<]+)/i);
	getParam(account, result, 'date', /действует по([^<]+)/i, replaceTagsAndSpaces, parseDate);
	getParam(account, result, 'balance', /overallAmount[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(account, result, 'currency', /overallAmount[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseCurrency);

	AnyBalance.setResult(result);
}