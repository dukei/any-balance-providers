/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){
    var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    var baseurl = 'https://parkingcab.mos.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	try {
		html = AnyBalance.requestPost(baseurl + 'local/MPGU.php', {
			module:'',
			login:'Войти в личный кабинет',
			_reqNo:0		
		}, g_headers);
		
		//AnyBalance.trace(html);
		
		html = AnyBalance.requestPost('https://login.mos.ru/eaidit/eaiditweb/outerlogin.do', {
			username:prefs.login,
			password:prefs.password,
		}, addHeaders({Referer: 'https://login.mos.ru/eaidit/eaiditweb/openouterlogin.do'})); 
	} catch (e) {}
	
	//AnyBalance.trace(html);
    if(!/logout/i.test(html)){
        /*var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);*/
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
    
	var result = {success: true};
	
    getParam(html, result, 'balance', /Текущий баланс[^>]*>[^>]*>[^>]*>[^>]*>[^>]*balance">([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	
	html = AnyBalance.requestGet(baseurl + '?page=accountData', g_headers);

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