/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию из личного кабинета AVON

Operator site: http://www.avon.ru
Личный кабинет: https://www.avon.ru/REPSuite/login.page
*/

var g_headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
    'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Cache-Control': 'max-age=0',
    'Connection': 'keep-alive',
	'Upgrade-Insecure-Requests': '1',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36'
};

var g_currency = {
	'руб': '₽',
	'RUB': '₽',
	'USD': '$',
	'EUR': '€'
};

var baseurl = "https://www.avon.ru/";
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

function main(){
    var prefs = AnyBalance.getPreferences();
    
    AnyBalance.setDefaultCharset('utf-8');

    checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(prefs.password, 'Введите пароль!');

    var html = AnyBalance.requestGet(baseurl + 'REPSuite/loginMain.page', g_headers);
    if (!html || AnyBalance.getLastStatusCode() > 400) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
    }
	
	var form = getElement(html, /<form[^>]+name="loginForm"[^>]*>/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму входа! Сайт изменен?');
	}

    var params = createFormParams(form, function(params, str, name, value) {
        if (name == 'userIdDisplay') {
            return prefs.login;
        } else if (name == 'password') {
            return prefs.password;
        }

        return value;
    });

    html = AnyBalance.requestPost(baseurl + 'REPSuite/login.page', params, addHeaders({
        Referer: baseurl + 'REPSuite/loginMain.page',
    }));
	
	if(/change_password|passwordmessage/i.test(html)){
		AnyBalance.trace('Сайт требует изменить пароль в целях безопасности. Пропускаем...');
        html = AnyBalance.requestGet(baseurl + 'REPSuite/home.page', g_headers);
    }

    if(!/logoutMain/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="Error-message text[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error, null, /неверный компьютерный номер/i.test(error));

        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

    html = AnyBalance.requestGet(baseurl + 'REPSuite/home.page', g_headers);

    getParam(html, result, ['balance', 'currency'], /Баланс:[\s\S]*?(?:[^>]*>){4}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', 'balance'], /Баланс:[\s\S]*?(?:[^>]*>){4}([^<]*)/i, replaceTagsAndSpaces, parseCurrencyMy);
	getParam(html, result, 'limit', /Доступный лимит:[\s\S]*?(?:[^>]*>){4}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'penalty', /Пени:[\s\S]*?(?:[^>]*>){4}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'quartordersum', /Сумма заказов:([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'tonextlevel', /Сумма продаж[\s\S]*?для достижения уровня[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'garantdiscount', /Гарантированная[\s\S]*?(?:[^>]*>){6}([^<]*)/i, replaceTagsAndSpaces);
	getParam(html, result, 'monthordersum', /Сумма заказов в этом месяце[\s\S]*?(?:[^>]*>){5}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'rubdiscount', /Скидка в рублях[\s\S]*?(?:[^>]*>){5}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'thismonthdiscount', /Скидка в этом месяце[\s\S]*?(?:[^>]*>){5}([^<]*)/i, replaceTagsAndSpaces);
	getParam(html, result, 'tonextdiscount', /Сумма продаж[\s\S]*?для достижения уровня[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'bonus',   /Доступные баллы[\s\S]*?<span[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'p_bonus', /Потенциальные баллы[\s\S]*?<span[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'h_bonus', /Горящие баллы[\s\S]*?<span[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);

	var perc = {'Бронза': '15%', 'Серебро': '20%', 'Золото': '25%', 'Платина': '30%', 'VIP Платина': '35%'};
	var stat = getElements(html, /<div[^>]+club-labels[^>]*>/ig);
	if(stat){
	    for(var i = 0; i<stat.length; i++){
	    	if (/bold/i.test(stat))
	    	    var disc = getParam(stat[i], result, '__tariff', /<div[^>]+font-weight-bold[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
				getParam(perc[disc], result, 'currdiscount');	
	    }
	}else{
 		AnyBalance.trace('Не удалось получить данные по привилегиям');
 	}
	
	getParam(html, result, 'expdate', /headerMenuCampaignDaysLeft[\s\S]*?(?:[^"]*>){5}([^"]*)/i, replaceTagsAndSpaces, parseDate);
    getParam(html, result, 'daysleft', /headerMenuCampaignDaysLeft[\s\S]*?(?:[^>]*>){1}([^<]*)/i, replaceTagsAndSpaces, parseBalance);

    if(AnyBalance.isAvailable('credit', 'campaign', 'orderdate', 'operation', 'paytill', 'ordersum', 'lastpay', 'invoice') ||
    	(AnyBalance.isAvailable('balance', 'currency') && !isset(result.balance) && !isset(result.currency)) || 
		(AnyBalance.isAvailable('penalty') && !isset(result.penalty)) || 
		(AnyBalance.isAvailable('limit') && !isset(result.limit))){

        html = AnyBalance.requestGet(baseurl + 'REPSuite/accountBalance.page', g_headers);

		getParam(html, result, 'credit',  /Общий лимит\s+?:[^>]([\s\S]*?)<\/div>/i, replaceTagsAndSpaces,  parseBalance);
        
        if(!result.balance && !result.currency)
            getParam(html, result, ['balance', 'currency'], /Баланс\s+?:[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, parseBalance);
		    getParam(html, result, ['currency', 'balance'], /Баланс\s+?:[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, parseCurrencyMy);
		if(!result.penalty)
            getParam(html, result, 'penalty', /Пени\s+?:[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, parseBalance);
		if(!result.limit)
            getParam(html, result, 'limit', /Доступный лимит\s+?:[^>]([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
        
        var campaign =  getParam(html, null, null, /<ul[^>]+Account_campaign_text[^>]*>([\s\S]*?)?<\/ul>/i);

        if(campaign) {
            liArray = getElements(campaign, /<li/ig);
			if(liArray) {
                getParam(liArray[1], result, 'orderdate', null, replaceTagsAndSpaces, parseDate);
                getParam(liArray[2], result, 'operation', null, replaceTagsAndSpaces);
                getParam(liArray[3], result, 'paytill',  null, replaceTagsAndSpaces, parseDate);
			    getParam(liArray[4], result, 'ordersum', null, replaceTagsAndSpaces, parseBalance);
                getParam(liArray[5], result, 'lastpay', null, replaceTagsAndSpaces, parseBalance);
                getParam(liArray[6], result, 'invoice',  null, replaceTagsAndSpaces);
            }
        }else{
 			AnyBalance.trace('Не удалось получить данные по последней операции');
 		}
    }
	
	if(AnyBalance.isAvailable('phone', 'fio')){
	    html = AnyBalance.requestGet(baseurl + 'REPSuite/profilePersonal.page', g_headers);
	
	    getParam(html, result, 'phone', /Мобильный телефон:[\s\S]*?(?:[^>]*>){5}([^<]*)/i, replaceNumber);
	    var firstName = getParam(html, null, null, /Имя:[\s\S]*?(?:[^>]*>){5}([^<]*)/i, replaceTagsAndSpaces);
	    var secondName = getParam(html, null, null, /Отчество:[\s\S]*?(?:[^>]*>){5}([^<]*)/i, replaceTagsAndSpaces);
	    var lastName = getParam(html, null, null, /Фамилия:[\s\S]*?(?:[^>]*>){5}([^<]*)/i, replaceTagsAndSpaces);
	    var fio = firstName; // Если пользователь не указал в профиле фамилию, значение свойства "name" имеет вид "Имя null", поэтому делаем в виде сводки
	    if (secondName)
	        fio += ' ' + secondName;
	    if (lastName)
	        fio += ' ' + lastName;
	    getParam(fio, result, 'fio', null, null);
	}

    //Возвращаем результат
    AnyBalance.setResult(result);
}

function parseCurrencyMy(text){
    var currency = parseCurrency(text);
    return g_currency[currency] ? '' + g_currency[currency] : currency;
}