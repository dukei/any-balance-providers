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

function main () {
    if (AnyBalance.getLevel () < 3)
        throw new AnyBalance.Error ('Для этого провайдера необходима версия программы не ниже 1.2.436. Пожалуйста, обновите программу.');
	
    var prefs = AnyBalance.getPreferences ();
    AnyBalance.setDefaultCharset('utf-8');
	
    var baseurl = 'http://eplus.evroopt.by/';
    if(!prefs.login)
        throw new AnyBalance.Error('Введите № карты');
	
    var html = AnyBalance.requestGet(baseurl + 'cabinet/enter/', g_headers);
    if (!html || AnyBalance.getLastStatusCode() > 400) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }
    var form = getParam(html, null, null, /<form[^>]+id="form_card"[^>]*>([\s\S]*?)<\/form>/i);
    if(!form){
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось найти форму ввода номера карты. Сайт изменен?');
    }

    var params = createFormParams(form, function(params, input, name, value){
        var dt = new Date();
        if(name == 'card_number')
            value = prefs.login;
        else if(name == 'captcha[input]'){
            var captchaid = getParam(form, null, null, /<input[^>]+name="captcha\[id\]"[^>]*value="([^"]*)/i, replaceHtmlEntities);
            var captchaimg = AnyBalance.requestGet(baseurl + 'Temp/Captcha/' + captchaid + '.png');
            value = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки.", captchaimg);
        }
       
        return value;
    });
	
    html = AnyBalance.requestPost(baseurl + 'cabinet/enter/', params, addHeaders({Referer: baseurl + 'cabinet/enter/'}));

    if(!/\/cabinet\/report\//i.test(html)){
        var error = sumParam(html, null, null, /<ul[^>]+class="errors"[^>]*>([\s\S]*?)<\/ul>/ig, replaceTagsAndSpaces, null, aggregate_join);
        if(error)
            throw new AnyBalance.Error(error, null, /Карточка с таким номером не найдена/i.test(error));
    
        error = getParam(html, null, null, /<h1[^>]*>\s*An error occurred/i);
        if(error){
        	error = getParam(html, null, null, /<b[^>]*>\s*Message:([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);
        	AnyBalance.trace('Системная ошибка на стороне Евроопта: ' + error);
        	throw new AnyBalance.Error("Системная ошибка на сайте евроопт. Обращайтесь в их службу поддержки.");
        }
		
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось получить данные по карте. Сайт изменен?');
    }

    html = AnyBalance.requestGet(baseurl + 'cabinet/report/', addHeaders({Referer: AnyBalance.getLastUrl()}));

    form = getElement(html, /<form[^>]+id="form_report"[^>]*>/i);
    if(!form){

        var error = getParam(html, null, null, /Вы не заполнили сведения о себе|Для идентификации пользователя|form_registration/);
        if(error)
            throw new AnyBalance.Error("Евроопт требует заполнить форму регистрации. Вам необходимо зайти на сайт http://eplus.evroopt.by/cabinet/enter/ через браузер и заполнить форму");

		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось найти форму ввода периода отчета. Сайт изменен?');
    }

    var params = createFormParams(form, function(params, input, name, value){
        if(name == 'from_date'){
        	var dt = new Date();
            value = '01.' + n2(dt.getMonth()+1) + '.' + n2(dt.getFullYear());
        }else if(name == 'to_date')
            value = getFormattedDate();
        return value;
    });

    html = AnyBalance.requestPost(baseurl + 'cabinet/report/', params, addHeaders({Referer: baseurl + 'cabinet/report/'}));

    if(!/<div[^>]*class="report_data"/i.test(html)){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось получить отчет по карте. Сайт изменен?');
    }

    var result = {success: true};

    getParam(html, result, 'status', /Текущий накопленный процент[^<]*<big[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'sum', /Общая сумма покупок(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    //getParam(html, result, 'skidka', /<tr[^>]*class="itog"(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult (result);
}
