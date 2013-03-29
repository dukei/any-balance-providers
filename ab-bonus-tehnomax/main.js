/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс на бонусной карте сети магазинов ТехноМакс

Operator site: http://tehnomaks.ru
Личный кабинет: http://tehnomaks.ru/modules.php?op=modload&name=discount&file=index
*/


var g_headers = {
'Accept':'text/plain,*/*;q=0.01',
'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
'Connection':'keep-alive',
'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.22 (KHTML, like Gecko) Chrome/25.0.1364.172 Safari/537.22',
'X-Requested-With':'XMLHttpRequest'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('windows-1251'); 

    var baseurl = "http://tehnomaks.ru/modules.php?op=modload&name=discount&file=index";

    //Теперь, когда секретный параметр есть, можно попытаться войти
    var html = AnyBalance.requestPost(baseurl + '&id=2', {
	'disc[number]':prefs.login,
	'disc[name]':prefs.password
    }, addHeaders({Referer: baseurl})); 

    if(!/Всего на вашей карте:/i.test(html)){
        //Если в кабинет войти не получилось, то в первую очередь надо поискать в ответе сервера объяснение ошибки
        var error = getParam(html, null, null, /<h1[^>]*>Дисконтная система "Техномакс"([\s\S]*?)Вернуться назад<\/a>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось получить информацию по карте. Сайт изменен?');
    }

    //Раз мы здесь, то мы успешно вошли в кабинет
    //Получаем все счетчики
    var result = {success: true};
    getParam(prefs.login, result, '__tariff', null, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Всего на вашей карте:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'willbe', /Скоро будет доступно:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'available', /Доступно к получению:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(prefs.login, result, '__tariff');

    //Возвращаем результат
    AnyBalance.setResult(result);
}
