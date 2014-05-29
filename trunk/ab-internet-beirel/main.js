/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает следующие данные для интернет провайдера Бэйрэль Телеком: 
ФИО, номер лицевого счета, баланс, блокировка, и название тарифа

Todo:
Отображение ip-адреса
Отображение услуг
Отображение iptv устройства
Отображение iptv пакетов
.....
и главное, что б все это работало, а у меня хватило сил и усидчивости :-D
Что не так - сюда: roman@terekhov.su


Официальный сайт: http://www.beirel.ru/
Личный кабинет: https://lk.beirel.ru
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.31 (KHTML, like Gecko) Chrome/26.0.1410.64 Safari/537.31'
};

function main(){
    var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    var baseurl = "https://lk.beirel.ru/";

    AnyBalance.setDefaultCharset('windows-1251'); 

    var html = AnyBalance.requestPost(baseurl + 'login/', {
        login:prefs.login,
        password:prefs.password,
        cmd:'login'
    }, addHeaders({Referer: baseurl + 'login/'})); 
    
    if(!/Выход<\/A>/i.test(html)){
        var error = getParam(html, null, null, /(?:[\s\S]*?<BR[^>]*>){2}([\s\S]*?)<BR>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
		
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    
	getParam(html, result, 'balance', [/<th[^>]*>Баланс лицевого счета, руб.<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/i, /class="balance[^"]+"([^>]*>){2}/i], replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'clientname', /<th>Полное имя<\/th><td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'accuntid', /<th>Лицевой счет<\/th><td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'block', /<th[^>]*>Блокировка<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    html = AnyBalance.requestGet(baseurl + 'services/internet/ip-address/', g_headers);

    getParam(html, result, '__tariff', /<td[^>]*>тариф(?:[\s\S]*?)[^>]+[;]/i, replaceTagsAndSpaces, html_entity_decode);    

    AnyBalance.setResult(result);
}