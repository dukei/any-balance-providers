 /**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

ГудЛайн первый разумный роуминг
Сайт оператора: http://www.goodline.ru/
Личный кабинет: http://goodline.ru/ru/abonents/entercabinet/
*/

function getParam (html, result, param, regexp, replaces, parser) {
	if (param && (param != '__tariff' && !AnyBalance.isAvailable (param)))
		return;

	var value = regexp ? regexp.exec (html) : [html, html];
	if (value) {
		value = value[1];
		if (replaces) {
			for (var i = 0; i < replaces.length; i += 2) {
				value = value.replace (replaces[i], replaces[i+1]);
			}
		}
		if (parser)
			value = parser (value);

    if(param)
      result[param] = value;
    else
      return value
	}
}

var replaceTagsAndSpaces = [/&nbsp;/i, ' ', /<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, '', /^"+|"+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

function parseBalance(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function parseCurrency(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /-?\d[\d\s.,]*(\S*)/);
    AnyBalance.trace('Parsing currency (' + val + ') from: ' + text);
    return val;
}

/**
 * Date.parse with progressive enhancement for ISO 8601 <https://github.com/csnover/js-iso8601>
 * © 2011 Colin Snover <http://zetafleet.com>
 * Released under MIT license.
 */
(function (Date, undefined) {
    var origParse = Date.parse, numericKeys = [ 1, 4, 5, 6, 7, 10, 11 ];
    Date.parse = function (date) {
        var timestamp, struct, minutesOffset = 0;

        // ES5 §15.9.4.2 states that the string should attempt to be parsed as a Date Time String Format string
        // before falling back to any implementation-specific date parsing, so that’s what we do, even if native
        // implementations could be faster
        //              1 YYYY                2 MM       3 DD           4 HH    5 mm       6 ss        7 msec        8 Z 9 ±    10 tzHH    11 tzmm
        if ((struct = /^(\d{4}|[+\-]\d{6})(?:-(\d{2})(?:-(\d{2}))?)?(?:(?:T|\s+)(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{3}))?)?(?:(Z)|([+\-])(\d{2})(?::(\d{2}))?)?)?$/.exec(date))) {
            // avoid NaN timestamps caused by “undefined” values being passed to Date.UTC
            for (var i = 0, k; (k = numericKeys[i]); ++i) {
                struct[k] = +struct[k] || 0;
            }

            // allow undefined days and months
            struct[2] = (+struct[2] || 1) - 1;
            struct[3] = +struct[3] || 1;

            if (struct[8] !== 'Z' && struct[9] !== undefined) {
                minutesOffset = struct[10] * 60 + struct[11];

                if (struct[9] === '+') {
                    minutesOffset = 0 - minutesOffset;
                }
            }

            timestamp = new Date(struct[1], struct[2], struct[3], struct[4], struct[5] + minutesOffset, struct[6], struct[7]).getTime();
        }
        else {
            timestamp = origParse ? origParse(date) : NaN;
        }

        return timestamp;
    };
}(Date));

function dateToDMY(date)
{
    var d = date.getDate();
    var m = date.getMonth()+1;
    var y = date.getFullYear();
    return '' + (d<=9?'0'+d:d) + '/'+ (m<=9?'0'+m:m) + '/' + y;
}

function parseDate(str){
    var tstamp = Date.parse(str);
    AnyBalance.trace('Parsed date ' + new Date(tstamp) + ' from ' + str);
    return tstamp;
}

function main(){
    var prefs = AnyBalance.getPreferences();
    if(prefs.num && !/^\d{10,}$/.test(prefs.num))
        throw new AnyBalance.Error("Введите номер телефона, по которому вы хотите получить информацию, или не вводите ничего, чтобы получить информацию по первому номеру.");

    AnyBalance.setDefaultCharset('utf-8');    

    var baseurl = 'http://goodline.ru';
    
    var info = AnyBalance.requestPost(baseurl + "/ru/abonents/entercabinet/", {
        mail:prefs.login,
        passwd:prefs.password
    });

    var error = getParam(info, null, null, /(Введите логин\/пароль для входа в систему)/i);
    if(error)
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Проверьте логин/пароль");
                        
    var result = {
        success: true
    };

    var num = prefs.num ? prefs.num : '\\d{10,}';
    var table = getParam(info, null, null, /Ваш список номеров туристических[\s\S]*?<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
    if(!table)
        throw new AnyBalance.Error("Не удалось найти список номеров!");

    var tr;
    var lines = table.split(/<\/tr>\s*<tr[^>]*>/g);
    var reNum = new RegExp('\\s*<td[^>]*>[\\s\\S]*?<\\/td>\\s*<td[^>]*>' + num + '<\\/td>', 'i');
    for(var i=0; i<lines.length; ++i){
        if(reNum.test(lines[i])){
            tr = lines[i];
            break;
        }
    }

    if(!tr)
        throw new AnyBalance.Error(prefs.num ? "Не удалось найти номер " + prefs.num : "Не удалось найти ни одного номера.");

    var number = getParam(tr, null, null, /(?:[\s\S]*?<\/td>){1}\s*<td[^>]*>([^<]*)/i, replaceTagsAndSpaces);

    getParam(tr, result, 'status', /(?:[\s\S]*?<\/td>){2}\s*<td[^>]*>([^<]*)/i, replaceTagsAndSpaces);
    getParam(tr, result, 'number', /(?:[\s\S]*?<\/td>){1}\s*<td[^>]*>([^<]*)/i, replaceTagsAndSpaces);

    var tariff_ref = getParam(tr, null, null, /'(\/tariffs.php\?onum=[^']*)/i);
    if(tariff_ref){
        html = AnyBalance.requestGet(baseurl + tariff_ref);
        getParam(html, result, '__tariff', /<tr[^>]*class="tariffs"[\s\S]*?<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    }else{
        AnyBalance.trace("Не удалось найти ссылку на тарифный план!");
    }
    
    if(AnyBalance.isAvailable('balance', 'currency')){
        var id = getParam(tr, null, null, /entercabinet\/list\/delete\/([^\.]*)\.html/i);
        if(!id)
            throw new AnyBalance.Error("Не удалось найти ссылку на информацию о балансе.");

        html = AnyBalance.requestGet(baseurl + '/ru/abonents/entercabinet/balans/get_value/?ajax=1&id=' + id, {'X-Requested-With':'XMLHttpRequest'});
        getParam(html, result, 'balance', null, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'currency', null, replaceTagsAndSpaces, parseCurrency);
    }

    if(AnyBalance.isAvailable('lastpay', 'lastpaydate')){
       var dateEnd = new Date();
       var dateStart = new Date(dateEnd.getTime() - 86400*90*1000); //Три месяца назад

       html = AnyBalance.requestPost('http://212.158.163.96/public/glcl/glcl2_cab.php', {
          started:dateToDMY(dateStart),
          finished:dateToDMY(dateEnd),
          command:'history',
          s:2,
          number:number
       });

       getParam(html, result, 'lastpaydate', /<tr[^>]*>(?:\s*<td[^>]*>[^<]*<\/td>){2}\s*<td[^>]*>([^<]*)<\/td>(?:\s*<td[^>]*>[^<]*<\/td>){4}\s*<\/tr>\s*<\/table>/i, replaceTagsAndSpaces, parseDate);
       getParam(html, result, 'lastpay', /<tr[^>]*>(?:\s*<td[^>]*>[^<]*<\/td>){4}\s*<td[^>]*>([^<]*)<\/td>(?:\s*<td[^>]*>[^<]*<\/td>){2}\s*<\/tr>\s*<\/table>/i, replaceTagsAndSpaces, parseBalance);
    }
		
    AnyBalance.setResult(result);
}

