/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Cache-Control': 'max-age=0',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
};

function main(){
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://alga-card.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(/^\d{19}$/.test(prefs.cardnumber), 'Введите номер карты - 19 цифр без пробелов и разделителей!');
	
	var html = AnyBalance.requestGet(baseurl + 'balance/', g_headers);
	
	if(AnyBalance.getLastStatusCode() >= 400){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
    }
	
	var form = getElement(html, /<form[^>]*>/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму входа! Сайт изменен?');
	}
	        
	var params = createFormParams(form, function(params, str, name, value) {
		if (name == 'cardnumber') {
			return prefs.cardnumber;
		}
	        
		return value;
	});
			
	var action = getParam(form, null, null, /<form[\s\S]*?action=\"([\s\S]*?)\"/i);
	
	html = AnyBalance.requestPost(action, params, addHeaders({'Content-Type': 'application/x-www-form-urlencoded', 'Referer': baseurl}));
	
	if(!/balance-result success/.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class='balance-result error'[^>]*>([\S\s]*?)<\/div>/, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error, null, true, false);
		
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось проверить баланс карты. Сайт изменен?');
    }
	
	var result = {success:true};
    
	getParam(html, result, 'balance', /<div[^>]+class='balance-text'[^>]*>([\S\s]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	
	result.__tariff = prefs.cardnumber.replace(/.*(\d{4})(\d{5})(\d{5})(\d{5})$/, '$1 $2 $3 $4');
	result.cardnum = prefs.cardnumber.replace(/.*(\d{4})(\d{5})(\d{5})(\d{5})$/, '$1 $2 $3 $4');

	AnyBalance.setResult(result);
}
