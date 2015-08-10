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

function getOptionByName(html, name, result, counterSuffix) {
	var div = getParam(html, null, null, new RegExp('"options"(?:[^>]*>){5}' + name + '(?:[\\s\\S]*?</div[^>]*>){17,19}', 'i'));
	if (div) {
		getParam(div, result, 'status' + counterSuffix, /turn(?:off|on)[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(div, result, 'balance' + counterSuffix, /<div[^>]*>Баланс(?:[\s\S]*?<div[^>]*>){1}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	}
}

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://lk.quartztelecom.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + 'login', g_headers);

	html = AnyBalance.requestPost(baseurl + 'login', {
        username:prefs.login,
        passwd:prefs.password,
    }, addHeaders({Referer: baseurl + 'login'})); 

    if(!/\/Logout/i.test(html)){
        var error = getParam(html, null, null, /<div\s*class="errors">\s*<p class="style2">\s*([\s\S]*?)\s*<\/p>\s*<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	html = AnyBalance.requestGet(baseurl + 'services', g_headers);
	
    var result = {success: true};
    
	getParam(html, result, 'fio', /<div[^>]*class="customer_name"><p>([^<]*)/i, null, html_entity_decode);
	getParam(html, result, 'account', /№ ЛИЦЕВОГО СЧЕТА(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	sumParam(html, result, '__tariff', /Тариф(?:[\s\S]*?<div[^>]*>){2}((?:[^>]*>){8})/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
	
	getOptionByName(html, 'Интернет', result, '');
	getOptionByName(html, '(?:КТВ|Цифровое тв)', result, '_tv');
	
	if(isAvailable('all')) {
		var packs = getParam(html, null, null, /Пакеты\s*<\/div>([\s\S]*?)(?:<\/div>\s*){2}/i);
		sumParam(packs, result, 'all', /rate_name">((?:[^>]*>){8}\s*<\/div>)/ig, [replaceTagsAndSpaces, /(^[^\d]+)(\d+\s*Р\s*\/[^"]+)/i, '<b>$1</b>: $2'], html_entity_decode, function(values) {return values.join('<br/>');});
	}
	
    AnyBalance.setResult(result);
}