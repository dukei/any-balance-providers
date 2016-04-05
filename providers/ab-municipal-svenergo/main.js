/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Connection': 'keep-alive',
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'http://ekb.esplus.ru/';
    AnyBalance.setDefaultCharset('utf-8');

    AB.checkEmpty(prefs.login, 'Введите логин!');
    AB.checkEmpty(prefs.password, 'Введите пароль!');

    var html = AnyBalance.requestGet(baseurl, g_headers);

    if (!html || AnyBalance.getLastStatusCode() > 400) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    var error = AB.getParam(html, null, null, /function\s*onCheckLogin[\s\S]*?(Ошибка авторизации[^"]+)/i, AB.replaceTagsAndSpaces);
    var params = {
        login: prefs.login,
        pass: prefs.password
    };

    html = AnyBalance.requestPost(
        'https://lk.sesb.ru/Individual',
        params,
        AB.addHeaders({ Referer: baseurl })
    );

    if (!/logout/i.test(html)) {
        if (error) {
            throw new AnyBalance.Error(error, null, /Неверный логин\/пароль/i.test(error));
        }

        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {
        success: true
    };

    var balanceHtml = AB.getParam(html, null, null, /NameBalance[^>]*>((?:[^>]+>){5})/i, AB.replaceTagsAndSpaces);
    AB.getParam(balanceHtml, result, 'balance', null, null, AB.parseBalance);

    if (/долг/i.test(balanceHtml)) {
        result.balance *= -1;
    }

    AB.getParam(html, result, 'fio', /ФИО[^>]*>([^>]+>){2}/i, AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'address', /Адрес[^>]*>([^>]+>){2}/i, AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'residents', /проживающих[^>]*>([^>]+>){2}/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'rooms', /комнат[^>]*>([^>]+>){2}/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'area', /Площадь[^>]*>([^>]+>){2}/i, AB.replaceTagsAndSpaces, AB.parseBalance);

    AB.getParam(html, result, '__tariff', /Тариф(?:[^>]*>){2}([\s\S]*?)<\//i, AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'cost', /Стоимость(?:[^>]*>){2}([\s\S]*?)<ta/i, AB.replaceTagsAndSpaces);


    var account = getAccountId(html, prefs.account);

    if (account && !isEqualPrefsAndCurrentAccount(html, prefs.account)) {
        params = AB.createFormParams(html);

        for (var key in params) {
            if (/ControlPaListDDL/i.test(key)) {
                params[key] = account;
                html = AB.requestPostMultipart(
                    'https://lk.sesb.ru/Individual',
                    params,
                    AB.addHeaders({
                        'Referer': 'https://lk.sesb.ru/Individual'
                    })
                );
                break;
            }
        }
    }

    AB.getParam(html, result, 'licschet', /№(?:[^>]*>){2}([\S\s]*?)<\//i, AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'period', /ControlChecksList[\s\S]*?<\/thead>[\s\S]*?<td>([^<]+)/i, AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'startBalance', /ControlChecksList[\s\S]*?<\/thead>[\s\S]*?([^>]+>){5}/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'payed', /ControlChecksList[\s\S]*?<\/thead>[\s\S]*?([^>]+>){7}/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'charged', /ControlChecksList[\s\S]*?<\/thead>[\s\S]*?([^>]+>){9}/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'endBalance', /ControlChecksList[\s\S]*?<\/thead>[\s\S]*?([^>]+>){11}/i, AB.replaceTagsAndSpaces, AB.parseBalance);

    AnyBalance.setResult(result);
}

function isEqualPrefsAndCurrentAccount(html, prefsAccount) {
    var selectedAccount = AB.getParam(html, null, null, /№(?:[^>]*>){2}([\S\s]*?)<\//i, AB.replaceTagsAndSpaces);
    return (new RegExp(selectedAccount, 'i')).test(prefsAccount);
}

function getAccountId(html, account) {
    var result = false;

    if (!account) {
        return result;
    }

    var accountsHtml = AB.getParam(html, null, null, /ControlPAListDDL[^>]*>([\s\S]+?)<\/select>/i),
        accounts = AB.sumParam(accountsHtml, null, null, /<option[^>]*value=([^<]+)/ig, AB.replaceTagsAndSpaces, accountParser),
        re = new RegExp(account, 'i');

    accounts.every(function(acc) {
        var res = re.test(acc.key);
        if (res) {
            result = acc.value;
        }
        return !res;
    });
    return result;
}

function accountParser(str) {
    var arr = str.replace(/"/g, '').split('>');

    return {
        key: arr[1],
        value: arr[0]
    }
}
