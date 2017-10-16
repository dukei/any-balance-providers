/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Operator site: http://taiget.ru
Личный кабинет: https://sec.taiget.ru/client/index.php
*/

var g_headers = {
'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
'Connection':'keep-alive',
'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){
    var prefs = AnyBalance.getPreferences(), matches, login, password;
    login=prefs.login;
    password=prefs.password;

    checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(prefs.password, 'Введите пароль!');

    var baseurl = "https://sec.taiget.ru/client/index.php";

    AnyBalance.setDefaultCharset('utf-8'); 

    html = AnyBalance.requestPost(baseurl, {
        "login": login,
        "password": password
    }, g_headers);

    if(!/Выход/i.test(html)){
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Неверный логин или пароль?');
    }

    var result = {success: true};
    AnyBalance.trace('search table...');
    
	if(matches = html.match(/\s*<tr[^>]*>\s*<td[^>]*>Номер договора<\/td>\s*<td[^>]*>Код оплаты<\/td>\s*<td[^>]*>Баланс.*<\/td>\s*<td[^>]*>Валюта<\/td>\s*<\/tr>/)){

        if(matches = html.match(/\s*<tr[^>]*>\s*<td[^>]*>фл-(.*?)<\/td>\s*<td[^>]*>(.*?)<\/td>\s*<td[^>]*>(.*?)<\/td>\s*<td[^>]*>(.*?)<\/td>\s\s*<\/tr>/i)){
            var Dogovor, Kod, balance, currency;
            AnyBalance.trace('found table');
            Dogovor = matches[1];
            Kod = matches[2];
            balance = replaceSpacesAndFloat(matches[3]);
            currency = matches[4];
            result.Dogovor=Dogovor;
            result.balance=balance;
            result.Kod=Kod;
            result.currency=currency;
            AnyBalance.trace(Dogovor);
            AnyBalance.trace(balance);
            AnyBalance.trace(currency);
            AnyBalance.setResult(result);
        }
    }
    AnyBalance.setResult(result);
}

function replaceSpacesAndFloat(string) {
var sOut;
    sOut=string.replace (/\s/g,'');
    sOut=sOut.replace (',', '.');
    return sOut;
}
