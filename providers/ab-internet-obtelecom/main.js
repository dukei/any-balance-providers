/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у интернет провайдера Obtelecom

Сайт оператора: http://obtelecom.ru
Личный кабинет: https://my.obtelecom.ru/cli/
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Language':'en-US,en;q=0.5',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:45.0) Gecko/20100101 Firefox/45.0'
	
};

function main(){
    
    var prefs = AnyBalance.getPreferences();
    	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
    
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://my.obtelecom.ru/";
    AnyBalance.setAuthentication(prefs.login, prefs.password);
    html = AnyBalance.requestGet(baseurl + "cli/client.php", g_headers);

    var status_code = AnyBalance.getLastStatusCode();
    if(status_code >= 300)
            throw new AnyBalance.Error("Ошибка при входе на сайт - сервер вернул статус:" + status_code);
     
    AnyBalance.trace('Trying to find balance on page');
    var result = {success: true};
    getParam(html, result, 'balance', /&nbsp;\d+\.?\d*\D+\(руб\)/g, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}
