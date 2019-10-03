/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    Accept:'application/json,text/plain,*/*',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    Connection:'keep-alive',
    'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.90 Safari/537.36'
};

var baseurl = 'https://my.mosenergosbyt.ru/';

function callApi(query, params, action){
	if(!action)
		action = sql;
    if(!params)
    	params = {};
    let url = baseurl + '?gate_lkcomu?action=' + action + '&query=' + query;
    if(callApi.session)
    	url += '&session=' + callApi.session;

    var html = AnyBalance.requestPost(url, params, addHeaders({
    	Referer: baseurl
    }));

    var json = getJson(html);
    if(!json.success){
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Ошибка вызова API ' + query + '. Сайт изменен?');
    }

    if(query === 'login'){
    	callApi.session = json.data[0].session;
    }

    return json.data;
}


var MES_KD_PROVIDER = 1;
var MOE_KD_PROVIDER = 2;
var TMK_NRG_KD_PROVIDER = 3;
var TMK_RTS_KD_PROVIDER = 4;
var UFA_KD_PROVIDER = 5;
var TKO_KD_PROVIDER = 6;
var VLG_KD_PROVIDER = 7;
var ORL_KD_PROVIDER = 8;
var ORL_EPD_KD_PROVIDER = 9;

export const providersPlugin = {
    [MES_KD_PROVIDER]: "bytProxy",
    [MOE_KD_PROVIDER]: "smorodinaTransProxy",
    [ORL_KD_PROVIDER]: "orlBytProxy",
    [TMK_NRG_KD_PROVIDER]: "tomskProxy",
    [TMK_RTS_KD_PROVIDER]: "tomskProxy",
    [UFA_KD_PROVIDER]: "ufaProxy",
    [TKO_KD_PROVIDER]: "trashProxy",
    [VLG_KD_PROVIDER]: "vlgProxy",
    [ORL_EPD_KD_PROVIDER]: "orlProxy",
};



function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(/^(?:\+7|8)?9\d{9}$/.test(prefs.login) || /@/.test(prefs.login), 'Введите в качестве логина ваш номер телефона в формате 9XXXXXXXXX или e-mail.');
	checkEmpty(prefs.password, 'Введите пароль!');			

	callApi('login', {
		login: prefs.login, 
		psw: prefs.password, 
		vl_device_info: JSON.stringify({appver: "1.9.0", type: "browser", "userAgent": g_headers['User-Agent']})
	}, 'auth');

	callApi('Init');

	var result = {success: true};

	var lss = callApi('LSList');
	var lsCurrent = null;
	var lssStr = '';
	for(var i=0; lss && i<lss.length; ++i){
		var ls = lss[i];
		AnyBalance.trace('Найден ЛС ' + ls.nn_ls + ': ' + ls.nm_type + ', ' + ls.nm_street);
		lssStr += ls.nn_ls + ': ' + ls.nm_type + ', ' + ls.nm_street + '\n';
		if(!lsCurrent && ls.nn_ls.indexOf(prefs.num) >= 0){
			AnyBalance.trace('Выбираем ЛС ' + ls.nn_ls + ' в качестве текущего');
			lsCurrent = ls;
		}
	}

	getParam(lssStr, result, 'lss');

	if(!lsCurrent && prefs.num){
		throw new AnyBalance.Error('Не удалось найти лицевой счет, содержащий ' + prefs.num + '. Доступные лицевые счета:\n' + lssStr, false, true);
	}

	if(!lsCurrent)
		lsCurrent = lss[0];

	if(!lsCurrent)
		throw new Anybalance.Error('В Вашем кабинете нет лицевых счетов');




    getParam(html, result, 'balance', /(Баланс:(?:[^>]*>){2,4}(?:[\s\d.,-]{3,})руб)/i, [/class="red"[^>]*>/, '>-', replaceTagsAndSpaces], parseBalance);
    getParam(html, result, '__tariff', /ЛС №([^<]*)/i, replaceTagsAndSpaces);
    // используем особенности AnyBalance зачем искать значение дважды, если __tariff всегда available?
    getParam(result.__tariff, result, 'agreement');
	
    html = AnyBalance.requestGet(baseurl + 'abonent/persInfo.xhtml', g_headers);
    //Величина тарифа:
    sumParam(html, result, '__tariff', /Величина тарифа:[\s\S]*?<tr>([\s\S]*?)<\/table>/i, replaceTagsAndSpaces, null, aggregate_join);
    // Однотарифный, Двухтарифный, Трехтарифный
    var type = getParam(html, null, null, /Тариф[\s\S]*?<tbody[^>]*>(?:[\s\S]*?<td[^>]*>){2}([\S\s]*?)<\/td>/i);
	
    if (isAvailable(['lastdate', 'lastsum'])) {
    	html = AnyBalance.requestGet(baseurl + 'abonent/paysInfo.xhtml', g_headers);
    	var table = getParam(html, null, null, /(<tbody id="t_pays:tbody_element">[\s\S]*?<\/tbody>)/i);
    	if (!table) {
    		AnyBalance.trace('не нашли таблицу с платежами, если платежи у вас есть - свяжитесь с автором провайдера');
    	} else {
    		getParam(table, result, 'lastdate', /<tbody[^>]*>(?:[\s\S]*?<td[^>]*>){1}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    		getParam(table, result, 'lastsum', /<tbody[^>]*>(?:[\s\S]*?<td[^>]*>){2}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    	}
    }
    if (isAvailable(['lastcounter', 'lastcounter1', 'lastcounter2'])) {
    	html = AnyBalance.requestGet(baseurl + 'abonent/counter.xhtml', g_headers);
    	var table = getParam(html, null, null, /(<table id="r_ctr:0:t_pok"[\s\S]*?<\/tbody><\/table>)/i, null, null);
    	if (!table) {
    		AnyBalance.trace('не нашли таблицу с показаниями счетчиков, если показания у вас есть, свяжитесь с автором провайдера');
    	} else {
    		getParam(table, result, 'lastcounter', /<tbody[^>]*>(?:[\s\S]*?<td[^>]*>){4}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    		getParam(table, result, 'lastcounterdate', /<tbody[^>]*>(?:[\s\S]*?<td[^>]*>){1}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);

    		if (type.toLowerCase().indexOf("двухтарифный") != -1 || /Зона суток/i.test(table)) 
				getParam(table, result, 'lastcounter1', /<tbody[^>]*>(?:[\s\S]*?<td[^>]*>){6}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    		if (type.toLowerCase().indexOf("трехтарифный") != -1) {
    			getParam(table, result, 'lastcounter1', /<tbody[^>]*>(?:[\s\S]*?<td[^>]*>){6}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    			getParam(table, result, 'lastcounter2', /<tbody[^>]*>(?:[\s\S]*?<td[^>]*>){8}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    		}
    	}
    }
    AnyBalance.setResult(result);
}