/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс, количество сообщений и репутацию на сайте E-INVEST.BIZ 

Operator site: http://e-invest.biz
*/

var g_headers = {
'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
'Connection':'keep-alive',
'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.1453.110 Safari/537.36'
};

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "http://e-invest.biz/";

    AnyBalance.setDefaultCharset('WINDOWS-1251'); 

    var html = AnyBalance.requestPost(baseurl, {
        login_name:prefs.login,
        login_password:prefs.password,
        x: '38',
        y: '14',
        login: 'submit'
    }, addHeaders({Referer: baseurl})); 

    if(!/action=logout/i.test(html)){
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Возможно вы ввели неправильный логин или пароль. Либо сайт изменен.');
    }

    var result = {success: true};
    getParam(html, result, 'messages', /Сообщений<\/a>:([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'balance', /Баланс:\s*([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'reputation', /Репутация:\s*([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}
