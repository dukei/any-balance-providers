/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс BalNet.

Сайт оператора: http://balnet.ru
Личный кабинет: https://billing.balnet.ru/lk/
*/

function getParam (html, result, param, regexp, replaces, parser) {
  if (param && !AnyBalance.isAvailable (param))
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
      return value;
  }
}

var replaceTagsAndSpaces = [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];


function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://billing.balnet.ru/lk/";
    AnyBalance.setDefaultCharset('utf-8');
   
    var html = AnyBalance.requestPost(baseurl,
	{
	  login:prefs.login,
	  password:prefs.password
	});

    var error = getParam(html, null, null, /<br>\s*<p style="color:red">([\S\d\s]+)<\/p>/ig, null, null);
    if(error)
        throw new AnyBalance.Error(error);

    var result = {success: true};

  //  html = AnyBalance.requestGet(baseurl + 'ajax/mile_balance', {'X-Requested-With':'XMLHttpRequest'});

    getParam(html, result, 'balance', /Баланс<\/td>\s*[^>]+>(\d+\.?\d*)<\/td>/i, replaceFloat, parseFloat);
    getParam(html, result, 'account', /Основной лицевой счет<\/td>\s*[^>]+>(\d+)<\/td>/i, replaceTagsAndSpaces, null);
    getParam(html, result, 'credit', /Кредит<\/td>\s*[^>]+>(\d+\.?\d*)<\/td>/i, replaceFloat, parseFloat);
    getParam(html, result, 'switch', /Состояние интернета<\/td>\s*[^>]+>(\W+) .*<\/td>/i, replaceTagsAndSpaces, null);

    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}
