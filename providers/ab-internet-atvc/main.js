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
'User-Agent':'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36'
};

function main(){
    var prefs = AnyBalance.getPreferences();

    AB.checkEmpty(prefs.login, 'Введите логин!');
    AB.checkEmpty(prefs.password, 'Введите пароль!');

    var baseurl = "https://lk.atvc.ru/";

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

    AnyBalance.sleep(3000);
    html = AnyBalance.requestGet(baseurl + 'internet/' + prefs.login + '/', g_headers);

    var result = {success: true};

    function getRe(name){
    	return new RegExp(/<td[^>]*service-title[^>]*>(?:\s+|<(?:strong|b|a)[^>]*>)*%NAME%[\s\S]*?<td[^>]*>([\s\S]*?)(?:<ul|<\/td>)/.source.replace(/%NAME%/, name), 'i');
    }

    getParam(html, result, '__tariff', getRe('Тариф'), replaceTagsAndSpaces);
    getParam(html, result, 'balance', getRe('Баланс'), replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'number', getRe('Номер договора'), replaceTagsAndSpaces);
    getParam(html, result, 'licenseFee', getRe('Ежемесячный платёж'), replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'payment', getRe('К оплате'), replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'virtual_payment', getRe('Виртуальный платеж'), replaceTagsAndSpaces);

    getParam(html, result, 'status', getRe('Статус'), replaceTagsAndSpaces);
    getParam(html, result, 'login', getRe('Логин'), replaceTagsAndSpaces);
    getParam(html, result, 'mailnumber', getRe('Почтовый ящик'), replaceTagsAndSpaces);

    AnyBalance.setResult(result);
}
