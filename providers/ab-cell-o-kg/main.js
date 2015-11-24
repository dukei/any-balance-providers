/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'Connection': 'keep-alive',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.86 Safari/537.36',
    'Content-Type': 'application/x-www-form-urlencoded',
    'Accept-Encoding': 'gzip, deflate',
    'Accept-Language': 'ru,en;q=0.8'
};

function main(){

    var prefs = AnyBalance.getPreferences();

    checkEmpty(prefs.phone, 'Введите номер телефона в 9-значном формате!');
    checkEmpty(prefs.pin2, 'Введите pin2!');

    var baseurl = "https://lk.o.kg/",
        codephone = prefs.phone.substring(0, 3),
        numberphone = prefs.phone.substring(3);
    AnyBalance.setDefaultCharset('utf-8');

    var html = AnyBalance.requestGet(baseurl + 'login', g_headers);

    if(!html || AnyBalance.getLastStatusCode() > 400){ //Если главная страница возвращает ошибку, то надо отреагировать
    	AnyBalance.trace(html); //В непонятных случаях лучше сделать распечатку в лог, чтобы можно было понять, что случилось
    	throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    AnyBalance.requestPost(baseurl + 'login', {
        'MSISDN_PREFIX':codephone,
        '_MSISDN':numberphone,
        'SUBMIT_FIRST_STAGE':'Войти в кабинет',
        'H_STAGE':'1',
        'H_TYPE_AUTH':'1',
        'H_VIEW_CAPTCHA':'1'
    });

    html = AnyBalance.requestPost(baseurl + 'login', {
        'SUBMIT_MOVE_TO_PIN2_AUTH': 'Войти, указав PIN2 от вашей SIM-карты',
        'H_STAGE': '2',
        'H_MSISDN': numberphone,
        'H_MSISDN_PREFIX': codephone,
        'H_TYPE_AUTH': '1',
        'H_VIEW_CAPTCHA': '2'
    });

    if (/<input[^>]*id="CAPTCHA_CODE2"/i.test(html)) {
        var captchasrc = getParam(html, null, null, /\/default\/login\/create-captcha\?a=image\&amp;c=2\&amp;random=\w+/i, null, html_entity_decode);
        AnyBalance.trace('O! решило показать капчу с адреса\n' + baseurl + captchasrc);
        var captchaimg = AnyBalance.requestGet(baseurl + captchasrc, g_headers);
        if (captchaimg) {
            var value = AnyBalance.retrieveCode("Пожалуйста, введите цифры с картинки.", captchaimg, {inputType: 'text', time: 300000});
            html = AnyBalance.requestPost(baseurl + 'login', {
                'PIN2': prefs.pin2,
                'CAPTCHA_CODE2': value,
                'SUBMIT': 'Войти в кабинет',
                'H_STAGE': '3',
                'H_MSISDN': numberphone,
                'H_MSISDN_PREFIX': codephone,
                'H_TYPE_AUTH': '2',
                'H_VIEW_CAPTCHA': '2'
            });
        } else AnyBalance.trace("Не нашли капчу!");
    };

    html = AnyBalance.requestPost(baseurl + 'login', {
        'PIN2': prefs.pin2,
        'SUBMIT': 'Войти в кабинет',
        'H_STAGE': '3',
        'H_MSISDN': numberphone,
        'H_MSISDN_PREFIX': codephone,
        'H_TYPE_AUTH': '2',
        'H_VIEW_CAPTCHA': '2'
    });

    if(/Войти в кабинет/i.test(html)){
        var error = getParam(html, null, null, /Войти в кабинет/i, replaceTagsAndSpaces, html_entity_decode);
        if(error){
            throw new AnyBalance.Error('Неверная пара номер телефона - pin2', null, true);
        }
    }

    html = AnyBalance.requestGet(baseurl + 'private-data/internet', g_headers);

    if (!/Выход/i.test(html)) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    getParam(html, result, 'tarif', /Тарифный план:([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'phone', /Ваш номер:([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Ваш баланс:([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'status', /Статус:([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'traffic', /Объем не использованного трафика[\s\S]*<span[^>]class=['"]bundle_balance["'][\s\S]*?>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'paydate', /Объем не использованного трафика[\s\S]*<span[^>]class=['"]next_payday["'][\s\S]*?>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    AnyBalance.setResult(result);
}
