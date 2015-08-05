# Введение #

Рассмотрим более сложный пример, чем [Hello world](TutorialHelloWorld.md). В этом примере придется делать GET запрос на вебсайт, и извлекать значения курсов валют из полученной страницы.

# Исследование #

Если вы смотрели пример [Hello world](TutorialHelloWorld.md), то видели, что написать сам провайдер очень просто. Но в написании реального провайдера сложности есть. Они состоят в том, что вам надо правильно придумать, как извлечь нужные вам данные. Если вы хотите извлечь какие-то данные с вебсайта, вам необходимо сначала понять, как они на этом сайте представлены.

В этом примере мы будем получать курсы валют с сайта http://www.forexpf.ru . А конкретно, из информера [Курсы валют ЦБ РФ](http://www.forexpf.ru/_informer_/cbrf_.php).
Идем на страницу информера и замечаем, что реальные значения курсов берутся скриптом по адресу `http://www.forexpf.ru/_informer_/cbrf.php?id=012345678`. Вводим в строке браузера этот адрес... и ничего интересного не получаем, хотя может это только в Chrome у меня так. Но такое случается часто. Чтобы уверенно получить содержимое этой страницы, нужно воспользоваться средствами разработки Chrome (для Firefox есть Firebug, который умеет всё примерно то же).

Для этого нажимаем правой кнопкой мыши в окне Хрома и выбираем **Просмотр кода элемента**. В открывшемся снизу окне выбираем вкладку **Network**. Теперь Хром будет показывать все запросы страниц, которые он делает, а также ответы сервера на них.

Вводим в адресной строке `http://www.forexpf.ru/_informer_/cbrf.php?id=012345678` ещё раз и нажимаем Enter. Во вкладке Network появилась информация по этому запросу. Щелкаем на неё и выбираем вкладку **Response**. Это тело ответа с сервера. Вы должны увидеть примерно следующее.

<a href='http://any-balance-providers.googlecode.com/svn/wiki/images/forex_resp.png'><img width='640' src='http://any-balance-providers.googlecode.com/svn/wiki/images/forex_resp.png' /></a> Рис. 1

Если переформатировать и сократить для наглядности, то сервер возвращает примерно это:

```
for (var i=0; i<document.links.length; i++){
  if (document.links[i].href=="http://www.forexpf.ru/") {
    document.getElementById("usrutd").innerHTML="31,1026";
    document.getElementById("usrutm").innerHTML="31,1527";
    //... пропущено для краткости
  }
}
```

Теперь видно, как можно извлечь значения. Нас интересуют курсы, оканчивающиеся на `tm`, потому что они соответствуют курсу ЦБ РФ на завтра, то есть, самые свежие. Чтобы их извлечь, воспользуемся [регулярными выражениями](http://javascript.ru/RegExp). Чтобы наглядно составить регулярное выражение можно пользоваться [визуальным редактором](http://www.debuggex.com/) на сайте http://www.debuggex.com.

Скопируйте полный текст страницы в окно редактора (в нижнюю часть). Для извлечения курса доллара нам понадобится регулярное выражение `"usrutm"[^"]*"([^"]*)"`. Вставьте его в редактор (в верхнюю часть) и можете увидеть, что часть `"usrutm").innerHTML="31,1527"` подсветилась, то есть выражение составлено правильно.

<a href='http://any-balance-providers.googlecode.com/svn/wiki/images/forex_regexp.png'><img width='640' src='http://any-balance-providers.googlecode.com/svn/wiki/images/forex_regexp.png' /></a> Рис. 2

Таким же образом можно составить выражения и для извлечения остальных курсов. Можно уже писать функцию `main`.

# Манифест #

Но сначала напишем [манифест](Manifest.md). Ведь именно в нем определяются имена счетчиков, значения для которых мы будем извлекать в JavaScript.  Полный манифест вы можете посмотреть в [репозитории](http://code.google.com/p/any-balance-providers/source/browse/trunk/ab-exchange-cbr/anybalance-manifest.xml). Здесь приведу только счетчики:

```
  <counters>
    <counter id="USD" name="Курс доллара" prefix="$ "/>
    <counter id="EUR" name="Курс евро" prefix="€ "/>
    <counter id="GBP" name="Курс фунта" prefix="£ "/>
    <counter id="BYR" name="Курс бел.рубля" prefix="Br "/>
    <counter id="KZT" name="Курс тенге" prefix="T "/>
    <counter id="CNY" name="Курс юаня" prefix="Ұ "/>
    <counter id="UAH" name="Курс гривны" prefix="₴ "/>
    <counter id="CHF" name="Курс франка" prefix="₣ "/>
    <counter id="JPY" name="Курс йены" prefix="¥ "/>
  </counters>
```

Атрибут `id` у каждого счетчика - это название переменной, в которой AnyBalance ждёт от провайдера возврата её значения. Атрибут `prefix` используется, чтобы на виджете отобразить значок валюты рядом с текущим курсом.

# Программа #

Курсы валют в скрипте `http://www.forexpf.ru/_informer_/cbrf.php?id=012345678` закодированы настолько однотипно, что оказалось удобно написать функцию извлечения нужного курса.

```
function getRate(result, info, namein, nameout){
        var matches, regexp = new RegExp('"'+namein+'"[^"]*"([^"]*)"', 'i');
        if(matches = info.match(regexp)){
                if(AnyBalance.isAvailable(nameout))
                        result[nameout] = parseFloat(matches[1].replace(',','.'));
        }
}
```

Функция принимает `result` - объект, в который записываются извлеченные значения курсов для передачи в AnyBalance, `info` - текст со всеми счетчиками, полученный с адреса `http://www.forexpf.ru/_informer_/cbrf.php?id=012345678`, `namein` - название курса валюты в этом тексте (например, `usrutm`), `nameout` - id счетчика, соответствующего этой валюте.

Надо пояснить, зачем делается вызов [AnyBalance.isAvailable()](AnyBalanceAPI#isAvailable.md). Дело в том, что пользователю могут быть нужны не все курсы одновременно. Может, ему нужно только курс доллара и евро, а остальное его не интересует. Тогда в настройках аккаунта он может выключить все курсы, кроме доллара и евро. Чтобы не получать зря ненужные пользователю счетчики, существует функция [AnyBalance.isAvailable()](AnyBalanceAPI#isAvailable.md). Если счетчик пользователем "спрятан", то для таких счетчиков она вернет `false`.

С функцией `getRate()` функция получения курсов валюты становится чрезвычайно простой.

```
function main(){
        // Получаем содержимое скрипта с курсами валют
        var info = AnyBalance.requestGet('http://www.forexpf.ru/_informer_/cbrf.php?id=012345678');
        
        // При успешном завершении извлечения значений счетчиков
        // в result обязательно должно быть поле success: true
        var result = {success: true};

        //Получаем все счетчики, записываем их в result
        getRate(result, info, 'usrutm', 'USD');
        getRate(result, info, 'eurutm', 'EUR');
        getRate(result, info, 'gbrutm', 'GBP');
        getRate(result, info, 'byrutm', 'BYR');
        getRate(result, info, 'kzrutm', 'KZT');
        getRate(result, info, 'cnrutm', 'CNY');
        getRate(result, info, 'uarutm', 'UAH');
        getRate(result, info, 'chrutm', 'CHF');
        getRate(result, info, 'jprutm', 'JPY');

        //Возвращаем результат
        AnyBalance.setResult(result);
}
```

Собственно, всё. Самое сложное позади. Остались всякие мелочи, типа иконки, собрать всё в zip файл, и т.д. Но это уже просто.

Виджет с курсами будет выглядеть примерно так:

<a href='http://any-balance-providers.googlecode.com/svn/wiki/images/widgets.jpg'><img width='240' src='http://any-balance-providers.googlecode.com/svn/wiki/images/widgets.jpg' /></a> Рис. 3

Полный код примера находится в [репозитории](http://code.google.com/p/any-balance-providers/source/browse/trunk/ab-exchange-cbr/).

# Другие примеры #

Этот пример показал как можно создать вполне полезный провайдер, затратив совсем немного усилий. Но всё же в реальной жизни провайдеры посложнее, хотя бы потому, что для получения доступа на некоторые страницы сайтов требуется вводить логин и пароль. Для этого надо уметь задавать [настройки провайдера](Preferences.md) и посылать формы [requestPost](AnyBalanceAPI#requestPost.md).

С этими техниками вы можете познакомиться, рассмотрев следующий пример.

  * [Отслеживание посылок](TutorialTrackingRussianPost.md)