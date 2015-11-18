/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для провайдера связи KiteNet

Operator site: http://my.rusat.com/
Личный кабинет: http://my.rusat.com/cgi-bin/clients/login
*/

var g_headers = {
'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
'Connection':'keep-alive',
'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){
    //Получаем в переменную заданные пользователем настройки
    var prefs = AnyBalance.getPreferences();
    var dbg = prefs.__dbg;
    //Проверяем, что логин и пароль введены
    checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(prefs.password, 'Введите пароль!');

    //Лучше базовый url забить где-нибудь вначале в переменную, потом гораздо легче переделывать в другой провайдер
    var baseurl = "http://my.rusat.com/cgi-bin/clients/",
        redirecturl = "http://kitenet.ru/blogin/&err=1";
    //Не забываем устанавливать кодировку по-умолчанию. Её можно узнать из заголовка Content-Type или из тела страницы в теге <meta> 
    AnyBalance.setDefaultCharset('utf-8');
    
    var html = AnyBalance.requestGet(baseurl + 'login', g_headers);

    if(!html || AnyBalance.getLastStatusCode() > 400){ //Если главная страница возвращает ошибку, то надо отреагировать
        AnyBalance.trace('trying to find html');
        AnyBalance.trace(html); //В непонятных случаях лучше сделать распечатку в лог, чтобы можно было понять, что случилось
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    try {
        html = AnyBalance.requestPost(baseurl + 'login', {
            login: prefs.login,
            password: prefs.password,
            action: 'validate'
        }, addHeaders({Referer: baseurl + 'login'}));         
    } catch(e) {
        if (!dbg) {
            AnyBalance.trace('Error redirecting', e.message);
        } else {
            html = AnyBalance.requestPost(redirecturl, {
                login:prefs.login,
                password:prefs.password,
                action: 'validate'
            }, addHeaders({Referer: baseurl + 'login'}));  
        }
    }

    AnyBalance.trace(html);
    //После входа обязательно проверяем маркер успешного входа
    //Обычно это ссылка на выход, хотя иногда приходится искать что-то ещё
    if(!/logout/i.test(html)){
        //Если в кабинет войти не получилось, то в первую очередь надо поискать в ответе сервера объяснение ошибки
        var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error){
            //При выкидывании ошибки входа третьим параметром передаём проверку на то, что это ошибка неправильного пароля. 
            //Если третий параметр true, то AnyBalance прекратит обновления до тех пор, пока пользователь не изменит настройки.
            //Это важно, а то постоянные попытки обновления с неправильным паролем могут заблокировать кабинет.
            throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test());
        }
        AnyBalance.trace('logout not found');
		AnyBalance.trace(html); //В непонятных случаях лучше сделать распечатку в лог, чтобы можно было понять, что случилось
        //Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    //Раз мы здесь, то мы успешно вошли в кабинет
    //Получаем все счетчики
    var result = {success: true};
    getParam(html, result, 'id', /лицевой счет № (\d+)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Ваш баланс:.*((&nbsp;|\s|\b)\d+\.\d{0,2})/i, replaceTagsAndSpaces, parseBalance, html_entity_decode);
    getParam(html, result, 'payment', /Рекомендуемый платеж:.*((&nbsp;|\s|\b)\d+\.\d{0,2})/i, replaceTagsAndSpaces, parseBalance);
    //Возвращаем результат
    AnyBalance.setResult(result);
}
