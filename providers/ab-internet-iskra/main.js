/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Connection': 'keep-alive',
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');
	
    var baseurl = 'https://stat.seven-sky.net/cgi-bin/clients/';

    var html = AnyBalance.requestGet(baseurl + 'login', g_headers);
    
    if(!html || AnyBalance.getLastStatusCode() > 400){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    AnyBalance.sleep(2000);

    html = AnyBalance.requestPost(baseurl + 'login', {
        action: 'validate',
        login: prefs.login,
        password: prefs.password,
        submit: 'Вход'
    }, addHeaders({ Referer: baseurl + 'login' }));

    if(!/exit.jsp|action=logout/.test(html)){
        var error = getParam(html, null, null, /<span[^>]*style=["']color:\s*#101010[^>]*>([\s\S]*?)<\/span>/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    var url = AnyBalance.getLastUrl();
    if(/lk.seven-sky\.net/.test(url)){
		getParam(html, result, 'balance', /<li>\s*Баланс:(?:<[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'days', /<li[^>]*>\s*Дней до блокировки:(?:<[^>]*>){1}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, '__tariff', /Ваш тарифный план[\s\S]*?<strong[^>]*>([\s\S]*?)<\/strong>/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, 'licschet', /Лицевой счет №\s*(\d+)/i, replaceTagsAndSpaces, html_entity_decode);
		
    } else if(/stat.seven-sky\.net/.test(url)){
    	//Может, этого уже и нет...
        getParam(html, result, 'balance', /Ваш баланс(?:[^>]*>){5}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'licschet', /счет N([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
    } else{
    	throw new AnyBalance.Error('Кабинет по адресу ' + url + ' не поддерживается. Сайт изменен?');
    }

    AnyBalance.setResult(result);
}