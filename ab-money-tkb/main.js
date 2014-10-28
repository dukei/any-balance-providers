/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 'ru,en;q=0.8',
	'Connection': 'keep-alive',
	'Origin': 'https://i.tkb.ru',
	'Cache-Control':'max-age=0',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.104 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	
	var baseurl = 'https://i.tcb.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	AnyBalance.setCookie('i.tcb.ru', 'CookiesEnabled', 'OK');
	AnyBalance.setCookie('i.tcb.ru', 'serv', 'front4');
	// AnyBalance.setCookie('i.tcb.ru', 'online-menu-opened-node', ' ');
	// AnyBalance.setCookie('i.tcb.ru', 'online-menu-selected-leaf', ' ');
	
	var html = AnyBalance.requestGet(baseurl + 'index.csp', g_headers);
	
	var form = getParam(html, null, null, /<FORM[^>]*action="\/j_security_check[\s\S]*?<\/FORM>/i);
	var action = getParam(form, null, null, /action="\/(j_security_check[^"]+)/i);
	checkEmpty(form && action, 'Не удалось найти форму входа, сайт изменен?', true);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	html = AnyBalance.requestPost(baseurl + action, [
		['j_security_check', 'csp.logon.apply'],
		['j_username', prefs.login],
		['jfull_username', prefs.login],
		['j_password', prefs.password],
	], addHeaders({Referer: baseurl}));

	// html = AnyBalance.requestGet(baseurl + 'user/standalone_menu', g_headers);

	if (!/Подождите, пожалуйста/i.test(html)) {
		var error = getParam(html, null, null, /LogonFail(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /ошиблись/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	// Переходим на страницу с картами
	html = AnyBalance.requestGet(baseurl + 'front/?redirect=true&facesBeanName=cardListAction&method=cardStateForm', g_headers);
	
	var result = {success: true};
	
	var card = getParam(html, null, null, new RegExp('<tr(?:[^>]*>){3}[\\d*\\s]{10,20}' + (prefs.card || '') + '(?:[^>]*>){25,30}\\s*</td>\\s*</tr>', 'i'));
	if(!card) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти ' + (prefs.card ? 'карту с последними цифрами ' + prefs.card : 'ни одной карты!'));
	}
	
	AnyBalance.trace(card);
	
	getParam(card, result, 'balance', /(?:[^>]*>){21}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(card, result, '__tariff', /(?:[^>]*>){3}([\s\d*]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(card, result, 'card_num', /(?:[^>]*>){3}([\s\d*]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(card, result, 'card_name', /(?:[^>]*>){3}[\s\d*]+([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(card, result, 'deadline', /(?:[^>]*>){14}([\d.]+)/i, replaceTagsAndSpaces, parseDate);
	getParam(card, result, 'card_account', /(?:[^>]*>){15}([\d]{20})/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}