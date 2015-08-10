/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'*/*',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	// Mobile
	//'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+',
	// Desktop
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
	'X-MicrosoftAjax':'Delta=true',
	
};
function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://www.kras.ru:8081/';
	AnyBalance.setDefaultCharset('utf-8');
	
	if(!prefs.login)
		throw new AnyBalance.Error('Введите логин!');
	if(!prefs.password)
		throw new AnyBalance.Error('Введите пароль!');
		
	//var html = AnyBalance.requestGet(baseurl + 'Shared/AuthenticationView.aspx', g_headers);

	var html = AnyBalance.requestPost(baseurl + 'Shared/AuthenticationView.aspx', {
		loginTextBox:prefs.login,
		passwordTextBox:prefs.password,
		closeButton:'Вход'
	}, addHeaders({Referer: 'http://www.kras.ru/'}));
	
	var html = AnyBalance.requestGet(baseurl + 'Contract/ContractsView.aspx', g_headers);
	
	if(!/НАСТРОЙКИ/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if(error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
    var result = {success: true};
	getParam(html, result, 'dogovor', /<span>Договоры<\/span>(?:[\s\S]*?<span[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'acc_num', /<span>Договоры<\/span>(?:[\s\S]*?<span[^>]*>){10}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /<span>Договоры<\/span>(?:[\s\S]*?<span[^>]*>){11}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /<span>Договоры<\/span>(?:[\s\S]*?<span[^>]*>){9}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	
    AnyBalance.setResult(result);
}