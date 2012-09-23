/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о балансе и тарифном плане для хостинг провайдера IPHoster

Сайт оператора: https://iphoster.ru
Личный кабинет: https://iphoster.ru/panel/
*/

function sumParam (html, result, param, regexp, replaces, parser, do_replace) {
	if (param && (param != '__tariff' && !AnyBalance.isAvailable (param))){
            if(do_replace)
  	        return html;
            else
                return;
	}

        var total_value;
	var html_copy = html.replace(regexp, function(str, value){
		for (var i = 0; replaces && i < replaces.length; i += 2) {
			value = value.replace (replaces[i], replaces[i+1]);
		}
		if (parser)
			value = parser (value);
                if(typeof(total_value) == 'undefined')
                	total_value = value;
                else
                	total_value += value;
                return ''; //Вырезаем то, что заматчили
        });

    if(param){
      if(typeof(total_value) != 'undefined'){
          if(typeof(result[param]) == 'undefined')
      	      result[param] = total_value;
          else 
      	      result[param] += total_value;
      }
      if(do_replace)
          return html_copy;
    }else{
      return total_value;
    }
}

var replaceTagsAndSpaces = [/&nbsp;/g, ' ', /<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function parseBalance(text){
    var val = sumParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function parseDate(str){
    var matches = /(\d+)[^\d](\d+)[^\d](\d+)/.exec(str);
    var time;
    if(matches){
	  time = (new Date(+matches[3], matches[2]-1, +matches[1])).getTime();
          AnyBalance.trace('Parsing date ' + new Date(time) + ' from value: ' + str);
          return time;
    }
    AnyBalance.trace('Could not parse date from value: ' + str);
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('UTF-8');

    var baseurl = "https://iphoster.ru/panel/";

    var html = AnyBalance.requestPost(baseurl, {
        login:prefs.login,
        pass:prefs.password,
        check:''
    });

    //AnyBalance.trace(html);
    if(!/\/panel\/\?do=logout/i.test(html)){
        var error = sumParam(html, null, null, /<font[^>]*class=["']?warn[^>]*>([\s\S]*?)<\/font>/, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    sumParam(html, result, 'licschet', /Номер аккаунта:[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces);
    sumParam(html, result, 'bills', /Всего счетов:[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    sumParam(html, result, 'orders', /Всего заказов:[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    sumParam(html, result, 'shop', /Всего товаров:[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    sumParam(html, result, 'domains', /Всего доменов:[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    sumParam(html, result, 'referals', /Всего рефералов:[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    sumParam(html, result, 'tickets', /Всего тикетов:[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    if(AnyBalance.isAvailable('topay')){
        html = AnyBalance.requestGet(baseurl + '?do=bills');
        sumParam(html, result, 'topay', /<td[^>]*>((?:[\s\S](?!\/td>))*)<\/td>\s*<td[^>]*>\s*<img[^>]*src="?\/images\/payed_0/ig, replaceTagsAndSpaces, parseBalance);
    }

    if(AnyBalance.isAvailable('ticket_answers')){
        html = AnyBalance.requestGet(baseurl + '?do=tickets');
        sumParam(html, result, 'ticket_answers', /<td[^>]*>([^<]*)<\/td>\s*<td[^>]*>\s*<a[^>]*href="?\?do=tickets&sub=view/ig, replaceTagsAndSpaces, parseBalance);
    }

//    sumParam(html, result, '__tariff', /Тариф(?:<[^>]*>)?:[\S\s]*?<dd[^>]*>([\S\s]*?)<\/dd>/i, replaceTagsAndSpaces);

    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

