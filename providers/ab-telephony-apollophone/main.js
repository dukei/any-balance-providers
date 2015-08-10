 /**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Apollophone Телефония
Сайт оператора: http://www.apollophone.ru
Личный кабинет: https://secure.apollophone.com/

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
    AnyBalance.setDefaultCharset('utf-8');    

    var baseurl = "https://secure.apollophone.com/";
    
	var html;
    var result = {success: true};
	
	if(prefs.type == 'card') {
		html = AnyBalance.requestPost('https://secure.apollophone.ru/cardoffice/' , {
			ap_login:prefs.login,
			ap_password:'',
			office_action:'login_do',
			'tx_apollologin_pi1[submit_button]':'Войти'
		} , addHeaders({Referer: baseurl}));
		
		if(!/header__login__exit/i.test(html)) {
			throw new AnyBalance.Error('Не удалось войти в личный кабинет с номером карты '+prefs.login+' проверьте правильность ввода');
		}
		
		getParam(html, result, 'balance', /Ваш баланс:([\s\S]*?)руб/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, '__tariff', /Тип карты:\s*<strong>([\s\S]*?)<\/strong>/i, replaceTagsAndSpaces);
	} else {
		html = AnyBalance.requestPost('https://secure.apollophone.ru/office/' , {
			ap_login:prefs.login,
			ap_password:prefs.password,
			office_action:'login_do',
			'tx_apollologin_pi1[submit_button]':'Войти'
		} , addHeaders({Referer: baseurl}));
		
		var error = getParam(html, null, null, /<td[^>]*class="zv3"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
		if(error)
			throw new AnyBalance.Error(error);

		getParam(html, result, 'balance', /Ваш баланс:([^>]+>){2}/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'currency', /Ваш баланс:([^>]+>){2}/i, replaceTagsAndSpaces, parseCurrency);
		getParam(html, result, 'number', /Абонент:([^>]+>){2}/i, replaceTagsAndSpaces);
		getParam(html, result, 'userName', /<input[^>]*name='cont1'[^>]*value="([^"]*)/i, replaceTagsAndSpaces);
		getParam(html, result, '__tariff', /<input[^>]*name='cont1'[^>]*value="([^"]*)/i, replaceTagsAndSpaces);
	}
    AnyBalance.setResult(result);
}