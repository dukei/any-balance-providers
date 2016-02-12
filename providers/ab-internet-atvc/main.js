/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс для провайдера АТК 

Operator site: http://atvc.ru/
Личный кабинет: https://support.atknet.ru/
*/

var g_headers = {
'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
'Connection':'keep-alive',
'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){
    var prefs = AnyBalance.getPreferences();

    AB.checkEmpty(prefs.login, 'Введите логин!');
    AB.checkEmpty(prefs.password, 'Введите пароль!');

    var baseurl = "https://support.atknet.ru/";

    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + 'account/login/?next=/', g_headers);

    if (!html || AnyBalance.getLastStatusCode() >= 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
    
    var form = AB.getElement(html, /<form[^>]*?auth-form/i);
    if (!form) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
    }
    
    var params = AB.createFormParams(form, function(params, str, name, value) {
        if (name == 'username') {
            return prefs.login;
        } else if (name == 'password') {
            return prefs.password;
        }

        return value;
    });

    html = AnyBalance.requestPost(baseurl + 'account/login/', params,
        addHeaders({
            Referer: baseurl + 'account/login/?next=/'
        }));

    if (!/\/logout/i.test(html)) {
        var error = getParam(html, null, null, /<div[^>]*?alert-danger[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
        if (error) {
            throw new AnyBalance.Error(error, null, /пользователя|парол/i.test(error));
        }
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    AnyBalance.sleep(2500);
    html = AnyBalance.requestGet(baseurl + 'internet/' + prefs.login + '/');

    var result = {success: true};

    getParam(html, result, '__tariff', /Тариф[\s\S]*?<td[^>]*>([\s\S]*?)<div[^>]*>/i, replaceTagsAndSpaces);
    getParam(html, result, 'balance', /Баланс[\s\S]*?<td[^>]*>([\s\S]*?)<div[^>]*>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'number', /Номер договора[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, 'licenseFee', /Ежемесячный платёж[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'payment', /К оплате[\s\S]*?<td[^>]*>([\s\S]*?)<div[^>]*>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'virtual_payment', /Виртуальный платеж[\s\S]*?<td[^>]*>([\s\S]*?)<div[^>]*>/i, replaceTagsAndSpaces);

    getParam(html, result, 'status', /Статус[\s\S]*?<td[^>]*>([\s\S]*?)<div[^>]*>/i, replaceTagsAndSpaces);
    getParam(html, result, 'login', /Логин[\s\S]*?<td[^>]*>([\s\S]*?)<div[^>]*>/i, replaceTagsAndSpaces);
    getParam(html, result, 'mailnumber', /Почтовый ящик[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);

    AnyBalance.setResult(result);
}
