/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Cache-Control': 'max-age=0',
	'Connection':'keep-alive',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent':'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36'
};

var baseurl;

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');
	
	if(prefs.source && prefs.source === 'old'){
		var baseurl = 'https://lk.quartztelecom.ru/';
	}else{
	    var baseurl = 'https://lk.tvpodolsk.ru/';
	}

    var html = AnyBalance.requestGet(baseurl + 'login', g_headers);

	html = AnyBalance.requestPost(baseurl + 'login', {
        username:prefs.login,
        passwd:prefs.password,
    }, addHeaders({Referer: baseurl + 'login'})); 

    if(!/\/Logout/i.test(html)){
        var error = getElement(html, /<span[^>]+action-label/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error, null, /логин|парол/i.test(error));
		
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }
	
	html = AnyBalance.requestGet(baseurl + 'services/main', g_headers);
	
    var result = {success: true};
    
	getParam(html, result, 'fio', /<div[^>]*class="main-info__name"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	getParam(html, result, 'address', /<div[^>]*class="main-info__adress"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	getParam(html, result, 'account', /Л\/сч:([^<]*)/i, replaceTagsAndSpaces);
	getParam(html, result, '__tariff', /Тариф:(?:[^>]*>){2}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	getParam(html, result, 'abon', /Тариф:(?:[^>]*>){5}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'speed', /Cкорость:[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'status', /<span[^>]+activity-label[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	getParam(html, result, 'balance', /<span[^>]+main-info__money-count[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	
    AnyBalance.setResult(result);
}
