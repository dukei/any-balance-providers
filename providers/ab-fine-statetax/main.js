/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает сумму штрафов и их количество с сайта http://www.statetax.ru

Сайт оператора: http://www.statetax.ru
Личный кабинет: http://www.statetax.ru
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
    var matches = /(\d+)[^\d](\d+)[^\d](\d+)(?:[^\d](\d+):(\d+)(?::(\d+))?)?/.exec(str);
    if(matches){
          var date = new Date(+matches[3], matches[2]-1, +matches[1], matches[4], matches[5], matches[6]);
	  var time = date.getTime();
          AnyBalance.trace('Parsing date ' + date + ' from value: ' + str);
          return time;
    }
    AnyBalance.trace('Failed to parse date from value: ' + str);
}

function parseDate(str){
    var matches = /(\d+)[^\d](\d+)[^\d](\d+)\s+(?:(\d+):(\d+))?/.exec(str);
    var time;
    if(matches){
	  time = (new Date(+matches[3], matches[2]-1, +matches[1], +matches[4], +matches[5])).getTime();
          AnyBalance.trace('Parsing date ' + new Date(time) + ' from value: ' + str);
          return time;
    }
    AnyBalance.trace('Could not parse date from value: ' + str);
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "http://www.statetax.ru";
    var html = AnyBalance.requestGet(baseurl);
    var href = sumParam(html, null, null, /<form[^>]+name="auth"[^>]*action="([^"]*)/i, null, html_entity_decode);
    if(!href)
        throw new AnyBalance.Error('Не удалось найти форму входа. Проблемы на сайте или сайт изменен.');

    html = AnyBalance.requestPost(baseurl + href, {
        msisdn:prefs.login,
        password:prefs.password
    });

    //AnyBalance.trace(html);
    if(!/\/exit\.do/i.test(html)){
        var error = sumParam(html, null, null, /<div[^>]*style=["']color:\s*red[^>]*>([\s\S]*?)<\/div>/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    sumParam(html, result, 'count', /Входящие счета\s*\(([^\)]*)/i, replaceTagsAndSpaces, parseBalance);
    sumParam(html, result, 'balance', /<span[^>]*class="price_number"[^>]*>([^<]*)<\/span>(?:[\s\S](?!<td))*.<td[^>]*class="nopay/ig, replaceTagsAndSpaces, parseBalance);
    sumParam(html, result, 'lastdate', /<tr[^>]*>\s*<td[^>]*>([^<]*)<\/td>(?:[\s\S](?!<\/tr))*?<td[^>]*class="nopay/i, replaceTagsAndSpaces, parseDate);

    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

