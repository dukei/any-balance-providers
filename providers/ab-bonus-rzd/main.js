/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию по бонусной карте РЖД

Сайт оператора: https://rzd-bonus.ru
Личный кабинет: https://rzd-bonus.ru
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://rzd-bonus.ru/";

    var html = AnyBalance.requestPost(baseurl + 'war-basic/j_spring_security_check', {
        j_username:prefs.login,
        j_password:prefs.password
    });

    var redirect = getParam(html, null, null, /top.location.href\s*=\s*'([^']*)/i);
    if(redirect)
        html = AnyBalance.requestGet(redirect);

    if(!/logouturl/.test(html)){
        var error = getParam(html, null, null, /<div[^>]*failure[^>]*>([\s\S]*?)<\/div>/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

	if(/Подтверждение временного пароля/.test(html)) {
		throw new AnyBalance.Error('Сайт требует заполнить профиль. Зайдите в личный кабинет через браузер и выполните все необходимые действия.');
	}
	
    var result = {success: true};
	
    getParam(html, result, 'balance', /Премиальные баллы:[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'qballs1', /Квалификационные баллы за \d+:[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'qballs2', /Квалификационные баллы за \d+:[\s\S]*?Квалификационные баллы за \d+:[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'cardnum', /<span[^>]+class="number"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /Уровень участия:[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balls_total', /Набрано за все время участия в программе:[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'balls_spent', /Использовано на премии за все время участия в программе:[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}
