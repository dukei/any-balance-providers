/**
AnyBalance Provider (http://any-balance-providers.googlecode.com)

Current balance in Lebara Móvil (Spain).

Provider site: https://www.lebara.es
Personal account: https://www.lebara.es/dashboard
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

var replaceTagsAndSpaces = [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, '', /^"+|"+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function parseBalance(text){
    var _text = text.replace(/\s+/g, '');
    var val = getParam(_text, null, null, /(-?\d[\d\.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function main(){
    var prefs = AnyBalance.getPreferences();

     var baseurl = 'https://www.lebara.es/view/';

    AnyBalance.trace("Trying to enter at address: " + baseurl);

    if(!prefs.__dbg){
        var html = AnyBalance.requestPost(baseurl + "LoginComponentController?targetUrl=/view/content/pl_dashboardLoggedin&", {
        	loginId: prefs.login,
            password: prefs.password
        });
    }else{
        var html = AnyBalance.requestGet(baseurl + "content/pl_dashboardLoggedin");
    }
    
    if(!/\/view\/LogoutController/.test(html)){
        var error = getParam(html, null, null, /<ul[^>]+id="[^"]*errors"[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Can not log in. Wrong login or password or site might be changed.');
    }
    

    var result = {success: true};
    
    getParam(html, result, '__tariff', /<option[^>]+selected[^>]*>\s*(\d+[^<]*)/i, replaceTagsAndSpaces);

    if(AnyBalance.isAvailable('balance')){
        html = AnyBalance.requestGet(baseurl + 'DashboardComponentController?compUid=cmp_dashboard');
        getParam(html, result, 'balance', /(?:Tu saldo|Your balance):([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    }

    AnyBalance.setResult(result);
}

function parseTime(date){
    AnyBalance.trace("Trying to parse date from " + date);
    var dateParts = date.split(/[\.\/]/);
    var d = new Date(dateParts[2], (dateParts[1] - 1), dateParts[0]);
    return d.getTime();
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

