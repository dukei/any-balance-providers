/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');
	
    if(AnyBalance.getLevel() < 5)
        throw new AnyBalance.Error('Для этого провайдера необходимо AnyBalance API v5.');
	
    var baseurl = "https://stat.ipnet.ua/";
	
    var html = AnyBalance.requestGet(baseurl);
    var url = AnyBalance.getLastUrl();
	
    var html = AnyBalance.requestPost(url, {
        login:prefs.login,
        password:prefs.password,
        'auth.x': 63,
        'auth.y': 12
    });
	
    if(!/logout/.test(html)){
        var error = getParam(html, null, null, /<font[^>]*color=["']?red[^>]*>([\s\S]*?)<\/font>/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
		
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }
	
    var result = {success: true};
	
    getParam(html, result, '__tariff', /Тариф:(?:[^>]*>){2}([\s\S]*?)<\//i, [/&ldquo;|&rdquo;/ig, '"', replaceTagsAndSpaces], html_entity_decode);
    getParam(html, result, 'agreement', /Номер договору:(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	
	html = AnyBalance.requestGet(baseurl + 'ua/finance/');
	
    getParam(html, result, 'balance', /Поточний баланс:(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'till', /Послуги сплачені до:(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDate);
    // getParam(html, result, 'status', /Текущее состояние[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    
	if(isAvailable('bonus')) {
		html = AnyBalance.requestGet(baseurl + 'ua/loyalty/');
		getParam(html, result, 'bonus', /Кількість доступних бaлів:(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	}
	
    AnyBalance.setResult(result);
}