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
    var baseurl = 'https://www.ippi.com/';
    //AnyBalance.setDefaultCharset('windows-1251'); 

    if(!prefs.login)
	    throw new AnyBalance.Error('Вы не ввели логин');
    if(!prefs.password)
	    throw new AnyBalance.Error('Вы не ввели пароль');

    AnyBalance.trace('get  ' + baseurl+'index.php?page=my-home&lang=44');
    var html = AnyBalance.requestPost(baseurl+'index.php?page=my-home&lang=44', {
                page:     'my-login',
                class:    'sign',
                form_name:'contact_form',
                lang:     44,
                username: prefs.login,
                password: prefs.password   
   });

    var p1 = html.lastIndexOf('Authentication error');
    if (p1 > 0)
        throw new AnyBalance.Error('Неверный логин или пароль.');
    
    //Проверяем маркер успешного входа
    p1 = html.lastIndexOf('ippi - My account');
    if(p1 < 0){
         throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    html = html.replace(/\n/g,' ');

    //AnyBalance.trace('GOT ' + html);

    var result = {success: true};
    
    var v = getParam(html, result, 'id', /ID\s*:\s*<\/span>\s*(\S*)\s*<br/, replaceTagsAndSpaces, html_entity_decode);
    //AnyBalance.trace('ID  ' + v);
    v = getParam(html, result, 'balance', /Credit[^>]*>[^>]*>[^>]*>\s*(\S+)\s*.*<\/font>/i, replaceTagsAndSpaces, parseBalance);
    //AnyBalance.trace('BL  ' + v);
    v = getParam(html, result, 'status',  /State<\/th>\s*<td>\s*(\S+)\s*<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    //AnyBalance.trace('ST  ' + v);
    v = getParam(html, result, 'sipid',  /SIP number<\/th>\s*<td>(\d+)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    //AnyBalance.trace('SIP  ' + v);

    //Возвращаем результат
    AnyBalance.setResult(result);
}
