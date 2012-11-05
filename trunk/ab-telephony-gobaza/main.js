 /**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

GoBaza - виртуальная атс
Сайт оператора: http://www.gobaza.ru
Личный кабинет: https://go2baza.cnt.ru/cnt/

*/

function getParam (html, result, param, regexp, replaces, parser) {
	if (param && (param != '__tariff' && !AnyBalance.isAvailable (param)))
		return;

	var value = regexp ? regexp.exec (html) : html;
	if (value) {
                if(regexp)
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

var replaceTagsAndSpaces = [/&nbsp;/ig, ' ', /<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, '', /^"+|"+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.', /(\d)\-(\d)/g, '$1.$2'];

function parseBalance(text){
    var _text = text.replace(/\s+/g, '');
    var val = getParam(_text, null, null, /(-?\d[\d\.,\-]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function parseCurrency(text){
    var _text = text.replace(/\s+/g, '');
    var val = getParam(_text, null, null, /[\d\.,\-]+(\S*)/);
    AnyBalance.trace('Parsing currency (' + val + ') from: ' + text);
    return val;
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('windows-1251');    

    var baseurl = "https://go2baza.cnt.ru/cnt/";
    
    var html = AnyBalance.requestPost(baseurl + 'login', {
        message:'',
	Name:prefs.login,
	Password:prefs.password,
        submit: 'Войти!'
    });

    var gt = getParam(html, null, null, /<form[^>]+id='goto'[^>]*action='([^']*)/i);
    if(gt){
        html = AnyBalance.requestPost(baseurl + gt, {
            j_username: 'user',
            j_password: ''
        });
    }

    if(!/report\.jsp/i.test(html)){
        var error = getParam(html, null, null, /<input[^>]+name="message"[^>]*value="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    html = AnyBalance.requestGet(baseurl + 'report.jsp');

    var dt = new Date();
    var today = dt.getDate() + '.' + (dt.getMonth()+1) + '.' + dt.getFullYear();
    html = AnyBalance.requestPost(baseurl + 'report', {
        begin_date:today,
        qty_on_page:30,
        offset:'',
        end_date:today
//        ,make_report:'Сформировать'
    });
    
    var result = {
        success: true
    };

    getParam(html, result, 'balance', /Остаток на счете:([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'mins_total', /Общий счетчик[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'mins_left', /Общий счетчик(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /Здравствуйте,([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		
    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

