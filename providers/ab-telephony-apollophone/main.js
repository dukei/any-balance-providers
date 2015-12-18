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

    checkEmpty(prefs.login, 'Введите номер договора, номер телефона или пин-код!');
    checkEmpty(/^[0-9]{10}$/.test(prefs.login) || prefs.password, 'Для номера договора или телефона необходимо ввести пароль!');

    var baseurl = "https://lk.apollophone.ru";
    
	var html = AnyBalance.requestGet(baseurl, g_headers);
	var form = getElement(html, /<form[^>]+id="loginform"[^>]*>/i);

	if(!form)
		throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');

	var action = getParam(form, null, null, /<form[^>]+action="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
	if(/^[0-9]{10}$/.test(prefs.login)) //Пин-код
		action = '/127/';

	html = AnyBalance.requestPost(baseurl + action , {
		ap_login: prefs.login,
		ap_password: prefs.password,
		office_action:'login_do',
		'tx_apollologin_pi1[submit_button]':'Войти'
	}, addHeaders({Referer: baseurl}));

	if(!/header__login__exit/i.test(html)) {
		var error = getParam(html, null, null, /<td[^>]+class="error"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
		if(error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет с номером карты '+prefs.login+' проверьте правильность ввода');
	}

	var result = {success: true};

	getParam(html, result, 'balance', /Ваш баланс:([^>]+>){2}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'currency', /Ваш баланс:([^>]+>){2}/i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'number', /Абонент:([^>]+>){2}/i, replaceTagsAndSpaces);
	getParam(html, result, '__tariff', /Тип карты:\s*<strong>([\s\S]*?)<\/strong>/i, replaceTagsAndSpaces);

	var join_space = create_aggregate_join(' ');
	sumParam(html, result, '__tariff', /<input[^>]*name="first_name"[^>]*value="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode, join_space);
	sumParam(html, result, '__tariff', /<input[^>]*name="middle_name"[^>]*value="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode, join_space);
	sumParam(html, result, '__tariff', /<input[^>]*name="last_name"[^>]*value="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode, join_space);

	getParam(result.__tariff, result, 'userName');

    AnyBalance.setResult(result);
}