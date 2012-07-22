/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и значения счетчиков по лицевым счетам, привязанным к карте Система Город.

Сайт оператора: много
Личный кабинет: много
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

var replaceTagsAndSpaces = [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function parseBalance(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

var supported_cards = {
   '990005000': uralsib //Система ГОРОД Башкортостан, Ижевск, Кемерово, Екатеринбург и др.
};

function main(){
    var prefs = AnyBalance.getPreferences();

    if(!prefs.login || !/^\d+$/.test(prefs.login))
        throw new AnyBalance.Error("Введите полный номер карты Системы Город. Только цифры без пробелов и разделителей.");
    
    if(prefs.accnum && !/^\d{8,}$/.test(prefs.accnum))
        throw new AnyBalance.Error("Введите полный номер лицевого счета, по которому вы хотите получить информацию, или не вводите ничего, если хотите получить информацию по первому счету.");

    for(var prefix in supported_cards){
        if(prefs.login.indexOf(prefix) == 0){
            supported_cards[prefix](prefix);
            break;
        }
    }

    if(!AnyBalance.isSetResultCalled())
        throw new AnyBalance.Error("Карта с номером " + prefs.cardnum + " пока не поддерживается этим провайдером. Пожалуйста, напишите автору провайдера по e-mail dco@mail.ru для добавления вашей карты.");
}

function uralsib(prefix){
    var prefs = AnyBalance.getPreferences();
    var login = prefs.login.substr(prefix.length);

    var baseurl = "https://oplata.uralsibbank.ru/";
    var html = AnyBalance.requestPost(baseurl + "gorod_login.asp", {
        CARDNUMBER:login,
        PSW:prefs.password,
        CustomerLogin:'real'
    });

    if(!getParam(html, null, null, /(ИНФОРМАЦИЯ ПО КАРТЕ)/i)){
      var error = getParam(html, null, null, /<p[^>]*style=['"]color:\s*#cc0000;['"][^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
      if(error)
          throw new AnyBalance.Error(error);
      throw new AnyBalance.Error("Не удалось войти в личный кабинет по неизвестной причине");
    }

    var schet = prefs.accnum || "\\d{9}";

    var result = {success: true};

    var tr = getParam(html, null, null, new RegExp('ИНФОРМАЦИЯ ПО КАРТЕ[\\s\\S]*?(<tr[^>]*>(?:\\s*<td[^>]*>[\\s\\S]*?<\\/td>){2}\\s*<td[^>]*>\\s*<nobr>' + schet + '[\\s\\S]*?<\\/tr>)', 'i'));
    if(!tr)
        throw AnyBalance.Error(prefs.accnum ? "Не найдено ни одного лицевого счета!" : "Не найдено лицевого счета №" + schet); 

    getParam(tr, result, 'balance', /(?:[\s\S]*?<\/td>\s*<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'balance_total', /Итого задолженностей:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'fio', /<td[^>]*>([\s\S]*?)<br/i, replaceTagsAndSpaces);
    getParam(tr, result, 'address', /<td[^>]*>[\s\S]*?<br[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, 'service', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<br/i, replaceTagsAndSpaces);
    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<br/i, replaceTagsAndSpaces);
    getParam(tr, result, 'provider', /(?:[\s\S]*?<td[^>]*>){2}[\s\S]*?<br[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, 'accnum', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<br[^>]*>/i, replaceTagsAndSpaces);

    if(AnyBalance.isAvailable('strah', 'strah_ok', 'cold', 'hot', 'gas', 'gas_heat', 'heat', 'electr', 'electr_day', 'electr_night')){
        var ref = getParam(tr, null, null, /"(gorod_acc_info[^"]*)/i);
        if(!ref)
            throw AnyBalance.Error("Не удаётся найти ссылку на подробную информацию о счете!");

        html = AnyBalance.requestGet(baseurl + ref);
        
        getParam(html, result, 'strah', /Сумма страхового взноса:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'strah_ok', /Согласие на страхование:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
        getParam(html, result, 'cold', /Холодная вода[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'hot', /Горячая вода[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'gas', /Газ.Нач.показание:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'gas_heat', /Газ\+Газ.отопление.Нач.показание:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'heat', /Газовое отопление.Нач.показание:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'electr', /Эл\/энергия.Нач.показания:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'electr_day', /Эл\/энергия\s*\(ДЕНЬ\).Нач.показания:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'electr_night', /Эл\/энергия\s*\(НОЧЬ\).Нач.показания:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    }

    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

