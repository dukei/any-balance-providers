/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у оператора интернет и телевидения QWERTY.ru.

Сайт оператора: http://qwerty.ru/
Личный кабинет: http://billing.qwerty.ru
*/

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://lk.qwerty.ru/owa/rac.k/!w3_p_main.showform";
    var html = AnyBalance.requestPost(baseurl + "?CONFIG=CONTRACT", {
	IDENTIFICATION:'CONTRACT',
	USERNAME:prefs.login,
	PASSWORD:prefs.password,
	FORMNAME:'QFRAME'
    });

    var error = getParam(html, null, null, /alert\s*\("([^"]*)"/);
    if(error)
        throw new AnyBalance.Error(error);

    var frmurl = getParam(html, null, null, /<FRAME\s+name="data"\s+SRC="([^"]*)"/i);
    if(!frmurl)
        throw new AnyBalance.Error("Не удаётся найти адрес фрейма с информацией! Обратитесь к автору.");

    var html = AnyBalance.requestGet(baseurl + frmurl);

    var result = {success: true};

    getParam(html, result, 'userName', /Клиент:[\s\S]*?<td[^>]*>([\s\S]*?)<td[^>]*>/i, replaceTagsAndSpaces);
    getParam(html, result, 'licschet', /Лицевой счёт:[\s\S]*?<td[^>]*>([\s\S]*?)<td[^>]*>/i, replaceTagsAndSpaces);
    getParam(html, result, 'balance', /Текущий баланс[\s\S]*?<td[^>]*>(-?\d[\d\., ]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'expences', /Сумма текущих начислений:[\s\S]*?<td[^>]*>(-?\d[\d\., ]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'pays', /Сумма платежей[\s\S]*?<td[^>]*>(-?\d[\d\., ]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'recommended', /Рекомендуемая сумма платежа:[\s\S]*?<td[^>]*>(-?\d[\d\., ]*)/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}

