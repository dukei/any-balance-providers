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
	var baseurl = 'https://lk.asvt.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'billing/!w3_p_main.showform?CONFIG=CONTRACT', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	html = AnyBalance.requestPost(baseurl + 'billing/!w3_p_main.showform?CONFIG=CONTRACT', {
        IDENTIFICATION: 'CONTRACT',
        FORMNAME: 'QFRAME',
        BUTTON: 'Войти',
        NAME_PASS: '',
		USERNAME: prefs.login,
		PASSWORD: prefs.password
	}, addHeaders({Referer: baseurl + 'billing/!w3_p_main.showform?CONFIG=CONTRACT'}));
    
	if (!/self\.location\.replace/i.test(html)) {
		var error = getParam(html, null, null, /class=ErrorText[^>]*>([\s\S]*?)</i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверное имя|Неверный пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
    var menu = getParam(html, null, null, /name="menu"\s+src="([^"]+)/i, replaceTagsAndSpaces, html_entity_decode);
    checkEmpty(menu, 'Не удалось найти ссылку на переадресацию, сайт изменен?', true);
    
    html = AnyBalance.requestGet(baseurl + 'billing/!w3_p_main.showform' + menu, g_headers);
    
    if(prefs.accnum && !/^\d{5}$/.test(prefs.accnum))
        throw new AnyBalance.Error("Введите номер договора или не вводите ничего, чтобы показать информацию по первому договору");
	
    var href = getParam(html, null, null, new RegExp("javascript:Click\\('R!C\\d*?!','\\?FORMNAME=\\S*?&CONTR_ID=\\d*?&SID=\\S*?&NLS=WR','data'\\)\">Договор\\s" + (prefs.accnum || "\\d+") + "</a>", 'i'), replaceTagsAndSpaces);
    
    if(!href) {
		AnyBalance.trace(href);
		throw new AnyBalance.Error("Не удалось найти " + (prefs.accnum ? ' номер договора ' + prefs.accnum : 'ни одного договора!'));        
    }
	
    var formname = getParam(href, null, null, /FORMNAME=([\s\S]*?)&/i);
    var contr_id = getParam(href, null, null, /CONTR_ID=([\s\S]*?)&/i);
    var sid = getParam(href, null, null, /SID=([\s\S]*?)&/i);
    
	checkEmpty(formname && contr_id && sid, 'Не удалось найти ссылку на договор, сайт изменен?', true);
	
 	html = AnyBalance.requestPost(baseurl + 'billing/!w3_p_main.showform?FORMNAME=' + formname + '&CONTR_ID=' + contr_id + '&SID=' + sid + '&NLS=WR', {}, addHeaders({Referer: baseurl + 'billing/!w3_p_main.showform?CONFIG=CONTRACT'}));  
    
	var result = {success: true};
    
	getParam(html, result, 'balance', /Текущий баланс \(на(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'recommended', /Рекомендуемая сумма платежа:(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'fio', /Абонент:[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'type', /Тип объекта договора:(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'account', /Состояние счёта по договору № (\d+)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'inner_id', /Внутренний идентификатор:(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'state', /Состояние:(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
    
	AnyBalance.setResult(result);
}