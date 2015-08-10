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

function getParamByName(html, name) {
	return getParam(html, null, null, new RegExp('name="' + name + '"[^>]*value="([^"]*)"'));
}

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://i.lockobank.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'Account/Login.aspx?ReturnUrl=%2fmain.aspx', g_headers);
	
	if(AnyBalance.getLastStatusCode() > 400) {
		throw new AnyBalance.Error('Ошибка! Сервер не отвечает! Попробуйте обновить баланс позже.');
	}
	
	var params = [
		['__EVENTTARGET',''],
		['__EVENTARGUMENT',''],
		['__VIEWSTATE',getParamByName(html, '__VIEWSTATE')],
		['__EVENTVALIDATION',getParamByName(html, '__EVENTVALIDATION')],
		['ctl00_ctl03_popupControlAlertWS','0:0:-1:-10000:-10000:0:350px:-10000:1:0:0:0'],
		['ctl00$cphPageContent$txtName',prefs.login],
		['ctl00$cphPageContent$txtPassword',prefs.password],
		['ctl00$cphPageContent$btnOK.x','101'],
		['ctl00$cphPageContent$btnOK.y','23'],
		['ctl00$ContactInfoCtrl$sReg','1'],
		['ctl00_ctl04_popupControl1WS','0:0:-1:-10000:-10000:0:400px:-10000:1:0:0:0'],
		['ctl00_ctl04_popupControl2WS','0:0:-1:-10000:-10000:0:400px:-10000:1:0:0:0'],
		['ctl00_ctl04_popupControl3WS','0:0:-1:-10000:-10000:0:400px:-10000:1:0:0:0'],
		['ctl00_ctl04_popupControl4WS','0:0:-1:-10000:-10000:0:400px:-10000:1:0:0:0'],
		['DXScript','1_145,1_81,1_137,1_120,1_78,1_130,1_128,1_99,1_105,1_92'],
	]
	
	html = AnyBalance.requestPost(baseurl + 'Account/Login.aspx?ReturnUrl=%2fmain.aspx', params, addHeaders({Referer: baseurl + 'Account/Login.aspx?ReturnUrl=%2fmain.aspx', 'Origin':'https://i.lockobank.ru'}));
	
	var html2 = AnyBalance.requestGet(baseurl + 'main.aspx', g_headers);
	
	if (!/CloseSession/i.test(html + html2)) {
		var error = getParam(html + html2, null, null, /alert\("([\s\S]*?)"\)/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Проверьте правильность имени и повторите ввод пароля/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	if (prefs.type == 'card')
		fetchCard(baseurl, html, result);
	else if (prefs.type == 'dep') 
		fetchDeposit(baseurl, html, result);
	//else if (prefs.type == 'cred') 
		//fetchCredit(baseurl, html, result);
	else
		fetchAccount(baseurl, html, result);
	
	AnyBalance.setResult(result);
}

function fetchDeposit(baseurl, html, result){
    var prefs = AnyBalance.getPreferences();
	
    /*if(prefs.num && !/^\d{4}$/.test(prefs.num))
        throw new AnyBalance.Error('Введите последние 4 цифры интересующего вас депозита или не вводите ничего, чтобы получить информацию по первому счету!');
	*/
	var href = getParam(html, null, null, /<a href="\/([^"]+)">\s*Депозиты/i);
	if(!href) {
		throw new AnyBalance.Error('Не удалось найти ссылку на информацию по депозитам, сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + href, g_headers);
	
    var table = getParam(html, null, null, /class="cH">Депозиты<([\s\S]*?)<\/table>/);
    if(!table)
        throw new AnyBalance.Error('Не найдено ни одного депозита!');
	
	getParam(table, result, 'type', />Валюта(?:[\s\S]*?<td[^>]*>){7}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(table, result, 'balance', />Валюта(?:[\s\S]*?<td[^>]*>){8}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, ['currency', '__tariff'], />Валюта(?:[\s\S]*?<td[^>]*>){6}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
}

function fetchAccount(baseurl, html, result){
    var prefs = AnyBalance.getPreferences();
	
    if(prefs.num && !/^\d{4}$/.test(prefs.num))
        throw new AnyBalance.Error('Введите последние 4 цифры интересующего вас счета или не вводите ничего, чтобы получить информацию по первому счету!');
	
	var href = getParam(html, null, null, /<a href="\/([^"]+)">\s*Текущие счета/i);
	if(!href) {
		throw new AnyBalance.Error('Не удалось найти ссылку на информацию по счетам, сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + href, g_headers);
	// <tr>\s*(?:[^>]*>){5}\d{16}2000(?:[^>]*>){5,7}\s*</tr>
	var re = new RegExp('<tr>\\s*(?:[^>]*>){5}\\d{16}' + (prefs.num || '\\d{4}') + '(?:[^>]*>){5,7}\\s*</tr>', 'i');
    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error(prefs.num ? 'Не удалось найти счет с последними цифрами ' + prefs.num : 'Не найдено ни одного счета!');
	
	getParam(tr, result, 'type', /(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(tr, result, 'accnum', /(?:[^>]*>){5}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(tr, result, 'balance', /(?:[^>]*>){11}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(tr, result, ['currency', '__tariff'], /(?:[^>]*>){9}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
}

function fetchCard(baseurl, html, result){
    var prefs = AnyBalance.getPreferences();

    if(prefs.num && !/^\d{4}$/.test(prefs.num))
        throw new AnyBalance.Error('Введите последние 4 цифры интересующей вас карты или не вводите ничего, чтобы получить информацию по первой карте!');
	
	var href = getParam(html, null, null, /<a href="\/([^"]+)">\s*Банковские карты/i);
	if(!href) {
		throw new AnyBalance.Error('Не удалось найти ссылку на информацию по картам, сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + href, g_headers);
	// <tr>\s*(?:[^>]*>){9,11}\*{6,}4771(?:[^>]*>){16,20}\s*</tr>
	var re = new RegExp('<tr>\\s*(?:[^>]*>){9,11}\\*{6,}' + (prefs.num || '\\d{4}') + '(?:[^>]*>){16,20}\\s*</tr>', 'i');
    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error(prefs.num ? 'Не удалось найти карту с последними цифрами ' + prefs.num : 'Не найдено ни одной карты!');
	
	getParam(tr, result, 'type', /(?:[^>]*>){12}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(tr, result, 'cardnum', /(?:[^>]*>){10}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(tr, result, '__tariff', /(?:[^>]*>){10}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(tr, result, 'fio', /(?:[^>]*>){15}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(tr, result, 'till', /(?:[^>]*>){17}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDate);
	getParam(tr, result, 'balance', /(?:[^>]*>){23}([\s\S]*?)<\//i, [replaceTagsAndSpaces, /В процессе изготовления|Готова для выдачи/i, '0.00'], parseBalance);
	getParam(tr, result, ['currency', '__tariff'], /(?:[^>]*>){21}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
}