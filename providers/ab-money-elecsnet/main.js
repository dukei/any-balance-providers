/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/28.0.1500.72 Safari/537.36',
	'Origin':'https://1.elecsnet.ru'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://1.elecsnet.ru';
    AnyBalance.setDefaultCharset('utf-8'); 
    
    AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

    var html = AnyBalance.requestGet(baseurl + '/notebookfront', g_headers);
    
    if (!html || AnyBalance.getLastStatusCode() >= 400) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    var form = AB.getElement(html, /<form[^>]*?NotebookFront\/Account/i);
    if (!form) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не найдена форма авторизации. Сайт изменен?');
    }
    
    var params = createFormParams(form, function(params, str, name, value){
        if(name == 'Login.Value')
            return prefs.login;
        else if(name == 'Password.Value')
            return prefs.password;
        return value;
    });
    
    html = AnyBalance.requestPost(baseurl + '/NotebookFront/Account', params, addHeaders({
        Referer: baseurl + '/notebookfront'
    })); 

	if (!/logoutBtn/i.test(html)) {
		var error = getElement(html, /<div[^>]*?validation-message/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Неправильно введены учетные данные/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
    var result = {success: true};
	
    getParam(html, result, 'balance', /Доступно:?\s*<\/span\s*>\s*<div[^>]*?count[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(prefs.login, result, 'phone');
	
    AnyBalance.setResult(result);
}