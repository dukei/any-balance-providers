/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Operator site: http://galaxy-net.ru
Личный кабинет: http://users.galaxy-net.ru/client2/index.php?r=site/login
*/

var g_headers = {
'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
'Connection':'keep-alive',
'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){
    var prefs = AnyBalance.getPreferences(), login, password;
    login=prefs.login;
    password=prefs.password;

    checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(prefs.password, 'Введите пароль!');

    var baseurl = "http://users.galaxy-net.ru/client2/index.php?r=site/login";

    AnyBalance.setDefaultCharset('utf-8'); 

    html = AnyBalance.requestPost(baseurl, {
        "LoginForm[login]": login,
        "LoginForm[password]": password,
        'yt0': 'Войти'
    });
    if(!/<title>LanBilling Client UI - Мои аккаунты<\/title>/i.test(html)){
        var error = getParam(html, null, null, /<li>Неверное имя пользователя или пароль<\/li>/i, replaceTagsAndSpaces);
        if(error){
            throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test());
        }
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Изменился сайт?');
    }

    var result = {success: true},matches;
    AnyBalance.trace('search table...');
    
    var balance,tariff,dogovor,account,status,matchall;
    if(matchall = html.match(/Номер договора:<\/small>[\s\S]*;(\d*.\d*)[\s\S]*Текущий баланс:.*?<span>(.*?,\d*).*[\s\S]*<tr>\s*<th[^>].*?>Учетная запись<\/th>\s*<th>Тарифный план<\/th>\s*<th>Подключенные услуги<\/th>\s*<th>Состояние<\/th>\s*?<\/tr>\s*<\/thead>\s*\s*<tr.*?>\s*<td.*?>\s*.*\s*?<a.*?>(\d*.\d*.\d*.\d*).*<\/a>[\s\S]*?<td>\s*.*>\d*<\/a>.*\s*?<br\/>Абонентская плата: (\d*,\d*..*).<br\/>Текущая скорость: (\d* .*\/с) [\s\S]*?Состояние: (.*?) \s*?<br\/>/)){
        AnyBalance.trace('found table');
        AnyBalance.trace(matchall[0]);
        AnyBalance.trace(matchall[1]);
        AnyBalance.trace(matchall[2]);
        AnyBalance.trace(matchall[3]);
        AnyBalance.trace(matchall[4]);
        AnyBalance.trace(matchall[5]);
        AnyBalance.trace(matchall[6]);
        balance = replaceSpacesAndFloat(matchall[2]);
        AnyBalance.trace(balance);
        tariff = (matchall[5] + ' ' + matchall[4]);
        dogovor = matchall[1];
        account = matchall[3];
        status = matchall[6];
        AnyBalance.setResult({success: true,"balance":balance,"tariff":tariff,"dogovor":dogovor,"account":account,"status":status});
    }
    AnyBalance.setResult(result);
}

function replaceSpacesAndFloat(string) {
var sOut;
    sOut=string.replace (/\s/g,'');
    sOut=sOut.replace (',', '.');
    return sOut;
}