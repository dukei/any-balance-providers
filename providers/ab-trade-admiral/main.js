 /**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Zebra Telecom Телефония
Сайт оператора: http://www.zebratelecom.ru
Личный кабинет: http://www.zebratelecom.ru/cabinet/

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

var replaceTagsAndSpaces = [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, '', /^"+|"+$/g, ''];
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

var MAX_ACCOUNTS = 4;

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');    

    var baseurl = "https://tr.admiralmarkets.com/index/auth";
    
    var html = AnyBalance.requestPost(baseurl, {
        formName:'Auth_Index_Login',
	Username:prefs.login,
	Password:prefs.password,
        submitButton:'Войти'
    });

    var error = getParam(html, null, null, /<ul[^>]*class="errors"[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces);
    if(error)
        throw new AnyBalance.Error(error);
  
    error = getParam(html, null, null, /<div[^>]*class="general-error"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
    if(error)
        throw new AnyBalance.Error(error);

    
    var result = {
        success: true
    };

    var accounts = [];
    html.replace(/<tr[^>]*accountId="\d+"[\s\S]*?<\/tr>/ig, function(acctext){
        accounts[accounts.length] = acctext;
        return acctext;
    });

    var accnums = prefs.accs && prefs.accs.split(/[^\d]+/g);
    if(accnums && !accnums[0]) accnums = null;
    if(accnums && accnums.length > MAX_ACCOUNTS)
        throw new AnyBalance.Error("Вы можете указать не более " + MAX_ACCOUNTS + " номеров счетов!");

    var found_accnums = {};
    for(var i=0; accnums && i<accnums.length; ++i){
        found_accnums['a'+accnums[i]] = false;
    }

    var result = {success: true};

    var found = 0;
    var all_accs = [];
    for(var i=0; i<accounts.length; ++i){
        var text = accounts[i];
        var accnum = getParam(text, null, null, /<tr[^>]*accountId="(\d+)/i);
        var ind = -1;
        if((!accnums && found < MAX_ACCOUNTS) || (accnums && (ind = accnums.indexOf(accnum))) >= 0){
            if(ind < 0) ind = found;
            var suffix = ind ? ind : '';
            getParam(text, result, 'currency' + suffix, /<tr[^>]*currencyId="([^"]+)/i);
            getParam(text, result, 'type' + suffix, /<span[^>]*class="type"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
            getParam(text, result, 'accnum' + suffix, /<span[^>]*class="num"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
            all_accs[all_accs.length] = getParam(text, null, null, /<span[^>]*class="num"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
            getParam(text, result, 'balance' + suffix, /<span[^>]*class="sum"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
            getParam(text, result, 'leverage' + suffix, /<span[^>]*class="leverage"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
            found_accnums['a' + accnum] = true;
            ++found;
        }
    }

    if(all_accs.length)
        result.__tariff = all_accs.join(', ');

    var found_any = false;
    var not_found_nums = [];
    for(var accId in found_accnums){
        if(found_accnums[accId])
            found_any = true;
        if(!found_accnums[accId])
            not_found_nums[not_found_nums.length] = accId.substr(1);
    }

    if(!found_any)
        throw new AnyBalance.Error('Не найдено ни одного счета!');

    if(not_found_nums.length > 0)
        AnyBalance.trace('Не найдены счет (счета) №' + not_found_nums);
		
    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

