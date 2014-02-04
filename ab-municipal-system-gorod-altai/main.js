/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и значения счетчиков по лицевым счетам, привязанным к карте Система Город (Челябинск).

Сайт оператора: http://www.sistemagorod.ru
Личный кабинет: https://www.sistemagorod.ru/lk/
*/

var supported_cards = {
   '990006': altai //Система ГОРОД Алтайский край
};

var g_headers = {
    Accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Cache-Control':'max-age=0',
    Connection:'keep-alive',
    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36'
};

function main(){
    var prefs = AnyBalance.getPreferences();

    if(!prefs.login || !/^\d{16}$/.test(prefs.login))
        throw new AnyBalance.Error("Введите полный номер карты Системы Город. Только цифры без пробелов и разделителей.", null, true);
    
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

function altai(prefix){
    var prefs = AnyBalance.getPreferences();
    var pan = prefs.login.substr(6);
    checkEmpty(prefs.password, 'Введите ПИН.');

    var accnumRe;
    if(prefs.accnum){
        var matches = prefs.accnum.match(/^~((?:[^~\\]|\\.)*)~(\w*)$/);
        if(matches){
            try{
                accnumRe = new RegExp(matches[1].replace(/\\~/g, '~'), matches[2]);
            }catch(e){
                throw new AnyBalance.Error('Ошибка регулярного выражения (' + e.message + '): ' + prefs.accnum, null, true);
            }
        }
    }

    var baseurl = "https://www.sistemagorod.ru/lk/";
    AnyBalance.requestGet(baseurl, g_headers);

    var html = AnyBalance.requestPost(baseurl + "auth", {
        typeAuth:'card',
        'answer-captcha':'',
        pan:pan,
        pin: prefs.password
    }, g_headers);

    if(!/<state>ok<\/state>/i.test(html)){
      var error = getParam(html, null, null, /<error>([\s\S]*?)<\/error>/i, replaceTagsAndSpaces, html_entity_decode);
      if(error)
          throw new AnyBalance.Error(error, null, /Неверный логин, либо пароль/i.test(error));
      throw new AnyBalance.Error("Не удалось войти в личный кабинет по неизвестной причине. Сайт изменен?");
    }

    html = AnyBalance.requestGet(baseurl, g_headers);

    var result = {success: true};

    var table = getParam(html, null, null, /<table[^>]+serv-table[^>]*>([\s\S]*?)<\/table>/i);
    if(!table)
        throw new AnyBalance.Error('Не найдена таблица услуг.');

    var re = /<tr[^>]+info_tr[^>]*>(?:[\s\S](?!\/tr>))*<\/tr>/ig;
    html.replace(re, function(tr){
        if(AnyBalance.isSetResultCalled())
            return; //Если уже вернули результат, то дальше крутимся вхолостую

        var accnum = (prefs.accnum || '').toUpperCase();
        var name = getParam(tr, null, null, /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        var acc = getParam(tr, null, null, /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        if(!prefs.accnum || 
            (!accnumRe && name && name.toUpperCase().indexOf(accnum) >= 0) ||
            (accnumRe && name && accnumRe.test(name)) ||
            (!accnumRe && acc && acc.toUpperCase().indexOf(accnum) >= 0) ||
            (accnumRe && acc && accnumRe.test(acc))){

            getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
			getParam(tr, result, 'last_payment', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
            getParam(tr, result, 'address', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
            getParam(tr, result, 'service', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
            getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
            getParam(tr, result, 'accnum', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
 
			//
            getParam(html, result, '2pay_total', /Общая сумма задолженности:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

			/*getParam(html, result, 'jil_plus', /ЖИЛ-КОММ. УСЛУГИ \+(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)р./i, replaceTagsAndSpaces, parseBalance);
			getParam(html, result, 'electricity', /ЭЛ\. ЭНЕРГИЯ(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)р./i, replaceTagsAndSpaces, parseBalance);
			getParam(html, result, 'telecom', /УСЛУГИ СВЯЗИ(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)р./i, replaceTagsAndSpaces, parseBalance);*/

            AnyBalance.setResult(result);
            return;
        }
    });

    if(!AnyBalance.isSetResultCalled())
        throw new AnyBalance.Error(!prefs.accnum ? "Не найдено ни одного лицевого счета!" : "Не найдено лицевого счета, содержащего текст " + prefs.accnum); 
}
