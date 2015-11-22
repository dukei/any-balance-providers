/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для сотового оператора xxxxxx 

Operator site: http://xxxxxx.ru
Личный кабинет: https://kabinet.xxxxxx.ru/login
*/

var g_headers = {
    'Connection': 'keep-alive',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.86 Safari/537.36',
    'Content-Type': 'application/x-www-form-urlencoded',
    'Accept-Encoding': 'gzip, deflate',
    'Accept-Language': 'ru,en;q=0.8'
};

function main(){
    //Получаем в переменную заданные пользователем настройки
    var prefs = AnyBalance.getPreferences();

    //Проверяем, что логин и пароль введены
    checkEmpty(prefs.phone, 'Введите номер телефона в 9-значном формате!');
    checkEmpty(prefs.pin2, 'Введите pin2!');

    //Лучше базовый url забить где-нибудь вначале в переменную, потом гораздо легче переделывать в другой провайдер
    var baseurl = "http://lk.o.kg/";

    //Не забываем устанавливать кодировку по-умолчанию. Её можно узнать из заголовка Content-Type или из тела страницы в теге <meta> 
    AnyBalance.setDefaultCharset('utf-8'); 

    //В данном провайдере в форму передаётся "секретный" параметр, поэтому, прежде чем делать запрос, надо его получить
    //Для этого сначала загружаем форму входа
    var html = AnyBalance.requestGet(baseurl + 'login', g_headers);

    if(!html || AnyBalance.getLastStatusCode() > 400){ //Если главная страница возвращает ошибку, то надо отреагировать
    	AnyBalance.trace(html); //В непонятных случаях лучше сделать распечатку в лог, чтобы можно было понять, что случилось
    	throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    html = AnyBalance.requestPost(baseurl + 'login', {
        MSISDN_PREFIX:700,
        _MSISDN:prefs.login,
        SUBMIT_FIRST_STAGE:'Войти в кабинет',
        H_STAGE:1,
        H_TYPE_AUTH:1,
        H_VIEW_CAPTCHA:1
    }, addHeaders({Referer: baseurl + 'login'})); 

    html = AnyBalance.requestPost(baseurl + 'login', {
        SUBMIT_MOVE_TO_PIN2_AUTH: 'Войти, указав PIN2 от вашей SIM-карты',
        // H_CODE 
        H_STAGE: '2',
        H_MSISDN: '558255',
        H_MSISDN_PREFIX: '700',
        H_TYPE_AUTH: '1',
        H_VIEW_CAPTCHA: '2'
    }

    html = AnyBalance.requestPost(baseurl + 'login', {
        PIN2: '3500',
        SUBMIT: 'Войти в кабинет',
        // H_CODE 
        H_STAGE: '3',
        H_MSISDN: '558255',
        H_MSISDN_PREFIX: '700',
        H_TYPE_AUTH: '2',
        H_VIEW_CAPTCHA: '2'
    }

    //После входа обязательно проверяем маркер успешного входа
    //Обычно это ссылка на выход, хотя иногда приходится искать что-то ещё
    if(!/\/Logout/i.test(html)){
        //Если в кабинет войти не получилось, то в первую очередь надо поискать в ответе сервера объяснение ошибки
        // var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
        // if(error){
        //     //При выкидывании ошибки входа третьим параметром передаём проверку на то, что это ошибка неправильного пароля. 
        //     //Если третий параметр true, то AnyBalance прекратит обновления до тех пор, пока пользователь не изменит настройки.
        //     //Это важно, а то постоянные попытки обновления с неправильным паролем могут заблокировать кабинет.
        //     throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test());
        // }
		AnyBalance.trace(html); //В непонятных случаях лучше сделать распечатку в лог, чтобы можно было понять, что случилось
        //Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
        // throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    //Раз мы здесь, то мы успешно вошли в кабинет
    //Получаем все счетчики
    var result = {success: true};
    getParam(html, result, 'fio', /Имя(?:\s|&nbsp;)*абонента:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /Тарифный план:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'phone', /Номер:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Текущий баланс:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'status', /Статус:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);

    //Возвращаем результат
    AnyBalance.setResult(result);
}
