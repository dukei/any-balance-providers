/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает данные о версии ,сроке подписки и др. для сайтов работающих на 1С-Битрикс

*/

var g_headers = {
'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
'Connection':'keep-alive',
'User-Agent':'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.111 Safari/537.36'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'http://' + prefs.site;
	AnyBalance.trace('Проверяю наличие формы...');
	var html = AnyBalance.requestPost(baseurl + '/bitrix/admin/', addHeaders({Referer: baseurl})); 
	var form = getParam(html, null, null, /<div[^>]+id="otp"[^>]*>([\s\S]*?)<\/div>/i);    
		if(!form)
			throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
	
    AnyBalance.trace('Форма найдена, пытаюсь авторизироваться...');
    html = AnyBalance.requestPost(baseurl + '/bitrix/admin/?login=yes', {
	'AUTH_FORM':'Y',
	'TYPE':'AUTH',
    'USER_LOGIN': prefs.login,
    'USER_PASSWORD': prefs.password
    });
	
  if(!/bitrix\/admin\/?logout=yes/i.test(html)) {
        var error = getParam(html, null, null, /:'([\s\S]*?)<br>'/i); 
        if(error)
            throw new AnyBalance.Error('Проверьте логин или пароль');
    }
	
	AnyBalance.trace('Авторизация выполнена, начинаю парсить'); 
    var result = {success: true};
    html = AnyBalance.requestGet(baseurl + "/bitrix/admin/update_system.php?lang=ru", g_headers);
	if (/bitrix\/admin\/update_system\.php/i.test(html)) {
	getParam(html, result, 'podpiskaStart', /<td>с ([\s\S]*?)по/i, replaceTagsAndSpaces, parseDate); 
	getParam(html, result, 'podpiskaEnd', /по ([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
	} else {
	throw new AnyBalance.Error('Не удалось найти данную страницу. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + "/bitrix/admin/bitrixcloud_monitoring_admin.php?lang=ru", g_headers);
    if (/bitrix\/admin\/bitrixcloud_monitoring_admin\.php/i.test(html)) {
	getParam(html, result, 'srokDomena', /<td[^>]*>Реги[^>](?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)дн/i, replaceTagsAndSpaces, parseBalance); 
	getParam(html, result, 'dneyPodpiski', /<td[^>]*>Лице[^>](?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)дн/i, replaceTagsAndSpaces, parseBalance);

	AnyBalance.trace('Сматываюсь');
	html = AnyBalance.requestGet(baseurl + "/bitrix/admin/?logout=yes", g_headers);
	}
	
    AnyBalance.setResult(result);
}
