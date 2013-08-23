/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию о скидке в белорусской компании евроопт.
Использует API версии не ниже 3.

Сайт магазина: http://www.euroopt.by
Личный кабинет: http://www.euroopt.by/otchet-po-diskontnoj-karte-2
*/

function main () {
    if (AnyBalance.getLevel () < 3) {
        throw new AnyBalance.Error ('Для этого провайдера необходима версия программы не ниже 1.2.436. Пожалуйста, обновите программу.');
    }

    var prefs = AnyBalance.getPreferences ();
    var baseurl = 'http://www.euroopt.by/';
    if(!prefs.login)
        throw new AnyBalance.Error('Введите № карты');

    var html = AnyBalance.requestGet(baseurl + 'otchet-po-diskontnoj-karte-2');
    var form = getParam(html, null, null, /<form[^>]+id="maec4cmoduleform_1"[^>]*>([\s\S]*?)<\/form>/i);
    if(!form)
        throw new AnyBalance.Error('Не удалось найти форму ввода номера карты. Сайт изменен?');

    var params = createFormParams(form, function(params, input, name, value){
        var dt = new Date();
        if(name == 'maec4cnumber')
            value = prefs.login;
        else if(name == 'maec4cfrom')
            value = '1.' + (dt.getMonth()+1) + '.' + dt.getFullYear();
        else if(name == 'maec4cto')
            value = dt.getDate() + '.' + (dt.getMonth()+1) + '.' + dt.getFullYear();
        else if(name == 'captcha'){
            if(AnyBalance.getLevel() < 7)
                throw new AnyBalance.Error ('Этот провайдер требует ввода капчи. Обновите программу для поддержки капчи.');
            var captchaimg = AnyBalance.requestGet(baseurl + 'captcha.php');
            value = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки.", captchaimg);
        }
       
        return value;
    });

    var html = AnyBalance.requestPost(baseurl + 'otchet-po-diskontnoj-karte-2', params);
    
    var error = getParam(html, null, null, /<div[^>]+class="error-message[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
    if(error)
        throw new AnyBalance.Error(error);

    var result = {success: true};

    getParam(html, result, 'status', /Текущий статус карточки:[^<]*<strong[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    sumParam(html, result, 'sum', /<th[^>]*>\d+\.\d+\.\d+<\/th>\s*<td[^>]*>(\d+)<\/td>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);

    AnyBalance.setResult (result);
}
