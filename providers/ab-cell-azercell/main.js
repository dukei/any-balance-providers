/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
  'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
  'Connection': 'keep-alive',
  'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "http://www.azercell.com/";
    AnyBalance.setDefaultCharset('utf-8');

    checkEmpty(prefs.login, 'Введите номер телефона (Логин)!');
    checkEmpty(prefs.password, 'Введите пароль!');
    var lang = prefs.lang || 'ru';

    AnyBalance.setCookie('www.azercell.com', 'language', lang, {path: '/selfservice/client'});

    var html = AnyBalance.requestGet(baseurl + 'selfservice/client/', g_headers);

    if (!html || AnyBalance.getLastStatusCode() > 400) {
      AnyBalance.trace(html);
      throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    var html = AnyBalance.requestGet(
      baseurl + 'selfservice/api/services/UserService/checkLoginDetailed/' + prefs.login + '/' + prefs.password,
      g_headers
    );

    var resp = getJson(html);

    // если srvResponse === 0, то не залогинились
    if (!resp || !resp.DetailedLoginResponse || resp.DetailedLoginResponse.srvResponse === 0) {
      throw new AnyBalance.Error('Некорректный логин или пароль', null, true);
    }

    // получаем токен для доступа к api
    var token = resp.DetailedLoginResponse.token;
    AnyBalance.setCookie('www.azercell.com', 'token', token, {path: '/selfservice/client'});

    var result = {success: true};

    html = AnyBalance.requestGet(
      baseurl + 'selfservice/api/services/CustomerService/getRateplan/' + prefs.login + '/' + token + '/' + prefs.login,
      g_headers
    );
    resp = getJson(html);
    result.__tariff = resp.StringResponse.responseMessage;

    if (AnyBalance.isAvailable('line', 'local_calls', 'inter_calls', 'roaming')) {
      html = AnyBalance.requestGet(
        baseurl + 'selfservice/api/services/CustomerService/getFullLineStatus/' + prefs.login + '/' + token + '/' + prefs.login,
        g_headers
      );
      resp = getJson(html);

      var line = '';
      var local_calls = '';
      var inter_calls = '';
      var roaming = '';

      if (resp.LineStatusResponse.lineStatus === 'active') {
        line = 'Активна';
        local_calls = 'Вкл';
      } else {
        line = 'Неактивна';
        local_calls = 'Откл';
      }

      // вычисляется по формуле из кода
      switch (resp.LineStatusResponse.intLineStatus) {
        case "int":
          inter_calls = 'Вкл';
          roaming = 'Откл';
        break;
        case "roam":
          inter_calls = 'Вкл';
          roaming = 'Вкл';
        break;
        default:
          inter_calls = 'Откл';
          roaming = 'Откл';
        break;
      }

      if (AnyBalance.isAvailable('line')) {
        result.line = line;
      }
      if (AnyBalance.isAvailable('local_calls')) {
        result.local_calls = local_calls;
      }
      if (AnyBalance.isAvailable('inter_calls')) {
        result.inter_calls = inter_calls;
      }
      if (AnyBalance.isAvailable('roaming')) {
        result.roaming = roaming;
      }
    }

    if (AnyBalance.isAvailable('balance', 'pre_balance', 'embossed', 'unembossed', 'end_time', 'credit_limit')) {
      html = AnyBalance.requestGet(
        baseurl + 'selfservice/api/services/BalanceService/getPostpaidBalance/' + prefs.login + '/' + token + '/' + prefs.login,
        g_headers
      );
      resp = getJson(html);

      var balance = resp.BalanceResponse.creditRemainder;
      if (AnyBalance.isAvailable('balance')) {
        result.balance = balance;
      }
      var pre_balance = resp.BalanceResponse.advPayment;
      if (AnyBalance.isAvailable('pre_balance')) {
        result.pre_balance = pre_balance;
      }

      // вычисляется по формуле из кода
      if (AnyBalance.isAvailable('credit_limit')) {
        result.credit_limit = balance - pre_balance;
      }

      if (AnyBalance.isAvailable('embossed')) {
        result.embossed = resp.BalanceResponse.billedAmt;
      }
      if (AnyBalance.isAvailable('unembossed')) {
        result.unembossed = resp.BalanceResponse.unbilledAmt;
      }
      if (AnyBalance.isAvailable('end_time')) {
        result.end_time = parseDateISO(resp.BalanceResponse.dueDate);
      }
    }

    if (AnyBalance.isAvailable('bonus')) {
      html = AnyBalance.requestGet(
        baseurl + 'selfservice/api/services/LoyaltyService/getLoyaltyBalance/' + prefs.login + '/' + token + '/' + prefs.login,
        g_headers
      );
      resp = getJson(html);
      result.bonus = resp.NumberResponse.srvResponse;
    }

    AnyBalance.setResult(result);
}
