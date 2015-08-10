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
	var baseurl = 'http://www.autodoc.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'Account/LogOn', {
		returnUrl:'/',
		UserName: prefs.login,
		Password: prefs.password,
		'RememberMe': 'false'
	}, addHeaders({Referer: baseurl}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /logon_error[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Логин и\(или\) пароль неверны/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'discount', />Скидка:(?:[^>]*>){3}([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
	
	if(isAvailable('balance')) {
		html = AnyBalance.requestGet(baseurl + 'Web/Pages/BalanceForm.aspx?type=1', g_headers);
		
		getParam(html, result, 'balance', /"Баланс с учётом получения всех заказанных деталей"(?:[^>]*>){6}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	}
	
	if(isAvailable('orders_details') && prefs.order_num) {
		var dt = new Date();
		
		html = AnyBalance.requestGet(baseurl + 'Web/Pages/ordersSubClients.aspx?m=Dvigenie&OrderNumber='+prefs.order_num+'&Article=&From=14.05.2012&To='+dt.getDate()+'.'+(dt.getMonth()+1)+'.'+dt.getFullYear()+'&StateID=0&p=p1week&m=Dvigenie', g_headers);
		
		var rows = sumParam(html, null, null, /<tr class="gridItemStyleOp" style="background-color:#(?:CCFFCD|b2e59f)">(?:[^>]*>){20,30}\s*<\/tr>/ig);
		var all = '<b>Заказ №' + prefs.order_num + '</b><br/>';
		if(rows) {
			for(var i = 0; i < rows.length; i++) {
				var name = getParam(rows[i], null, null, /"detal"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
				//var sum = getParam(rows[i], null, null, /"order_num"[^>]*>([\d\s.,]*)<\/td>\s*<td class="comment/i, replaceTagsAndSpaces, parseBalance);
				var title = getParam(rows[i], null, null, /"comment tipp"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
				//var comment = getParam(rows[i], null, null, /"comment"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
				var awaiting = getParam(rows[i], null, null, /<td style="width:100px">([\s\S]*?)<\//i, replaceTagsAndSpaces) || 'Неизвестно';				
				
				all += name + ': ' + title + ' - Ожидается: ' + awaiting + '<br/>';
			}
			getParam(all, result, 'orders_details', null, [/<br\/>$/, '']);
		}
	}
	
	AnyBalance.setResult(result);
}