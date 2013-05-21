/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию о перевозках в ТК Энергия 

Operator site: http://nrg-tk.ru/poisk-nakladnoj.html
*/

var g_headers = {
'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
'Connection':'keep-alive',
'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main() {
    var prefs = AnyBalance.getPreferences();

    var baseurl = "http://nrg-tk.ru/";

    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestPost(baseurl + 'tracking.php', {
        city:prefs.city,    
        invoice:prefs.number,
    }, addHeaders({Referer: baseurl + 'tracking.php'})); 

    if(/Накладная не найдена!/i.test(html)){
        var error = getParam(html, null, null, null, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

    getParam(html, result, 'now', /\nТекущее местоположение:\s*([\s\S]*?)$/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'tocity', /\nКуда:\s*([\s\S]*?)\n/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'from', /\nОткуда:\s*([\s\S]*?)\n/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'sits', /\nКол\-во мест:\s*([\s\S]*?)\n/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'weight', /\nВес:\s*([\s\S]*?)\n/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'volume', /\nОбъём:\s*([\s\S]*?)\n/i, replaceTagsAndSpaces, parseBalance);

    getParam(html, result, 'results', null, [/:([\s\S]*?)(?:\n|$)/ig, ": <strong>$1</strong><br/>", /\n/g, "<br/>"], null);

// buildRegions(html);

    AnyBalance.setResult(result);
}

function buildRegions(result){
    var html = AnyBalance.requestGet('http://nrg-tk.ru/poisk-nakladnoj.html'),
        select = getParam(html, null, null, /(<select[^>]+id="city"[^>]*>([\s\S]*?)<\/select>)/i, null, null),
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
