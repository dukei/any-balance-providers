# Введение #

JavaScript API доступно провайдеру для взаимодействия с AnyBalance. Кроме того, оно предоставляет функции для посылки запросов в интернет.

# Описание функций #

Все функции предоставляются через глобальный объект `AnyBalance`. К каждой функции указан номер версии API, с которой она доступна.



## getLevel ##
```
AnyBalance.getLevel() //since level 1
```
Возвращает номер версии текущего AnyBalance API.

## getLastError ##
```
AnyBalance.getLastError() //since level 1
```
Возвращает строку - описание последней произошедшей ошибки. Имеет смысл использовать, когда исключения отключены функцией [setExceptions(false)](AnyBalanceAPI#setExceptions.md).

## trace ##
```
AnyBalance.trace(/*string*/ msg, /*string or null*/ caller) //since level 1
```

Записывает сообщение `msg` в лог аккаунта. Если `caller` не `null`, то он указывается в качестве дополнительной информации. Если `null`, то в качестве `caller` будет записано `trace`.

Для каждого аккаунта AnyBalance хранит лог таких сообщений с момента последнего запуска `main()`. Этот лог можно просматривать прямо в AnyBalance. Полезно использовать для отладки. <a href='http://any-balance-providers.googlecode.com/svn/wiki/images/log.png'>Пример лога.</a>

## setExceptions ##
```
AnyBalance.setExceptions(/*bool*/ use) //since level 1
```

Переключает режим исключений (`use = true` - включить, `use = false` - выключить). По умолчанию исключения включены, то есть в случае возникновения ошибки в недрах AnyBalance API, будет выброшена ошибка [AnyBalance.Error](AnyBalanceAPI#Error.md)). Это удобно, потому что в этом случае, если исключение провайдером не перехвачено, то он автоматически завершится и вернет описание ошибки AnyBalance.

Если исключения отключить, то функции в случае ошибки будут возвращать ошибочное значение (обычно `null` или `false` в зависимости от функции), а описание ошибки можно получить, вызвав [getLastError()](AnyBalanceAPI#getLastError.md).

## requestGet ##
```
AnyBalance.requestGet(/*string*/ url, /*object or null*/headers, /*object or null*/options) throws AnyBalance.Error //since level 1,3,7
```

Посылает GET запрос по адресу `url`. Возвращает строку - тело ответа.

`headers` - (необязательный параметр, поддерживается начиная с API v.3) объект с дополнительными заголовками запроса, например,
```
{
  "Content-Type": "multipart/form-data; boundary=----WebKitFormBoundaryIu4PwUJhm5qcpsdI",
  "User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64)"
}
```

`options` - (необязательный параметр, поддерживается, начиная с API v.7)
объект с дополнительными настройками.
```
{
   "callback": function(info){}, //Асинхронный вызов запроса, 
      //результат придет в функцию в виде 
      //{success: true|false, content: '', error: ''}
      //Этот параметр работает только для вызова из управления настройками
}
```

Пример:
```
  var xml = AnyBalance.requestGet('http://dgame.ru/api.php');
```

В случае возникновения ошибки возвращает `null` или бросает исключение [AnyBalance.Error](AnyBalanceAPI#Error.md), в зависимости от режима исключений, установленного [setExceptions()](AnyBalanceAPI#setExceptions.md).

## requestPost ##
```
AnyBalance.requestPost(/*string*/ url, /*string, object or null*/ data, /*object or null*/headers, /*object or null*/options) throws AnyBalance.Error //since level 1,3,7
```

Посылает POST запрос по адресу `url` с телом `data`, если это строка. Если `data` объект, то тело запроса представляет собой параметры форм с именами и значениями всех свойств объекта `data`.

`headers` - (необязательный параметр, поддерживается начиная с API v.3) объект с дополнительными заголовками запроса, например,
```
{
  "Content-Type": "multipart/form-data; boundary=----WebKitFormBoundaryIu4PwUJhm5qcpsdI",
  "User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64)"
}
```

Возвращает строку - тело ответа.

Пример:
```
  var str = AnyBalance.requestPost('http://haddan.ru/member.php', {
    username: 'dukei',
    passwd: 'strongpass'
  });
```

В случае возникновения ошибки возвращает `null` или бросает исключение [AnyBalance.Error](AnyBalanceAPI#Error.md), в зависимости от режима исключений, установленного [setExceptions()](AnyBalanceAPI#setExceptions.md).

**Примечания**
  * Параметр `headers` добавлен в API v.3. Работает аналогично [requestGet()](AnyBalanceAPI#requestGet.md)
  * Начиная с API v.3 `requestPost` учитывает кодировку по умолчанию, установленную функцией [AnyBalance.setDefaultCharset AnyBalanceAPI#setDefaultCharset]
  * Параметр `options` добавлен в API v.7. Работает аналогично [requestGet()](AnyBalanceAPI#requestGet.md)

## setAuthentication ##
```
AnyBalance.setAuthentication(/*string*/ name, /*string*/ pass, /*object or null*/ authscope) throws AnyBalance.Error //since level 1
```

Устанавливает параметры HTTP авторизации для всех последующих запросов [requestGet()](AnyBalanceAPI#requestGet.md) и [requestPost()](AnyBalanceAPI#requestPost.md). `name` и `pass` - имя и пароль для авторизации,

`authscope` - необязательный параметр, задающий границы действия авторизации (полностью повторяет [AuthScope](http://developer.android.com/reference/org/apache/http/auth/AuthScope.html) из Android). Значения по умолчанию ниже не накладывают никаких ограничений.
```
{
  host: null, /*string or null or undefined - имя хоста */
  realm: null, /*string or null or undefined - название области авторизации */
  scheme: null, /*string or null or undefined - схема авторизации */
  port: -1 /*integer or null or undefined - номер порта */
}
```

Пример:
```
  AnyBalance.setAuthentication('dukei','strongpass');
```

В случае успеха возвращает `true`, в противном случае `false` или бросает исключение [AnyBalance.Error](AnyBalanceAPI#Error.md), в зависимости от режима исключений, установленного [setExceptions()](AnyBalanceAPI#setExceptions.md).

Замечания:
  * До API версии 2 (AnyBalance 1.1.416) существовала ошибка, которая не позволяла не передавать третий параметр. Чтобы обойти эту ошибку в API v.1 надо в качестве третьего параметра передать пустую строку ''

## clearAuthentication ##
```
AnyBalance.clearAuthentication() throws AnyBalance.Error //since level 1
```

Сбрасывает все ранее установленные параметры HTTP авторизации, установленные [setAuthentication()](AnyBalanceAPI#setAuthentication.md).

В случае успеха возвращает `true`, в противном случае `false` или бросает исключение [AnyBalance.Error](AnyBalanceAPI#Error.md), в зависимости от режима исключений, установленного [setExceptions()](AnyBalanceAPI#setExceptions.md).

## setResult ##
```
AnyBalance.setResult(/*object*/ result) throws AnyBalance.Error //since level 1
```

Функция, устанавливающая результат выполнения скрипта провайдера. Она может установить как успешное состояние и передать значение счетчиков, так и состояние ошибки и передать описание ошибки.
В случае успеха в объекте `result` должно быть установлено свойство `success`: true, а также все значения счетчиков. Имя свойства для значения счетчика должно совпадать с id счетчика, описанного в [манифесте](Manifest.md).

В случае ошибки в объекте `result` должно быть установлено свойство `error: true`, а также `message: 'описание ошибки'` и опционально `allow_retry: true`, если ошибка не фатальная и надо просто ещё раз запустить функцию `main()`. Например, если сайт, с которого извлекаются значения счетчиков, сообщает что он перегружен, и надо повторять запросы, пока он не ответит. Но этой возможностью злоупотреблять не стоит, иначе может возникнуть ситуация, когда аккаунт постоянно находится в режиме обновления.

Если в `result` не установлено ни `error: true`, ни `success: true`, то эта ситуация также считается ошибкой.

Например, для счетчиков из манифеста:
```
<counters>
  <counter id="counter1" name="Счетчик 1"/>
  <counter id="counter2" name="Счетчик 2"/>
</counters>
```
Требуется следующий код:
```
  AnyBalance.setResult({success: true, counter1: 123, counter2: 456}); 
```

### Особенности ###
  * Эта функция может быть вызвана только **один** раз, потому что после получения результата AnyBalance считает, что работа провайдера завершена, и может прекратить его выполнение в любой момент.
  * Будьте внимательны! В целях экономии ресурсов мобильного устройства не следует получать и возвращать значения счетчиков, которые не выбраны пользователем для показа. Проверить, выбран ли пользователем счетчик, можно функцией [isAvailable](AnyBalanceAPI#isAvailable.md).
  * В случае успеха можно установить специальное текстовое свойство `__tariff`. Значение этого свойства будет отображаться в списке аккаунтов. Для провайдеров баланса телефона оно может использоваться для отображения названия текущего тарифного плана.
  * Начиная с API v.3 (AnyBalance 1.2.436) в случае возврата null в качестве значения счетчика, значение этого счетчика будет скопировано из предыдущего результата. Это следует использовать для счетчиков, которые обязательно должны быть, но не могут быть получены по каким-то причинам (например, сбой определенной страницы сайта), чтобы их значение не сбрасывалось у пользователей в 0.

### Возвращаемое значение ###
В случае успеха возвращает `true`, в противном случае `false` или бросает исключение [AnyBalance.Error](AnyBalanceAPI#Error.md), в зависимости от режима исключений, установленного [setExceptions()](AnyBalanceAPI#setExceptions.md). После возврата этой функции не рекомендуется делать ничего важного, потому что в любой момент код провайдера может быть выгружен.

## isSetResultCalled ##
```
AnyBalance.isSetResultCalled() //since level 1
```

Возвращает `true`, если [setResult()](AnyBalanceAPI#setResult.md) уже была вызвана. AnyBalance не гарантирует продолжение выполнения JavaScript провайдера после вызова им [setResult()](AnyBalanceAPI#setResult.md).

## isAvailable ##
```
AnyBalance.isAvailable(/*array or string*/ countername, ...) //since level 1
```

Возвращает `true`, если хотя бы один из переданных счетчиков разрешен пользователем. Пользователь может запретить показ некоторых счетчиков в настройках аккаунта. Чтобы сберечь ресурсы мобильного устройства пользователя, не следует извлекать и возвращать значения запрещенных счетчиков.

Пример:
```
//Если для счетчиков надо делать отдельный запрос,
//то выясним сначала, нужны ли вообще эти счетчики?
if(AnyBalance.isAvailable('counter1', 'counter2')){
  var str = AnyBalance.requestGet(url1);
  if(AnyBalance.isAvailable('counter1')) //Если этот счетчик нужен
    result.counter1 = str.substr(1,5); //Извлекаем каким-то образом значение счетчика
  if(AnyBalance.isAvailable('counter2')) //Если этот счетчик нужен
    result.counter1 = str.substr(8,9); //Извлекаем каким-то образом значение счетчика
}
```

## getPreferences ##
```
AnyBalance.getPreferences() //since level 1
```

Возвращает `object`, содержащий все настройки аккаунта, сделанные пользователем. В том числе настройки, предусмотренные в файле категории [preferences](Preferences.md) [манифеста](Manifest.md). Код провайдера может получить свои настройки из этого объекта по именам, заданным в атрибутах `key` настроек из xml-файла [настроек](Preferences.md).

Например, файл настроек:
```
<?xml version="1.0" encoding="utf-8"?>
<PreferenceScreen>
    <EditTextPreference 
        title="Логин" 
        key="login">
    </EditTextPreference>
    <EditTextPreference 
        key="password" 
        title="Пароль"
        inputType="textPassword">
    </EditTextPreference>
</PreferenceScreen>
```
Получение этих свойств:
```
var prefs = AnyBalance.getPreferences();
var pass = prefs.password;
var login = prefs.login;
```

## setDefaultCharset ##
```
AnyBalance.setDefaultCharset(/*string*/ charset) //since level 1
```
Устанавливает кодовую страницу ответов сервера по-умолчанию. Эта кодировка будет использоваться, если не получается извлечь кодировку текста из заголовка `Content-Type`. В качестве `charset` нужно указать нужную кодировку, например `utf-8`. [Список значений `charset`](http://www.iana.org/assignments/character-sets).

## Error ##
```
AnyBalance.Error(/*string*/ message, /*bool*/ allowRetry) //since level 1
```

Конструктор исключения. `message` - описание ошибки, `allowRetry` - флаг, предписывающий AnyBalance повторно вызвать обновление для этого аккаунта. Подробнее об `allowRetry` см. [setResult()](AnyBalanceAPI#setResult.md).

Непойманное вами исключение ведет к завершению провайдера с ошибкой. Поэтому удобно использовать исключения, например, так:

```
var matches;
if(matches = session.match(/<ERROR_ID>(.*?)<\/ERROR_ID>/i)){
	AnyBalance.trace('Got error from sg: ' + matches[1]);
	//Случилась ошибка, может быть мы можем даже увидеть её описание
	if(matches = session.match(/<ERROR_MESSAGE>(.*?)<\/ERROR_MESSAGE>/i)){
		AnyBalance.trace('Got error message from sg: ' + matches[1]);
		throw new AnyBalance.Error(matches[1]);
	}
	AnyBalance.trace('Got unknown error from sg');
	throw new AnyBalance.Error('Неизвестная ошибка');
}
if(!(matches = session.match(/<SESSION_ID>(.*?)<\/SESSION_ID>/i))){
        //Странный ответ, может, можно переконнектиться...
	throw new AnyBalance.Error('Не удалось получить сессию', true); }

```

Замечания:
  * Начиная с API версии 2 (AnyBalance 1.1.416) в тексте ошибки разрешены теги HTML, например, ссылки. Поддержка HTML очень ограниченная, используйте с осторожностью.

## getCookies ##
```
AnyBalance.getCookies() //since level 4
```

Возвращает все куки (массив), которые установлены в локальной сессии. Выглядит этот массив примерно следующим образом:
```
[
 {"name":"myowncookie","value":"myvalue","domain":"192.168.1.101","path":"/","persistent":false},
 {"name":"anothercookie","value":"someval","domain":"192.168.1.101","path":"/","expires":"Wed, 28 Nov 2012 23:04:05 GMT","persistent":true}
]
```

## getCookie ##
```
AnyBalance.getCookie(/*string*/ name, /*object or null*/ params) //since level 4
```

Возвращает значение первой куки с заданным именем. При этом можно указать дополнительное ограничение на домен и путь в объекте `params` (все поля необязательные).

```
var params = {
    domain: 'example.com', //Домен куки
    path: '/', //Путь куки
    allcookies: [] //Если вы до этого получили все куки функцией AnyBalance.getCookies(), 
                   //то рекомендуется в этом параметре передать массив кук
};
```

Возвращает строку - значение куки.

## setCookie ##
```
AnyBalance.setCookie(/*string*/ domain, /*string*/ name, /*string or null*/ value, /*object or null*/ params) //since level 4
```

Устанавливает (замещает) куки с заданным именем и параметрами. Или удаляет её (если `value == null`).

```
var params = {
    path: '/', //Путь куки
    expires: 'GMT Time String', //Срок устаревания
    secure: false //Безопасная ли кука
};
```

## getLastResponseParameters ##
```
AnyBalance.getLastResponseParameters() //since level 5
```

Получает параметры, связанные с последним запросом. Возвращает объект:

```
var params = {
    url: 'http://somedomain.com/path', //Финальный URL (после всех редиректов)
    status: 'HTTP/1.1 200 OK', //HTTP status
    headers: [ //Набор HTTP заголовков ответа
        ['name', 'value'],
        ...
    ]
};
```

Рекомендуется вместо этой функции пользоваться набором частных функций, получающих отдельные элементы этой структуры, а именно: [getLastUrl()](AnyBalanceAPI#getLastUrl.md), [getLastStatusString()](AnyBalanceAPI#getLastStatusString.md), [getLastStatusCode()](AnyBalanceAPI#getLastStatusCode.md), [getLastResponseHeaders()](AnyBalanceAPI#getLastResponseHeaders.md) и [getLastResponseHeader()](AnyBalanceAPI#getLastResponseHeader.md)

### getLastUrl ###
```
AnyBalance.getLastUrl() //since level 5
```

Получает финальный url, который был получен или на который был переадресован последний вызов [requestGet()](AnyBalanceAPI#requestGet.md) или [requestPost()](AnyBalanceAPI#requestPost.md).

### getLastStatusString ###
```
AnyBalance.getLastStatusString() //since level 5
```

Получает строку HTTP статуса, которая была получена с последним вызовом [requestGet()](AnyBalanceAPI#requestGet.md) или [requestPost()](AnyBalanceAPI#requestPost.md).

### getLastStatusCode ###
```
AnyBalance.getLastStatusCode() //since level 5
```

Получает код HTTP ответа на последний запрос [requestGet()](AnyBalanceAPI#requestGet.md) или [requestPost()](AnyBalanceAPI#requestPost.md).

### getLastResponseHeaders ###
```
AnyBalance.getLastResponseHeaders() //since level 5
```

Получает массив всех HTTP заголовков ответа на последний запрос [requestGet()](AnyBalanceAPI#requestGet.md) или [requestPost()](AnyBalanceAPI#requestPost.md). Возвращается массив:

```
    var headers = [ //Набор HTTP заголовков ответа
        ['name', 'value'], //название заголовка, его значение
        ...
    ]
```

### getLastResponseHeader ###
```
AnyBalance.getLastResponseHeader(/*string*/ name) //since level 5
```

Получает строковое значение первого заголовка с заданным именем `name`. Заголовок ищется среди всех заголовков ответа на последний запрос [requestGet()](AnyBalanceAPI#requestGet.md) или [requestPost()](AnyBalanceAPI#requestPost.md). Если такого нет, возвращает `null`.

## retrieveCode ##
```
AnyBalance.retrieveCode(/*string*/ comment, /*string*/ image, /*object*/options) //since level 7
//options parameter is supported since level 9
```

Запрашивает ввод кода с картинки. В настоящее время эта функция открывает в программе окошко с картинкой и полем ввода, в которое надо за минуту успеть ввести код.

В качестве опций `options` можно указать следующее:
```
{
   time: 120000, //Время ожидания ввода кода в мс
   inputType: 'text', //Способ ввода капчи (аналогично inputType в EditTextPreference)
}
```

Пример использования:
```
var captchaimg = AnyBalance.requestGet(baseurl + 'captcha.php');
var value = AnyBalance.retrieveCode("Пожалуйста, введите цифры с картинки.", captchaimg, {inputType: 'number'});
```

Ещё примеры реального использования можно посмотреть, например, в провайдерах [Газпромбонус](http://code.google.com/p/any-balance-providers/source/browse/trunk/ab-bonus-gazprom/main.js), [Евроопт](http://code.google.com/p/any-balance-providers/source/browse/trunk/ab-bonus-euroopt/main.js) и [Почта России](http://code.google.com/p/any-balance-providers/source/browse/trunk/ab-tracking-russian-post/main.js)

# Сохранение данных #

До API v.9 аккаунт не имел состояния, то есть, провайдер запускался каждый раз как в первый раз - без кук и прочих данных. Все накопленные за время работы провайдера промежуточные данные, такие как переменные сессий, куки, токены доступа, в конце работы провайдера терялись.

AnyBalance API v.9 даёт возможность некоторые данные сохранять между вызовами провайдера.

Для этого вводятся функции [getData](AnyBalanceAPI#getData.md), [setData](AnyBalanceAPI#setData.md), [saveData](AnyBalanceAPI#saveData.md) и вспомогательные [saveCookies](AnyBalanceAPI#saveCookies.md) и [restoreCookies](AnyBalanceAPI#restoreCookies.md).

Схема работы с сохранением данных такова. Во время работы провайдера можно вызывать [getData](AnyBalanceAPI#getData.md) для получения сохраненных данных и [setData](AnyBalanceAPI#setData.md) для установки сохраненных данных. При этом чтобы физически сохранить все данные, установленные [setData](AnyBalanceAPI#setData.md), необходимо явно вызывать [saveData](AnyBalanceAPI#saveData.md). Рекомендуется делать это непосредственно в самом конце перед вызовом [setResult](AnyBalanceAPI#setResult.md), чтобы сохранять данные только после успешного выполнения провайдера.

Для удобства сохранения и восстановления кук предусмотрены вспомогательные функции [saveCookies](AnyBalanceAPI#saveCookies.md) и [restoreCookies](AnyBalanceAPI#restoreCookies.md). Куки, сохраненные [saveCookies](AnyBalanceAPI#saveCookies.md) также физически сохраняются только после очередного вызова [saveData](AnyBalanceAPI#saveData.md).

Пример:
```
function main(){
    var token = AnyBalance.getData('token', 'empty_token');
    if(token == 'empty_token'){
        token = '8023jf0j2f0ws-0952';
        AnyBalance.setData('token', token);
    }

    //... Здесь делается куча работы

    AnyBalance.saveData(); //Сохраняем, всё, что передавали в setData
    AnyBalance.setResult({success: true});
}
```

## getData ##
```
AnyBalance.getData(/*string*/ name, /*mixed*/ defaultVal) //since level 9
```

Возвращает сохраненные ранее под именем `name` данные. Если данные не сохранены, возвращается `defaultVal`.

Пример использования:
```
var token = AnyBalance.getData('token');
var regions = AnyBalance.getData('regions', ['moscow','ural','dv']);
var cabinet_type = AnyBalance.getData('cabinet_type', 1);
```

## setData ##
```
AnyBalance.setData(/*string*/ name, /*mixed*/ value) //since level 9
```

Запоминает данные, подлежащие сохранению, под именем `name`. Если `value` не передать, то данные с этим именем удаляются.

Данные не сохраняются физически, пока не вызвана функция [saveData](AnyBalanceAPI#saveData.md), но для [getData](AnyBalanceAPI#getData.md) доступны сразу же.

Пример использования:
```
AnyBalance.setData('token', '2098ysdn5y20yfwh3-');
'2098ysdn5y20yfwh3-' == AnyBalance.getData('token'); //true
AnyBalance.setData('regions', ['moscow','ural','dv','urupinsk']);
AnyBalance.setData('cabinet_type', 8);
```

## clearData ##
```
AnyBalance.clearData() //since level 9
```

Очищает все данные. Для физического запоминания надо позже вызвать [saveData](AnyBalanceAPI#saveData.md)

Пример использования:
```
AnyBalance.setData('token', '2098ysdn5y20yfwh3-');
AnyBalance.clearData();
'2098ysdn5y20yfwh3-' == AnyBalance.getData('token'); //false
```

## saveData ##
```
AnyBalance.saveData(/*boolean*/ forceSave) //since level 9
```

Осуществляет физическое сохранение всех данных, модифицированных ранее функциями [setData](AnyBalanceAPI#setData.md), [clearData](AnyBalanceAPI#setData.md), [saveCookies](AnyBalanceAPI#saveCookies.md) и [restoreCookies](AnyBalanceAPI#restoreCookies.md).

Параметр `forceSave` указывает функции произвести сохранение даже в том случае, если изменения в данных не зарегистрированы.

Пример использования:
```
AnyBalance.setData('token', '2098ysdn5y20yfwh3-');
AnyBalance.saveData();
```

## saveCookies ##
```
AnyBalance.saveCookies() //since level 9
```

Сохраняет все куки, которые возвращаются функцией [getCookies](AnyBalanceAPI#getCookies.md). Физически данные сохраняются только после первого вызова [saveData](AnyBalanceAPI#saveData.md).

Пример использования:
```
AnyBalance.saveCookies();
AnyBalance.saveData();
```


## restoreCookies ##
```
AnyBalance.restoreCookies() //since level 9
```

Восстанавливает все куки, которые ранее были сохранены функцией [saveCookies](AnyBalanceAPI#saveCookies.md). Сохраненные куки добавляются к уже имеющимся кукам (или заменяют их, если совпадает имя/домен). Получить все куки после восстановления можно с помощью [getCookies](AnyBalanceAPI#getCookies.md).

Пример использования:
```
AnyBalance.restoreCookies();
```

# Управление настройками #

Начиная с API v.7 можно управлять процессом настройки провайдера, для этого предназначены следующие функции API.

## Preference ##

Представляет собой объект настройки. Содержит свойства и методы для управления настройкой. Как правило, явно не создаётся, а возвращается другими методами и свойствами, возвращающими настройки.

Настройки бывают тех же типов, что описываются в `xml`, у них почти все те же свойства. Типы образуют иерархию наследования свойств. Базовый тип - Preference, от него наследуются все остальные.

### Типы настроек и поддерживаемые свойства ###
```
{
    Preference: {
    	properties: ['key','title',
                     'summary', //Изначальное summary, как было в xml
                     'summaryPlain', //Текущее summary
    	             'enabled', 'dependency','order','defaultValue',
    	             'visible','parent','preference'],
    },
    DialogPreference: {
    	properties: ['dialogTitle','dialogMessage',
    	             'positiveButtonText','negativeButtonText'],
    	parent: 'Preference' 
    },
    EditTextPreference: {
    	properties: ['inputType','text'],
    	parent: 'DialogPreference' 
    },
    ListPreference: {
    	properties: ['entries','value'],
    	parent: 'DialogPreference' 
    },
    CheckBoxPreference: {
    	properties: ['summaryOff','summaryOn',
    	             'disableDependentsState','checked'],
    	parent: 'Preference' 
    },
    PreferenceGroup: {
    	properties: ['preferences'],
    	parent: 'Preference' 
    },
    PreferenceCategory: {
    	properties: [],
    	parent: 'PreferenceGroup' 
    },
    PreferenceScreen: {
    	properties: [],
    	parent: 'PreferenceGroup' 
    },
}
```

В каждом типе указаны присущие типу свойства и ссылка на базовый тип. Настройки базового типа также наследуются.

### get ###
```
pref.get(/*string or object*/ prop) //since level 7
```

Получает свойство с именем `prop`. В этом случае возвращает значение свойства. Можно получить значение сразу нескольких свойств, если передать в качестве `prop` объект с ключами - именами свойств. Например,

Пример:
```
   var title = pref.get('title');

   var props = pref.get({title: '', summary: '', enabled: '', visible: ''});
   //props будет равен {title: 'Логин', summary: '||{@s}', enabled: true, visible: true}
```

### set ###
```
pref.set(/*string or object*/ prop, value) //since level 7
```

Устанавливает свойство с именем `prop` в значение value. В этом случае возвращает значение свойства. Можно установить значение сразу нескольких свойств, если передать в качестве `prop` объект с ключами - именами свойств и значениями - значениями свойств. Например,

Пример:
```
   var title = pref.set('entries');

   //Устанавливаем набор значений для списка ListPreference и сразу же выбираем одно из значений
   var props = pref.set({entries: [{n: 'Пункт 1', v: 'p1'}, {n: 'Пункт 2', v: 'p2'}], value: 'p1']});
```

### add ###
```
pref.add(/*object*/ props) //since level 7
```

Метод добавляет новую настройку. Этот метод есть только у настроек типа `PreferenceGroup` (`CategoryPreference` и `ScreenPreference`). В `props` указываются значения свойств новой настройки.

Пример:
```
var group = AnyBalance.getPreference();

var pref = g_group.add({
    type: 'EditTextPreference',
    title: 'Новая настройка',
    key: 'newEdit',
    summary: '||{@s}',
    value: 'test'
});
```

### remove ###
```
pref.remove() //since level 7
```

Метод удаляет настройку. После вызова этого метода уже нельзя обращаться к этой настройке, потому что настройка уже будет удалена.

### getSubPreferences ###
```
pref.getSubPreferences() //since level 7
```

Метод получает дочерние настройки. Этот метод есть только у настроек типа `PreferenceGroup` (`CategoryPreference` и `ScreenPreference`).

Возвращает массив дочерних настроек в виде объектов `Preference`.

### getType ###
```
pref.getType() //since level 7
```

Метод получает тип настройки.

## getTopPreferences ##
```
AnyBalance.getTopPreferences() //since level 7
```

Метод получает настройки верхнего уровня.

Возвращает массив настроек в виде объектов `Preference`.

## getPreference ##
```
AnyBalance.getPreference(/*string*/ key) //since level 7
```

Возвращает настройку в виде объекта `Preference` с ключом `key`.

## setPreferenceProperties ##
```
AnyBalance.setPreferenceProperties(/*object*/ prefs) //since level 7
```

Эта функция предназначена для быстрой установки свойств нескольких настроек сразу. Устанавливаемые свойства для каждой настройки передаются в виде объекта `{propname: propvalue, ...}`

Параметр `prefs` передаётся в формате
```
{
   key: { //Ключ настройки
       propname: propvalue,
       ...
   }, ...
}
```

Пример:
```
var props = AnyBalance.getPreferenceProperties({
    locality: {
        value: ''
    }
});

var surgut = (props.locality.value == 'Сургут');

AnyBalance.setPreferenceProperties({
    street: {visible: surgut},
    house: {visible: surgut},
    flat: {visible: surgut},
    account: {visible: !surgut},
});
```

## getPreferenceProperties ##
```
AnyBalance.getPreferenceProperties(/*object*/ prefs) //since level 7
```

Эта функция предназначена для быстрого извлечения свойств нескольких настроек сразу.

Пример:
```
var props = AnyBalance.getPreferenceProperties({
    locality: {
        value: '',
        enabled: ''
    },
    street: {
        enabled: ''
    }
});

//Значения свойств настроек теперь легко получить примерно так:
AnyBalance.trace(props.locality.enabled);
AnyBalance.trace(props.street.enabled);
```

## addCallback ##
```
AnyBalance.addCallback(/*string*/ event, /*function*/ func) //since level 7
```

Привязывает функцию к событию. События есть следующие:
  * `change#` - срабатывает при изменении любой настройки
  * `change#key` - срабатывает при изменении настройки с ключом `key`

Пример:
```
AnyBalance.addCallback('change#country', onChangeCountry);
AnyBalance.addCallback('change#city', onChangeCity);
AnyBalance.addCallback('change#amountOut', recomputeComission);
AnyBalance.addCallback('change#tarif', onChangeTariff);
AnyBalance.addCallback('change#currency', onChangeCurrency);
```

## removeCallback ##
```
AnyBalance.removeCallback(/*string*/ event, /*function*/ func) //since level 7
```

Отвязывает заданную функцию от события.