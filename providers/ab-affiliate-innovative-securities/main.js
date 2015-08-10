/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у Innovative Securities

Сайт оператора: https://www.innovativesecurities.com
Личный кабинет: https://www.innovativesecurities.com
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://www.innovativesecurities.com/";

    var html = AnyBalance.requestPost(baseurl + 'loginclient.php', {
	username:prefs.login,
	password:prefs.password,
	submit:''
    });

    if(!/logout.php/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+reason_message[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode); 
        if(error){
            throw new AnyBalance.Error(error);
        }
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    html = AnyBalance.requestGet(baseurl + 'details.php');
    
    var result = {success: true};
    getParam(html, result, 'fio', /<div[^>]+class="details_info"[\s\S]*?<font[^>]*>([\s\S]*?)<\/font>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /(?:Продукт|Product|Produkt):([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'acc', /(?:Номер счёта|Account number|Kontonummer):([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);

    getParam(html, result, 'balance', /(?:Баланс инвестиции|Investment Balance|Investitionssaldo):[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'rs', /(?:Расчётный счёт|Charge Balance|Verrechnungskonto):[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'credit', /(?:Кредитный баланс|Credit Balance|Kreditsaldo):[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'avail', /(?:Доступный баланс для транзакции|Available Balance for Transaction|Verfügbarer Saldo für Transaktion):[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}
