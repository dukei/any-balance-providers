/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

ЕРЦ Мегабанк
Сайт: https://erc.megabank.net/
*/

var g_headers = {
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
  'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
  'User-Agent': 'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.116 Safari/537.36',
};

function main(){
    AnyBalance.setDefaultCharset('utf-8');
    var prefs   = AnyBalance.getPreferences(),
        baseurl = 'https://erc.megabank.net/';

    AB.checkEmpty(prefs.login,    "Введите логин!");
    AB.checkEmpty(prefs.password, "Введите пароль!")

    var html = AnyBalance.requestGet(baseurl + 'ru/user/login', g_headers);
    if (!html || AnyBalance.getLastStatusCode() > 400) {
      AnyBalance.trace(html);
      throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже.');
    }

    var form_b_id = AB.getParam(html, null, null, /<input[^>]+name="form_build_id"[^>]+value="([^"]*)/i),
        form_id   = AB.getParam(html, null, null, /<input[^>]+name="form_id"[^>]+value="([^"]*)/i);
    if(!form_b_id || ! form_id) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error("Не удалось найти параметры авторизации. Сайт изменён?");
    }

    html = AnyBalance.requestPost(baseurl + 'ru/user/login', {
        name: prefs.login,
        pass: prefs.password,
        op: 'Войти',
        form_build_id: form_b_id,
        form_id: form_id
      }, addHeaders({
        Referer: baseurl + 'ru/user/login'
    }));

    if(!/logout/i.test(html)) {
        var error = AB.getParam(html, null, null, /<div[^>]+messages\s*error([^>]*>){6}/i);
        if(error) {
            throw new AnyBalance.Error(error, null, /имя пользователя или пароль неверны/i);
        }

        AnyBalance.trace(html);
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Сайт изменён?");
    }

    var result = {success: true};

    html = AnyBalance.requestGet(baseurl + 'ru/service/publicutilities/debt/1', g_headers);

    AB.getParam(html, result, 'account', /Лицевой счет([^>]*>){3}/i,                                 AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'address', /Адрес([^>]*>){3}/i,                                        AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'name',    /Ф\.И\.О([^>]*>){3}i/,                                      AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'month',   /Выберите месяц[\s\S]*?<option[^>]+selected[^>]*>([^<]*)/i, AB.replaceTagsAndSpaces);

    var month_id = AB.getParam(html, null, null, /<option[^>]+value="([^"]*)"[^>]+selected[^>]*>/i);
    if(!month_id) {
        AnyBalance.trace(html);
        AnyBalance.trace("Не удалось найти ID месяца по которому запрашивать информацию");
    } else {
        html = AnyBalance.requestGet(baseurl + 'ru/service/resp/debt/1/' + month_id + '?order=asc', addHeaders({
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json, text/javascript, */*; q=0.01'
        }));

        var json = getJson(decodeURIComponent(html)),
            debt_acc = 0,
            debt_sal = 0;

        json = isArray(json) ? json : [json];

        for(var i = 0; i < json.length; i++) {
            var counter_name = null;

            if (json[i].servicename == 'ЭЛЕКТРИЧЕСТВО') {
                counter_name = 'elec'
            } else if (json[i].servicename == 'КВАРТПЛАТА') {
                counter_name = 'rent'
            } else if (json[i].servicename == 'ОТОПЛЕНИЕ') {
                counter_name = 'heating'
            } else if (json[i].servicename == 'ГОРЯЧАЯ ВОДА') {
                counter_name = 'hot_water'
            } else if (json[i].servicename == 'ХОЛОДНАЯ ВОДА') {
                counter_name = 'cold_water'
            } else if (json[i].servicename == 'КАНАЛИЗАЦИЯ') {
                counter_name = 'sewerage'
            }

            if(counter_name) {
                AB.getParam(json[i].credited + '', result, counter_name + '_accrued', null, null, AB.parseBalance);
                AB.getParam(json[i].pays + '',     result, counter_name + '_paid',    null, null, AB.parseBalance);
                AB.getParam(json[i].saldo == null ? '0' : json[i].saldo + '',    result, counter_name + '_saldo',   null, null, AB.parseBalance);
                debt_acc += result[counter_name+'_accrued'];
                debt_sal += result[counter_name+'_saldo'];

            } else {
                AnyBalance.trace("Неизвестная опция: " + json[i].servicename)
            }
        }

    }

    result.debt_accrued = debt_acc;
    result.debt_saldo   = debt_sal;
    result.__tariff='Счет: ' + result.account + ' (' + result.month + ')';

    AnyBalance.setResult(result);
}
