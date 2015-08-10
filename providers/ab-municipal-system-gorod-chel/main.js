/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и значения счетчиков по лицевым счетам, привязанным к карте Система Город (Челябинск).

Сайт оператора: https://gorod74.ru/
Личный кабинет: https://gorod74.ru/
*/

var supported_cards = {
   '990002': chelyab //Система ГОРОД Челябинск
};

function main(){
    var prefs = AnyBalance.getPreferences();

    if(!prefs.login || !/^\d{16}$/.test(prefs.login))
        throw new AnyBalance.Error("Введите полный номер карты Системы Город. Только цифры без пробелов и разделителей.");
    
//    if(prefs.accnum && !/^\d+$/.test(prefs.accnum))
//        throw new AnyBalance.Error("Введите полный номер лицевого счета, по которому вы хотите получить информацию, или не вводите ничего, если хотите получить информацию по первому счету.");

    for(var prefix in supported_cards){
        if(prefs.login.indexOf(prefix) == 0){
            supported_cards[prefix](prefix);
            break;
        }
    }

    if(!AnyBalance.isSetResultCalled())
        throw new AnyBalance.Error("Карта с номером " + prefs.cardnum + " не поддерживается этим провайдером. Попробуйте общий провайдер \"Система Город\".");
}

function chelyab(prefix){
    var prefs = AnyBalance.getPreferences();
    var zeroes = prefs.login.substr(6, 4);
    var num = prefs.login.substr(10);

    var baseurl = "https://gorod74.ru/";
    if(!prefs.__dbg){
        var html = AnyBalance.requestPost(baseurl + "gorod/zadolzh/auth.jsp", {
            pan1:zeroes,
            pan2:num,
            usr: prefs.surname,
            pin:prefs.password
        });
    }else{
        var html = AnyBalance.requestGet(baseurl + "gorod/zadolzh/debts.jsp");
    }

    if(!/"end.jsp"/i.test(html)){
      var error = getParam(html, null, null, /<p[^>]*align=['"]center['"][^>]*>Уважаемый абонент!((?:[\s\S]*?<\/p>){2})/i, replaceTagsAndSpaces, html_entity_decode);
      if(error)
          throw new AnyBalance.Error(error);
      throw new AnyBalance.Error("Не удалось войти в личный кабинет по неизвестной причине. Сайт изменен?");
    }

    var schet = prefs.accnum || "\\d+";

    var result = {success: true};

    var re = /<tr[^>]*>(?:\s*<td[^>]*>(?:[\s\S](?!<t))*<\/td>){2}\s*<td[^>]*>\s*\d+[\s\S]*?<\/tr>/ig;
    html.replace(re, function(tr){
        if(AnyBalance.isSetResultCalled())
            return; //Если уже вернули результат, то дальше крутимся вхолостую

        var accnum = (prefs.accnum || '').toUpperCase();
        var name = getParam(tr, null, null, /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<br/i, replaceTagsAndSpaces, html_entity_decode);
        var acc = getParam(tr, null, null, /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<br/i, replaceTagsAndSpaces, html_entity_decode);
        if(!prefs.accnum || 
            (name && name.toUpperCase().indexOf(accnum) >= 0) ||
            (acc && acc.toUpperCase().indexOf(accnum) >= 0)){

        
            getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
            getParam(tr, result, '2pay', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
            getParam(html, result, 'balance_total', /ЗАДОЛЖЕННОСТЬ:([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
            getParam(html, result, '2pay_total', /ЗАДОЛЖЕННОСТЬ:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
            getParam(tr, result, 'fio', /<td[^>]*>([\s\S]*?)<br/i, replaceTagsAndSpaces, html_entity_decode);
            getParam(tr, result, 'address', /<td[^>]*>[\s\S]*?<br[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
            getParam(tr, result, 'service', /(?:[\s\S]*?<td[^>]*>){2}(?:(?:[\s\S](?!<br))*:)?([\s\S]*?)<br/i, replaceTagsAndSpaces, html_entity_decode);
            getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<br/i, replaceTagsAndSpaces, html_entity_decode);
            getParam(tr, result, 'provider', /(?:[\s\S]*?<td[^>]*>){2}[\s\S]*?<br[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
            getParam(tr, result, 'accnum', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
 
            AnyBalance.setResult(result);
            return;
        }
    });

    if(!AnyBalance.isSetResultCalled())
        throw new AnyBalance.Error(!prefs.accnum ? "Не найдено ни одного лицевого счета!" : "Не найдено лицевого счета, содержащего текст " + schet); 
}
