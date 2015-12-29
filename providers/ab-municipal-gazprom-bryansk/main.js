/**
 * Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
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

    var baseurl = 'https://xn--80afn.xn--80ahmohdapg.xn--80asehdb/pages/';

    AnyBalance.setDefaultCharset('utf-8');

    var html = AnyBalance.requestGet(baseurl + 'abonent/login.jsf', g_headers);

    if (!html || AnyBalance.getLastStatusCode() > 400) {
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    if (!/Выход\s*<\/a>/i.test(html)) {
        var params = {
            'javax.faces.partial.ajax': true,
            'javax.faces.source': 'f_login_abon:j_idt26',
            'javax.faces.partial.execute': 'f_login_abon:pLogin',
            'javax.faces.partial.render:': 'f_login_abon',
            'f_login_abon:j_idt26': 'f_login_abon:j_idt26',
            'f_login_abon': 'f_login_abon'
        };
        params['f_login_abon:eLogin'] = prefs.login;
        params['f_login_abon:ePwd'] = prefs.password;
        params['javax.faces.ViewState'] = createFormParams(html)['javax.faces.ViewState'];

        html = AnyBalance.requestPost(
            baseurl + 'abonent/login.jsf',
            params,
            AB.addHeaders({
                'Referer': baseurl + 'abonent/login.jsf?faces-redirect=true',
                'X-Requested-With': 'XMLHttpRequest',
                'Faces-Request': 'partial/ajax'
            })
        );

        if (!/<redirect url/i.test(html)) {
            throw new AnyBalance.Error('Неверный логин или пароль!', null, true);
        }

        html = AnyBalance.requestGet(
            baseurl + 'templates/loginResult.jsf?face-redirect=true',
            AB.addHeaders({'Referer': baseurl + 'abonent/login.jsf?faces-redirect=true'})
        );

        // meta content=2; url=..., поэтому делаем задержку 2 сек, иначу Tomcat вернет ошибку в след. запросе
        sleep(2000);

        html = AnyBalance.requestGet(baseurl + '/abonent/lite/accounts/accountInfo.jsf?faces-redirect=true', g_headers);

        if (!/Выход\s*<\/a>/i.test(html)) {
            AnyBalance.trace(html);
            throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
        }
    }

    var result = {success: true};
    AB.getParam(html, result, 'period', /Дата периода счета[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'debt', /Долг\(\+\)\/переплата\(-\) за период[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);

    AnyBalance.setResult(result);
}

function sleep(ms) {
    ms += new Date().getTime();
    while (new Date() < ms) {}
}
