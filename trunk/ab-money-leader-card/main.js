/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс на кошельке Leomoney 

Operator site: http://leomoney.ru
Личный кабинет: http://leomoney.ru
*/

var g_headers = {
'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.22 (KHTML, like Gecko) Chrome/25.0.1364.152 Safari/537.22'
};

function mooncheck( $num ) {
  var $n = $num.length;
  if ( $n > 0 ) {
      for (var $i=0; $i <= $n; $i++ ) {
          var $p = $num[$n-$i-1];
          if ( $i % 2 != 0 ) {
              $p = 2 * $p;
              if ( $p > 9 ) {
                  $p = $p - 9;
              }
          }
          var $sum = $sum + $p;
      }

      if ( $sum % 10 == 0 ) {
          return true;
      } else {
          return false;
      }
  } else {
      return false;
  }
}

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "http://leomoney.ru/";
    AnyBalance.setDefaultCharset('utf-8');
    var rePrefixes = /^(?:412379)(\d+)\d$/;
    if(!prefs.login || !rePrefixes.test(prefs.login))
        throw new AnyBalance.Error('Номер карты ' + prefs.login + ' введен неправильно.');
//    if(!mooncheck(prefs.login)){}

    var matches = prefs.login.match(rePrefixes);

    var phone = getParam(prefs.login, null, null, rePrefixes);

    var html = AnyBalance.requestPost(baseurl + 'security/signin', {
	flags0:7,
	LoginClear:'9' + phone,
	Password:prefs.password,
	x:24,
	y:22,
	ReturnUrl:'',
        Login:'79' + phone
    }, addHeaders({Origin: baseurl, Referer: baseurl})); 

    if(!/\/security\/signout/i.test(html)){
        var error = getParam(html, null, null, /\$\('#window1'\)\.html\('([\s\S]*?)'\)/i, replaceSlashes);
        if(error)
            throw new AnyBalance.Error(error);
        //Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    //Раз мы здесь, то мы успешно вошли в кабинет
    //Получаем все счетчики
    var result = {success: true};
    getParam(prefs.login, result, 'card', null, [/(\d{4})(\d{4})(\d{4})(\d+)/, '$1 $2 $3 $4']);
    getParam(html, result, 'pursue', /(Кошелек №\s*\d+)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /(Кошелек №\s*\d+)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Ваш баланс:([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseBalanceRK);

    //Возвращаем результат
    AnyBalance.setResult(result);
}

function parseBalanceRK(_text){
    var text = _text.replace(/\s+/g, '');
    var rub = getParam(text, null, null, /(-?\d[\d\.,]*)руб/i, replaceFloat, parseFloat) || 0;
    var kop = getParam(text, null, null, /(-?\d[\d\.,]*)коп/i, replaceFloat, parseFloat) || 0;
    var val = rub+kop/100;
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + _text);
    return val;
}
