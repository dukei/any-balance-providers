/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и значения счетчиков по лицевым счетам, привязанным к карте Система Город.

Сайт оператора: много
Личный кабинет: много
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

var supported_cards = {
   '990005000': uralsib, //Система ГОРОД Башкортостан, Ижевск, Кемерово, Екатеринбург и др.
   '990002': function(prefix){redirect(prefix, 'Челябинск');},
   '990006': function(prefix){redirect(prefix, 'Алтайский край');}
};

function main(){
    var prefs = AnyBalance.getPreferences();

    if(!prefs.login || !/^\d+$/.test(prefs.login))
        throw new AnyBalance.Error("Введите полный номер карты Системы Город. Только цифры без пробелов и разделителей.");
    
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

    AnyBalance.setCookie('oplata.uralsibbank.ru', 'TS01db9e9f_28', '01403d4e06e826537cf8c80504ddcf44915dbf3b1bd97b8b2b6a1f9e4452726e8c9699f8046546440e57a9397486c29f669072f021');
    AnyBalance.setCookie('oplata.uralsibbank.ru', 'TS01db9e9f', '0118f3d0af0d378be4bc2bcfa4f89939b3fef03015c8d1d1993ffdde052ac300893af8547cd62d73686b3ee36bc96c40b3d8a647ef8b41015a6d1846bcf867ca5ac1330ba5e04cd8e302139565e26ebec104cfaa149789b2cfd2a17a51ca439efeb2b335bce23cd21cb8e73bd5730a21e10becbdc6');
    var csrt = '633068871708536467';
    
    var html = AnyBalance.requestGet(baseurl + "gorod_login.asp");
    
    html = AnyBalance.requestPost(baseurl + 'gorod_login.asp?csrt=' + csrt, {
        CARDNUMBER:login,
        PSW:prefs.password,
        CustomerLogin:'real'
    }, addHeaders({Referer: baseurl + "gorod_login.asp" }));
    
    var table = AB.getElement(html, /<table[^>]*?name="acclist"/i);

    if(!table){
        var error = getParam(html, null, null, /<\/noscript\s*>\s*<p[^>]+?class="errorb"[^>]*>\s*(?:<b>ВНИМАНИЕ:?<\/b>)?\s*([^<]+)/i, replaceTagsAndSpaces);
        if(error) {
            throw new AnyBalance.Error(error, false, /Карта\s+не\s+зарегистрирована|Неверный\s+ПИН/i.test(error));
        }
        AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    
    var prefsAccnum = prefs.accnum && prefs.accnum.toUpperCase();
    var prefsAccname = prefs.accname && prefs.accname.toUpperCase();
    
    function getAccnum(cells) {
        return getParam(cells[2], null, null, null, AB.replaceTagsAndSpaces);
    }
    function getAccname(cells) {
        return AB.getElement(cells[1], /<b\b/i, AB.replaceTagsAndSpaces);
    }
    
    var trs = AB.getElements(table, /<tr[^>]*>(?=\s*<td)/ig);
    var tr = null;
    
    for (var i = 0; i < trs.length; ++i) {
        var cells = AB.getElements(trs[i], /<td/ig);
        if (prefsAccnum) {
            var accnum = getAccnum(cells);
            if (accnum && accnum.toUpperCase().indexOf(prefsAccnum) >= 0) {
                tr = cells;
                break;
            }
        } else {
            if (prefsAccname) {
                var accname = getAccname(cells);
                if (accname && accname.toUpperCase().indexOf(prefsAccname) >= 0) {
                    tr = cells;
                    break;
                }
            } else {
                tr = cells;
                break;
            }
        }
    }
    
    if (tr) {
        getParam(tr[0], result, 'fio', /<b\b[^>]*>([^<]+)/i, replaceTagsAndSpaces);
        getParam(tr[0], result, 'address', /<br[^>]*>([^<]+)/i, replaceTagsAndSpaces);
        getParam(getAccname(tr), result, 'service');
        getParam(getAccname(tr), result, '__tariff');
        getParam(tr[1], result, 'provider', /<br[^>]*>([^<]+)/i, AB.replaceTagsAndSpaces);
        getParam(getAccnum(tr), result, 'accnum');
        getParam(tr[4], result, 'balance', /<font[^>]*>([^<]+)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    } else {
        var causes = [];
        if(prefs.accnum)
            causes[causes.length] = "номер которого содержит \"" + prefs.accnum + '"';
        if(prefs.accname)
            causes[causes.length] = "название услуги которого содержит \"" + prefs.accname + '"';
        throw new AnyBalance.Error(causes.length==0 ? "Не найдено ни одного лицевого счета!" : "Не найдено лицевого счета, " + causes.join(' и ')); 
    }

    AnyBalance.setResult(result);
}

function redirect(prefix, city){
    throw new AnyBalance.Error('Для карт, начинающихся на ' + prefix + ' установите провайдер Система Город (' + city + ')');
}
