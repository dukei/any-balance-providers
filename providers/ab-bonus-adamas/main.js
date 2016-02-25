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
	var baseurl = 'http://www.adamas.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	AB.checkEmpty(prefs.login, 'Введите логин!');
    AB.checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	var params = {
        'BACK_LINK': '',
        'yakor': AB.getParam(html, null, null, /<input[^>]*yakor[^>]*value="([^"]+)/i),
        'LOGIN': prefs.login,
        'PASSWORD': prefs.password,
        'n2': 'Войти'
    };
	
	var postHtml = AnyBalance.requestPost(baseurl + 'index.php', params, AB.addHeaders({Referer: baseurl}));
    html = AnyBalance.requestGet(baseurl + 'personal/', g_headers);
	
	if (!/logout/i.test(html)) {
		var error = AB.getParam(
            postHtml, null, null, /<div class="cont-input">[\s\S]*?<p[^>]*>([^<]+)/i, AB.replaceTagsAndSpaces
        );

		if (error) {
            throw new AnyBalance.Error(error, null, /Проверьте данные/i.test(error));
        }
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};

	var fName = AB.getParam(html, null, null, /name="name"[^>]+value="([\s\S]*?)"/i, AB.replaceTagsAndSpaces) || '';
	var lName = AB.getParam(html, null, null, /name="last_name"[^>]+value="([\s\S]*?)"/i, AB.replaceTagsAndSpaces) || '';
	var patronymic = AB.getParam(html, null, null, /name="SECOND_NAME"[^>]+value="([\s\S]*?)"/i, AB.replaceTagsAndSpaces) || '';

    AB.getParam(lName + ' ' + fName + ' ' + patronymic, result, 'fio');
    AB.getParam(html, result, 'phone', /Мобильный телефон:([\s\S]*?)<\/div>/i, [AB.replaceTagsAndSpaces, /(.*?)/, '+7$1']);
    AB.getParam(html, result, 'discount', /name="DISCOUNT"[^>]+value="([\s\S]*?)"/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'balance', /name="BONUS"[^>]+value="([\s\S]*?)"/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'cardNumber', /Номер карты:[\s\S]*?(\d+)<\/div>/i, AB.replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}