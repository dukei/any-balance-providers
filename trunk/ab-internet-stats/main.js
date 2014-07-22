/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и другую информацию для интерент провайдера СвязьТехноСервис

Operator site: http://www.stsats.ru/
Личный кабинет: http://cab.stsats.ru/
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

    var baseurl = "http://cab.stsats.ru/";

    AnyBalance.setDefaultCharset('windows-1251');

    var html = AnyBalance.requestPost(baseurl + 'index.php', addHeaders({Referer: baseurl})); 

	var params = createFormParams(html);
  	var captcha_href = getParam(html, null, null, /(pic.php[^"]*)/i);
        if    (name == 'intext')  {  
				if(AnyBalance.getLevel() < 7)
               				throw new AnyBalance.Error ('Этот провайдер требует ввода капчи. Обновите программу для поддержки капчи.');
                	AnyBalance.trace('Пытаемся ввести капчу');
			var captchaimg = AnyBalance.requestGet(baseurl + captcha_href);
               		value = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captchaimg);
       			AnyBalance.trace('Капча получена: ' + value);
			
        }
 
	params.l = prefs.login;
	params.p = prefs.password;
        
        html = AnyBalance.requestPost(baseurl + 'index.php', params, addHeaders({Referer: baseurl}));

    if(!/logout\.php/i.test(html)){
        var error = getParam(html, null, null, /alert\(\'([\s\S]*?)\'/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');

    }
	AnyBalance.trace('Авторизация выполнена');
        AnyBalance.trace('Начинаю парсить...');
        
    var result = {success: true};
    getParam(html, result, 'fio', /Добро пожаловать в [^<]*?кабинет,\s*([\s\S]*?)!/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'id', /Ваш персональный ID:\s*<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);

    html = AnyBalance.requestGet(baseurl + "wrapper.php?cclass_id=17", g_headers);

    if (/wrapper\.php\?v_s=26/i.test(html)) {      
        html = AnyBalance.requestGet(baseurl + "wrapper.php?v_s=26", g_headers);
        html = AnyBalance.requestGet(baseurl, g_headers);

        getParam(html, result, 'balance', /Баланс:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'promise', /Сумма обещанных платежей:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'ipStatus', /Состояние IP адресов:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, 'period', /Текущий период:\s*([\s\S]*?)<\/h2>/i, replaceTagsAndSpaces, html_entity_decode);  
        getParam(html, result, 'rekplat', /Необходимая для внесения [^<]*?услуг:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance); 
        getParam(html, result, 'trafik', /Объем использованного трафика:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'tarif', /Текущий тариф [\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);  
    }

    if (/wrapper\.php\?v_s=27/i.test(html)) {            
        html = AnyBalance.requestGet(baseurl + "wrapper.php?v_s=27", g_headers);
        html = AnyBalance.requestGet(baseurl, g_headers);

        getParam(html, result, 'balancePhone', /Баланс:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'promisePhone', /Сумма обещанных платежей:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'statusPhone', /Состояние тел\. номеров клиента:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
    }

    if (/wrapper\.php\?v_s=32/i.test(html)) {            
        html = AnyBalance.requestGet(baseurl + "wrapper.php?v_s=32", g_headers);
        html = AnyBalance.requestGet(baseurl, g_headers);

        getParam(html, result, 'balanceWimax', /Баланс:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'promiseWimax', /Сумма обещанных платежей:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'statusWimax', /Состояние IP адресов:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, 'periodWimax', /Текущий период:\s*([\s\S]*?)<\/h2>/i, replaceTagsAndSpaces, html_entity_decode);  
        getParam(html, result, 'rekplatWimax', /Необходимая для внесения [^<]*?услуг:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'trafikWimax', /Объем использованного трафика:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);  
        getParam(html, result, 'tarifWimax', /Текущий тариф [\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);  
    }

    AnyBalance.setResult(result);
}
