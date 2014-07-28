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
    var baseurl = 'http://simglobalsim.ru/';
    AnyBalance.setDefaultCharset('utf-8');
	
	var html = AnyBalance.requestGet(baseurl + 'emptyfrontpage?destination=emptyfrontpage', g_headers);
	
	var form_build_id = getParam(html, null, null, /name="form_build_id"\s*id="([\s\S]*?)"/i, null, html_entity_decode);
    if(!form_build_id)
        throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
	
	html = AnyBalance.requestPost(baseurl + 'emptyfrontpage?destination=emptyfrontpage', {
        'form_build_id':form_build_id, 
        name:prefs.login,
        pass:prefs.password,
		'form_id':'user_login_block',
		'nachricht':'',
		'op':'Войти',
    }, g_headers); 
	
    if(!/Logout/i.test(html)) {
        var error = getParam(html, null, null, /Ошибка!<\/h4>([^>]*>){1}/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error, null, /имя пользователя или пароль неверны/i.test(html));
		
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	
	html = AnyBalance.requestGet(baseurl + 'user', g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'fio', /Название[\s\S]*?<dd>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'phone', /Телефон GLOBALSIM[\s\S]*?<dd>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Баланс[\s\S]{1,50}<dd>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}