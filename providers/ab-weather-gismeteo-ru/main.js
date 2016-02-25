
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main() {
  var prefs = AnyBalance.getPreferences();
  // Защита от undefined для уже созданных аккаунтов
  if (!prefs.domen) {
    prefs.domen = 'ru';
  }
  if (!prefs.lang) {
    prefs.lang = 'ru'; // В текущей версии провайдера информация берется только на русском языке
  }
  if (prefs.domen == 'lt' && prefs.lang == 'ru') {
    prefs.domen = 'lt/ru';
  }
  checkEmpty(prefs.city, 'Введите индекс или название города!');
  // Базовый линк
  var baseurl = 'https://www.gismeteo.' + prefs.domen + '/';
  // Если не числа, значит надо сделать доп запрос для поиска индекса города
  if (!/^\d+$/i.test(prefs.city)) {
    AnyBalance.trace('Ищем ID города ' + prefs.city);
    html = AnyBalance.requestGet(baseurl + 'ajax/city_search/?searchQuery=x' + encodeURIComponent(prefs.city));
    // Нужно для того, чтобы проверить вернулся ли правильный json, иначе могут быть ошибки
    var json = getJson(html);
    AnyBalance.trace(JSON.stringify(json));

    var id = getParam(html, null, null, /^\{["']+(\d+)/i, [/\D/g, '']);

    checkEmpty(id, 'Не удалось найти ID города ' + prefs.city, true);
    AnyBalance.trace('Нашли ID города ' + prefs.city + ': ' + id);
    prefs.city = id;
  }

  var result = {
    success: false
  };

  switch (prefs.tod) {
    case '-2':
    case '0':
    case '1':
    case '2':
    case '3':
      if (prefs.city.indexOf('_1') > 0) {
        result = getWeatherFromXML(prefs);
        break;
      }

    case '-1':
      if (prefs.city.indexOf('_1') > 0) {
        throw new AnyBalance.Error(
          'По текущему индексу города можно получить только прогноз погоды. Для получения текущей погоды введите индекс со страницы <a href="http://www.gismeteo.' +
          prefs.domen + '">Gismeteo.' + prefs.domen + '</a>.');
      }
      result = getWeatherFromHTML(prefs);
      break;

    default:
      throw new AnyBalance.Error("Ошибка получения выбранного прогноза. Пожалуйста, свяжитесь с разработчиками.");
      break;
  }

  AnyBalance.setResult(result);
}

function getWeatherFromHTML(prefs) {
  var baseurl = 'https://www.gismeteo.' + prefs.domen + '/city/daily/';

  AnyBalance.trace('Trying open address: ' + baseurl + prefs.city + '/');
  var html = AnyBalance.requestGet(baseurl + prefs.city + '/');

  // Проверка неправильной пары логин/пароль
  var regexp = /<h2>Ошибка[\s\S]*?<p>([^<]*)/i;
  var res = regexp.exec(html);
  if (res) {
    throw new AnyBalance.Error(res[1]);
  }

  // Проверка на корректный вход
  var error = getParam(html, null, null, /Страница не найдена/i);

  if (error) {
    throw new AnyBalance.Error('Неизвестная ошибка. Пожалуйста, свяжитесь с автором провайдера.');
  }

  if (getParam(html, null, null, /Почасовой прогноз погоды/i)) {
    AnyBalance.trace('It looks like we are in selfcare...');
  } else {
    AnyBalance.trace('Have not found weather info... Unknown error. Please contact author.');
    throw new AnyBalance.Error('Неизвестная ошибка. Пожалуйста, свяжитесь с автором провайдера.');
  }

  var result = {
    success: true
  };
  // Город
  getParam(html, result, '__tariff', /<h2[^>]*>([^<]*)/i);

  result = (prefs.tod == '-1') ? getCurrentWeather(html, result) : getWeatherForecast(html, result, prefs.tod);
  // Температура воды
  getParam(html, result, 'waterTemperature', /<div[^>]+class="wicon water"[^>]*>\s*<dd[^>]+class="value m_temp c">([-+]?\d+)/i, null,
    parseFloat);
  // Восход Солнца
  getParam(html, result, 'rising', /Восход[^\d]*(\d{2}:\d{2})/i, null, parseMinutes);
  // Закат Солнца
  getParam(html, result, 'setting', /Заход[^\d]*(\d{2}:\d{2})/i, null, parseMinutes);
  // Долгота дня
  getParam(html, result, 'dayLength', /Долгота[^\d]*(\d{2}:\d{2})/i, null, parseMinutes);
  // Фаза Луны
  getParam(html, result, 'moonPhase', /Фаза[^\d]*((\d+%)[\s\S]*?<span[^>]+class="astronomy_title">([^<]*))/i, [
    /(\d+%)[\s\S]*?<span[^>]+class="astronomy_title">([^<]*)/, '$2 $1'
  ]);

  return result;
}

function getCurrentWeather(html, result) {
  // Атмосферные явления
  getParam(html, result, 'atmosphericConditions', /class="cloudness">[\s\S]*?>([^\s<]+[^<]*)/i);
  // Температура
  getParam(html, result, 'temperature', /class='value\sm_temp\sc'>((?:[-+]?|&minus;|&plus;)\d+[,.]?\d*)/i, ['&minus;', '-', '&plus;', '+'],
    parseFloat);
  // Атмосферное давление
  getParam(html, result, 'pressure', /class='value m_press torr'>(\d+)/i, [], parseInt);
  // Ветер
  getParam(html, result, 'wind', /<dd[^>]* ms'[^>]*>((\d+)[\s\S]*?<dt>([^<]*))/i, [/(\d+)[\s\S]*?<dt>([^<]*)/, '$2 $1м/с']);
  // Влажность
  getParam(html, result, 'humidity', /title="Влажность">(\d+)/i, [], parseInt);
  // Время обновления
  getParam(html, result, 'time', /class="icon date">([^<]*)/i, [/(\d{1,2})\s+(\S+)\s+(\d{4})\s+(.*)/, '$3/$2/$1 $4',
      'января', '01',
      'февраля', '02',
      'марта', '03',
      'апреля', '04',
      'мая', '05',
      'июня', '06',
      'июля', '07',
      'августа', '08',
      'сентября', '09',
      'октября', '10',
      'ноября', '11',
      'декабря', '12'
    ],
    Date.parse);

  return result;
}

function getWeatherForecast(html, result, tod) {
  var regExpPrefix = '';
  var array = ['Утро', 'День', 'Вечер', 'Ночь'];
  if (tod < 0) {
    //Если нам нужна текущая или ближайшая, то надо выбрать нужный индекс
    var dt = new Date();
    var hour = dt.getHours();
    if (0 <= hour && hour < 6) { //Ночь
      tod = tod == -1 ? 3 : 0;
    } else if (6 <= hour && hour < 12) { //Утро
      tod = tod == -1 ? 0 : 1;
    } else if (12 <= hour && hour < 18) { //День
      tod = tod == -1 ? 1 : 2;
    } else { //Вечер
      tod = tod == -1 ? 2 : 3;
    }
    AnyBalance.trace('Выбираем прогноз на ' + array[tod]);
  }

  if (tod >= 0) {
    regExpPrefix = array[tod];

    // Фактические данные(?:[^>]*>){1}[^>]*День[\s\S]*?</tr
    var regExp = new RegExp('(?:Фактические данные|Прогноз)(?:[^>]*>){1}[^>]*' + regExpPrefix + '[\\s\\S]*?</tr>', 'i');

    var tr = getParam(html, null, null, regExp);
    if (!tr)
      throw new AnyBalance.Error('Не найден прогноз погоды. Пожалуйста, обратитесь к разработчикам.');

    getParam(tr, result, 'atmosphericConditions', /"cltext"[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'temperature', /temp\s*c[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'pressure', /m_press torr[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'wind', /wind[^>]*>([\s\S]*?)<\/span/i, [replaceTagsAndSpaces, /([\s\S]*)/i, '$1 м/с'], html_entity_decode);
    getParam(tr, result, 'humidity', /<td>(\d+)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'heat', /m_temp c[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'time', /Local:\s*(\d{4}-\d{2}-\d{2}\s+\d+:\d{2})/i, [/(\d{4})-(\d{2})-(\d{2})\s+(\d+:\d{2})/, '$3/$2/$1 $4'],
      parseDate);
  }

  return result;


}
