# Введение #

Если провайдер, баланс которого вы хотите получить, поддерживает XML - это удивительное везение. И грех его не использовать. Потому что обработка XML в AnyBalance приносит только удовольствие, ибо может быть произведена с использованием [JQuery](http://api.jquery.com/jQuery.parseXML/).

# Подробности #

Рассмотрим получение значений счетчиков из XML на примере получения баланса игровой валюты в игре [Повелители](http://dgame.ru). Эта игра имеет API, при запросе которого возвращается XML, содержащий в том числе и значения счетчиков игровой валюты.

Полный исходный код провайдера находится в [репозитории](http://code.google.com/p/any-balance-providers/source/browse/trunk/ab-game-dgame). Здесь я приведу только код получения счетчиков (полная версия в [main.js](http://code.google.com/p/any-balance-providers/source/browse/trunk/ab-game-dgame/main.js)).

Во-первых, в манифесте надо подключить [JQuery](http://jquery.com/). Можно, конечно, просто включить её в список файлов провайдера наравне с `main.js`. Но в данном случае это не требуется, потому что JQuery используется для внутренних нужд AnyBalance и поэтому уже доступна вашему провайдеру.

Для использования JQuery в манифесте необходимо написать:
```
<js>api:jquery.min.js</js> <!-- Используем библиотеку, которая и так входит в AnyBalance -->
```

Префикс `api:` указывает, что этот файл уже находится в AnyBalance и не поставляется вместе с провайдером.

После этого к моменту вызова функции `main()` `JQuery` уже будет загружена и её можно будет использовать. С помощью `JQuery` можно получать значения провайдеров, используя механизм селекторов (аналогично XPath):

```
        //Получаем xml
        var info = AnyBalance.requestPost('http://dgame.ru/api.php', {
                selfid: userid,
                key: apikey,
                type: 'person',
                id: userid
        });
        
        var xmlDoc = $.parseXML(info),
          $xml = $(xmlDoc);
        
        var $leader = $xml.find('maoli>team>disciples>d[leader="1"]');
        if(!$leader.size())
                throw new AnyBalance.Error("Ошибка: не найден лидер команды!");
        
        if(AnyBalance.isAvailable('cash')){
                result.cash = parseInt($leader.find('cash').text())/10000; //Сводим к золоту
        }
                
        if(AnyBalance.isAvailable('diamond')){
                result.diamond = parseInt($leader.find('diamond').text())/100; // Потому что они в сотых долях
        }
```

Если бы все провайдеры предоставляли свои счетчики в XML, то не было бы проблем...

# Другие примеры #

  * [Hello, World!](TutorialHelloWorld.md)
  * [Курсы валют](TutorialExchangeCbr.md)
  * [Отслеживание посылок](TutorialTrackingRussianPost.md)