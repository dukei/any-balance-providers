/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает "Погоду за окном" для выбранного города.

Сайт компании: http://www.gismeteo.ru
*/

function main () {
    var prefs = AnyBalance.getPreferences ();
    var baseurl = 'http://www.gismeteo.ru/city/daily/';

    checkEmpty (prefs.city, 'Введите индекс города');

    var html = AnyBalance.requestGet (baseurl + prefs.city);

    // Проверка неправильной пары логин/пароль
    var regexp=/<h2>Ошибка[\s\S]*?<p>([^<]*)/i;
    var res = regexp.exec (html);
    if (res)
        throw new AnyBalance.Error (res[1]);

    // Проверка на корректный вход
    regexp = />Погода за окном<([\s\S]*)>Прогноз</i;
    html = regexp.exec (html);
    if (html)
    	AnyBalance.trace ('It looks like we are in selfcare...');
    else {
        AnyBalance.trace ('Have not found logOff... Unknown error. Please contact author.');
        throw new AnyBalance.Error ('Неизвестная ошибка. Пожалуйста, свяжитесь с автором скрипта.');
    }

    var result = {success: true};

    // Город
    getParam (html, result, '__tariff', /<h3[^>]*>([^<]*)/i);

    // Атмосферные явления
    getParam (html, result, 'atmosphericConditions', /<dd>([^<]*)<\/dd>/i);

    // Температура
    getParam (html, result, 'temperature', /class="temp">([-+]?\d+[,.]?\d*)/i, [], parseFloat);

    // Атмосферное давление
    getParam (html, result, 'pressure', /title="Давление">(\d+)/i, [], parseInt);

    // Ветер
    getParam (html, result, 'wind', /class="wicon wind">.*?<dt>(([^<]*)<\/dt><dd>(\d*))/i, [/([^<]*)<\/dt><dd>(\d*)/, '$1 $2м/с']);

    // Влажность
    getParam (html, result, 'humidity', /title="Влажность">(\d+)/i, [], parseInt);

    // Время обновления
    getParam (html, result, 'time', /class="icon date">([^<]*)/i, [/(\d{2})\.(\d{2})\.(.*)/, '$2/$1/$3'], Date.parse);

    AnyBalance.setResult (result);
}
