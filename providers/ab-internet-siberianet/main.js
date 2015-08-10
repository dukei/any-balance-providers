/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для Красноярского интернет провайдера siberianet 

Operator site: http://siberianet.ru
Личный кабинет: https://cab.siberianet.ru/
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
    var baseurl = "https://cab.siberianet.ru/";
    AnyBalance.setDefaultCharset('windows-1251'); 

    var html = AnyBalance.requestPost(baseurl + 'login.php', {
	sendform:'/',
	login:prefs.login,
	password:prefs.password
    }, addHeaders({Referer: baseurl})); 

    if(!/\/exit.php/i.test(html)){
        //Если в кабинет войти не получилось, то в первую очередь надо поискать в ответе сервера объяснение ошибки
        var error = getParam(html, null, null, /error_login.gif[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        //Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    //Раз мы здесь, то мы успешно вошли в кабинет
    //Получаем все счетчики
    var result = {success: true};
    getParam(html, result, 'fio', /К<[^>]*>лиент:([\s\S]*?)(?:<br|<\/div>)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /Т<[^>]*>арифный план:([\s\S]*?)(?:<br|<\/div>)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'licschet', /Н<[^>]*>омер счета:([\s\S]*?)(?:\(|<br|<\/div>)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Т<[^>]*>екущий остаток:([\s\S]*?)(?:<br|<\/div>)/i, replaceTagsAndSpaces, parseBalance);

    if(AnyBalance.isAvailable('traffic')){
        var dt = new Date();
        html = AnyBalance.requestPost(baseurl + 'stat.php?summary', {
	    beg:'01.' + (dt.getMonth() < 9 ? '0' : '') + (dt.getMonth()+1) + '.' + dt.getFullYear(),
	    end: (dt.getDate() < 10 ? '0' : '') + dt.getDate() + '.' + (dt.getMonth() < 9 ? '0' : '') + (dt.getMonth()+1) + '.' + dt.getFullYear()
        }, g_headers);
        getParam(html, result, 'traffic', /<td[^>]*>Интернет трафик[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, function(str){ return parseTrafficGb(str, 'bytes'); });
    }

    getParam(html, result, '__tariff', /Т<[^>]*>арифный план:([\s\S]*?)<br/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'phone', /Номер:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Текущий баланс:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'status', /Статус:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);

    //Возвращаем результат
    AnyBalance.setResult(result);
}
