Процедура получения значений счетчиков, предоставляемых провайдером, реализуется на языкe [JavaScript](http://ru.wikipedia.org/wiki/Javascript) с использованием [AnyBalance API](AnyBalanceAPI.md).

Провайдер может иметь один или несколько [JavaScript](http://ru.wikipedia.org/wiki/Javascript) файлов, главное, чтобы в одном из них была определена функция main, например,

```
function main(){
  //Получим настройки аккаунта
  var prefs = AnyBalance.getPreferences();

  //Получаем значения счетчиков
  //что-то для этого делаем
  var strGet = AnyBalance.requestGet(url);
  var strPost = AnyBalance.requestGet(url, {login: prefs.login, pass: prefs.pass});

  //извлекаем из строк значения счетчиков
  //...

  //Возвращаем результат
  AnyBalance.setResult({success: true, counter: counter});
}
```

Все декларированные в [манифесте](Manifest.md) под категорией `js` файлы будут загружены при обновлении AnyBalance аккаунта в Android [WebView](http://developer.android.com/reference/android/webkit/WebView.html) и вызвана функция main(). Получив значения счетчиков, провайдер обязательно должен вызвать [AnyBalance.setResult()](AnyBalanceAPI#setResult.md), чтобы передать полученные счетчики программе AnyBalance.

Для получения счетчиков провайдерам необходимо пользоваться [AnyBalance API](AnyBalanceAPI.md). Обычная схема работы функции main:
  * Получаем настройки с помощью [AnyBalance.getPreferences](AnyBalanceAPI#getPreferences.md)
  * Получаем страницы, содержащие нужные нам значения, с помощью функций [AnyBalance.requestGet](AnyBalanceAPI#requestGet.md) и [AnyBalance.requestPost](AnyBalanceAPI#requestPost.md)
  * Извлекаем из них значения счетчиков, не забывая про оптимизацию ([AnyBalance.isAvailable](AnyBalanceAPI#isAvailable.md))
  * Возвращаем результат - [AnyBalance.setResult](AnyBalanceAPI#setResult.md)

Ничего сложного. Можно посмотреть примеры, например
  * [Hello, World!](TutorialHelloWorld.md)
  * [Курсы валют](TutorialExchangeCbr.md)
  * [Отслеживание посылок](TutorialTrackingRussianPost.md)
  * [Обработка XML](TutorialXML.md)

Здесь вы можете найти очень хороший учебник и справочник по javascript на русском языке:

  * http://learn.javascript.ru/
  * http://javascript.ru/manual