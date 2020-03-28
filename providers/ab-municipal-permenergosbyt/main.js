/**
Показания счетчика Пермэнергосбыт (http://any-balance-providers.googlecode.com)

Получает баланс на счету оплаты электроэнергии

Operator site: http://permenergosbyt.ru/
Личный кабинет: http://lk.permenergosbyt.ru/
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.99 Safari/537.36'
};

function redirectIfNeeded(html){
    if(/document.forms\[0\].submit/i.test(html)){
    	AnyBalance.trace('Потребовался редирект формой...');
    	var params = createFormParams(html);
    	var action = getParam(html, /<form[^>]+action=['"]([^'"]*)/, replaceHtmlEntities);
    	var url = AnyBalance.getLastUrl();
    	html = AnyBalance.requestPost(joinUrl(url, action), params, addHeaders({Refefer: url}));
    }
    var redir = getParam(html, /<meta[^>]+http-equiv="REFRESH"[^>]*content="0;url=([^";]*)/i, replaceHtmlEntities);
    if(redir){
    	AnyBalance.trace('Потребовался get редирект...');
    	var url = AnyBalance.getLastUrl();
    	html = AnyBalance.requestGet(joinUrl(url, redir), addHeaders({Refefer: url}));
    }
    return html;
}

function main(){
    var prefs = AnyBalance.getPreferences();
	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.phone, 'Введите телефон!');

    var baseurl = "https://lk.permenergosbyt.ru/";

    AnyBalance.setDefaultCharset('utf-8');

    var html = AnyBalance.requestPost(baseurl + 'personal/show', {
        "action": 'login',
        "login": prefs.login,
        "phone": prefs.phone
    }, addHeaders({Referer: baseurl + 'personal/show'}));
    html = redirectIfNeeded(html);

    var form = getElement(html, /<form[^>]+(?:name="auth")/i);
    var reAccount = /Лицевой счёт\: (\d+)/i;

    if (form || !/action="logout"/i.test(html), !reAccount.test(html)) {
        var error = getElement(html, /<div[^>]+(?:alert)/i, replaceTagsAndSpaces);
        if (error)
            throw new AnyBalance.Error('Не удалось войти в личный кабинет. ' + error.replace('×', ''));
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    // Получим список лицевых счетов
    /* Вообще-то список уже есть на странице, но там только id, номер, ФИО
       А на странице со списком ЛС ещё есть адрес и вид услуги (типа, тариф) */
    html = AnyBalance.requestGet(baseurl + 'personal/show?action=new_incdec', g_headers);
    var table = getElement(html, /<div[^>]+(?:id="related-acc-list")/i);

    var rows = getElements(table, /<div[^>]+(?:class="[^"]+ie-block")/ig);
    AnyBalance.trace('Найдено ' + rows.length + ' ЛС.');

    if (rows.length < 1) {
        throw new AnyBalance.Error('У вас нет ни одного лицевого счета!');
    }

    var current_account;
    for (var i = 0; i < rows.length; i++) {
        var account_number = getElement(rows[i], /<span class="text-big"/i, replaceTagsAndSpaces);
        AnyBalance.trace(account_number);
        if (!current_account && (!prefs.num || endsWith(account_number, prefs.num))) {
            AnyBalance.trace('Выбран ' + account_number);
            current_account = {'account_number': account_number};
            current_account.acc_id = rows[i].match(/<button[^>]+data-account="(\d+)"/i)[1];
            let matches = rows[i].matchAll(/<strong>([^<]+)<\/strong>\s*<span>([^<]+)<\/span>/ig);
            for (const match of matches) {
                if (match[1] == 'ФИО ') {
                    current_account.fio = match[2];
                }
                if (match[1] == 'Адрес ') {
                    current_account.address = match[2];
                }
                if (match[1] == 'Вид услуги ') {
                    current_account.service = match[2];
                }
            }
        }
    }

    if(!current_account) {
        throw new AnyBalance.Error('Не удалось найти лицевой счет с последними цифрами ' + prefs.num);
    }

    // Переход к нужному лицевому счёту
    var xhr = AnyBalance.requestPost(baseurl + 'bb/ShowProc2/web.lk_account_related', {
        go_lk_acc_id: current_account.acc_id
    }, {'X-Requested-With': 'XMLHttpRequest'});

    html = AnyBalance.requestGet(baseurl + 'personal/show?account=info', g_headers);

    var result = {success: true};

    result.__tariff = current_account.service;
    result.account = current_account.account_number;

    // Не учитывает положительный баланс (переплату)
    // result.balance = -getParam(html, null, null, /<tr[^>]+class="tr-pay-total"+>.*?<\/tr>/i, replaceTagsAndSpaces, parseBalance);
    // Возьмём сумму из модального окна "Детальная информация"
    var table = getElement(html, /<div[^>]+id="modal-help-balance"[^>]+>.*(<table.*<\/table>)/i);
    var trs = getElements(table, /<tr>(.*)<\/tr>/ig);
    result.balance = 0;
	for (var i = 0; i < trs.length; i++) {
        result.balance += getParam(trs[i], null, null, '', [replaceTagsAndSpaces, /задолженность/i, '-', /переплата/i, ''], parseBalance);
	}
    result.fio = current_account.fio;
    result.address = current_account.address;

    getParam(html, result, 'phone', /<p><strong>Телефон\: <\/strong>(.*?)<\/p>/i, replaceTagsAndSpaces);
    getParam(html, result, 'date', /alert.*?\:\s+(.+?)<\/strong>/i, replaceTagsAndSpaces, parseDate);

    //Возвращаем результат
    AnyBalance.setResult(result);
}
