/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
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
    var baseurl = 'http://stat.premier-gc.ru/';
    AnyBalance.setDefaultCharset('windows-1251'); 

    if(!prefs.login)
	    throw new AnyBalance.Error('Вы не ввели логин');
    if(!prefs.password)
	    throw new AnyBalance.Error('Вы не ввели пароль');

    var html = AnyBalance.requestPost(baseurl+'client.php', {
		ContractNumber: prefs.login,
        Password:       prefs.password
    });

    var p1 = html.lastIndexOf('Введите пароль');
    if (p1 > 0)
        throw new AnyBalance.Error('Неверный логин или пароль.');
 
    //AnyBalance.trace('got  ' + html);
    
    //Проверяем маркер успешного входа
    p1 = html.lastIndexOf('<td>ID Клиента:');
    if(p1 < 0){
         throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
    var result = {success: true};
    
    getParam(html, result, 'fio',     /Название:<\/td>[^>]*><b>(.*?)<\/b>/i,    replaceTagsAndSpaces, html_entity_decode);
    //getParam(html, result, 'tariff',  /Пакет услуг<\/td><td><b>(.*?)<\/b>/i,    replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Баланс:<\/td>[^>]*><b>(.*?)<\/b>/i,      replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'status',  /Статус клиента:<\/td>[^>]*?>[^>]*?><FONT[^>]*>(.*?)<\/FONT>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'dogovor', /Договор:<\/td>[^>]*><b>(.*?)<\/b>/i,     replaceTagsAndSpaces, html_entity_decode);
    //getParam(html, result, 'id',      /ID Клиента:<\/td>[^>]*><b>(.*?)</i,  replaceTagsAndSpaces, parseBalance);

    //Возвращаем результат
    AnyBalance.setResult(result);
}
