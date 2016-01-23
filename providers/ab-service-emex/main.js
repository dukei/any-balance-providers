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
	var baseurl = 'https://www.emex.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() >= 400)
            throw new AnyBalance.Error('Ошибка! Сервер не отвечает! Попробуйте обновить баланс позже.');
            
    
        var token = AB.getParam(html, null, null, /<input\s(?=[^>]*name="__RequestVerificationToken")[^>]*value="([^"]+)"/i, AB.replaceTagsAndSpaces);
        if (!token) {
            AnyBalance.trace(html);
            throw new AnyBalance.Error('Невозможно авторизоваться');
        }
	
	var params = {
            Login: prefs.login,
            Password: prefs.password,
            ReturnUrl: 'https://www.emex.ru/',
            __RequestVerificationToken: token
	};

	html = AnyBalance.requestPost(baseurl + 'Authorization.mvc/Login', params, AB.addHeaders({Referer: baseurl}));
        if(!html || AnyBalance.getLastStatusCode() >= 400)
            throw new AnyBalance.Error('Ошибка! Сервер не отвечает! Попробуйте обновить баланс позже.');

        var loginResult = AB.getJson(html);
        if (loginResult.state != 0) {
            AnyBalance.trace(html);
            throw new AnyBalance.Error(loginResult.message || 'Ошибка авторизации', false, /логин|пароль/i.test(loginResult.message));
        }

        html = AnyBalance.requestGet(baseurl + 'profile', g_headers);
        var json = AB.getParam(html, null, null, /InitialProfileData\s*=\s*([^;]+?(?=}};)}});/, AB.replaceTagsAndSpaces, AB.getJson);
        
        if (!json || !json.User) {
            AnyBalance.trace(html);
            throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	AB.getParam(json.Balance && json.Balance.AvailableBalance, result, 'balance');
        AB.getParam(json.User.UserI + ' ' + json.User.UserF, result, 'fio');
	
	AnyBalance.setResult(result);
}