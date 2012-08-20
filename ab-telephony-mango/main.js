 /**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Манго-офис IP-телефония - удобные облачные коммуникации для бизнеса любого масштаба
Сайт оператора: http://www.mango-office.ru/
Личный кабинет: https://issa.mangotele.com
*/

function getParam (html, result, param, regexp, replaces, parser) {
	if (param && (param != '__tariff' && !AnyBalance.isAvailable (param)))
		return;

	var value = regexp.exec (html);
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

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');    

    var baseurl = 'https://issa.mangotele.com';
    
    var info = AnyBalance.requestPost(baseurl + "/ics/auth", {
        'auth-type':'mo',
        username:prefs.login,
        password:prefs.password
    });

    if(!getParam(info, null, null, /\/ics\/auth\/(logout)/i)){
        var error = getParam(info, null, null, /<div[^>]*class="b-error-message[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Сайт изменен?");
    }
     
    var result = {
        success: true
    };

    var prodid;
    var already_selected;
    if(prefs.prodid){
        var product_sel = getParam(info, null, null, /<select[^>]*id="head_fiacc_dtl_id"[^>]*>([\s\S]*?)<\/select>/i) || '';
        var options = product_sel.split(/<\/option>/i);
        for(var i=0; i<options.length; ++i){
            if(options[i].indexOf('№' + prefs.prodid) >= 0){
                prodid = getParam(options[i], null, null, /<option[^>]*value="([^"]*)/i);
                already_selected = getParam(options[i], null, null, /<option[^>]*(selected)/i)
                break;
            }
        }
    }

    if(prefs.prodid && !prodid)
        throw new AnyBalance.Error("Не удаётся найти продукт №" + prefs.prodid);

    if(prodid && !already_selected)
        info = AnyBalance.requestGet(baseurl + '/ics/update-state/set-acc-dtl/acc-dtl/' + prodid);

    getParam(info, result, 'licschet', /<td[^>]*class="account">([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(info, result, 'product', /<td[^>]*class="b-balance-product">([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(info, result, '__tariff', /<td[^>]*class="b-balance-product">[\s\S]*?<\/td>\s*<td[^>]*>([\s\S]*?)<ul>/i, replaceTagsAndSpaces);
    getParam(info, result, 'incline', /Внешняя линия:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(info, result, 'balance', /Остаток на счете[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(info, result, 'freespace', /<th>Свободно[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		
    AnyBalance.setResult(result);
}

