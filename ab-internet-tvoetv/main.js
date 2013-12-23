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

g_services = {
    tv: {
       name: 'Твоё ТВ',
       section: /<img[^>]*src="\.\/i\/logo-tv-grey\.jpg"[^>]*>([\s\S]*?)(?:<img[^>]*src="\.\/i\/logo-(?:inet|tv|phone)-grey\.jpg"[^>]*>|$)/
    },
    inet: {
       name: 'Твой Интернет',
       section: /<img[^>]*src="\.\/i\/logo-inet-grey\.jpg"[^>]*>([\s\S]*?)(?:<img[^>]*src="\.\/i\/logo-(?:inet|tv|phone)-grey\.jpg"[^>]*>|$)/
    },
    phone_local: {
       name: 'Твой Телефон (местные вызовы)',
       section: /<img[^>]*src="\.\/i\/logo-phone-grey\.jpg"[^>]*>([\s\S]*?)(?:<img[^>]*src="\.\/i\/logo-(?:inet|tv|phone)-grey\.jpg"[^>]*>|$)/,
       subsection: /<th[^>]*class="[^"]*header[^>]*>\s*местная связь([\s\S]*?)(?:<th[^>]*class="[^"]*header[^>*]>|$)/i
    },
    phone_inter: {
       name: 'Твой Телефон (междугородние/международные)',
       section: /<img[^>]*src="\.\/i\/logo-phone-grey\.jpg"[^>]*>([\s\S]*?)(?:<img[^>]*src="\.\/i\/logo-(?:inet|tv|phone)-grey\.jpg"[^>]*>|$)/,
       subsection: /<th[^>]*class="[^"]*header[^>]*>\s*междугородняя\/международная связь([\s\S]*?)(?:<th[^>]*class="[^"]*header[^>*]>|$)/i
    }
};

function main(){
    var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "http://www.spb.tvoe.tv/cabinet/";

	var html = AnyBalance.requestGet(baseurl + 'auth.php', g_headers);
	
	
    var html = AnyBalance.requestPost(baseurl + 'auth.php', {
        login: prefs.login,
        password: prefs.password,
        submit: 'Продолжить'
    });

    var error = getParam(html, null, null, /(<form[^>]*name="auth")/i);
    if(error)
        throw new AnyBalance.Error("Не удаётся войти в личный кабинет. Неправильный логин/пароль?");

    var result = {success: true};

    getParam(html, result, 'userName', /<h3>Абонент<\/h3>[\s\S]*?<strong[^>]*>([^<]*)/i, replaceTagsAndSpaces);

    var what = prefs.what || 'tv';
    if(!g_services[what])
        what = 'tv';

    var service = g_services[what];
    var serviceBody = getParam(html, null, null, service.section);
    if(!serviceBody)
        throw new AnyBalance.Error('Не удалось найти информацию по сервису ' + service.name);

    getParam(serviceBody, result, 'agreement', /Договор №[^>]*>([^<]*)/i, replaceTagsAndSpaces);

    if(service.subsection)
        serviceBody = getParam(serviceBody, null, null, service.subsection);
    
    if(!serviceBody)
        throw new AnyBalance.Error('Не удалось найти детальную информацию по сервису ' + service.name);

    result.__tariff = service.name;
    getParam(serviceBody, result, 'balance', /Баланс:[\s\S]*?<strong[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(serviceBody, result, 'credit', /Кредит:[\s\S]*?<strong[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(serviceBody, result, 'status', /Статус:[\s\S]*?<strong[^>]*>([^<]*)/i, replaceTagsAndSpaces);

    AnyBalance.setResult(result);
}