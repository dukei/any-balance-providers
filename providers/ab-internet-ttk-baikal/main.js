/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_baseUrls = {
	all: 'https://stat.baikal-ttk.ru/',
	yak: 'https://188.244.184.44/',
}

function main(){
    var prefs = AnyBalance.getPreferences();

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	processCabinet(g_baseUrls[(prefs.region || 'all')], prefs)
}

function processCabinet(baseurl, prefs){
    var html = AnyBalance.requestGet(baseurl);
    var login_name = getParam(html, null, null, /(login_remote\w+)/i);
    var pass_name = getParam(html, null, null, /(password_remote\w+)/i);
	
    if(!login_name || !pass_name)
		throw new AnyBalance.Error('Не удалось найти форму входа в личный кабинет!');
	
    var params = {
		roiiur:0,
		soiiur:true,
		redirect:''
    };
	
    params[login_name] = prefs.login;
    params[pass_name] = prefs.password;
    params['action.remote_login.0kiiur.x'] = 23;
    params['action.remote_login.0kiiur.y'] = 6;
	
    var html = AnyBalance.requestPost(baseurl + 'login', params);
	
    var error = getParam(html, null, null, /<font [^>]*class="error"[^>]*>([\s\S]*?)<\/font>/i, replaceTagsAndSpaces, html_entity_decode);
    if(error)
        throw new AnyBalance.Error(error);
	
    var result = {success: true};
	
    html = AnyBalance.requestGet(baseurl + 'webUserLogin');
	
    getParam(html, result, 'userName', /<!-- Наименование клиента -->[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'licschet', /Договор (\d+) от/i, replaceTagsAndSpaces, html_entity_decode);
//    getParam(html, result, 'status', /Состояние:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Итого на [\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, [replaceTagsAndSpaces, /долг|задолженность/i, '-'], parseBalance);
	
    var href = getParam(html, null, null, /<a href=["']([^'"]+)["'][^>]*>сменить тариф Интернет<\/a>/i);
    if(href){
		html = AnyBalance.requestGet(baseurl + href);
        getParam(html, result, '__tariff', /Текущий тариф[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    }
	
    AnyBalance.setResult(result);
}