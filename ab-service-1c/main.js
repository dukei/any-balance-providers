/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.65 Safari/537.36'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://login.1c.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 
    AnyBalance.trace('Пытаюсь авторизироваться...');
    var html = AnyBalance.requestGet(baseurl + 'login', g_headers);
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'username') 
			return prefs.login;
		else if (name == 'password')
			return prefs.password;

		return value;
	});	
	
	params['rememberMe'] = undefined;
	
	html = AnyBalance.requestPost(baseurl + 'login', params, addHeaders({Referer: baseurl + 'login'})); 

    if(!/logout/i.test(html)){
        var error = getParam(html, null, null, /msg"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
		
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	AnyBalance.trace('Авторизация выполнена, начинаю парсить'); 
    html = AnyBalance.requestGet('https://portal.1c.ru/subscription/contract/list', g_headers);
	
	if(/У Вас нет действующих или будущих договоров 1С/i.test(html))
		throw new AnyBalance.Error('У Вас нет активных подписок на ИТС');
	
	/*if(/У Вас нет активированных сервисов 1С/i.test(html))
		throw new AnyBalance.Error('У Вас нет активных подписок на ИТС:Отраслевой');*/
	var result = {success: true};
	
    getParam(html, result, 'date-end-ITS', /<th>Действует по<\/th>([^>]*>){14}/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'date-start-ITS', /<th>Действует с<\/th>([^>]*>){14}/i, replaceTagsAndSpaces, parseDate);
	//getParam(html, result, 'dateITS-OTR', /<th>Действует по<\/th>([^>]*>){63}/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'viddogovoraITS', /<th>Вид договора<\/th>([^>]*>){14}/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'partnerITS', /<th>Партнер 1С<\/th>([^>]*>){14}/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'clientITS', /<th>Зарегистрирован на<\/th>([^>]*>){14}/i, replaceTagsAndSpaces, html_entity_decode);
	//AnyBalance.trace('Делаю выход'); 
	//html = AnyBalance.requestPost(baseurl + 'logout');
	
    AnyBalance.setResult(result);
}