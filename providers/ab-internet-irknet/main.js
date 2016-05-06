function main() 
{
    var params = {
        'balance': /Баланс счета[.\s\S]{1,200} (\d+,\d+) руб\./,
        'date': /Дата оплаты[.\s\S]+ (\d+.+)<!--/,
        'next_payment': /Следующий платеж[.\s\S]+ (\d+\.\d+) руб./,
        'plan': /<a href="\/office\/smenit-tarif">(.+)<\/a>/,
        'ip': /Ваш IP[.\s\S]+ (\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/
    }

    var info = auth();
    var result = {};

    for (var param in params) {
        getParam(info, result, param, params[param], replaceTagsAndSpaces, html_entity_decode);
    }

    result['balance'] = result['balance'].replace(',', '.');
    result['success'] = true;

    AnyBalance.setResult(result);
}

function auth() 
{
    var prefs = AnyBalance.getPreferences();

    checkEmpty(prefs.user_id, 'Не задан номер договора');
    checkEmpty(prefs.password, 'Не задан пароль');

    trace('авторизация...');
    
    var info = AnyBalance.requestPost('https://irkutsk.irknet.ru/avtorizatsiya-v-lichnom-kabinete', {
       user_id: prefs.user_id,
       password: prefs.password, 
       action: 'login'
    });

    if (matches = info.match(/Ошибка авторизации \((.+)\).+/)) {
        trace(matches[1], true);
    }

    trace('авторизация успешно завершена');

    return info;
}

function trace(message, thr) 
{
    AnyBalance.trace(message);
    if (thr) {
        throw new AnyBalance.Error(message);
    }
}
