/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
var g_headers = {
	'Accept':'text/plain,*/*;q=0.01',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.22 (KHTML, like Gecko) Chrome/25.0.1364.172 Safari/537.22'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8'); 

    var baseurl = "http://oao-tts.ru/";

	var html = AnyBalance.requestGet(baseurl + 'index.php/balans-karty', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');

    var params = {
        n: prefs.login,
        keystring: getCaptcha(baseurl, html)
    };
	
	html = AnyBalance.requestPost(
        baseurl + 'modules/mod_balans/ajax.php',
        params,
        AB.addHeaders({
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Origin': baseurl,
            'Referer': baseurl + 'index.php/balans-karty',
            'X-Requested-With': 'XMLHttpRequest'
        })
    );
	
	var json = AB.getJson(html);
	
    if(json.result != 'data'){
        throw new AnyBalance.Error(json.rem || 'Не удалось получить информацию по карте. Введен неверный номер карты?');
    }
	
    var result = {success: true};

    AB.getParam(json.balance + '', result, 'balance', null, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(json.tknumber + '', result, '__tariff', null, AB.replaceTagsAndSpaces);
    AB.getParam(json.ostlgottips + '', result, 'lgotleft', null, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(json.lgottips + '', result, 'lgotnum', null, AB.replaceTagsAndSpaces, AB.parseBalance);

    AnyBalance.setResult(result);
}

function getCaptcha(url, html) {
    if (AnyBalance.getLevel() < 7) {
        throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
    }

    AnyBalance.trace('Пытаемся ввести капчу');
    var src = AB.getParam(html, null, null, /(modules\/mod_balans\/lib\/kcaptcha[^"]+)/i);
    var captcha = AnyBalance.requestGet(
        url + src,
        AB.addHeaders({
            Referer: url + 'index.php/balans-karty'
        })
    );
    captcha = AnyBalance.requestGet(
        url + src + '&R=' + Math.random() * 10 * 3,
        AB.addHeaders({
            Referer: url + 'index.php/balans-karty'
        })
    );

    var captchaCode = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
    AnyBalance.trace('Капча получена: ' + captchaCode);
    return captchaCode;
}