/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main(){
	throw new AnyBalance.Error("Этот провайдер вскоре будет удален, воспользуйтесь провайдером Домашний Интернет и Телевидение МТС", null, true);
	
    var prefs = AnyBalance.getPreferences();

    checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(prefs.password, 'Введите пароль!');

    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://client.lanbilling.ptcomm.ru/index.php?";

    var html = AnyBalance.requestPost(baseurl + 'r=site/login', {
        'LoginForm[login]':prefs.login,
        yt0:'Войти',
        'LoginForm[password]':prefs.password
    });

    //AnyBalance.trace(html);

    if(!/\?r=site\/logout/i.test(html)){
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Неправильный логин-пароль?");
    }

    var result = {success: true};

    getParam(html, result, 'agreement', /Номер договора:([\s\S]*?)<a/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Текущий баланс:([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, parseBalance);

    //Тут услуги в таблице, пройдемся по ней и возьмем тарифные планы
    var services = sumParam(html, null, null, /(<tr[^>]*>\s*<td[^>]+class="first_col"[^>]*>(?:[\s\S](?!\/tr))*<\/tr>)/ig);
    var tariffs = [];
    for(var i=0; i<services.length; ++i){
        var tariff = getParam(services[i], null, null, /(?:[\s\S]*?<td[^>]*>){2}\s*<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
        if(tariff == 'Услуги')
            continue;
        tariffs[tariffs.length] = tariff;
        getParam(services[i], result, 'abon', /Абонентская плата:([^<]*)/i, replaceTagsAndSpaces, parseBalance);
        getParam(services[i], result, 'status', /Состояние:([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    }
    
    if(tariffs.length > 0)
        result.__tariff = tariffs.join(', ');

    getParam(html, result, '__tariff', /Текущий тарифный план:([\s\S]*?)<\/strong>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'username', /Общая информация\s+\/([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}
