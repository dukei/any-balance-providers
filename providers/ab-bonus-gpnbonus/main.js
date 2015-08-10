/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://gpnbonus.by/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите номер карты!');
	checkEmpty(prefs.surname, 'Введите фамилию!');
	checkEmpty(/^(\d{2})\.(\d{2}|[А-яЁё]+)\.(\d{4})$/i.test(prefs.date_of_birth), 'Введите дату рождения в формате 31.12.2014! или 31.декабря.2014');
    var date = /^(\d{2})\.(\d{2}|[А-яЁё]+)\.(\d{4})$/i.exec(prefs.date_of_birth);
    
	var html = AnyBalance.requestGet(baseurl + 'users', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    
	var parmsSource = 'O:9:"front_api":1:{s:6:"result";a:1:{s:7:"captcha";b:1;}}';
	
	var arr = [
		{fusers: {getInfoUser: {
			'CardSWNumberID': prefs.login,
            'SurNameID': prefs.surname,
            'DayOfBirthID': date[1],
            'MonthOfBirthID': date[2],
            'YearOfBirthID': date[3]
            }
		}},
		undefined
	];
	
	var auth = serialize(arr);
	var requestParams = {
		arguments: auth,
		className: "front_api",
		method: "xroute",
		source: parmsSource,
	}
	
	auth = serialize(requestParams);
	
    html = AnyBalance.requestPost(baseurl + '_run.php?xoadCall=true', auth, addHeaders({Referer: baseurl + '_run.php?xoadCall=true'}));
	
	if (!/"vxod":"true"/i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
    
    html = AnyBalance.requestGet(baseurl + 'users/~showinfousers', g_headers);
	
	var result = {success: true};
	
    function parseBalanceMy(val) {
        return (parseBalance(val) /100).toFixed(0);
    };
    
	getParam(html, result, 'balance', /Доступно к использованию(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalanceMy);
	getParam(html, result, 'sum_needed', /class="right"(?:[^>]*>){9}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalanceMy);
	getParam(html, result, 'fio', /class="name"(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, capitalFirstLetters);
	getParam(html, result, '__tariff', /№\sкарты([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'status', /Статус карты(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'prev_month', /Сумма покупок за предыдущий месяц(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cur_month', /Сумма покупок за текущий месяц(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}

function serialize(data) {
    if (data == null) {
        return 'N;';
    }
    var type = typeof (data);
    var code = '';
    var iterator = 0;
    var length = null;
    var asciiCode = null;
    var key = null;
    
    if (type == 'function')
        return '';
    if (type == 'boolean') {
        code += 'b:' + (data ? 1 : 0) + ';';
    } else if (type == 'number') {
        if (Math.round(data) == data) {
            code += 'i:' + data + ';';
        } else {
            code += 'd:' + data + ';';
        }
    } else if (type == 'string') {
        //data=win2utf(data);
        length = data.length;
        for (iterator = 0; iterator < data.length; iterator++) {
            asciiCode = data.charCodeAt(iterator);
            if ((asciiCode >= 0x00000080) && (asciiCode <= 0x000007FF)) {
                length += 1;
            } else if ((asciiCode >= 0x00000800) && (asciiCode <= 0x0000FFFF)) {
                length += 2;
            } else if ((asciiCode >= 0x00010000) && (asciiCode <= 0x001FFFFF)) {
                length += 3;
            } else if ((asciiCode >= 0x00200000) && (asciiCode <= 0x03FFFFFF)) {
                length += 4;
            } else if ((asciiCode >= 0x04000000) && (asciiCode <= 0x7FFFFFFF)) {
                length += 5;
            }
        }
        code += 's:' + length + ':"' + data + '";';
    } else if (type == 'object') {
        if (typeof (data.__class) == 'undefined') {
            length = 0;
            if (
            (typeof (data.length) == 'number') && 
            (data.length > 0) && 
            (typeof (data[0]) != 'undefined')) {
                for (iterator = 0; iterator < data.length; iterator++) {
                    code += serialize(iterator);
                    code += serialize(data[iterator]);
                }
                length = data.length;
            } else {
                for (key in data) {
                    if (typeof (data[key]) != 'function') {
                        if (/^[0-9]+$/.test(key)) {
                            code += serialize(parseInt(key));
                        } else {
                            code += serialize(key);
                        }
                        code += serialize(data[key]);
                        length++;
                    }
                }
            }
            code = 'a:' + length + ':{' + code + '}';
        } else {
            code += 'O:' + data.__class.length + ':"' + data.__class + '":' + data.__size + ':{';
            if (data.__meta != null) {
                for (key in data.__meta) {
                    code += serialize(key);
                    code += serialize(data[key]);
                }
            }
            code += '}';
        }
    } else {
        code = 'N;'
    }
    
    return code;
};