/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс, количество сообщений и счетов в QIWI Кошельке.

Сайт компании: http://qiwi.ru
Личный кабинет: http://w.qiwi.ru
*/

function jsonp (obj) {
  return obj;
}

var g_headers = {
    Accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Cache-Control':'max-age=0',
    Connection:'keep-alive',
    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.60 Safari/537.1'
};

function main(){
    var prefs = AnyBalance.getPreferences ();
    switch(prefs.type){
    case 'new':
        mainNew();
        break;
    case 'old':
        mainOld();
        break;
    case 'auto':
    default:
        try{
            mainOld();
        }catch(e){
            if(e.fatal)
                throw e;
            AnyBalance.trace('Ошибка подключения к старому кабинету: ' + e.message + '\nПробуем новый...');
            mainNew();
        }
        break;
    }
}

function getFatalError(str){
    var e = new AnyBalance.Error(str);
    e.fatal = true;
    return e;
}

var g_currency = {
    RUB: 'р',
    USD: '$',
    KZT: '〒',
    UAH: '₴'
};

function parseCurrencyMy(text){
    var currency = parseCurrency(text);
    return g_currency[currency] ? ' ' + g_currency[currency] : currency;
}

function mainNew () {
    var prefs = AnyBalance.getPreferences ();
    var baseurl = 'https://w.qiwi.com/';

    if (!prefs.login)
        throw getFatalError ('Введите номер телефона');

    if (!prefs.password)
        throw getFatalError ('Введите пароль');

    AnyBalance.requestGet(baseurl + 'payment/main.action'); //Надо сессию поставить

    AnyBalance.trace ('Trying to enter NEW account at address: ' + baseurl);

    var login = /^\s*\+/.test(prefs.login) ? prefs.login : '+7' + prefs.login;
    var params = {
        source: 'MENU',
        login: login,
        password: prefs.password
    };

    var info = AnyBalance.requestPost (baseurl + 'auth/login.action', params, addHeaders({Accept: 'application/json, text/javascript', 'X-Requested-With':'XMLHttpRequest'}));
    AnyBalance.trace ('Login result: ' + info);

    var res = getJson(info);

    if(res.code.value == '7'){
        AnyBalance.trace('Требуется ввести токен авторизации');
        params.loginToken = res.data.token;
        var info = AnyBalance.requestPost (baseurl + 'auth/login.action', params, addHeaders({Accept: 'application/json, text/javascript', 'X-Requested-With':'XMLHttpRequest'}));
        AnyBalance.trace ('Login result 2: ' + info);

        res = getJson(info);
    }

    // Проверка ошибки входа
    if (res.code.value != '0'){
	var errors = {
		0 : "ОК",
		1 : "Ошибка",
		2 : "Ошибка",
		3 : "Требуется авторизация",
		4 : "Требуется подтверждение",
		5 : "Требуется подтверждение",
		6 : "Срок действия пароля истек",
                7 : "Требуется ввод токена авторизации",
		success : "Успех",
		timeout : "Время соединения истекло. Проверьте подключение к сети",
		error : "Ошибка соединения. Проверьте подключение к сети",
		abort : "Запрос отменен",
		parsererror : "Синтаксическая ошибка"
	};

        throw new AnyBalance.Error (res.message || (res.messages ? res.messages.join('\n') : 'Не удаётся войти в QIWI кошелек: ' + (errors[res.code.value] || res.code._NAME)));
    }

    var html = AnyBalance.requestGet (baseurl + 'payment/main.action');

    // Проверка на корректный вход
    if (/id="person-accounts-/i.exec(html)){
    	AnyBalance.trace ('It looks like we are in selfcare...');
        if(!getParam(html, null, null, /(profileBalance)/i)){
            //Похоже, проблема с паролем, устарел, наверное.
            var error = getParam(html, null, null, /<p[^>]+class="attention"[^>]*>\s*([\s\S]*?)\s*<\/p>/i);
            if(error)
                throw getFatalError(error.replace(/href="\//ig, 'href="https://w.qiwi.com/'));
            throw getFatalError('Срок действия пароля истек. Смените пароль, зайдя в свой QIWI-кошелек (https://w.qiwi.com) через браузер.');
        }
    }else if(/passwordchangesuccess.action|password.action/i.test(html)){
        throw getFatalError('Срок действия пароля истек. Смените пароль, зайдя в свой QIWI-кошелек (https://w.qiwi.com) через браузер.');
    }else {
        AnyBalance.trace ('Have not found logout... Unknown error. Please contact author.');
        throw new AnyBalance.Error ('Неизвестная ошибка. Пожалуйста, свяжитесь с автором провайдера.');
    }

    var result = {success: true};

    // Баланс
    getParam (html, result, 'balance', /<option[^>]+id="person-accounts-\w+"[^>]*selected[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    // Это не всегда работает на девайсе, хотя в ебугере все отлично
	//getParam (html, result, ['currency', 'balance'], /<option[^>]+id="person-accounts-\w+"[^>]*selected[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseCurrencyMy);
	getParam (html, result, ['currency', 'balance'], /<option[^>]+id="person-accounts-\w+"[^>]*selected[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseCurrencyMy);

    // Сообщения (че-то непонятно, где они в новом личном кабинете)
    //getParam (html, result, 'messages', /Сообщения:.*?>(\d+)/i, [], parseInt);
	
    if(AnyBalance.isAvailable('bills')){
        html = AnyBalance.requestGet(baseurl + 'user/order/main.action?type=1');
        var count = html.match(/<div[^>]*ordersLine\s+NOT_PAID[^>]*>/ig);
        result.bills = count ? count.length : 0;
    }

    if(AnyBalance.isAvailable('messages')){
        html = AnyBalance.requestGet(baseurl + 'user/message/content/loadlist.action');
        var count = html.match(/<li[^>]+data-container-name="item"[^>]*class="unread"/ig);
        result.messages = count ? count.length : 0;
    }
	// QVC
	if(AnyBalance.isAvailable('qvc_card'))
	{
        html = AnyBalance.requestGet(baseurl + 'qvc/main.action');
		
		var card = getParam (html, result, 'qvc_card', /Номер карты:[\s\S]{1,70}value">\s*([\s\S]*?)\s*<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
		getParam (html, result, 'qvc_exp', /Срок действия:[\s\S]{1,70}value">\s*([\s\S]*?)\s*<\/p>/i, replaceTagsAndSpaces, parseDate);
		// Получим отчеты, чтобы получить последнюю транзакцию по карте
		var today = new Date();
		var yr = today.getFullYear();
		var month = today.getMonth()+1;
		month = ('0'+month).slice(-2);
		var day = ('0'+today.getDate()).slice(-2);
		// На валидность проверяется только дата окончания отчета
		html = AnyBalance.requestGet(baseurl + 'qvc/reports.action?number='+card+'&daterange=true&start=24.06.2013&finish='+day+'.'+month+'.'+yr);
		
		var element = getParam (html, null, null, /(<div class="reportsLine">[\s\S]*?<div class="clearBoth">)/i, null, html_entity_decode);
		if(element)
		{
			var seller = getParam (html, null, null, /<div class="comment">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
			var ammount = getParam (html, null, null, /<div class="cash">(-?\d[\d\s]*[.,]?\d*[.,]?\d*)/i, null, null);
			
			var date = getParam (html, null, null, /<span class="date">([\s\S]*?)<\//i, null, null);
			var time = getParam (html, null, null, /<span class="time">([\s\S]*?)<\//i, null, null);
			
			var all = date + ' ' + time +': \n' + seller + ' (' + ammount + ')';
			getParam (all, result, 'qvc_last', null, null, null);
		}
		else
			AnyBalance.trace('Не нашли ни одной транзакции');
    }
    AnyBalance.setResult (result);
}

function mainOld () {
    var prefs = AnyBalance.getPreferences ();
    var baseurl = 'https://w.qiwi.ru/';

    if (!prefs.login || prefs.login == '')
        throw getFatalError ('Введите номер телефона');

    if (!prefs.password || prefs.password == '')
        throw getFatalError ('Введите пароль');

    AnyBalance.trace ('Trying to enter OLD account at address: ' + baseurl);
    var login = /^\s*\+/.test(prefs.login) ? prefs.login.replace(/\+/g, '') : '7' + prefs.login;
    var info = AnyBalance.requestGet (baseurl +
                                      'login.action?source=0&phone=' +
                                      encodeURIComponent(login) +
                                      '&password=' +
                                      encodeURIComponent(prefs.password) +
                                      '&captcha=0&callback=jsonp');
    AnyBalance.trace ('Login result: ' + info);

    try{
       var res = eval(info);
    }catch(e){
       throw new AnyBalance.Error('Неверный ответ сервера (' + e.message + '). Сайт изменен?');
    }

    // Проверка ошибки входа
    if (res.error != 0) {
        var err = '';

        switch (res.error) {
            case 3:
                err = 'Ошибка входа. Возможно, неверно введен пароль';  // На самом деле, не факт, что это так, но на телефоне такая ситуация была, код - 3, описания ошибок нет.
                break;
        }

        for (var i in res.errors) {
            if (res.errors[i] == '')
                continue;

            if (err != '')
                err += '; ';
            err += res.errors[i];
        }

        if (err == '')
            err = 'Неопределенная ошибка. Пожалуйста, свяжитесь с автором скрипта.';
        else if (err == 'Введенные цифры неверны')  // Возможно, эта ситуация будет срабатывать только при отладке в Chrome
            err = 'Требуется ручной ввод. Пожалуйста, войдите в личный кабинет на <a href=\'https://w.qiwi.ru\'>домашней странице</a> QIWI Кошелька.';
        throw new AnyBalance.Error (err);
    }

    var html = AnyBalance.requestGet (baseurl + 'userdata.action');

    // Проверка на корректный вход
    if (/<h1>Кошелёк:/i.exec(html)){
    	AnyBalance.trace ('It looks like we are in selfcare...');
    }else if(/passwordchangesuccess.action/i.test(html)){
        throw getFatalError('Срок действия пароля истек. Смените пароль, зайдя в свой QIWI-кошелек (https://w.qiwi.ru) через браузер.');
    }else {
        AnyBalance.trace ('Have not found logout... Unknown error. Please contact author.');
        throw new AnyBalance.Error ('Неизвестная ошибка. Пожалуйста, свяжитесь с автором провайдера.');
    }

    var result = {success: true};

    // Баланс
    getParam (html, result, 'balance', /id="balance".*?>([+-]?(?:\d+[.,]?\d*|\d*[.,]?\d+))/i, [',', '.'], parseFloat);
    getParam (' р', result, ['currency', 'balance']);

    // Сообщения
    getParam (html, result, 'messages', /Сообщения:.*?>(\d+)/i, [], parseInt);

    // Счета
    getParam (html, result, 'bills', /Счета:.*?>(\d+)/i, [], parseInt);

	
	// QVC
	if(AnyBalance.isAvailable('qvc_card'))
	{
        html = AnyBalance.requestGet(baseurl + 'qvc.action');
		
		getParam (html, result, 'qvc_card', /Номер карты:[\s\S]{1,6}>\s*([\s\S]*?)\s*<\//i, replaceTagsAndSpaces, html_entity_decode);
		getParam (html, result, 'qvc_exp', /Срок действия:[\s\S]{1,6}>\s*([\s\S]*?)\s*<\//i, replaceTagsAndSpaces, parseDate);
    }
	
    AnyBalance.setResult (result);
}
