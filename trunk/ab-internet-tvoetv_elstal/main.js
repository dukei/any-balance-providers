/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Статус почтового отправления с сайта gdeposylka.ru

Сайт оператора: http://gdeposylka.ru
Личный кабинет: http://gdeposylka.ru
*/

function getParam (html, result, param, regexp, replaces, parser) {
	if (param && (param != '__tariff' && !AnyBalance.isAvailable (param)))
		return;

	var value = regexp.exec (html);
	if (value) {
		value = value[0];
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
	return numSize(dt.getDate(), 2) + '/' + numSize(dt.getMonth()+1, 2) + '/' + dt.getFullYear() + " " + dt.getHours() + ':' + dt.getMinutes();
}

function parseDate(str){
	AnyBalance.trace('Parsing date: ' + str);
  var matches = /(\d+)[^\d](\d+)[^\d](\d+)\s+(?:(\d+):(\d+))?/.exec(str);
  var time = 0;
  if(matches){
	time = (new Date(+matches[3], matches[2]-1, +matches[1], +matches[4], +matches[5])).getTime();
  }
  return time;
}

var replaceTagsAndSpaces = [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, ''  , /Баланс /g,'' , /Основной лицевой счет /g,'', /Кредит /g, ''];

function main(){
	var prefs = AnyBalance.getPreferences();
	var v_login = prefs.login;
	var v_pass = prefs.password; 

	baseurl = "https://stat.eltv.ru/"; 
	AnyBalance.trace('connect '+baseurl);

	var html = AnyBalance.requestPost(baseurl , {
        	login: prefs.login,
	        password: prefs.password,
        	submit: 'Продолжить'
		});

	AnyBalance.trace('trying to find data');

	var v_balance = getParam(html, null, null, /Баланс<\/td>\n<td class='utm-cell' align='left' width='50%'>([\s\S]*?)<\/td>/i,replaceTagsAndSpaces);
	AnyBalance.trace('v_balance='+v_balance);

	var v_ls = getParam(html, null, null, /Основной лицевой счет<\/td>\n<td class='utm-cell' align='left' width='50%'>([\s\S]*?)<\/td>/i,replaceTagsAndSpaces);
	AnyBalance.trace('v_ls='+v_ls);

	var v_credit = getParam(html, null, null, /Кредит<\/td>\n<td class='utm-cell' align='left' width='50%'>([\s\S]*?)<\/td>/i,replaceTagsAndSpaces);
	AnyBalance.trace('v_credit='+v_credit);


	var error = getParam(html, null, null, /<div class="errorBox"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	if(error)
		throw new AnyBalance.Error(error);
	error = getParam(html, null, null, /<span class="error"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	if(error)
		throw new AnyBalance.Error(error);
	
	var result = {success: true};

	if(AnyBalance.isAvailable('balance'))
		result.balance = v_balance;
		result.ls = v_ls;
		result.credit = v_credit;

	AnyBalance.setResult(result);
}
