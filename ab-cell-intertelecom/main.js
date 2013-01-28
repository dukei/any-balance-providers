/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Интертелеком – первый национальный CDMA оператор.
Сайт оператора: http://www.intertelecom.ua/
Автоматическая Система Самообслуживания Абонентов (АССА): https://assa.intertelecom.ua/ru/login/
*/

function main(){
	var prefs = AnyBalance.getPreferences();
	var html = AnyBalance.requestPost('https://assa.intertelecom.ua/ru/login/', {
		phone: prefs.phone,
		pass: prefs.pass
	});

        if(!/\?logout/i.test(html))
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Проверьте логин-пароль.');
                
	var result = {success: true};
	//Название тарифа
        getParam(html, result, '__tariff', /<td[^>]*>\s*Тарифный план\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	//Основной счет (Сальдо)
        getParam(html, result, 'saldo', /<td[^>]*>\s*Сальдо\s*<\/td>\s*<td[^>]*>([^<]*)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	//Предоплаченые услуги на месяц
        getParam(html, result, 'predoplata', /<td[^>]*>\s*Предоплаченые услуги на месяц\s*<\/td>\s*<td[^>]*>([^<]*)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	//Неактивированные бонусы с 094
        getParam(html, result, 'bonus', /<td[^>]*>\s*Неактивированные бонусы \(с 094\)\s*<\/td>\s*<td[^>]*>([^<]*)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	//Предоплачение местные минуты
        getParam(html, result, 'min_local', /<td[^>]*>\s*Минуты\s*<\/td>[\s\S]*?<td[^>]*>[^<]*местные[^<]*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseSeconds);
	//Бонус по программе лояльности «Наилучшее общение»
	getParam(html, result, 'bonus_pl', /<td[^>]*>\s*Наилучшее общение\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	//Бонус facebook
	getParam(html, result, 'bonus_fb', /<td[^>]*>\s*Бонус facebook\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

	//Пакетный трафик (получаем в локальную переменную, и независимо от включенности счетчика 'traffic_paket')
        var traffic_paket = getParam(html, null, null, /<td[^>]*>\s*пакетный трафик\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	//Трафик использованный за текущую интернет сессию  (получаем в локальную переменную, и независимо от включенности счетчика 'traffic_paket_session')
        var traffic_paket_session = getParam(html,  null, null, /<td[^>]*>\s*Трафик МБ\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

	//Узнаем разницу между имеющимся Пакетным трафиком и израсходованным за текущую сессию
	if(typeof(traffic_paket) != 'undefined'){
            if(AnyBalance.isAvailable('traffic_paket'))
                result.traffic_paket = traffic_paket - (traffic_paket_session || 0); //Если вдруг traffic_paket_session не найден, то считаем его равным 0
        }

	//Трафик смартфон 
        getParam(html, result, 'traffic_night', />\s*Ночной трафик\s*<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	//Трафик ночной
        getParam(html, result, 'traffic_smart', />\s*Смартфон\s*<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	//Трафик по акции
	getParam(html, result, 'traffic_action', />\s*по акции\s*<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	
	//Дата последней абонентской активности
	sumParam(html, result, 'date_activity', /<td[^>]*>\s*Дата последней абонентской активности \(мм.гггг\)\s*<\/td>\s*<td[^>]*>([^<]*)<\/td>/ig, replaceTagsAndSpaces, parseDate, aggregate_min);

	//Количество новостей
        getParam(html, result, 'news', />Новости <span [^>]*>([^<]*)<\/span>/i, replaceTagsAndSpaces, parseBalance);

	//Номер телефона
	getParam(html, result, 'phonet', /<td[^>]*>\s*Номер телефона\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        if(AnyBalance.isAvailable('phonet'))
               result.phonet = '+380' + result.phonet;

	AnyBalance.setResult(result);
}

function getParam (html, result, param, regexp, replaces, parser) {
	if (param && (param != '__tariff' && !AnyBalance.isAvailable (param)))
		return;

	var matches = regexp.exec (html), value;
	if (matches) {
		value = matches[1];
		if (replaces) {
			for (var i = 0; i < replaces.length; i += 2) {
				value = value.replace (replaces[i], replaces[i+1]);
			}
		}
		if (parser)
			value = parser (value);

    if(param)
      result[param] = value;
	}
   return value
}

var replaceTagsAndSpaces = [/&nbsp;/g, ' ', /<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function parseBalance(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function parseSeconds(str){
    var matches = /(\d+):0*(\d+):0*(\d+)/.exec(str);
    var time;
    if(matches){
	  time = (+matches[1])*3600 + (+matches[2])*60 + (+matches[3]);
          AnyBalance.trace('Parsing seconds ' + time + ' from value: ' + str);
          return time;
    }
    AnyBalance.trace('Could not parse seconds from value: ' + str);
}

/**
 * Заменяет HTML сущности в строке на соответствующие им символы
 */
function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

/**
 *  Получает дату из строки
 */
function parseDate(str){
    var matches = /(?:(\d+)[^\d])?(\d+)[^\d](\d{2,4})(?:[^\d](\d+):(\d+)(?::(\d+))?)?/.exec(str);
    if(matches){
          var year = +matches[3];
          var date = new Date(year < 1000 ? 2000 + year : year, matches[2]-1, +(matches[1] || 1), matches[4] || 0, matches[5] || 0, matches[6] || 0);
	  var time = date.getTime();
          AnyBalance.trace('Parsing date ' + date + ' from value: ' + str);
          return time;
    }
    AnyBalance.trace('Failed to parse date from value: ' + str);
}

/**
 * Получает значение, подходящее под регулярное выражение regexp, производит 
 * в нем замены replaces, результат передаёт в функцию parser, 
 * а затем записывает результат в счетчик с именем param в result
 * Результат в result помещается только если счетчик выбран пользователем 
 * в настройках аккаунта
 *
 * Очень похоже на getParam, но может получать несколько значений (при наличии 
 * в регулярном выражении флага g). В этом случае применяет к ним функцию aggregate, 
 * а если она не передана, то возвращает массив всех совпадений.
 * 
 * если result и param равны null, то значение просто возвращается.
 * eсли parser == null, то возвращается результат сразу после замен
 * если regexp == null, то значением является переданный html
 * если replaces == null, то замены не делаются
 * do_replace - если true, то найденные значения вырезаются из переданного текста 
 * и новый текст возвращается (только при param == null)
 * 
 * replaces - массив, нечетные индексы - регулярные выражения, четные - строки, 
 * на которые надо заменить куски, подходящие под предыдущее регулярное выражение. Эти массивы могут быть вложенными.
 * см. например replaceTagsAndSpaces
 */
function sumParam (html, result, param, regexp, replaces, parser, do_replace, aggregate) {
    if (param && (param != '__tariff' && !AnyBalance.isAvailable (param))){
	if(do_replace)
		return html;
        else
		return;
    }

    if(typeof(do_replace) == 'function'){
        aggregate = do_replace;
        do_replace = false;
    }

    var values = [], matches;
    if(param && isset(result[param]))
        values.push(result[param]);

    if(!regexp){
        values.push(replaceAll(html, replaces));
    }else{
        regexp.lastIndex = 0; //Удостоверяемся, что начинаем поиск сначала.
        while(matches = regexp.exec(html)){
		value = isset(matches[1]) ? matches[1] : matches[0];
        	value = replaceAll(value, replaces);
		if (parser)
			value = parser (value);
            
        	values.push(value);
        	if(!regexp.global)
            		break; //Если поиск не глобальный, то выходим из цикла
	}
    }

    var total_value;
    if(aggregate)
        total_value = aggregate(values);
    else if(!param) //Если не требуется записывать в резалт, и функция агрегации отсутствует, то вернем массив
        total_value = values;

    if(param){
      if(isset(total_value)){
          result[param] = total_value;
      }
      if(do_replace)
          return regexp ? html.replace(regexp, '') : html;
    }else{
      return total_value;
    }
}

function aggregate_sum(values){
    if(values.length == 0)
        return;
    var total_value = 0;
    for(var i=0; i<values.length; ++i){
        total_value += values[i];
    }
    return total_value;
}

function aggregate_min(values){
    if(values.length == 0)
        return;
    var total_value;
    for(var i=0; i<values.length; ++i){
        if(!isset(total_value) || total_value > values[i])
            total_value = values[i];
    }
    return total_value;
}
