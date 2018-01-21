/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для сотового оператора xxxxxx 

Operator site: http://xxxxxx.ru
Личный кабинет: https://kabinet.xxxxxx.ru/login
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

    //Проверяем, что логин и пароль введены
    AB.checkEmpty(prefs.coin, 'Введите название монеты!');
   

    //Лучше базовый url забить где-нибудь вначале в переменную, потом гораздо легче переделывать в другой провайдер
    var baseurl = "https://api.coinmarketcap.com/v1/ticker/";

    //Не забываем устанавливать кодировку по-умолчанию. Её можно узнать из заголовка Content-Type или из тела страницы в теге <meta> 
    AnyBalance.setDefaultCharset('utf-8'); 

    //В данном провайдере в форму передаётся "секретный" параметр, поэтому, прежде чем делать запрос, надо его получить
    //Для этого сначала загружаем форму входа
    var html = AnyBalance.requestGet(baseurl + prefs.coin, g_headers);

    if(!html || AnyBalance.getLastStatusCode() > 400){ //Если главная страница возвращает ошибку, то надо отреагировать
    	AnyBalance.trace(html); //В непонятных случаях лучше сделать распечатку в лог, чтобы можно было понять, что случилось
    	throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Проверьте правильность названия монеты');
    }

  
    //После входа обязательно проверяем маркер успешного входа
    //Обычно это ссылка на выход, хотя иногда приходится искать что-то ещё
    if(!/price_usd/i.test(html)){
        //Если в кабинет войти не получилось, то в первую очередь надо поискать в ответе сервера объяснение ошибки
        var error = AB.getParam(html, null, null, /id not found/i, AB.replaceTagsAndSpaces);
        if(error){
            //При выкидывании ошибки входа третьим параметром передаём проверку на то, что это ошибка неправильного пароля. 
            //Если третий параметр true, то AnyBalance прекратит обновления до тех пор, пока пользователь не изменит настройки.
            //Это важно, а то постоянные попытки обновления с неправильным паролем могут заблокировать кабинет.
            throw new AnyBalance.Error(error, null, /Сайт изменен? или вы ввели неизвестный ID монеты/i.test());
        }
		AnyBalance.trace(html); //В непонятных случаях лучше сделать распечатку в лог, чтобы можно было понять, что случилось
        //Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    //Раз мы здесь, то мы успешно вошли в кабинет
    //Получаем все счетчики
    var result = {success: true};
    AB.getParam(html, result, 'priceUSD', /"price_usd":[\s\S]*?"([\s\S]*?)"/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'priceBTC', /"price_btc":[\s\S]*?"([\s\S]*?)"/i, AB.replaceTagsAndSpaces, AB.parseBalance);

    //Возвращаем результат
    AnyBalance.setResult(result);
}
