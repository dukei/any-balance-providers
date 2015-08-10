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

function createParamsArray(params){
    var a = [];
    for(var i=0; i<params.length; ++i)
        a[a.length] = encodeURIComponent(params[i][0]) + '=' + encodeURIComponent(params[i][1]);
    return a.join('&');
}

function main(){
    var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var baseurl = "https://cabinet.idport.kz:8443/IdPort/";
	AnyBalance.setDefaultCharset('utf-8'); 
	
	var html = AnyBalance.requestGet(baseurl + 'login/login.cfm', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'index.cfm', {
		AuthType:prefs.authtype || 1,
		j_username: prefs.login,
		j_password: prefs.password,
		'sSubmit': 'ВХОД В КАБИНЕТ'
	}, addHeaders({Referer: baseurl + 'login/login.cfm'}));

    /*var logtype = prefs.authtype == 2 ? 'Телефон :' : 'Логин :';
    var sitetype = prefs.sitetype || 1;
    var html = AnyBalance.requestPost(baseurl + 'index.cfm', createParamsArray([
        ['AuthType',prefs.authtype || 1],
        ['AuthTypeText',logtype],
        ['j_username',sitetype == 1 ? prefs.login : ''],
        ['AuthTypeTextPass','Пароль :'],
        ['j_password',sitetype == 1 ? prefs.password : ''],
        ['AuthTypeText2',logtype],
        ['j_username',sitetype == 2 ? prefs.login : ''],
        ['AuthTypeTextPass','Пароль :'],
        ['j_password',sitetype == 2 ? prefs.password : ''],
        ['AuthTypeText3',logtype],
        ['j_username',sitetype == 3 ? prefs.login : ''],
        ['AuthTypeTextPass','Пароль :'],
        ['j_password',sitetype == 3 ? prefs.password : ''],
    ]), addHeaders({Referer: baseurl + 'index.cfm', 'Content-Type': 'application/x-www-form-urlencoded'})); */
	
	if(!/\?logout=true/i.test(html)){
		if(/location.href\s*=\s*'https?:\/\/cabinet.idport.kz(?::\d+)?\/IdPort\/index_error.html'/.test(html))
            throw new AnyBalance.Error('Неверно указаны логин или пароль');
			
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	// Бывает, что требуется смена пароля, при этом /\?logout=true/i.test(html) == true
	if(/src\s*=\s*"\s*fMain\.cfm\?Registration=true&LangId=\d+/i.test(html)){
		throw new AnyBalance.Error('Вам требуется сменить пароль! Зайдите в кабинет через браузер и поменяйте ваш пароль.');
	}
	
    html = AnyBalance.requestGet(baseurl + 'index.cfm', g_headers);
	
    var result = {success: true};
	
    getParam(html, result, 'fio', [/>Уважаемый \(ая\)([^,]+)/i, /<td[^>]*>\s*(?:ФИО|АЖТ)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i], replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', [/>Уважаемый \(ая\)([^,]+)/i, /<td[^>]*>\s*(?:ФИО|АЖТ)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i], replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'licschet', [/(?:Лицевой счет|Дербес шот)([^>]*>){3}/i, /<td[^>]*>\s*(?:Лицевой счет|Дербес шот)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i], replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'login', [/(?:Логин|Логин)([^>]*>){3}/i, /<td[^>]*>\s*(?:Логин|Логин)[\s\S]*?<td[^>]*>([\s\S]*?)(?:<a|<\/td>)/i], replaceTagsAndSpaces, html_entity_decode);
	
	if(isAvailable('balance')) {
		html = AnyBalance.requestGet(baseurl + 'presentation/billing/index.cfm?show_only_balance=true', g_headers);
		
		getParam(html, result, 'balance', /"pay_amount"[^>]*value="([^"]*)/i, replaceTagsAndSpaces, parseBalance);
	}
	//Возвращаем результат
    AnyBalance.setResult(result);
}