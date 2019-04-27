/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var baseurl = "https://my.ipnet.ua/";

var g_headers = {
    Accept: 'application/json, text/plain, */*',
    Origin: 'https://my.ipnet.ua',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36',
    'Content-Type': 'application/json;charset=UTF-8',
    Referer: baseurl,
    'Accept-Language': 'ru,en-US;q=0.8,en;q=0.6'
}

function callApi(verb, params){
    var html = AnyBalance.requestPost(baseurl + 'api/v2/' + verb, params ? JSON.stringify(params) : '', addHeaders(g_headers), {HTTP_METHOD: params ? 'POST' : 'GET'});

    return getJson(html);
}

var g_errors = {
    LOGIN_USER_NOT_FOUND: 'Невірний логін чи пароль!',
};

function throwError(json){
    var error = json.errors || json.message;
    if(error)
        throw new AnyBalance.Error(g_errors[error] || error, null, /USER_NOT_FOUND/i.test(error));

    AnyBalance.trace(JSON.stringify(json));
    throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://my.ipnet.ua/";

    var json = callApi('account/login/', {
        agg_id: prefs.login,
        password: hex_md5(prefs.password)
    });

    if(!json.data.token){
        throwError(json);
    }

    var parts = json.data.token.split(/\./g);
    var part1 = getJson(Base64.decode(parts[0]).replace(/\x00/g, ''));
    var part2 = getJson(Base64.decode(parts[1]).replace(/\x00/g, ''));

    var type = part1.typ;
    var user_id = part2.user_id;

    g_headers.Authorization = type + ' ' + json.data.token;

    var result = {success: true};

    getParam(json.data.account.agg_id, result, 'agreement');
    getParam(json.data.account.balance, result, 'balance');
    getParam(json.data.account.date_minus*1000, result, 'till');
    getParam(json.data.account.users[0].ipaddr, result, 'ip');
    getParam(json.data.account.users[0].state.name, result, 'status');
    getParam(json.data.account.users[0].tariff.type_name, result, '__tariff');

    json = callApi('services/loyalty/');
    getParam(json.data.current_points, result, 'bonus');

    AnyBalance.setResult(result);
}
