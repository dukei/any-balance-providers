/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/33.0.1750.154 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'ru-ru,ru;q=0.8,en-us;q=0.5,en;q=0.3',
    'Connection': 'keep-alive'
};

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = 'https://issa.beltelecom.by/';

    AnyBalance.trace('Entering ' + baseurl);

    var html = AnyBalance.requestGet(baseurl, g_headers);
    var code;
    if(/<input[^>]+name="cap_field"/i.test(html)){
        //Требуется капча, черт
        AnyBalance.trace('Затребовали капчу...');
        var lnk = getParam(html, null, null, /<img[^>]+src="\/([^"]*)"[^>]*id="capcher"/i, null, html_entity_decode);
        var captcha = AnyBalance.requestGet(baseurl + lnk, g_headers);
        code = AnyBalance.retrieveCode('Пожалуйста, введите код с картинки', captcha);
    }

    html = AnyBalance.requestPost(baseurl + "main.html", {
        redirect: '/main.html',
        oper_user: prefs.login,
        passwd: prefs.password,
        cap_field: code
    }, g_headers);


    if(!/\/logout/i.test(html)){
        var error = getParam(html, null, null, /\$\.jGrowl\('([^']*)/, [replaceSlashes, replaceTagsAndSpaces], html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error, null, /Введен неверный пароль или абонент не существует/i.test(error));
        error = getParam(html, null, null, /<div[^>]+id="error"[^>]*>([\s\S]*?)<\/div>/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error, null, /пользователя не существует/i.test(error));
        if(/Вы совершаете слишком частые попытки авторизации/i.test(html))
            throw new AnyBalance.Error('Вы совершаете слишком частые попытки авторизации. К сожалению, Белтелеком вынужден вас заблокировать на 10 минут.');
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }

    if(!/<h1[^>]*>Состояние счета<\/h1>/i.test(html)){
        AnyBalance.trace('Оказались не на состоянии счета, переходим туда явно');
        html = AnyBalance.requestGet(baseurl + 'main.html', g_headers);
    }

    var result = {success: true};

    getParam(html, result, 'balance', /Актуальный баланс:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'username', /<td[^>]*>Абонент<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'agreement', /Договор (?:&#8470;|№)([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /<td[^>]*>Тарифный план на услуги<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'status', />Статус блокировки<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    if(AnyBalance.isAvailable('last_pay_date', 'last_pay_sum', 'last_pay_comment')){
        html = AnyBalance.requestGet(baseurl + 'payact.html', g_headers);
        var row = getParam(html, null, null, /Зачисленные платежи за последние 180 дней(?:[\s\S](?!<\/table>))*?(<td[^>]*>\d\d\.\d\d\.\d{2,4} \d\d:\d\d:\d\d<[\s\S]*?)<\/tr>/i);
        if(row){
            getParam(row, result, 'last_pay_date', /(?:[\s\S]*?<td[^>]*>)([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
            getParam(row, result, 'last_pay_sum', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
            getParam(row, result, 'last_pay_comment', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        }else{
            AnyBalance.trace('Последний платеж не найден...');
        }
    }
	
	if(AnyBalance.isAvailable('traf_used', 'traf_left', 'traf_total')) {
		html = AnyBalance.requestGet(baseurl + 'statact.html', g_headers);
		
		getParam(html, result, ['traf_used', 'traf_total'], /трафик(?:[^>]*>){6}([\s\d.]+(?:М|К|Г)Б)/i, replaceTagsAndSpaces, parseTraffic);
		getParam(html, result, ['traf_left', 'traf_total'], /трафик(?:[^>]*>){8}([\s\d.]+(?:М|К|Г)Б)/i, replaceTagsAndSpaces, parseTraffic);
		
		if(isset(result.traf_used) && isset(result.traf_left)) {
			getParam(result.traf_used + result.traf_left, result, 'traf_total');
		}	
	}
	
    AnyBalance.setResult(result);
}