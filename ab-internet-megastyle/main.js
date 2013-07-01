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
	
    var baseurl = 'https://stats.uch.net/';
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestPost(baseurl + 'EndUserStats/index2.php', {
		Login:prefs.login,
        Password:prefs.password,
        submit:'Смотреть статистику'
    }, addHeaders({Referer: baseurl + 'EndUserStats/index.html'})); 

    if(!/Общая информация о пользователе/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

	var result = {success: true};
    getParam(html, result, 'balance', /Денег на л\/сч, грн[\s\S]*?class=info>([\s\S]*?)<\/FONT>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'bonus', /акционных:([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /Контактное лицо[\s\S]*?class=info>([\s\S]*?)<\/FONT>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'account', /Номер лицевого счета[\s\S]*?class=info><B>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'status', /Текущий статус[\s\S]*?<B>([\s\S]*?)<\/B>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'deadline', /дата отключения[\s\S]*?class=info>([\s\S]*?)<\/FONT>/i, replaceTagsAndSpaces, parseDateISO);

    //Возвращаем результат
    AnyBalance.setResult(result);
}
