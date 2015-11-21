/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
'Accept-Encoding':'gzip, deflate, sdch',
'Accept-Language':'en-US,en;q=0.8,ru;q=0.6',
'Connection':'keep-alive',
'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.86 Safari/537.36'
}
function main(){
    var prefs = AnyBalance.getPreferences();
    checkEmpty(prefs.kinnumber, 'Введите номер заявления!');
    var baseurl = "http://www.krskstate.ru/krao/underschool/";
    AnyBalance.setDefaultCharset('utf-8'); 
    var html = AnyBalance.requestGet(baseurl + 'queue', g_headers);
    if(!html || AnyBalance.getLastStatusCode() > 400){
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    };
    html = AnyBalance.requestGet(baseurl + 'queue?kinnumber=' + prefs.kinnumber,
        addHeaders({Referer: baseurl + 'queue'})); 

    if(!/\/Первичная информация о положении в очереди/i.test(html)){
        // var error = getParam(html, null, null, /Информация не найдена[\s\S]*?<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
        var error = /Информация не найдена/.test(html);
        if(error){
            //При выкидывании ошибки входа третьим параметром передаём проверку на то, что это ошибка неправильного пароля. 
            //Если третий параметр true, то AnyBalance прекратит обновления до тех пор, пока пользователь не изменит настройки.
            //Это важно, а то постоянные попытки обновления с неправильным паролем могут заблокировать кабинет.
            throw new AnyBalance.Error(error, null, /Информация не найдена/i.test());
        }
		AnyBalance.trace(html); //В непонятных случаях лучше сделать распечатку в лог, чтобы можно было понять, что случилось
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    getParam(html, result, 'login', /Имя(?:\s|&nbsp;)*абонента:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'queue', /<p[^>]*>Статус/состояние:[\s\S]*?([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'lvcount', /<p[^>]*>Количество внеочередников[\s\S]*?([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'lpcount', /<p[^>]*>Количество первоочередников[\s\S]*?([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'uncount', /<p[^>]*>Количество не имеющих льготу[\s\S]*?([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
    AnyBalance.setResult(result);
}
