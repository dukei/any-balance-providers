/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток и другие параметры кредитов Русфинанс банка, используя систему Инфо-банк

Сайт оператора: http://www.rusfinancebank.ru
Личный кабинет: http://www.rusfinancebank.ru/ru/info-bank.html
*/

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://info-msk.rusfinance.ru:7779/";
    AnyBalance.setDefaultCharset('utf-8');

    if(!prefs.login)
        throw new AnyBalance.Error("Пожалуйста, укажите логин для входа в ИНФО-Банк!");
    if(!prefs.password)
        throw new AnyBalance.Error("Пожалуйста, укажите пароль для входа в ИНФО-Банк!");

    var html = AnyBalance.requestGet(baseurl + 'jsso/SSOLogin');

    html = AnyBalance.requestPost(baseurl + 'jsso/j_security_check', {
        username:prefs.login,
        j_password:prefs.password,
        j_username:prefs.login,
        'checkForm.mandatoryField':'Обязательное поле!',
        'action.incorrectInputData':'Введенные данные некорректны!'
    }, {Referer: baseurl + 'jsso/SSOLogin?appurl=http%3A%2F%2Finfo%3A7779%2FICA%2FwelcomeInput.do&appid=%2FICA'});

    if(!/logoutInput.do/i.test(html)){
        var error = getParam(html, null, null, /<td[^>]+id="login.error"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в ИНФО-банк. Сайт изменен?');
    }

    fetchCredit(baseurl, html);
}

function fetchCredit(baseurl, html){
    var prefs = AnyBalance.getPreferences();

    var result = {success: true};

    getParam(html, result, '__tariff', /Тип кредита\/займа\s*:(?:[\s\S]*?<td[^>]*>)([\s\S]*?)<\/td>/, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'agreement', /Номер договора\s*:(?:[\s\S]*?<td[^>]*>)([\s\S]*?)<\/td>/, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'limit', /Сумма кредита\/займа\s*:(?:[\s\S]*?<td[^>]*>)([\s\S]*?)<\/td>/, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'balance', /Остаток ссудной задолженности\s*:(?:[\s\S]*?<td[^>]*>)([\s\S]*?)<\/td>/, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, ['currency', 'balance', 'minpay', 'lastoppct', 'lastopcrd'], /Сумма кредита\/займа\s*:(?:[\s\S]*?<td[^>]*>)([\s\S]*?)<\/td>/, replaceTagsAndSpaces, parseCurrency);

    getParam(html, result, 'minpay', /Рекомендуем Вам внести\s+ежемесячный платеж[^<]*?в сумме([^<]*?)до/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'minpaytill', /Рекомендуем Вам внести\s+ежемесячный платеж[^<]*?в сумме[^<]*?до\s*([\.\d]*)/i, replaceTagsAndSpaces, parseDate);

    if(AnyBalance.isAvailable('lastopdate', 'lastoppct', 'lastopcrd')){
        html = AnyBalance.requestPost(baseurl + 'ICA/contractEditOutput.do', {
            lastEvent:16,
            recordId:0,
            orderBy:'',
            tab:'/repaymentInput.do',
            postAction:''
        });

        getParam(html, result, 'lastopdate', /<td[^>]*>([^<]*)<\/td>\s*<td[^>]*>[^<]*?Проценты за/i, replaceTagsAndSpaces, parseDate);
        getParam(html, result, 'lastoppct', /Проценты за(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'lastopcrd', /погашение (?:кредита|займа) по(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    }
    
    AnyBalance.setResult(result);
}


