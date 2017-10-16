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
	
    var baseurl = 'https://nrg-tk.ru/client/tracking/';
    var ajaxurl = 'https://clients.nrg-tk.ru/tracking';

	AnyBalance.setCookie('nrg-tk.ru', 'DDOSEXPERT_COM_V3', 'c175d59221c53d61968148f9e5c2e939');

    var html = AnyBalance.requestGet(baseurl, g_headers);
    var sitekey = getParam(html, /data-sitekey="([^"]*)/i, replaceHtmlEntities);

    if(!sitekey){
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не удалось найти форму запроса. Сайт изменен?');
    }

    var response = solveRecaptcha('Пожалуйста, докажите, что вы не робот.', baseurl, sitekey);

    html = AnyBalance.requestPost(ajaxurl, {
    	docNum: prefs.number,
    	'g-recaptcha-response': response,
    	submit: ''
    }, addHeaders({
    	'X-Requested-With': 'XMLHttpRequest',
    	Referer: baseurl

    }));

    var json = getJson(html);
	
	if(!json || json.code){
		var error = (json && json.code);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти информацию. Сайт изменен?');
	}
	
    var result = {success: true};

    getParam(json.states[0].title + getState(json.states[0]), result, 'now');
    getParam(json.cityTo.name, result, 'tocity');
    getParam(json.cityFrom.name, result, 'from');
    getParam(json.places, result, 'sits');
    getParam(json.weight, 'weight');
    getParam(json.volume, result, 'volume');
	
    AnyBalance.setResult(result);
}

function getState(state){
	var info;
    switch (state.idState) {
        case 0:
            info = ' создана';
            break
        case 1:
            info = ': ' + state.stateInfo.warehouse.title + ', адрес ' + state.stateInfo.warehouse.address + ', телефон ' + state.stateInfo.warehouse.phone;
            break
        case 2:
            var d = new Date(state.stateInfo.trip.date * 1000);
            info = ': от ' + $.date(d) + ' ' + state.stateInfo.trip.cityFrom.name + '-' + state.stateInfo.trip.cityTo.name;
            break
        case 3:
            info = '';
            break
        case 10:
            info = '';
            break
        case 20:
            var d = new Date(state.stateInfo.issued.issueDate * 1000);
            info = ': ' + (state.stateInfo.issued.issueDateFormatted).slice(0,-9) + ', на складе "' + state.stateInfo.issued.warehouse.title + '"';
            break
        default:
            info = ': информация отсутствует. За информацией обратитесь к операторам по номеру 8-800-700-7000';
            break
    }
    return info;
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
