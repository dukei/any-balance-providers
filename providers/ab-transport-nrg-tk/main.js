/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'*/*',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.99 Safari/537.36',
	'Accept-Language': 'ru,en;q=0.8'
};

function main() {
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8'); 
	
	checkEmpty(prefs.number, 'Введите номер накладной!');
	
    var baseurl = 'http://api.nrg-tk.ru/api/rest';
	
    var html = AnyBalance.requestGet(baseurl + '/?callback=jQuery11100618867561686784_1421683618927&method=nrg.get_sending_state&numdoc=' + encodeURIComponent(prefs.number) + '&idcity=' + encodeURIComponent(prefs.city) + '&_=' + new Date().getTime(), addHeaders({Referer: baseurl + 'tracking.html'}));
	
	// buildRegions(html);
	
	var json = getParam(html, null, null, /jQuery[\d_]+\((\{[\s\S]*?\})\)/i, null, getJson);
	
	if(!json || !json.rsp || json.rsp.stat != 'ok'){
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти информацию. Сайт изменен?');
	}
	
	json = json.rsp.info;
	
    var result = {success: true};

    getParam(json.cur_state + '', result, 'now', null, replaceTagsAndSpaces, html_entity_decode);
    getParam(json.cityto + '', result, 'tocity', null, replaceTagsAndSpaces, html_entity_decode);
    getParam(json.cityfrom + '', result, 'from', null, replaceTagsAndSpaces, html_entity_decode);
    getParam(json.num_places + '', result, 'sits', null, replaceTagsAndSpaces, html_entity_decode);
    getParam(json.weight + '', result, 'weight', null, replaceTagsAndSpaces, parseBalance);
    getParam(json.volume + '', result, 'volume', null, replaceTagsAndSpaces, parseBalance);
	
    AnyBalance.setResult(result);
}

function buildRegions(result){
    var html = AnyBalance.requestGet('http://nrg-tk.ru/poisk-nakladnoj.html'),
	select = getParam(html, null, null, /(<select[^>]+id="city[^>]*>([\s\S]*?)<\/select>)/i, null, null),
	regions = sumParam(select, null, null, /(<option[^>]*>([\s\S]*?)<\/option>?)/ig);
	
    // console.log(regions);
	
    var names = [], values = [], value = '';
    for(var i=0; i<regions.length; ++i){
        value = getParam(regions[i], null, null, /value=['"]([^'"]*)/i, replaceTagsAndSpaces);
        if (value !== "") {
            values.push(value);
            names.push(getParam(regions[i], null, null, /<option[^>]*>([\s\S]*?)<\/option>/i, replaceTagsAndSpaces));
        }

    }
    if (values.length === 0) AnyBalance.trace('Города не найдены.');

    console.log(names.join('|'));
    console.log(values.join('|'));

}
