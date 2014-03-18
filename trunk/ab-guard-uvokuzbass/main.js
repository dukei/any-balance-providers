/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс для управления вневедомственной охраны УВО Кузбасс

Operator site: http://www.uvokuzbass.ru/
Личный кабинет: http://www.uvokuzbass.ru/dolg.html
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/33.0.1750.154 Safari/537.36'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "http://www.uvokuzbass.ru/";
    AnyBalance.setDefaultCharset('utf-8'); 

	var html = AnyBalance.requestGet(baseurl + 'zadolg/', g_headers);

    html = AnyBalance.requestPost(baseurl + 'zadolg/', {
		sposob:1, //По лицевому счету
		NOMOVO:'А8238',
		LSCHET:prefs.login,
		DOG:'',
		FIO:'',
		sendinfo:'Узнать задолженность'
		//cities:prefs.city,
    }, addHeaders({Referer: baseurl + 'zadolg/'})); 
	
	if(!/На дату \d{2}.\d{2}.\d{2,4}/i.test(html)){
		var error = getParam(html, null, null, /<p[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти информацию. Сайт изменен?');
	}
	
    var result = {success: true};
	
	getParam(html, result, 'balance', /(?:Переплата|Задолженность) по штрафам(?:[^>]*>){7}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'licschet', /На дату[^<]*(?:задолженность|переплата)\s+по\s+договору([^<]*)составляет/i, replaceTagsAndSpaces, html_entity_decode);
    //getParam(html, result, 'balance', /(?:Переплата|Задолженность) по счету[\s\S]*?(<span[^>]*>[\s\S]*?)<\/span>/i, [/<span[^>]+color:\s*red[^>]*>/g, '-', replaceTagsAndSpaces], parseBalance);
	

	
	
	
	
//    makeCities(result);

    //Возвращаем результат
    AnyBalance.setResult(result);
}

function makeCities(result){
    var html = AnyBalance.requestGet('http://www.uvokuzbass.ru/dolg.html', g_headers);
    var citieshtml = getParam(html, null, null, /<select[^>]+name="cities"[^>]*>([\s\S]*?)<\/select>/i);
    var cities = sumParam(citieshtml, null, null, /<option[^>]*>[\s\S]*?<\/option>/ig);
    var joinfunc = create_aggregate_join('|');
    for(var i=0; i<cities.length; ++i){
        sumParam(cities[i], result, 'entries', null, replaceTagsAndSpaces, html_entity_decode, joinfunc);
        sumParam(cities[i], result, 'entryValues', /value="([^"]*)/i, null, html_entity_decode, joinfunc);
    }
}
