 /**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function dateToDMY(date) {
	var d = date.getDate();
	var m = date.getMonth() + 1;
	var y = date.getFullYear();
	return '' + (d <= 9 ? '0' + d : d) + '/' + (m <= 9 ? '0' + m : m) + '/' + y;
}

/** Получает дату из строки, почему-то parseDateISO на устройстве не может распарсить вот такую дату 2013-11-23 21:16:00 */
function parseDateISO2(str){
	//new Date(year, month, date[, hours, minutes, seconds, ms] )
	//2013-11-23 21:16:00

    var matches = /(\d{4})\D(\d{2})\D(\d{2})\D(\d{1,2}):(\d{1,2}):(\d{1,2})/.exec(str);
    if(matches){
          var date = new Date(matches[1], matches[2]-1, +matches[3], matches[4] || 0, matches[5] || 0, matches[6] || 0);
	  var time = date.getTime();
          AnyBalance.trace('Parsing date ' + date + ' from value: ' + str);
          return time;
    }
    AnyBalance.trace('Failed to parse date from value: ' + str);
}

var g_urls = {
	ru: ['http://new.goodline.ru', mainNew],
	ua: ['http://goodline.com.ua', mainOld]
};

var g_headers = {
	Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Cache-Control': 'max-age=0',
	Connection: 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.60 Safari/537.1'
};

function getMyJson(info) {
	try {
		var json = new Function('return ' + info)();
		return json;
	} catch (e) {
		AnyBalance.trace('Неверный json: ' + info);
		throw new AnyBalance.Error('Неверный ответ сервера!');
	}
}

function findParam(params, name) {
	for (var i = 0; i < params.length; ++i) {
		if (params[i][0] == name)
			return i;
	}
	return -1;
}
function createSignedParams(params, arData) {
	var key = new rsasec_key(arData.key.E, arData.key.M, arData.key.chunk);
	var data = '__RSA_RAND=' + arData.rsa_rand;
	for (var i = 0; i < arData.params.length; i++) {
		var param = arData.params[i];
		var idx = findParam(params, param);
		if (idx >= 0) {
			data += '&' + param + '=' + encodeURIComponent(params[idx][1]);
			params[idx] = undefined;
		}
	}
	data = data + '&__SHA=' + SHA1(data);
	params.push(['__RSA_DATA', rsasec_crypt(data, key)]);
	var out = [];
	for (var i = 0; i < params.length; ++i) {
		var p = params[i];
		if (!p) continue;
		out.push(encodeURIComponent(p[0]) + '=' + encodeURIComponent(p[1]));
	}
	return out.join('&');
}

function main() {
	var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var country = prefs.country || 'ru';
	var baseurl = g_urls[country][0];
	var func = g_urls[country][1];
	func(baseurl);
}

function mainNew(baseurl){
    var prefs = AnyBalance.getPreferences();
    if(prefs.num && !/^\d{1,}$/.test(prefs.num))
        throw new AnyBalance.Error("Введите номер телефона, по которому вы хотите получить информацию, или не вводите ничего, чтобы получить информацию по первому номеру.");

    AnyBalance.setDefaultCharset('utf-8');    

    var info = AnyBalance.requestGet(baseurl + '/user', g_headers);
    var rsainfo = getParam(info, null, null, /top.rsasec_form_bind\)\s*\((\{'formid':'form_auth'[^)]*\})\)/);
    if(!rsainfo){
        var error = getParam(info, null, null, /<h2[^>]+style="color:\s*#933"[^>]*>([\s\S]*?)<\/h2>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не найдены ключи шифрования пароля. Сайт изменен, обратитесь к автору провайдера.');
    }

    rsainfo = getMyJson(rsainfo);
    
//    AnyBalance.requestGet(baseurl + '/ru/bb/?ajax=1&p_id=21&pl=banner_right5', g_headers); //Сессию устанавливает. Вот тупизм.

    var info = AnyBalance.requestPost(baseurl + "/user/?login=yes", createSignedParams([
        ['AUTH_FORM','Y'],
        ['TYPE','AUTH'],
        ['backurl','/user/'],
        ['USER_LOGIN',prefs.login],
        ['USER_PASSWORD',prefs.password],
        ['Login','Авторизация']
    ], rsainfo), addHeaders({'Content-Type': 'application/x-www-form-urlencoded', Referer: baseurl + '/user/'}));

    if(!/\?logout=yes/i.test(info)){
        var error = getParam(info, null, null, /<font[^>]+class="errortext"[^>]*>([\s\S]*?)<\/font>/i, replaceTagsAndSpaces, html_entity_decode);
        if(!error)
            error = getParam(info, null, null, /<h2[^>]+style="color:\s*#933"[^>]*>([\s\S]*?)<\/h2>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        AnyBalance.trace(info);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

    var num = prefs.num ? prefs.num : '\\d{10,}';
    var tr = getParam(info, null, null, new RegExp('(<div[^>]+class="phonenumber_head"(?:[\\s\\S](?!<div[^>]+class="phonenumber_head"|<a[^>]+href="/user/add_number.php))*\\?phone=\\d*' + num + '"[\\s\\S]*?(?:<div[^>]+class="phonenumber_head"|<a[^>]+href="/user/add_number.php))', 'i'));

    if(!tr)
        throw new AnyBalance.Error(prefs.num ? "Не удалось найти номер " + prefs.num : "Не удалось найти ни одного номера.");

    getParam(tr, result, 'number', /<span[^>]+class="phonenumber"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, '__tariff', /Мой тариф:\s*<[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'balance', /Мой баланс:\s*<[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'currency', /Мой баланс:\s*<[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseCurrency);
    getParam(tr, result, 'status', /Статус:\s*<[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);

    if(AnyBalance.isAvailable('lastpay', 'lastpaydate')) {
		var dateEnd = new Date();
		var dateStart = new Date(dateEnd.getTime() - 86400*360*1000); //Год назад
		var phone = getParam(tr, null, null, /\?phone=(\d+)/i);
		
		AnyBalance.setDefaultCharset('windows-1251');
		html = AnyBalance.requestPost('http://212.158.163.96/public/glcl/glcl2_cab.php', {
			started:dateToDMY(dateStart),
			finished:dateToDMY(dateEnd),
			command:'history',
			s:2,
			number:phone
		}, g_headers);
		
		if(/<h2>нет данных<\/h2>/i.test(html)) {
			AnyBalance.trace('Не найдено информации о последних платежах.');
		} else {
			getParam(html, result, 'lastpaydate', /<tr[^>]*>(?:\s*<td[^>]*>[^<]*<\/td>){2}\s*<td[^>]*>([^<]*)<\/td>(?:\s*<td[^>]*>[^<]*<\/td>){4}\s*<\/tr>\s*<\/table>/i, replaceTagsAndSpaces, parseDateISO2);
			getParam(html, result, 'lastpay', /<tr[^>]*>(?:\s*<td[^>]*>[^<]*<\/td>){4}\s*<td[^>]*>([^<]*)<\/td>(?:\s*<td[^>]*>[^<]*<\/td>){2}\s*<\/tr>\s*<\/table>/i, replaceTagsAndSpaces, parseBalance);		
		}
	}
	AnyBalance.setResult(result);
}

function mainOld(baseurl){
    var prefs = AnyBalance.getPreferences();
    if(prefs.num && !/^\d{10,}$/.test(prefs.num))
        throw new AnyBalance.Error("Введите номер телефона, по которому вы хотите получить информацию, или не вводите ничего, чтобы получить информацию по первому номеру.");

    AnyBalance.setDefaultCharset('utf-8');    

    AnyBalance.requestGet(baseurl + '/ru/bb/?ajax=1&p_id=21&pl=banner_right5', g_headers); //Сессию устанавливает. Вот тупизм.

    var info = AnyBalance.requestPost(baseurl + "/ru/abonents/entercabinet/", {
        mail:prefs.login,
        passwd:prefs.password
    }, addHeaders({Referer: baseurl + 'ru/abonents/entercabinet/'}));

    var error = getParam(info, null, null, /(Введите логин\/пароль для входа в систему)/i);
    if(error)
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Проверьте логин/пароль");

    var result = {success: true};

    var num = prefs.num ? prefs.num : '\\d{10,}';
    var table = getParam(info, null, null, /Ваш список номеров туристических[\s\S]*?<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
    if (!table)
		throw new AnyBalance.Error("Не удалось найти список номеров!");
	
    var tr;
    var lines = table.split(/<\/tr>\s*<tr[^>]*>/g);
    var reNum = new RegExp('\\s*<td[^>]*>[\\s\\S]*?<\\/td>\\s*<td[^>]*>' + num + '<\\/td>', 'i');
	for (var i = 0; i < lines.length; ++i) {
		if (reNum.test(lines[i])) {
			tr = lines[i];
			break;
		}
	}

    if(!tr)
        throw new AnyBalance.Error(prefs.num ? "Не удалось найти номер " + prefs.num : "Не удалось найти ни одного номера.");

    var number = getParam(tr, null, null, /(?:[\s\S]*?<\/td>){1}\s*<td[^>]*>([^<]*)/i, replaceTagsAndSpaces);

    getParam(tr, result, 'status', /(?:[\s\S]*?<\/td>){2}\s*<td[^>]*>([^<]*)/i, replaceTagsAndSpaces);
    getParam(tr, result, 'number', /(?:[\s\S]*?<\/td>){1}\s*<td[^>]*>([^<]*)/i, replaceTagsAndSpaces);

    if(AnyBalance.isAvailable('balance', 'currency')){
        var id = getParam(tr, null, null, /entercabinet\/list\/delete\/([^\.]*)\.html/i);
        if(!id)
            throw new AnyBalance.Error("Не удалось найти ссылку на информацию о балансе.");
        
        html = AnyBalance.requestGet(baseurl + '/ru/abonents/entercabinet/balans/get_value/?ajax=1&id=' + id, addHeaders({'X-Requested-With': 'XMLHttpRequest'}));

        getParam(html, result, 'balance', null, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'currency', null, replaceTagsAndSpaces, parseCurrency);
    }

    var tariff_ref = getParam(tr, null, null, /'(\/tariffs.php\?onum=[^']*)/i);
    if(tariff_ref){
        html = AnyBalance.requestGet(baseurl + tariff_ref, g_headers);
        getParam(html, result, '__tariff', /<tr[^>]*class="tariffs"[\s\S]*?<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    }else{
        AnyBalance.trace("Не удалось найти ссылку на тарифный план!");
    }
    
    if(AnyBalance.isAvailable('lastpay', 'lastpaydate')){
       var dateEnd = new Date();
       var dateStart = new Date(dateEnd.getTime() - 86400*90*1000); //Три месяца назад

       html = AnyBalance.requestPost('http://212.158.163.96/public/glcl/glcl2_cab.php', {
          started:dateToDMY(dateStart),
          finished:dateToDMY(dateEnd),
          command:'history',
          s:2,
          number:number
       }, g_headers);

       getParam(html, result, 'lastpaydate', /<tr[^>]*>(?:\s*<td[^>]*>[^<]*<\/td>){2}\s*<td[^>]*>([^<]*)<\/td>(?:\s*<td[^>]*>[^<]*<\/td>){4}\s*<\/tr>\s*<\/table>/i, replaceTagsAndSpaces, parseDateISO2);
       getParam(html, result, 'lastpay', /<tr[^>]*>(?:\s*<td[^>]*>[^<]*<\/td>){4}\s*<td[^>]*>([^<]*)<\/td>(?:\s*<td[^>]*>[^<]*<\/td>){2}\s*<\/tr>\s*<\/table>/i, replaceTagsAndSpaces, parseBalance);
    }
		
    AnyBalance.setResult(result);
}