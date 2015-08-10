/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у оператора интернет ФормулаСвязи

Сайт оператора: http://iformula.ru
Личный кабинет: https://stats.iformula.ru/
*/

function parseDateMoment(str){
    var mom = moment(str, ['D MMM YYYY', 'HH:mm-D MMM YYYY']);
    if(!mom.isValid()){
        AnyBalance.trace('Failed to parse date from ' + str);
    }else{
        var val = mom.toDate();
        AnyBalance.trace('Parsed date ' + val + ' from ' + str);
        return val.getTime();
    }
}

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://stats.iformula.ru/";

    moment.lang('ru');

    var html = AnyBalance.requestPost(baseurl + 'login_func.php', {
        user:prefs.login,
        pass:prefs.password,
        login_uri:''
    });

    if(!/\/logout/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]*class="[^"]*ui-state-error[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

    getParam(html, result, 'fio', /Клиент:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'agreement', /Номер договора:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Баланс счета:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /Текущий ТП:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    getParam(html, result, 'lastpaydate', /<th[^>]*>\s*Дата платежа(?:(?:[\s\S](?!<\/table>))*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDateMoment);
    getParam(html, result, 'lastpaysum', /<th[^>]*>\s*Дата платежа(?:(?:[\s\S](?!<\/table>))*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'lastpaydesc', /<th[^>]*>\s*Дата платежа(?:(?:[\s\S](?!<\/table>))*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}
