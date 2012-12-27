/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Статус почтового отправления с сайта moyaposylka.ru

Сайт оператора: http://moyaposylka.ru
Личный кабинет: http://moyaposylka.ru
*/

function numSize(num, size){
  var str = num + '';
  if(str.length < size){
    for(var i=str.length; i<size; ++i){
	str = '0' + str;
    }
  }
  return str;
}

function getDateString(dt){
	if(typeof dt != 'object') dt = new Date(dt);
	return numSize(dt.getDate(), 2) + '/' + numSize(dt.getMonth()+1, 2) + '/' + dt.getFullYear() + " " + numSize(dt.getHours(), 2) + ':' + numSize(dt.getMinutes(), 2);
}

var g_headers = {
	Accept:'*/*',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
        Connection:'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.97 Safari/537.11'
};

function getMyPosylkaResult(prefs){
	AnyBalance.trace('Connecting to moyaposylka...');
	var id = prefs.track_id; //Код отправления, введенный пользователем
	var dest = prefs.track_dest; //Страна назначения

	var baseurl = "https://moyaposylka.ru";
	var html = AnyBalance.requestGet(baseurl, g_headers);
        var token = getParam(html, null, null, /<input[^>]+name="tracker\[_token\]"[^>]*value="([^"]*)/i, null, html_entity_decode);
        if(!token)
            throw new AnyBalance.Error('Не найден токен безопасности. Сайт изменен?');
        
	html = AnyBalance.requestPost(baseurl + '/quick-check', {
		'tracker[number]':prefs.track_id,
		'tracker[destinationCountry]':prefs.track_dest,
		'tracker[_token]':token
	}, addHeaders({Origin:baseurl, Referer:baseurl + '/', 'X-Requested-With': 'XMLHttpRequest'}));

	var json = getJson(html);
        if(!json.content){
            AnyBalance.trace('Неверный ответ сервера: ' + html);
            throw new AnyBalance.Error('Неверный ответ сервера!');
        }
        html = json.content;

	var result = {success: true};

        //createCountries(baseurl, result);

        var error;

        var tr = getParam(html, null, null, /<tr[^>]*>(\s*<td[^>]+class="tracker-date[\s\S]*?)<\/tr>/i);
        if(!tr){
            error = getParam(html, null, null, /<ul[^>]+class="form-errors"[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
            if(error)
                AnyBalance.trace('Случилась ошибка, пробуем закешеный результат: ' + error);
        }

        if(!tr){
            html = AnyBalance.requestGet(baseurl + '/' + prefs.track_id, g_headers);
            tr = getParam(html, null, null, /<tr[^>]*>(\s*<td[^>]+class="tracker-date[\s\S]*?)<\/tr>/i);
            if(!tr){
                if(error)
                    throw new AnyBalance.Error(error);
                throw new AnyBalance.Error('Информация об отправлении не найдена!');
            }
        }

        getParam(html, result, 'trackid', /<h2[^>]*>([\s\S]*?)<\/h2>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, 'days', /Дней в пути\s*<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'weight', /Вес посылки:?\s*<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);

        getParam(tr, result, 'date', /(?:<td[^>]*>[\s\S]*?){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
        getParam(tr, result, 'address', /(?:<td[^>]*>[\s\S]*?){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(tr, result, 'status', /(?:<td[^>]*>[\s\S]*?){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

        if(AnyBalance.isAvailable('fulltext')){
	    var date = getParam(tr, null, null, /(?:<td[^>]*>[\s\S]*?){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
	    var address = getParam(tr, null, null, /(?:<td[^>]*>[\s\S]*?){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	    var status = getParam(tr, null, null, /(?:<td[^>]*>[\s\S]*?){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	    var days = getParam(html, null, null, /Дней в пути\s*<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);

	    result.fulltext = '<b>' + status + '</b><br/>\n' + 
			'<small>' + getDateString(date) + '</small>: ' + address + '<br/>\n' + 
                        'в пути ' + days + ' дн.';
	}

        return result;
}

function main(){
	var prefs = AnyBalance.getPreferences();

        var result = getMyPosylkaResult(prefs);

	AnyBalance.setResult(result);
}

function createCountries(baseurl, result){
        var html = AnyBalance.requestGet(baseurl);
        var ids = [], names = [];
        html.replace(/<option[^>]+value="([^"]*)[^>]*>([^<]*)<\/option>/ig, function(str, countryid, countryname){
            ids[ids.length] = countryid;
            names[names.length] = countryname;
            return str;
        });
        result.entries = ids.join('|');
        result.entryValues = names.join('|');
}

//" <div id="tracker-14086953000628"> <h2> <i class="flag-ru" title="Россия"></i> 14086953000628 <i class="i-icon-delivery" title="Вручено адресату"></i> </h2> <div class="clearfix"></div> <p> Дней в пути <span class="badge badge-info">5</span>. Вес посылки: <span class="badge">0.02</span> кг. </p> <table class="table table-striped table-bordered table-condensed"> <tbody> <tr> <td class="tracker-date">08.08.2012 00:00</td> <td class="tracker-place">МОСКВА 557 [123557]</td> <td> Вручение <span> // </span> Вручение адресату </td> </tr> <tr> <td class="tracker-date">06.08.2012 12:33</td> <td class="tracker-place">МОСКВА 557 [123557]</td> <td> Неудачная попытка вручения <span> // </span> Временное отсутствие адресата </td> </tr> <tr> <td class="tracker-date">06.08.2012 12:33</td> <td class="tracker-place">МОСКВА 557 [123557]</td> <td> Обработка <span> // </span> Прибыло в место вручения </td> </tr> <tr> <td class="tracker-date">04.08.2012 00:39</td> <td class="tracker-place">МОСКОВСКИЙ АСЦ ЦЕХ ЛОГИСТИКИ [140980]</td> <td> Обработка <span> // </span> Покинуло сортировочный центр </td> </tr> <tr> <td class="tracker-date">04.08.2012 00:00</td> <td class="tracker-place">МОСКВА МСП-3 УЧ-49 [111949]</td> <td> Обработка <span> // </span> Покинуло сортировочный центр </td> </tr> <tr> <td class="tracker-date">03.08.2012 16:17</td> <td class="tracker-place">МОСКОВСКИЙ АСЦ ЦЕХ ФЛЭТОВ И РПО [140992]</td> <td> Обработка <span> // </span> Сортировка </td> </tr> <tr> <td class="tracker-date">03.08.2012 05:00</td> <td class="tracker-place">МОСКОВСКИЙ АСЦ [140961]</td> <td> Приём <span> // </span> Партионный </td> </tr> </tbody> </table> </div> <div class="alert alert-gray"> <a href="/register/?utm_source=search">Зарегистрируйтесь</a>, если хотите отслеживать несколько посылок. <br>Хотите поделиться информацией о статусах Вашей посылки?<br>Постоянная ссылка на страницу: <strong><a href="https://moyaposylka.ru/14086953000628">https://moyaposylka.ru/14086953000628</a></strong> </div> "
