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

var g_baseurl = 'http://stat.pentabox.ru/index.html/wuser/w3_p_Main.ShowForm';

function login() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('windows-1251');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestPost(g_baseurl, [
		['P1', 'USERNAME'],
		['V1', prefs.login],
		['P2', 'PASSWORD'],
		['V2', prefs.password],
		['P3', 'FORMNAME'],
		['V3', 'IP_CONTRACTS;FORMNAME:IDENTIFICATION;SID:;NLS:RUS;FIRST:;FORM_NAME:IP_CONTRACTS;'],
		['P20', 'BUTTON'],
		['V20', 'Вход']
	], addHeaders({Referer: g_baseurl + '?P20=FORMNAME:IP_CONTRACTS;SID:;NLS:RUS;'}));
	
	if (!/<meta[^>]+content="IP_CONTRACTS"/i.test(html)) {
		var error = getParam(html, null, null, /alert\s*\(\s*\"([^"]*)/i, replaceSlashes);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверное имя|Неверный пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	return html;
}

function processAccounts(html, result){
	var table = getElements(html, [/<table[^>]*>/ig, /№ договора/i])[0];
	if(!table){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти таблицу договоров. Сайт изменен?');
	}

	result.accounts = [];

	var rows = table.split(/<tr[^>]*>/ig);
	for(var i=0; i<rows.length; ++i){
		var row = rows[i];
		if(!/<td[^>]*>/i.test(row))
			continue; //Нет ячеек, значит, или заголовок, или конец таблицы.

		var id = getParam(row, null, null, /CONTR_ID:([^;]*)/i, null, html_entity_decode);
		var name = getParam(row, null, null, /<a[^>]+IP_CONTRACT_INFO[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);
		var acc = {__id: id, __name: name};
		
		if(__shouldProcess('accounts', acc)){
			processAccount(row, acc);			
		}

		result.accounts.push(acc);
	}
}

function processAccount(html, result){
	getParam(html, result, 'accounts.fio', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<(?:td|tr|\/table)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'accounts.balance', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<(?:td|tr|\/table)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'accounts.balance_new', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*)/i, replaceTagsAndSpaces, parseBalance);

	if(AnyBalance.isAvailable('accounts.traffic')){
		var href = getParam(html, null, null, /<a[^>]+href="[^"]*w3_p_Main.ShowForm([^"]*IP_CONTRACT_INFO[^"]*)/i, null, html_entity_decode);
		if(!href){
			AnyBalance.trace(html);
			AnyBalance.trace('Не удаётся найти ссылку на расширенную информацию о договоре. Сайт изменен?');
			return;
		}
	    
		html = AnyBalance.requestGet(g_baseurl + href, g_headers);
		var form = getElements(html, [/<form[^>]*>/ig, /W3_L_NEWCHRG/])[0];
		if(!form){
			AnyBalance.trace(html);
			AnyBalance.trace('Не удаётся найти форму для перехода на расширенную информацию о договоре. Сайт изменен?');
			return;
		}
        
        var params = createFormParams(form, null, true);
        html = AnyBalance.requestPost(g_baseurl, params, g_headers);
        
        getParam(html, result, 'accounts.traffic', /Объем Интернет трафика(?:[\s\S]*?<td[^>]*>){2}((?:[\s\S]*?(?:td|tr|\/table)[^>]*>){2})/i, replaceTagsAndSpaces, parseTrafficGb);
    }
}			
