/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Данные по бонусной карте Eldorado

Сайт магазина: http://eldorado.com.ua/
Личный кабинет: http://www.club.eldorado.com.ua/enter.php
*/

function main(){
	var baseurl = 'http://www.club.eldorado.com.ua/enter.php';
	var prefs = AnyBalance.getPreferences();
//	AnyBalance.setDefaultCharset('windows-1251');
        var headers = {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
        'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
        'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.17 (KHTML, like Gecko) Chrome/24.0.1312.56 Safari/537.17',
    };
    
    var html = AnyBalance.requestGet(baseurl, headers); //Установим сессию

    headers.Referer = baseurl;
   
    html = AnyBalance.requestPost(baseurl, {
        pan: prefs.login,
        pin: prefs.pass,
	action: 'save'
    }, headers);

    var error = getParam(html, null, null, /<div[^>]*class=['"]red['"][^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    if(error)
        throw new AnyBalance.Error(error);

    if(!getParam(html, null, null, /(personal_silver_top)/i))
        throw new AnyBalance.Error("Не удалось зайти в личный кабинет. Проверьте, что вам удаётся зайти в него из браузера с указанными номером карты и ПИНом.");

    var result = {success: true};

		//ФИО
		getParam(html, result, '__tariff', /ФИО владельца:[^<]*<b>([^<]*)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);

		//Активная сумма
		getParam(html, result, 'balance', /Активная сумма:[^<]*<b>([^<]*)<\/b>/i, replaceTagsAndSpaces, parseBalance);

		//НЕактивная сумма
		getParam(html, result, 'balance_not_active', /НЕактивная сумма:[^<]*<b>([^<]*)<\/b>/i, replaceTagsAndSpaces, parseBalance);

		AnyBalance.setResult(result);
}
