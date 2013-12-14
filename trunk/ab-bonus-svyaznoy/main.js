/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию о балансе карты, последней операции, статусе и количестве сообщений.
Использует API версии не ниже 3.

Сайт магазина: http://svyaznoy.ru
Личный кабинет: http://www.sclub.ru/
*/

function getViewState(html){
    return getParam(html, null, null, /name="__VIEWSTATE".*?value="([^"]*)"/);
}

function main () {
    if (AnyBalance.getLevel () < 3) {
        throw new AnyBalance.Error ('Для этого провайдера необходима версия программы не ниже 1.2.436. Пожалуйста, обновите программу.');
    }

    var prefs = AnyBalance.getPreferences ();
    var baseurl = 'http://www.sclub.ru/';

    checkEmpty (prefs.login, 'Введите № карты');
    checkEmpty (prefs.password, 'Введите пароль');

    // Разлогин для отладки
    //AnyBalance.requestGet ('http://www.sclub.ru/LogOut.aspx');

    // Необходимо для формирования cookie
    var html = AnyBalance.requestGet (baseurl);

    var form = getParam(html, null, null, /(<form[^>]*name="Form"[^>]*>[\s\S]*?<\/form>)/i);
    if(!form)
	throw new AnyBalance.Error('Не удалось найти форму входа, похоже, связной её спрятал. Обратитесь к автору провайдера.');

    var params = createFormParams(html, function(params, str, name, value) {
        var id = getParam(str, null, null, /\bid="([^"]*)/i, null, html_entity_decode) || '';
	if(/tbUserName/i.test(id)){ //Это имя
		value = prefs.login;
	}else if(/tbUserPassword/i.test(id)){ //Это пароль
		value = prefs.password;
	}
    
    	return value;
    });

    AnyBalance.trace ('Trying to enter selfcare at address: ' + baseurl);
    var html = requestPostMultipart (baseurl + '?AspxAutoDetectCookieSupport=1', params, {Referer: baseurl + '?AspxAutoDetectCookieSupport=1'});

    // Проверка неправильной пары логин/пароль
    var error = getParam(html, null, null, /<input[^>]*id="shouldOpenPopup"[^>]*value="(1)"/i);
    if (error)
        throw new AnyBalance.Error ("Неверный логин или пароль. Проверьте введенные данные", null, true);

    // Редирект при необходимости
    var regexp = /window.location.replace\("([^"]*)"\)/;
    var res = regexp.exec (html);
    if (res)
        html = AnyBalance.requestGet (res[1]);

    // Проверка на корректный вход
    regexp = /'\/LogOut.aspx'/;
    if (regexp.exec (html))
    	AnyBalance.trace ('It looks like we are in selfcare...');
    else {
	//Оказывается, иногда карта может быть заблокирована. Обработаем эту ситуацию
	var blocked = getParam(html, null, null, /card_block.jpg[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(blocked)
		throw new AnyBalance.Error(blocked);
        AnyBalance.trace ('Have not found logout... Unknown error. Please contact author.');
//        AnyBalance.trace (html);
        throw new AnyBalance.Error ('Неизвестная ошибка. Пожалуйста, свяжитесь с автором провайдера.');
    }

    var result = {success: true};

    // Владелец
    getParam (html, result, 'customer', /<a href="\/YourAccountMain.aspx">([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);

    // Баланс в баллах
    getParam (html, result, 'balanceinpoints', /CurrentBalance: '([^']*)/i, replaceTagsAndSpaces, parseBalance);

    // Баланс в рублях
    getParam (html, result, 'balanceinrubles', /\(скидка ([\s\S]*?)<span[^>]+class="rur[^>]*>/i, replaceTagsAndSpaces, parseBalance);

    // Количество сообщений
    getParam (html, result, 'messages', /title="Мои сообщения">([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, parseBalance);


    if (AnyBalance.isAvailable ('cardnumber',
                                'pointsinlastoper')) {

        AnyBalance.trace ('Fetching account info...');

        html = AnyBalance.requestGet (baseurl + 'YourAccountMain.aspx');

        AnyBalance.trace ('Parsing account info...');
    
        // Номер карты
        getParam (html, result, 'cardnumber', /Номер карты: <nobr>([^<]*)/i);
    
        // Баллы по последней операции
        getParam (html, result, 'pointsinlastoper', /<td[^>]*class="(?:positiv|negativ)-points"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, function(str){
            str = html_entity_decode(str.replace(/\s+/g, ''));
            return str.replace(/^(\d)/, '+$1');
        });
    }


    if (AnyBalance.isAvailable ('cardstate')) {

        AnyBalance.trace ('Fetching personal data...');

        html = AnyBalance.requestGet ('https://www.sclub.ru/PersonalCabinet/UserForm.aspx');

        AnyBalance.trace ('Parsing personal data...');
    
        // Статус карты
        getParam (html, result, 'cardstate', /Статус карты:[\s\S]*?<span[^>]*>([^<]*)/i);
    }

    AnyBalance.setResult (result);
}
