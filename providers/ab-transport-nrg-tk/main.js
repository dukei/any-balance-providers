/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'application/json, text/javascript, */*; q=0.01',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.7,en;q=0.4',
	'Connection': 'keep-alive',
	'Origin': 'https://nrg-tk.ru',
    'Referer': 'https://nrg-tk.ru/',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
};

function main() {
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8'); 
	
	checkEmpty(prefs.number, 'Введите номер накладной!');
	
    var baseurl = 'https://nrg-tk.ru/client/tracking/';

    var html = AnyBalance.requestGet(baseurl, g_headers);

    html = AnyBalance.requestGet('https://api2.nrg-tk.ru/v2/sending/state/?docNum=' + prefs.number, g_headers);

    var json = getJson(html);
	AnyBalance.trace('Info: ' + JSON.stringify(json));
	
	if(!json || json.code){
		var error = (json && json.message);
		if (error)
			throw new AnyBalance.Error(error, null, /not found/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти информацию. Сайт изменен?');
	}
	
    var result = {success: true};
	
	result.__tariff = prefs.number;

	getParam(json.states[0].title, result, 'operation');
	getParam(json.states[0].movingDateFormatted, result, 'time', null, replaceTagsAndSpaces, parseDate);
	var loc = json.states[0].subStateTitle;
	if (!loc && /Выдан|Доставлен|Вруч/i.test(json.states[0].title)){
		loc = json.cityTo.name;
	}
	getParam(loc, result, 'location');
	getParam(json.states[0].title + getState(json.states[0]), result, 'now');
	getParam(json.cityFrom.name, result, 'from');
    getParam(json.cityTo.name, result, 'tocity');
	getParam(json.priceTripType.title, result, 'triptype');
    getParam(json.places, result, 'sits', null, replaceTagsAndSpaces, parseBalance);
    getParam(json.weight, result, 'weight', null, replaceTagsAndSpaces, parseBalance);
    getParam(json.volume, result, 'volume', null, replaceTagsAndSpaces, parseBalance);
	getParam(json.senderTotalPrice, result, 'senderTotalPrice', null, replaceTagsAndSpaces, parseBalance);
	getParam(json.recipientTotalPrice, result, 'recipientTotalPrice', null, replaceTagsAndSpaces, parseBalance);
	var delivery = 'С ' + json.deliveryDateFromFormatted + ' по ' + json.deliveryDateToFormatted;
	getParam(delivery + '', result, 'delivery');
	
    AnyBalance.setResult(result);
}

function getState(state){
	var info;
    switch (state.idState) {
        case 0:
            info = ' создана';
            break
        case 1:
            info = ': ' + state.stateInfo.warehouse.title + ',<br>адрес: ' + state.stateInfo.warehouse.address + ',<br>телефон: ' + state.stateInfo.warehouse.phone;
            break
        case 2:
            var d = new Date(state.stateInfo.trip.date * 1000);
			var dt = n2(d.getDate()) + '.' + n2(d.getMonth()+1) + '.' + d.getFullYear();
            info = ': от ' + dt + ' ' + state.stateInfo.trip.cityFrom.name + ' -> ' + state.stateInfo.trip.cityTo.name;
            break
        case 3:
            info = '';
            break
        case 10:
            info = '';
            break
        case 20:
            var d = new Date(state.stateInfo.issued.issueDate * 1000);
			var dt = n2(d.getDate()) + '.' + n2(d.getMonth()+1) + '.' + d.getFullYear();
            info = ': ' + dt + ',<br>на складе ' + state.stateInfo.issued.warehouse.title + ',<br>адрес: ' + state.stateInfo.issued.warehouse.address;
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
