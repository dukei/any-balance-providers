/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию по бонусной карте РЖД

Сайт оператора: https://rzd-bonus.ru
Личный кабинет: https://rzd-bonus.ru
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Encoding': 'gzip, deflate, br',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.6',
	'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36'
};

var baseurl = "https://rzd-bonus.ru";
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

function main(){
    var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');	
	
    AnyBalance.setDefaultCharset('utf-8');
	
	var params = [
	    ['AUTH_FORM','Y'],
		['TYPE','AUTH'],
        ['backurl','/cabinet/'],
		['USER_LOGIN',prefs.login],
		['USER_PASSWORD',prefs.password],
		['Login','Войти']
	];
	
	AnyBalance.trace('Пробуем войти по логину ' + prefs.login + ' и паролю...');
	
	html = AnyBalance.requestPost(baseurl + '/cabinet/?login=yes', params, addHeaders({
		'Content-Type': 'application/x-www-form-urlencoded',
		'Origin': baseurl,
		'Referer': baseurl + '/cabinet/'
	}));
	
	if(AnyBalance.getLastStatusCode() >= 400){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сайт РЖД Бонус временно недоступен. Попробуйте еще раз позже');
    }

//  var redirect = getParam(html, null, null, /top.location.href\s*=\s*'([^']*)/i);
//  if(redirect)
//      html = AnyBalance.requestGet(redirect);

    if(!/logout/.test(html)){
        var error = getParam(html, null, null, /<div[^>]*message_error[^>]*>([\s\S]*?)<\/div>/, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }

	if(/Подтверждение временного пароля/.test(html)) {
		throw new AnyBalance.Error('Сайт требует заполнить профиль. Зайдите в личный кабинет через браузер и выполните все необходимые действия.');
	}
	
    var result = {success: true};
	
    getParam(html, result, 'balance', /<p[^>]+class="user-info_points">Общая сумма баллов:([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'pballs', /Премиальные баллы[\s\S]*?number-inner[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'qballs1', /Квалификационные баллы за \d+[\s\S]*?number-inner[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'qballs2', /Квалификационные баллы за \d+[\s\S]*?Квалификационные баллы за \d+[\s\S]*?number-inner[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'cardnum', /<div[^>]+class="user_cart__number"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	getParam(html, result, 'phone', /user-info_name[\s\S]*?(?:[^"]*"){6}([^"]*)/i, replaceNumber);
	
	html = AnyBalance.requestGet(baseurl + '/cabinet/profile/', g_headers);
	
    var level = getParam(html, null, null, /Уровень[\s\S]*?value="([^"]*)/i, replaceTagsAndSpaces);
	getParam(level + ' уровень', result, '__tariff', null, null);
	var firstName = getParam(html, null, null, /Имя[\s\S]*?value="([^"]*)/i, replaceTagsAndSpaces);
	var surName = getParam(html, null, null, /Отчество[\s\S]*?value="([^"]*)/i, replaceTagsAndSpaces);
	var lastName = getParam(html, null, null, /Фамилия[\s\S]*?value="([^"]*)/i, replaceTagsAndSpaces);
	var fio = firstName; // Если пользователь не указал в профиле фамилию, значение свойства "name" имеет вид "Имя null", поэтому делаем в виде сводки
	if (surName)
	    fio += ' ' + surName;
	if (lastName)
	    fio += ' ' + lastName;
	getParam(fio, result, 'fio', null, null);
	
	var status = {
    	ACTIVE: 'Активен',
    	INACTIVE: 'Не активен'
    };
	var accStatus = getParam(html, null, null, /Статус счета[\s\S]*?value="([^"]*)/i, replaceTagsAndSpaces);
	getParam(status[accStatus]||accStatus, result, 'status', null, replaceTagsAndSpaces);
//  getParam(html, result, 'balls_total', /Набрано за все время участия в программе:[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, parseBalance);
//  getParam(html, result, 'balls_spent', /Использовано на премии за все время участия в программе:[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, parseBalance);
    
	if (AnyBalance.isAvailable('lastdate', 'lastsum', 'lasttype', 'lastpballs', 'lastqballs', 'lastoff')) {
		html = AnyBalance.requestGet(baseurl + '/cabinet/my-trips/', g_headers);
		
        var info = getElements(html, [/var clients = \[([^\]]*)/i, /\{([^\}]*)/ig])[0];
	    if (info) {
	        getParam(html, result, 'lastdate', /"Дата": "([^"]*)/i, replaceTagsAndSpaces, parseDateISO);
	        getParam(html, result, 'lastsum', /Цена:\s?([\s\S]*?)<br>/i, replaceTagsAndSpaces, parseBalance);
	        getParam(html, result, 'lasttype', /"Операция":\s?"([^<|"]*)/i, replaceTagsAndSpaces);
	        getParam(html, result, 'lastpballs', /"Начислено премиальных баллов":\s?"([^"]*)/i, replaceTagsAndSpaces, parseBalance);
	        getParam(html, result, 'lastqballs', /"Начислено квалификационых баллов":\s?"([^"]*)/i, replaceTagsAndSpaces, parseBalance);
	        getParam(html, result, 'lastoff', /"Списано":\s?"([^"]*)/i, replaceTagsAndSpaces, parseBalance);
		} else {
        	AnyBalance.trace('Последняя операция не найдена');
        }
	}
	
    AnyBalance.setResult(result);
}
