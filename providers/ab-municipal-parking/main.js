/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'Origin': 'https://login.mos.ru',
	'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){
    var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    var loginurl = 'https://login.mos.ru/',
    	siteurl = 'https://parkingcab.mos.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 
	
	var html = AnyBalance.requestGet(loginurl + 'eaidit/eaiditweb/openouterlogin.do', g_headers);

	html = AnyBalance.requestPost(loginurl + 'eaidit/eaiditweb/outerlogin.do', {
		username: prefs.login,
		password: prefs.password		
	}, addHeaders({ Referer: loginurl + 'eaidit/eaiditweb/openouterlogin.do' }));

	html = AnyBalance.requestGet(loginurl + 'eaidit/eaiditweb/redirect.do?redirectto=https%3A%2F%2Fpgu.mos.ru%2Fru%2Fid%2F%3Fto%3Dhttps%253A%252F%252Fparkingcab.mos.ru%252Flocal%252FMPGU.php%252F%253Flogin%253D1%2526redirect%253D', g_headers)

    if(!/logout/i.test(html)){
        /*var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);*/
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
    
	var result = {success: true};
	
    getParam(html, result, 'balance', /<strong[^>]*class="balance"[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	
	html = AnyBalance.requestGet(siteurl + '?page=accountData', g_headers);

	var trs = sumParam(html, null, null, /<tr>\s*<td[^>]+toggle-details(?:[^>]+>){18}\s+<\/tr>/ig);
		
	var text = '';
	for(var i = 0; i < trs.length; i++) {
		var name = getParam(trs[i], null, null, /([^>]+>){7}/i, replaceTagsAndSpaces);
		var region = getParam(trs[i], null, null, /([^>]+>){9}/i, replaceTagsAndSpaces);
		var regNumAndPermNum = getParam(trs[i], null, null, /([^>]+>){13}/i, replaceTagsAndSpaces);
		var till = getParam(trs[i], null, null, /([^>]+>){15}/i, replaceTagsAndSpaces, html_entity_decode);
		
		getParam(regNumAndPermNum, result, 'car' + (i+1), /([^<(\s]+)/i);
		getParam(regNumAndPermNum, result, 'permission' + (i+1), /\(([\-\d]+)/i);
		getParam(till, result, 'permission_till' + (i+1), /\d{2}.\d{2}.\d{4}$/i, null, parseDate);
		
		getParam(html, result, '__tariff', /Тарифный план:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, 'phone', /Номер:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
		// Сводка
		text += name + ' ' + region + ': ' + regNumAndPermNum + ' ' + till + '<br/><br/>';
	}
	
	getParam(text, result, 'all', null, [/<br\/><br\/>$/i, '']);
	
    AnyBalance.setResult(result);
}