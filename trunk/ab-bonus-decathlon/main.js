/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Бонусная программа Декатлон

Сайт оператора: http://www.decathlon.ru/RU/
Личный кабинет: http://customercard.decathlon.fr/netcard/index.jsp?language=RU&country=RU
*/

var g_headers = {
  'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
  'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
  'Connection':'keep-alive',
  'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.97 Safari/537.11'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://customercard.decathlon.fr/netcard/site/';

    var html = AnyBalance.requestPost(baseurl + 'loadAccount.do', {
        login: prefs.login,
        passcode: prefs.password
    }, g_headers);
    
    
    if(!/disconnect.do/.test(html)){
      throw new AnyBalance.Error("Не удалось зайти в личный кабинет. Неверный номер карты или пароль?");
    }

    var result = {success: true};

    getParam(html, result, '__tariff', /<\w+ id="espace_perso_solde_title"[^>]*>[\s\S]*?<br[^>]*>([\s\S]*?)<\/p>/, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /<\w+ id="espace_perso_solde_messages">[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'left2kupon', /<\w+ id="espace_perso_solde_messages">(?:[\s\S]*?<p[^>]*>){2}([\s\S]*?)<\/p>/, replaceTagsAndSpaces, parseBalance);
    
    AnyBalance.setResult(result);
}

