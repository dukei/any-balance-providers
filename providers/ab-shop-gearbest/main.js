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
	var loginUrl = 'https://login.gearbest.com/m-users-a-sign.htm',
        userUrl = 'http://user.gearbest.com/my-favorites.html';

	AnyBalance.setDefaultCharset('utf-8');
	
	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(loginUrl + '?type=1', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	var params = {
        'email': prefs.login,
        'password': prefs.password,
        'code': getCaptchaCode()
    };
	
	html = AnyBalance.requestPost(
        'https://login.gearbest.com/m-users-a-act_sign.htm',
        params,
        AB.addHeaders({
            'Referer': loginUrl + '?type=1',
            'X-Requested-With': 'XMLHttpRequest'
        })
    );

    // POST возвращает голый текст
    if (/incorrect/i.test(html)) {
        throw new AnyBalance.Error(html, null, /email|password/i.test(html));
    }

    html = AnyBalance.requestGet(userUrl, g_headers);
	
	if (!/users-a-logout/i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	AB.getParam(html, result, 'my_points', /my points:\s*<span[^>]*>([\s\S]*?)<\/span>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'points', /Points\s*=[\s\S]*?orgp="([\s\S]*?)"/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'gb_wallet', /<li>My GB Wallet[\s\S]*?orgp="([\s\S]*?)"/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	
	AnyBalance.setResult(result);
}

function getCaptchaCode() {
    AnyBalance.trace('Пытаемся ввести капчу');
    var captchaImg = AnyBalance.requestGet('https://login.gearbest.com/fun/?act=verify');
    AnyBalance.trace('Капча получена: ' + captchaImg);
    return AnyBalance.retrieveCode('Пожалуйста, введите код с картинки', captchaImg);
}