var g_headers = {
    'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36'
};

function main() {
    function getCurrentMonth() {
        var dt = new Date();
        var months = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
        return months[dt.getMonth()] + ' ' + dt.getFullYear();
    }

    AnyBalance.setDefaultCharset('utf-8');

    var API = {
        'accounts': 'https://api.portalgkh.com/v1/accounts',
        'billing': 'https://api.portalgkh.com/v1/accounts/{account_id}/billing',
        'card': 'https://api.portalgkh.com/v1/accounts/{account_id}/card',
        'login': 'https://api.portalgkh.com/v1/users/login'
    };
    var result = {success: true};
    var prefs = AnyBalance.getPreferences();

    checkEmpty(prefs.email, 'Не задан email');
    checkEmpty(prefs.password, 'Не задан пароль');

    var credentials = {login: prefs.email, password: prefs.password};
    var loginResult = getJson(AnyBalance.requestPost(API.login, credentials, g_headers));

    if (loginResult.status === 'error') {
        throw new AnyBalance.Error(loginResult.message);
    }

    var headers = {'Authorization': 'Bearer ' + loginResult.token};

    var account = getJson(AnyBalance.requestGet(API.accounts, headers));
    // TODO: выбор лицевого счета.
    account = account[0];
    var accountId = account.accountId;

    var cardUrl = replaceAll(API.card, ['{account_id}', accountId]);
    var card = getJson(AnyBalance.requestGet(cardUrl, headers));

    var billingUrl = replaceAll(API.billing, ['{account_id}', accountId]);
    var billing = getJson(AnyBalance.requestGet(billingUrl, headers));

    var uk = billing[0];
    var gvs = billing[1];

    result.account = account.accountNumber;
    result.owner = account.owner;
    result.company = card.company;
    result.opened = parseDate(card.openDate);
    result.address = card.address;
    result.phone = card.phone;
    result.type = card.type;
    result.current_period = getCurrentMonth();
    result.uk_accrued = parseBalance(uk.toPay.toFixed(2));
    result.uk_paid = parseBalance(uk.payd.toFixed(2));
    result.uk_to_pay = parseBalance(uk.totalDebt.toFixed(2));
    result.gvs_accrued = parseBalance(gvs.toPay.toFixed(2));
    result.gvs_paid = parseBalance(gvs.payd.toFixed(2));
    result.gvs_to_pay = parseBalance(gvs.totalDebt.toFixed(2));
    result.to_pay = parseBalance((result.uk_to_pay + result.gvs_to_pay).toFixed(2));

    AnyBalance.setResult(result);
}
