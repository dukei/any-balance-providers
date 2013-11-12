/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'Referer': g_baseurl,
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.17 (KHTML, like Gecko) Chrome/24.0.1312.56 Safari/537.17'
};

function dateToYMD(date) {
	var d = date.getDate();
	var m = date.getMonth() + 1;
	var y = date.getFullYear();
	return '' + y + '-' + (m <= 9 ? '0' + m : m) + '-' + (d <= 9 ? '0' + d : d);
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = 'http://profit-partner.ru/';

	var html = AnyBalance.requestGet(baseurl + 'sign/in', g_headers);

	/*var captchaa;
	if(AnyBalance.getLevel() >= 7){
		AnyBalance.trace('Пытаемся ввести капчу');
		var captcha = AnyBalance.requestGet(baseurl+ '/ps/scc/php/cryptographp.php');
		captchaa = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
		AnyBalance.trace('Капча получена: ' + captchaa);
	}else{
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
	}*/
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'username') 
			return prefs.login;
		else if (name == 'password')
			return prefs.password;

		return value;
	});	
	
    var html = AnyBalance.requestPost(baseurl + 'sign/in', params, g_headers);

    if(!/\/sign\/out/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="error"(?:[^>](?!display:none))*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    getParam(html, result, 'today', /<div[^>]*>Сегодня(?:[^>]*>){26}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'yesterday', /<div[^>]*>Вчера(?:[^>]*>){26}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'month', /<div[^>]*>За 30 дней(?:[^>]*>){26}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
    //getParam(html, result, 'estimate', /<td[^>]*>Прогноз дохода[\s\S]*?<td[^>]*>([\s\S]*?)<\/a>\s*<\/td>/i, [/"[^"]*"/g, '', replaceTagsAndSpaces], parseBalance);
	getParam(html, result, 'estimate', /<div[^>]*>Прогноз дохода(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	
	getParam(html, result, 'income', /">([^<]*)(?:[^>]*>){4}Прогноз дохода/i, replaceTagsAndSpaces, parseBalance);
	
    if(AnyBalance.isAvailable('views','clicks','ctr','cpc','cpm','income')){
        var now = new Date();
        var startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        var endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        html = AnyBalance.requestPost(baseurl + 'stats/common/', {
            form_reload:1,
            area:'all',
            period:dateToYMD(startOfMonth) + '~' + dateToYMD(endOfMonth),
            from:'',
            to:'',
            step:'no',
            splits:0,
            split:'',
            diff:0,
            ok:'Показать',
            splitid:'',
            splitarea:'',
            splitname:''
        }, g_headers);

        getParam(html, result, 'views', /Итого:(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'clicks', /Итого:(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'ctr', /Итого:(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'cpc', /Итого:(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'cpm', /Итого:(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        //getParam(html, result, 'income', /Итого:(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    }
    
    AnyBalance.setResult(result);
}
