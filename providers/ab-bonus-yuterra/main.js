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
	var baseurl = 'http://www.yuterra.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите номер карты!');
	
	var html = AnyBalance.requestGet(baseurl + 'klubnye_karty/balance/', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');

    var captcha_sid = getParam(html, null, null, /name="captcha_sid"\s*value="([\s\S]*?)"/i);
    AnyBalance.trace(captcha_sid);

    if(!captcha_sid){
    	if(/сумму начисленных БОНУСОВ прямо сейчас по бесплатному/i.test(html))
    		throw new AnyBalance.Error('Уютерра временно не предоставляет данные по карте онлайн: Узнайте текущий % начисления по Вашей карте и сумму начисленных БОНУСОВ прямо сейчас по бесплатному телефону горячей линии 8 800 100-71-71.');
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
    }
    
	var captchaa;
    AnyBalance.setOptions({forceCharset: 'base64'});
	AnyBalance.trace('Пытаемся ввести капчу');
	var captcha = AnyBalance.requestGet(baseurl + 'bitrix/tools/captcha.php?captcha_sid=' + captcha_sid, g_headers);
	captchaa = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
    AnyBalance.setOptions({forceCharset: 'utf-8'});
	AnyBalance.trace('Капча получена: ' + captchaa);
	
	html = AnyBalance.requestPost(baseurl + 'klubnye_karty/balance/', {
		'bonus_value': prefs.login,
		'captcha_sid': captcha_sid,
        'captcha_word': captchaa,
        'web_form_submit': 'Узнать скидку'
	}, addHeaders({Referer: baseurl + 'klubnye_karty/balance/'}));
	
	if (!/Ваша карта №/i.test(html)) {
		var error = getParam(html, null, null, /<div class="hr">(?:[\s\S]*?)style=["']color:red["'][^>]*>[\s\S]*?([\s\S]*?)<\//i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Такой карты не существует|неверный код с картинки/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Сумма начисленных бонусов на счете(?:[^>]*>){8}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'percent', /Текущий % начисления бонусов(?:[^>]*>){8}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'card', /Ваша карта №([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(html, result, 'term', /Срок действия % начисления(?:[^>]*>){8}([\s\S]*?)<\//i, replaceTagsAndSpaces);
	
	AnyBalance.setResult(result);
}