/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
var g_headers = {
	'Accept':'text/plain,*/*;q=0.01',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.22 (KHTML, like Gecko) Chrome/25.0.1364.172 Safari/537.22',
	'X-Requested-With':'XMLHttpRequest'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8'); 

    var baseurl = "http://oao-tts.ru/";

	var html = AnyBalance.requestGet(baseurl + 'index.php/balans-karty', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	var captchaa;
	if(AnyBalance.getLevel() >= 7) {
		AnyBalance.trace('Пытаемся ввести капчу');
		var src = getParam(html, null, null, /modules\/mod_balans\/lib\/kcaptcha[^"]+/i);
		var captcha = AnyBalance.requestGet(baseurl + src);
		captchaa = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
		AnyBalance.trace('Капча получена: ' + captchaa);
	}else{
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
	}
	
	html = AnyBalance.requestPost(baseurl + 'modules/mod_balans/ajax.php', {
		n: prefs.login,
		keystring: captchaa,
	}, addHeaders({Referer: baseurl + 'index.php/balans-karty'}));
	
	var json = getJson(html);
	
    if(json.result != 'data'){
        throw new AnyBalance.Error(json.rem || 'Не удалось получить информацию по карте. Введен неверный номер карты?');
    }
	
    var result = {success: true};
	
    getParam(json.balance + '', result, 'balance', null, replaceTagsAndSpaces, parseBalance);
    getParam(json.tknumber + '', result, '__tariff', null, replaceTagsAndSpaces, html_entity_decode);
    getParam(json.ostlgottips + '', result, 'lgotleft', null, replaceTagsAndSpaces, parseBalance);
    getParam(json.lgottips + '', result, 'lgotnum', null, replaceTagsAndSpaces, parseBalance);
    // getParam(json.lgottips + '', result, 'lgotlast', /<li[^>]*>Дата последней поездки:([\s\S]*?)<\/?li>/i, replaceTagsAndSpaces, parseDate);

    AnyBalance.setResult(result);
}